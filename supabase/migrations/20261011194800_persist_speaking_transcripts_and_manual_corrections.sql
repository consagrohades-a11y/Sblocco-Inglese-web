
-- Speaking transcripts are retained independently of short-lived recording files.
-- Existing 14-day audio Storage and metadata cleanup jobs remain unchanged.
alter table public.exercise_builder_attempt_questions
  add column if not exists speech_transcript text,
  add column if not exists speech_transcribed_at timestamptz;

-- The teacher can correct transcriber mistakes and save manually entered text.
-- Changing the underlying transcript clears the old text-offset annotations.
create or replace function public.admin_save_exercise_builder_speech_transcript(
  p_attempt_question_id uuid, p_transcript text
)
returns text
language plpgsql security definer
set search_path = 'public'
as $function$
declare
  v_type text;
  v_attempt_status text;
  v_previous text;
  v_next text;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_attempt_question_id is null then raise exception 'Attempt question is required.'; end if;
  v_next := nullif(btrim(coalesce(p_transcript, '')), '');
  if length(coalesce(v_next, '')) > 20000 then raise exception 'Transcript exceeds 20,000 characters.'; end if;
  select q.question_snapshot ->> 'type', a.status, q.speech_transcript
    into v_type, v_attempt_status, v_previous
  from public.exercise_builder_attempt_questions q
  join public.exercise_builder_attempts a on a.id = q.attempt_id
  where q.id = p_attempt_question_id
  for update of q;
  if not found then raise exception 'Attempt question not found.'; end if;
  if v_type <> 'audio_response' then raise exception 'Only speaking responses can have transcripts.'; end if;
  if v_attempt_status <> 'submitted' then raise exception 'Transcripts can be saved after submission.'; end if;
  if v_previous is distinct from v_next then
    update public.exercise_builder_attempt_questions
    set speech_transcript = v_next,
        speech_transcribed_at = case when v_next is null then null else now() end,
        teacher_correction = '{}'::jsonb
    where id = p_attempt_question_id;
  end if;
  return coalesce(v_next, '');
end;
$function$;
revoke all on function public.admin_save_exercise_builder_speech_transcript(uuid,text) from public, anon;
grant execute on function public.admin_save_exercise_builder_speech_transcript(uuid,text) to authenticated;

