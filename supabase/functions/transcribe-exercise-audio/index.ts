import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.0";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return respond({ error: "Method not allowed." }, 405);

  const token = req.headers.get("Authorization") || "";
  if (!token.startsWith("Bearer ")) return respond({ error: "Authentication required." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  // Prefer current publishable API keys; retain compatibility with older Supabase projects.
  const published = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  let publishableKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (published) {
    try {
      const keys = JSON.parse(published) as Record<string, string>;
      publishableKey = keys.default || publishableKey;
    } catch {
      return respond({ error: "Invalid Supabase key configuration." }, 503);
    }
  }
  if (!url || !publishableKey) return respond({ error: "Server configuration unavailable." }, 503);

  const supabase = createClient(url, publishableKey, {
    global: { headers: { Authorization: token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return respond({ error: "Session expired." }, 401);

  // Explicit admin check: learners may read their own submissions but cannot transcribe them here.
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || isAdmin !== true) return respond({ error: "Only a teacher can transcribe submissions." }, 403);

  let payload: { file_id?: unknown };
  try { payload = await req.json(); } catch { return respond({ error: "Invalid request." }, 400); }
  const id = typeof payload?.file_id === "string" ? payload.file_id : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return respond({ error: "Invalid recording." }, 400);
  }

  const { data: file, error: fileError } = await supabase
    .from("exercise_builder_submission_files")
    .select("attempt_question_id, storage_bucket, storage_path, status, size_bytes, mime_type, created_at")
    .eq("id", id).single();
  if (fileError || !file || file.status !== "active" || file.storage_bucket !== "exercise-submissions") {
    return respond({ error: "Recording unavailable or expired." }, 404);
  }
  if (Date.now() - new Date(file.created_at).getTime() >= 14 * 86400_000) {
    return respond({ error: "Recording has passed its 14-day retention period." }, 410);
  }
  if (file.size_bytes <= 0 || file.size_bytes > 25 * 1024 * 1024 || !/^audio\//.test(file.mime_type || "")) {
    return respond({ error: "Unsupported recording." }, 400);
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return respond({ error: "Transcription is not configured. Add OPENAI_API_KEY to Supabase Edge Function secrets." }, 503);

  const { data: audio, error: downloadError } = await supabase.storage
    .from("exercise-submissions").download(file.storage_path);
  if (downloadError || !audio) return respond({ error: "Unable to access the recording." }, 404);

  const ext = file.mime_type.includes("ogg") ? "ogg"
    : file.mime_type.includes("mp4") ? "mp4" : file.mime_type.includes("wav") ? "wav" : "webm";
  const form = new FormData();
  form.append("model", "gpt-transcribe");
  form.append("languages[]", "en");
  form.append("file", new File([audio], "recording." + ext, { type: file.mime_type }));
  try {
    const transcription = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: "Bearer " + apiKey }, body: form,
      signal: AbortSignal.timeout(45000),
    });
    if (!transcription.ok) return respond({ error: "The transcription provider could not process this recording." }, 502);
    const result = await transcription.json();
    if (typeof result?.text !== "string" || !result.text.trim()) {
      return respond({ error: "No speech was detected." }, 422);
    }
    // Persist text on the attempt question, independently from the 14-day audio cleanup.
    // The RPC requires admin status and clears outdated range annotations if text changes.
    const { data: savedTranscript, error: saveError } = await supabase.rpc(
      "admin_save_exercise_builder_speech_transcript",
      { p_attempt_question_id: file.attempt_question_id, p_transcript: result.text.trim() },
    );
    if (saveError) return respond({ error: "Transcription was generated but could not be saved. Please try again." }, 500);
    return respond({ transcript: savedTranscript });
  } catch {
    return respond({ error: "Transcription timed out or was temporarily unavailable." }, 504);
  }
});
