-- Admin review workflow for Exercise Builder attempts.
-- Automatic grading is preserved separately whenever a teacher overrides a result.

alter table public.exercise_builder_attempt_questions
  add column if not exists automatic_grading_result jsonb,
  add column if not exists teacher_status_override text
    check (teacher_status_override is null or teacher_status_override in ('correct', 'nearly_correct', 'incorrect', 'unanswered')),
  add column if not exists teacher_points_override numeric,
  add column if not exists teacher_comment text,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.exercise_builder_attempts
  add column if not exists teacher_note text,
  add column if not exists review_status text not null default 'unreviewed'
    check (review_status in ('unreviewed', 'reviewed', 'approved')),
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

update public.exercise_builder_attempt_questions
set automatic_grading_result = grading_result
where automatic_grading_result is null
  and grading_result is not null;

create index if not exists exercise_builder_attempts_review_idx
  on public.exercise_builder_attempts(review_status, submitted_at desc)
  where status = 'submitted';

create or replace function public.protect_exercise_builder_teacher_review_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.is_admin() then
    if tg_table_name = 'exercise_builder_attempt_questions' then
      if new.automatic_grading_result is distinct from old.automatic_grading_result
        or new.teacher_status_override is distinct from old.teacher_status_override
        or new.teacher_points_override is distinct from old.teacher_points_override
        or new.teacher_comment is distinct from old.teacher_comment
        or new.reviewed_by is distinct from old.reviewed_by
        or new.reviewed_at is distinct from old.reviewed_at then
        raise exception 'Teacher review fields are admin-only.';
      end if;
    elsif tg_table_name = 'exercise_builder_attempts' then
      if new.teacher_note is distinct from old.teacher_note
        or new.review_status is distinct from old.review_status
        or new.reviewed_by is distinct from old.reviewed_by
        or new.reviewed_at is distinct from old.reviewed_at then
        raise exception 'Teacher review fields are admin-only.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists exercise_builder_attempt_questions_protect_teacher_review
  on public.exercise_builder_attempt_questions;
create trigger exercise_builder_attempt_questions_protect_teacher_review
before update on public.exercise_builder_attempt_questions
for each row execute function public.protect_exercise_builder_teacher_review_fields();

drop trigger if exists exercise_builder_attempts_protect_teacher_review
  on public.exercise_builder_attempts;
create trigger exercise_builder_attempts_protect_teacher_review
before update on public.exercise_builder_attempts
for each row execute function public.protect_exercise_builder_teacher_review_fields();

create or replace function public.refresh_exercise_builder_attempt_totals(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
  v_earned numeric := 0;
  v_max numeric := 0;
  v_score numeric := 0;
  v_correct integer := 0;
  v_nearly integer := 0;
  v_incorrect integer := 0;
  v_unanswered integer := 0;
  v_summary jsonb;
begin
  select * into v_attempt
  from public.exercise_builder_attempts
  where id = p_attempt_id
  for update;
  if v_attempt.id is null then raise exception 'Attempt not found.'; end if;

  select
    coalesce(sum(coalesce((question.grading_result ->> 'earned_points')::numeric, 0)), 0),
    coalesce(sum(coalesce((question.grading_result ->> 'max_points')::numeric, 0)), 0),
    count(*) filter (where question.grading_result ->> 'status' = 'correct'),
    count(*) filter (where question.grading_result ->> 'status' = 'nearly_correct'),
    count(*) filter (where question.grading_result ->> 'status' = 'incorrect'),
    count(*) filter (where coalesce(question.grading_result ->> 'status', 'unanswered') = 'unanswered')
    into v_earned, v_max, v_correct, v_nearly, v_incorrect, v_unanswered
  from public.exercise_builder_attempt_questions question
  where question.attempt_id = p_attempt_id;

  v_score := case when v_max > 0 then round((v_earned / v_max) * 100, 2) else 100 end;
  v_summary := coalesce(v_attempt.result_summary, '{}'::jsonb) || jsonb_build_object(
    'correct', v_correct,
    'nearly_correct', v_nearly,
    'incorrect', v_incorrect,
    'unanswered', v_unanswered,
    'teacher_reviewed', v_attempt.review_status <> 'unreviewed'
  );

  update public.exercise_builder_attempts
  set earned_points = v_earned,
      max_points = v_max,
      score = v_score,
      result_summary = v_summary
  where id = p_attempt_id;

  if v_attempt.status = 'submitted' then
    perform public.record_exercise_builder_attempt_diagnostics(p_attempt_id);
  end if;

  return jsonb_build_object(
    'earned_points', v_earned,
    'max_points', v_max,
    'score', v_score,
    'correct', v_correct,
    'nearly_correct', v_nearly,
    'incorrect', v_incorrect,
    'unanswered', v_unanswered
  );
end;
$$;

create or replace function public.admin_list_exercise_builder_attempts(p_limit integer default 200)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(item order by item.submitted_at desc nulls last, item.started_at desc), '[]'::jsonb)
  from (
    select
      attempt.id,
      attempt.learner_id,
      coalesce(nullif(profile.display_name, ''), 'Studente') learner_name,
      assignment.id assignment_id,
      assignment.title assignment_title,
      attempt.assignment_resource_id,
      attempt.exercise_id,
      attempt.exercise_version_id,
      attempt.exercise_snapshot ->> 'public_id' exercise_public_id,
      attempt.exercise_snapshot ->> 'title' exercise_title,
      attempt.attempt_number,
      attempt.status,
      attempt.review_status,
      attempt.score,
      attempt.earned_points,
      attempt.max_points,
      attempt.result_summary,
      attempt.teacher_note,
      attempt.started_at,
      attempt.submitted_at,
      attempt.reviewed_at,
      count(question.id) question_count,
      count(question.id) filter (where question.teacher_status_override is not null or question.teacher_points_override is not null) overridden_question_count
    from public.exercise_builder_attempts attempt
    join public.profiles profile on profile.id = attempt.learner_id
    left join public.assignments assignment on assignment.id = attempt.assignment_id
    left join public.exercise_builder_attempt_questions question on question.attempt_id = attempt.id
    where public.is_admin()
    group by attempt.id, profile.display_name, assignment.id, assignment.title
    order by attempt.submitted_at desc nulls last, attempt.started_at desc
    limit greatest(1, least(coalesce(p_limit, 200), 500))
  ) item;