CREATE OR REPLACE FUNCTION public.admin_save_exercise_builder_written_corrections(p_attempt_id uuid, p_corrections jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_item jsonb;
  v_question_id uuid;
  v_correction jsonb;
  v_snapshot jsonb;
  v_speech_transcript text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if jsonb_typeof(coalesce(p_corrections, '[]'::jsonb)) <> 'array' then
    raise exception 'Corrections must be an array.';
  end if;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_corrections, '[]'::jsonb))
  loop
    v_question_id := nullif(v_item ->> 'attempt_question_id', '')::uuid;
    v_correction := coalesce(v_item -> 'correction', '{}'::jsonb);

    select question_snapshot, speech_transcript
      into v_snapshot, v_speech_transcript
    from public.exercise_builder_attempt_questions
    where id = v_question_id
      and attempt_id = p_attempt_id
    for update;

    if v_snapshot is null then
      raise exception 'Attempt question not found.';
    end if;

    if jsonb_typeof(v_correction) <> 'object' then
      raise exception 'Writing correction must be an object.';
    end if;

    if v_correction <> '{}'::jsonb
      and coalesce(v_snapshot ->> 'type', '') not in ('written_response', 'audio_response') then
      raise exception 'Visual corrections are supported only for writing and speaking responses.';
    end if;

    if v_correction <> '{}'::jsonb
      and v_snapshot ->> 'type' = 'audio_response'
      and nullif(btrim(coalesce(v_speech_transcript, '')), '') is null then
      raise exception 'Save a transcript before correcting a speaking response.';
    end if;

    if (v_correction ? 'corrected_text')
      and jsonb_typeof(v_correction -> 'corrected_text') <> 'string' then
      raise exception 'corrected_text must be a string.';
    end if;

    if (v_correction ? 'summary')
      and jsonb_typeof(v_correction -> 'summary') <> 'string' then
      raise exception 'summary must be a string.';
    end if;

    if (v_correction ? 'reasons')
      and jsonb_typeof(v_correction -> 'reasons') <> 'array' then
      raise exception 'reasons must be an array.';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(coalesce(v_correction -> 'reasons', '[]'::jsonb)) reason
      where jsonb_typeof(reason) <> 'object'
        or (reason ? 'original' and jsonb_typeof(reason -> 'original') <> 'string')
        or (reason ? 'corrected' and jsonb_typeof(reason -> 'corrected') <> 'string')
        or (reason ? 'reason' and jsonb_typeof(reason -> 'reason') <> 'string')
        or (reason ? 'category' and (
          jsonb_typeof(reason -> 'category') <> 'string'
          or reason ->> 'category' not in (
            'grammar', 'vocabulary', 'spelling', 'punctuation',
            'style', 'clarity', 'register', 'structure', 'other'
          )
        ))
    ) then
      raise exception 'Writing correction reasons are invalid.';
    end if;

    update public.exercise_builder_attempt_questions
    set teacher_correction = v_correction,
        reviewed_by = auth.uid(),
        reviewed_at = case when v_correction <> '{}'::jsonb then now() else reviewed_at end
    where id = v_question_id
      and attempt_id = p_attempt_id;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_exercise_builder_attempt_detail(p_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'attempt', jsonb_build_object(
      'id', attempt.id,
      'learner_id', attempt.learner_id,
      'learner_name', coalesce(nullif(profile.display_name, ''), 'Studente'),
      'assignment_id', attempt.assignment_id,
      'assignment_title', assignment.title,
      'assignment_resource_id', attempt.assignment_resource_id,
      'exercise_id', attempt.exercise_id,
      'exercise_version_id', attempt.exercise_version_id,
      'attempt_number', attempt.attempt_number,
      'status', attempt.status,
      'review_status', attempt.review_status,
      'learner_confidence', attempt.learner_confidence,
      'score', attempt.score,
      'earned_points', attempt.earned_points,
      'max_points', attempt.max_points,
      'result_summary', attempt.result_summary,
      'teacher_note', attempt.teacher_note,
      'started_at', attempt.started_at,
      'submitted_at', attempt.submitted_at,
      'reviewed_at', attempt.reviewed_at
    ),
    'exercise', attempt.exercise_snapshot,
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', section.id,
        'sequence_index', section.sequence_index,
        'title', section.title,
        'instructions', section.instructions,
        'feedback_timing', section.feedback_timing,
        'status', section.status,
        'earned_points', section.earned_points,
        'max_points', section.max_points,
        'questions', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', question.id,
            'sequence_index', question.sequence_index,
            'question_id', question.question_id,
            'question_version_id', question.question_version_id,
            'question', question.question_snapshot,
            'answer', question.answer,
            'result', question.grading_result,
            'automatic_result', coalesce(question.automatic_grading_result, question.grading_result),
            'teacher_status_override', question.teacher_status_override,
            'teacher_points_override', question.teacher_points_override,
            'teacher_comment', question.teacher_comment,
            'teacher_correction', question.teacher_correction,
            'speech_transcript', question.speech_transcript,
            'latest_revision', (
              select jsonb_build_object(
                'id', revision.id,
                'revision_text', revision.revision_text,
                'created_at', revision.created_at
              )
              from public.exercise_builder_writing_revisions revision
              where revision.attempt_question_id = question.id
              order by revision.created_at desc
              limit 1
            ),
            'reviewed_at', question.reviewed_at
          ) order by question.sequence_index)
          from public.exercise_builder_attempt_questions question
          where question.attempt_section_id = section.id
        ), '[]'::jsonb)
      ) order by section.sequence_index)
      from public.exercise_builder_attempt_sections section
      where section.attempt_id = attempt.id
    ), '[]'::jsonb)
  )
  from public.exercise_builder_attempts attempt
  join public.profiles profile on profile.id = attempt.learner_id
  left join public.assignments assignment on assignment.id = attempt.assignment_id
  where attempt.id = p_attempt_id
    and public.is_admin();
$function$;

