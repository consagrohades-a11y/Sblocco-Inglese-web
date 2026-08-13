-- Recovery topic verify retake freshness.
-- A repeated Exercise Builder exercise_version remains historical evidence but is not a fresh form.

create or replace function public.annotate_recovery_mini_check_freshness()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_current_exercise_id text;
  v_current_version_id text;
  v_previous_version_id text;
  v_current_form_key text;
  v_previous_form_key text;
  v_fresh boolean;
  v_reason text;
begin
  if new.evidence_type <> 'mini_check' then
    return new;
  end if;

  select attempt.exercise_id::text, attempt.exercise_version_id::text
  into v_current_exercise_id, v_current_version_id
  from public.exercise_builder_attempts attempt
  where attempt.id = new.exercise_attempt_id;

  if v_current_version_id is not null then
    v_current_form_key := 'exercise-version:' || v_current_version_id;
  end if;

  if new.session_id is not null then
    select coalesce(source_evidence.metadata ->> 'verify_exercise_version_id', source_attempt.exercise_version_id::text)
    into v_previous_version_id
    from public.recovery_plan_sessions session
    join public.recovery_mastery_evidence source_evidence
      on source_evidence.id::text = session.metadata ->> 'source_mastery_evidence_id'
     and source_evidence.evidence_type = 'mini_check'
    left join public.exercise_builder_attempts source_attempt
      on source_attempt.id = source_evidence.exercise_attempt_id
    where session.id = new.session_id
    limit 1;
  end if;

  if v_previous_version_id is null then
    select coalesce(previous_evidence.metadata ->> 'verify_exercise_version_id', previous_attempt.exercise_version_id::text)
    into v_previous_version_id
    from public.recovery_mastery_evidence previous_evidence
    left join public.exercise_builder_attempts previous_attempt
      on previous_attempt.id = previous_evidence.exercise_attempt_id
    where previous_evidence.enrollment_id = new.enrollment_id
      and previous_evidence.topic_key = new.topic_key
      and previous_evidence.evidence_type = 'mini_check'
    order by previous_evidence.observed_at desc, previous_evidence.created_at desc, previous_evidence.id desc
    limit 1;
  end if;

  if v_previous_version_id is not null then
    v_previous_form_key := 'exercise-version:' || v_previous_version_id;
  end if;

  if v_current_version_id is null then
    v_fresh := false;
    v_reason := 'verify_form_unknown';
  elsif v_previous_version_id is null then
    v_fresh := true;
    v_reason := 'first_verify_form';
  elsif v_current_version_id = v_previous_version_id then
    v_fresh := false;
    v_reason := 'same_exercise_version';
  else
    v_fresh := true;
    v_reason := 'different_exercise_version';
  end if;

  new.metadata := coalesce(new.metadata, '{}'::jsonb) || jsonb_build_object(
    'verify_exercise_id', v_current_exercise_id,
    'verify_exercise_version_id', v_current_version_id,
    'verify_form_key', v_current_form_key,
    'previous_verify_exercise_version_id', v_previous_version_id,
    'previous_verify_form_key', v_previous_form_key,
    'fresh_form', v_fresh,
    'freshness_reason', v_reason,
    'freshness_policy_version', 'recovery-topic-retake-v1'
  );

  return new;
end;
$$;

drop trigger if exists recovery_mastery_evidence_annotate_verify_freshness on public.recovery_mastery_evidence;
create trigger recovery_mastery_evidence_annotate_verify_freshness
before insert on public.recovery_mastery_evidence
for each row execute function public.annotate_recovery_mini_check_freshness();

notify pgrst, 'reload schema';