$$;

create or replace function public.admin_get_exercise_builder_attempt_detail(p_attempt_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
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
$$;

create or replace function public.admin_save_exercise_builder_attempt_review(
  p_attempt_id uuid,
  p_reviews jsonb,
  p_teacher_note text default null,
  p_review_status text default 'reviewed'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
  v_review jsonb;
  v_question record;
  v_question_id uuid;
  v_clear boolean;
  v_status text;
  v_points numeric;
  v_max numeric;
  v_auto jsonb;
  v_effective jsonb;
  v_totals jsonb;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_review_status not in ('unreviewed', 'reviewed', 'approved') then
    raise exception 'Invalid review status.';
  end if;
  if p_reviews is null or jsonb_typeof(p_reviews) <> 'array' then
    raise exception 'Reviews must be an array.';
  end if;

  select * into v_attempt
  from public.exercise_builder_attempts
  where id = p_attempt_id
  for update;
  if v_attempt.id is null then raise exception 'Attempt not found.'; end if;
  if v_attempt.status <> 'submitted' then raise exception 'Only submitted attempts can be reviewed.'; end if;

  for v_review in select value from jsonb_array_elements(p_reviews)
  loop
    v_question_id := nullif(v_review ->> 'attempt_question_id', '')::uuid;
    v_clear := coalesce((v_review ->> 'clear_override')::boolean, false);

    select * into v_question
    from public.exercise_builder_attempt_questions
    where id = v_question_id and attempt_id = p_attempt_id
    for update;
    if v_question.id is null then raise exception 'Attempt question not found.'; end if;

    v_auto := coalesce(v_question.automatic_grading_result, v_question.grading_result, '{}'::jsonb);
    v_max := coalesce((v_auto ->> 'max_points')::numeric, 0);

    if v_clear then
      update public.exercise_builder_attempt_questions
      set grading_result = v_auto,
          automatic_grading_result = v_auto,
          teacher_status_override = null,
          teacher_points_override = null,
          teacher_comment = null,
          reviewed_by = auth.uid(),
          reviewed_at = now()
      where id = v_question_id;
    else
      v_status := nullif(v_review ->> 'status', '');
      v_points := nullif(v_review ->> 'earned_points', '')::numeric;
      if v_status is null then v_status := coalesce(v_auto ->> 'status', 'incorrect'); end if;
      if v_status not in ('correct', 'nearly_correct', 'incorrect', 'unanswered') then
        raise exception 'Invalid teacher result.';
      end if;
      if v_points is null then
        v_points := case
          when v_status = 'correct' then v_max
          when v_status = 'nearly_correct' then round(v_max * 0.5, 3)
          else 0
        end;
      end if;
      if v_points < 0 or v_points > v_max then
        raise exception 'Teacher points must be between 0 and %.', v_max;
      end if;

      v_effective := v_auto || jsonb_build_object(
        'status', v_status,
        'earned_points', v_points,
        'teacher_overridden', true
      );

      update public.exercise_builder_attempt_questions
      set automatic_grading_result = v_auto,
          grading_result = v_effective,
          teacher_status_override = v_status,
          teacher_points_override = v_points,
          teacher_comment = nullif(trim(v_review ->> 'comment'), ''),
          reviewed_by = auth.uid(),
          reviewed_at = now()
      where id = v_question_id;
    end if;
  end loop;

  update public.exercise_builder_attempts
  set teacher_note = nullif(trim(p_teacher_note), ''),
      review_status = p_review_status,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_attempt_id;

  v_totals := public.refresh_exercise_builder_attempt_totals(p_attempt_id);
  return public.admin_get_exercise_builder_attempt_detail(p_attempt_id) || jsonb_build_object('totals', v_totals);
end;
$$;

revoke all on function public.refresh_exercise_builder_attempt_totals(uuid) from public;
revoke all on function public.admin_list_exercise_builder_attempts(integer) from public;
revoke all on function public.admin_get_exercise_builder_attempt_detail(uuid) from public;
revoke all on function public.admin_save_exercise_builder_attempt_review(uuid, jsonb, text, text) from public;
grant execute on function public.admin_list_exercise_builder_attempts(integer) to authenticated;
grant execute on function public.admin_get_exercise_builder_attempt_detail(uuid) to authenticated;
grant execute on function public.admin_save_exercise_builder_attempt_review(uuid, jsonb, text, text) to authenticated;
