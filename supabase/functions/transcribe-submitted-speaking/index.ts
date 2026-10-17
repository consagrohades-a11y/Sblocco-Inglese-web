import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

// Backend-only job worker. It transcribes submitted audio_response questions,
// never listening media, unsubmitted recordings or roleplay turn recordings.
const EXPECTED_CRON_TOKEN_SHA256 = "f401431492f2236bf7e2114a7f3c10f674962aa859d8364a64348d7b94b6ef20";
const MAX_BATCH = 3;
const MAX_ATTEMPTS = 4;
const RETENTION_MS = 14 * 86400_000;

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((n) => n.toString(16).padStart(2, "0")).join("");
}
function serverKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const keys = JSON.parse(raw) as Record<string, string>;
      const candidate = keys.default || Object.values(keys)[0];
      if (typeof candidate === "string") return candidate;
    } catch { /* Legacy fallback below. */ }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}
function recordingExtension(mime: string) {
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  return "webm";
}
function retryable(message: string) {
  return !message.startsWith("invalid:") && !message.startsWith("missing:") && !message.startsWith("unsupported:");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  const supplied = req.headers.get("x-sblocco-cron-token") || "";
  if (!supplied || await sha256(supplied) !== EXPECTED_CRON_TOKEN_SHA256) {
    return respond({ error: "Unauthorized" }, 401);
  }
  const url = Deno.env.get("SUPABASE_URL");
  const key = serverKey();
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!url || !key || !openaiKey) {
    return respond({ error: "Server transcription configuration unavailable", missing: [!url ? "SUPABASE_URL" : null, !key ? "SUPABASE_SECRET_KEYS_OR_SERVICE_ROLE_KEY" : null, !openaiKey ? "OPENAI_API_KEY" : null].filter(Boolean) }, 503);
  }
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = new Date();
  // Recover interrupted work; a fresh worker may safely claim those jobs again.
  const { error: resetError } = await db.from("exercise_speech_transcription_jobs")
    .update({ status: "pending", next_attempt_at: now.toISOString() })
    .eq("status", "processing")
    .lt("started_at", new Date(now.getTime() - 5 * 60_000).toISOString());
  if (resetError) return respond({ error: "Unable to recover transcription jobs" }, 500);

  const { data: pending, error: pendingError } = await db.from("exercise_speech_transcription_jobs")
    .select("id,attempt_question_id,file_id,attempts")
    .eq("status", "pending").lte("next_attempt_at", now.toISOString())
    .order("created_at", { ascending: true }).limit(MAX_BATCH);
  if (pendingError) return respond({ error: "Unable to load transcription jobs" }, 500);

  let completed = 0;
  let failed = 0;
  let retried = 0;
  for (const job of pending || []) {
    const { data: claimed, error: claimError } = await db.from("exercise_speech_transcription_jobs")
      .update({ status: "processing", attempts: job.attempts + 1, started_at: new Date().toISOString(), last_error: null })
      .eq("id", job.id).eq("status", "pending").select("id");
    if (claimError || !claimed?.length) continue;

    try {
      const { data: question, error: questionError } = await db.from("exercise_builder_attempt_questions")
        .select("attempt_id,question_snapshot,answer,speech_transcript")
        .eq("id", job.attempt_question_id).maybeSingle();
      if (questionError || !question) throw new Error("missing:question");
      if (question.question_snapshot?.type !== "audio_response" ||
          question.answer?.file_id !== job.file_id) throw new Error("invalid:question_answer");
      if (question.speech_transcript?.trim()) {
        await db.from("exercise_speech_transcription_jobs")
          .update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", job.id);
        completed++;
        continue;
      }

      const { data: attempt, error: attemptError } = await db.from("exercise_builder_attempts")
        .select("status").eq("id", question.attempt_id).maybeSingle();
      if (attemptError || attempt?.status !== "submitted") throw new Error("invalid:unsubmitted_attempt");

      const { data: file, error: fileError } = await db.from("exercise_builder_submission_files")
        .select("attempt_question_id,attempt_id,storage_bucket,storage_path,status,size_bytes,mime_type,created_at")
        .eq("id", job.file_id).maybeSingle();
      if (fileError || !file) throw new Error("missing:recording");
      if (file.status !== "active" || file.storage_bucket !== "exercise-submissions" ||
          file.attempt_question_id !== job.attempt_question_id || file.attempt_id !== question.attempt_id ||
          Date.now() - new Date(file.created_at).getTime() >= RETENTION_MS) {
        throw new Error("invalid:recording_expired_or_replaced");
      }
      if (file.size_bytes <= 0 || file.size_bytes > 25 * 1024 * 1024 ||
          !String(file.mime_type).startsWith("audio/")) throw new Error("unsupported:recording");

      const { data: audio, error: audioError } = await db.storage
        .from("exercise-submissions").download(file.storage_path);
      if (audioError || !audio) throw new Error("missing:audio_storage");
      const form = new FormData();
      form.append("model", "gpt-transcribe");
      form.append("languages[]", "en");
      form.append("prompt", "This recording is a spontaneous spoken answer by an English-language learner. The learner may make grammar errors, repeat words, restart sentences, or use unusual phrasing. Represent the words actually spoken, including nonstandard grammar and incomplete sentences. Do not silently correct, paraphrase, or rewrite the learner's English. Do not invent inaudible words.");
      form.append("file", new File([audio], "recording." + recordingExtension(file.mime_type), { type: file.mime_type }));
      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST", headers: { Authorization: "Bearer " + openaiKey }, body: form,
        signal: AbortSignal.timeout(35000),
      });
      if (!res.ok) {
        if (res.status === 429 || res.status >= 500) throw new Error("provider:temporary");
        throw new Error("unsupported:provider_rejected");
      }
      const result = await res.json();
      const transcript = typeof result?.text === "string" ? result.text.trim() : "";
      if (!transcript) throw new Error("unsupported:no_speech_detected");
      if (transcript.length > 20000) throw new Error("unsupported:transcript_too_long");

      // Never replace teacher-edited text. Reviews remain teacher-owned.
      const { data: updated, error: writeError } = await db.from("exercise_builder_attempt_questions")
        .update({ speech_transcript: transcript, speech_transcribed_at: new Date().toISOString() })
        .eq("id", job.attempt_question_id).is("speech_transcript", null).select("id");
      if (writeError) throw new Error("database:transcript_save");
      const { error: doneError } = await db.from("exercise_speech_transcription_jobs")
        .update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", job.id);
      if (doneError) throw new Error("database:job_save");
      completed++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      const retry = retryable(message) && job.attempts + 1 < MAX_ATTEMPTS;
      const delayMinutes = Math.min(30, Math.pow(2, job.attempts + 1));
      const { error: statusError } = await db.from("exercise_speech_transcription_jobs").update({
        status: retry ? "pending" : "failed",
        next_attempt_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
        last_error: message.slice(0, 160),
      }).eq("id", job.id);
      if (statusError) console.error("Failed to update transcription job status", job.id);
      if (retry) retried++; else failed++;
    }
  }
  return respond({ ok: true, processed: (pending || []).length, completed, retried, failed });
});