CREATE OR REPLACE FUNCTION public.exercise_builder_attempt_payload(p_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'attempt', jsonb_build_object(
      'id', a.id, 'status', a.status, 'attempt_number', a.attempt_number,
      'current_section_index', a.current_section_index, 'current_question_index', a.current_question_index,
      'learner_confidence', a.learner_confidence,
      'earned_points', case when a.review_status = 'reviewed' then null else a.earned_points end,
      'max_points', a.max_points,
      'score', case when a.review_status = 'reviewed' then null else a.score end,
      'result_summary', case when a.review_status = 'reviewed' then jsonb_build_object('pending_review', 0, 'review_required', true) else a.result_summary end,
      'review_status', a.review_status,
      'teacher_note', case when a.review_status = 'approved' then a.teacher_note else null end,
      'reviewed_at', case when a.review_status = 'approved' then a.reviewed_at else null end,
      'started_at', a.started_at, 'submitted_at', a.submitted_at,
      'completion', (
        select jsonb_build_object(
          'rule', coalesce(r.exercise_config ->> 'completion_rule', 'passed'),
          'required_score', case
            when coalesce(r.exercise_config ->> 'completion_rule', 'passed') = 'passed'
            then greatest(0, least(100, coalesce((r.exercise_config ->> 'required_score')::numeric, 70)))
            else null end,
          'required_attempts', case
            when coalesce(r.exercise_config ->> 'completion_rule', 'passed') = 'attempts'
            then greatest(1, coalesce((r.exercise_config ->> 'required_attempts')::integer, 1))
            else null end
        )
        from public.assignment_resources r
        where r.id = a.assignment_resource_id
      )
    ),
    'exercise', a.exercise_snapshot,
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'sequence_index', s.sequence_index, 'title', s.title,
        'instructions', s.instructions, 'feedback_timing', s.feedback_timing,
        'settings', s.settings, 'status', s.status,
        'earned_points', case when a.review_status = 'reviewed' then null else s.earned_points end,
        'max_points', s.max_points,
        'questions', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', q.id, 'sequence_index', q.sequence_index,
            'question', public.exercise_builder_safe_question_snapshot(q.question_snapshot),
            'answer', q.answer,
            'teacher_comment', case when a.review_status = 'approved' then q.teacher_comment else null end,
            'teacher_turn_reviews', case when a.review_status = 'approved' then q.teacher_turn_reviews else '{}'::jsonb end,
            'teacher_correction', case when a.review_status = 'approved' then q.teacher_correction else '{}'::jsonb end,
            'speech_transcript', case when a.review_status = 'approved' then q.speech_transcript else null end,
            'latest_revision', case when a.review_status = 'approved' then (
              select jsonb_build_object(
                'id', revision.id,
                'revision_text', revision.revision_text,
                'created_at', revision.created_at
              )
              from public.exercise_builder_writing_revisions revision
              where revision.attempt_question_id = q.id
                and revision.learner_id = a.learner_id
              order by revision.created_at desc
              limit 1
            ) else null end,
            'result', case
              when a.status = 'submitted' then public.exercise_builder_learner_grading_result(q.question_snapshot, case when a.review_status = 'approved' then q.grading_result else coalesce(q.automatic_grading_result, q.grading_result) end)
              when s.feedback_timing = 'question_end' and q.grading_result is not null then public.exercise_builder_learner_grading_result(q.question_snapshot, coalesce(q.automatic_grading_result, q.grading_result))
              when s.status = 'completed' and s.feedback_timing = 'section_end' then public.exercise_builder_learner_grading_result(q.question_snapshot, case when a.review_status = 'approved' then q.grading_result else coalesce(q.automatic_grading_result, q.grading_result) end)
              else null end
          ) order by q.sequence_index)
          from public.exercise_builder_attempt_questions q where q.attempt_section_id = s.id
        ), '[]'::jsonb)
      ) order by s.sequence_index)
      from public.exercise_builder_attempt_sections s where s.attempt_id = a.id
    ), '[]'::jsonb)
  )
  from public.exercise_builder_attempts a
  where a.id = p_attempt_id and (a.learner_id = auth.uid() or public.is_admin());
$function$;
