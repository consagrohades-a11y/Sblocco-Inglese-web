-- Automatically transcribe submitted Learning Studio speaking_response (audio_response) only.
-- Submission remains independent of transcription availability. Existing 14-day audio
-- Storage/metadata deletion jobs are untouched.
create table if not exists public.exercise_speech_transcription_jobs (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null unique,
  attempt_question_id uuid not null references public.exercise_builder_attempt_questions(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts integer not null default 0 check (attempts between 0 and 20),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  completed_at timestamptz,
  last_error text
);

create index if not exists exercise_speech_transcription_jobs_pending_idx
on public.exercise_speech_transcription_jobs(status, next_attempt_at, created_at)
where status = 'pending';

alter table public.exercise_speech_transcription_jobs enable row level security;
revoke all on public.exercise_speech_transcription_jobs from public, anon, authenticated;
grant select, insert, update, delete on public.exercise_speech_transcription_jobs to service_role;

create or replace function public.enqueue_submitted_speaking_transcriptions()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $trigger$
declare
  v_created integer := 0;
  v_token text;
begin
  if old.status is not distinct from 'submitted' or new.status <> 'submitted' then
    return new;
  end if;

  insert into public.exercise_speech_transcription_jobs(file_id, attempt_question_id)
  select f.id, q.id
  from public.exercise_builder_attempt_questions q
  join public.exercise_builder_submission_files f
    on f.id::text = q.answer ->> 'file_id'
   and f.attempt_question_id = q.id
   and f.attempt_id = new.id
  where q.attempt_id = new.id
    and q.question_snapshot ->> 'type' = 'audio_response'
    and nullif(btrim(q.speech_transcript), '') is null
    and f.status = 'active'
    and f.storage_bucket = 'exercise-submissions'
    and f.created_at > now() - interval '14 days'
  on conflict (file_id) do nothing;

  get diagnostics v_created = row_count;
  if v_created > 0 then
    -- pg_net only dispatches after the submission transaction commits.
    -- The 5-minute catch-up worker is a fallback for network/provider failures.
    begin
      select decrypted_secret into v_token from vault.decrypted_secrets
      where name = 'exercise_audio_cleanup_token';
      if v_token is not null then
        perform net.http_post(
          url := 'https://crzgvhonevrmkueajddy.supabase.co/functions/v1/transcribe-submitted-speaking',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-sblocco-cron-token', v_token
          ),
          body := jsonb_build_object('event', 'speaking_submitted'),
          timeout_milliseconds := 5000
        );
      end if;
    exception when others then
      raise warning 'Speech transcription dispatch failed; scheduled retry will recover';
    end;
  end if;
  return new;
end;
$trigger$;

revoke all on function public.enqueue_submitted_speaking_transcriptions() from public, anon, authenticated;

drop trigger if exists exercise_builder_attempt_auto_transcription
on public.exercise_builder_attempts;
create trigger exercise_builder_attempt_auto_transcription
after update of status on public.exercise_builder_attempts
for each row
when (new.status = 'submitted' and old.status is distinct from new.status)
execute function public.enqueue_submitted_speaking_transcriptions();

-- Use the existing Vault-protected internal cron token; never place it in
-- source control, user-facing clients or SQL job definitions as plaintext.
select cron.schedule(
  'sblocco-speaking-transcription-retry',
  '*/5 * * * *',
  $job$
    select net.http_post(
      url := 'https://crzgvhonevrmkueajddy.supabase.co/functions/v1/transcribe-submitted-speaking',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-sblocco-cron-token',
        (select decrypted_secret from vault.decrypted_secrets
         where name = 'exercise_audio_cleanup_token')
      ),
      body := '{"source":"scheduled_retry"}'::jsonb,
      timeout_milliseconds := 5000
    );
  $job$
);
