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
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return respond({ error: "Server configuration unavailable." }, 503);

  const supabase = createClient(url, anonKey, {
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
    .select("storage_bucket, storage_path, status, size_bytes, mime_type, created_at")
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
  form.append("model", "gpt-4o-mini-transcribe");
  form.append("language", "en");
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
    // No persisted transcript or second stored audio copy; the teacher may copy text during review.
    return respond({ transcript: result.text.trim() });
  } catch {
    return respond({ error: "Transcription timed out or was temporarily unavailable." }, 504);
  }
});
