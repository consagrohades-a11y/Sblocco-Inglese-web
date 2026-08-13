-- Recovery Curriculum v2 assessment-fragment registration and question-level evidence capture.
-- This extends the additive v2 runtime foundation. It does not change cumulative
-- materialization or learner-facing Readiness v2 yet.

alter table public.recovery_assessment_fragments
  add column if not exists unseen_or_mixed_context boolean not null default true;

create table public.recovery_assessment_fragment_questions (
  fragment_id text not null references public.recovery_assessment_fragments(fragment_id) on delete cascade,
  question_version_id uuid not null references public.exercise_builder_question_versions(id) on delete restrict,
  outcome_id text not null references public.recovery_curriculum_outcomes(outcome_id) on delete restrict,
  assessment_mode text not null references public.recovery_assessment_modes(mode_key) on delete restrict,
  evidence_role text not null default 'primary' check (evidence_role in ('primary', 'supporting')),
  production_evidence boolean not null default false,
  evidence_weight numeric(5,2) not null default 1 check (evidence_weight > 0 and evidence_weight <= 1),
  created_at timestamptz not null default now(),
  primary key (fragment_id, question_version_id, outcome_id, assessment_mode)
);

create index recovery_assessment_fragment_questions_question_idx
  on public.recovery_assessment_fragment_questions(question_version_id, fragment_id);
create index recovery_assessment_fragment_questions_outcome_idx
  on public.recovery_assessment_fragment_questions(outcome_id, fragment_id);

alter table public.recovery_assessment_fragment_questions enable row level security;
create policy recovery_assessment_fragment_questions_authenticated_read
on public.recovery_assessment_fragment_questions for select to authenticated
using (true);

revoke all privileges on table public.recovery_assessment_fragment_questions from anon, authenticated;
grant select on table public.recovery_assessment_fragment_questions to authenticated;

create or replace function public.recovery_question_version_belongs_to_exercise_version(
  p_exercise_version_id uuid,
  p_question_version_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    exists (
      select 1
      from public.exercise_builder_sections section
      join public.exercise_builder_section_fixed_questions fixed
        on fixed.section_id = section.id
      where section.exercise_version_id = p_exercise_version_id
        and fixed.question_version_id = p_question_version_id
    )
    or exists (
      select 1
      from public.exercise_builder_sections section
      join public.exercise_builder_section_pool_rules rule
        on rule.section_id = section.id
      join public.exercise_builder_pool_questions pooled
        on pooled.pool_version_id = rule.pool_version_id
      where section.exercise_version_id = p_exercise_version_id
        and pooled.question_version_id = p_question_version_id
    );
$$;

revoke all on function public.recovery_question_version_belongs_to_exercise_version(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.admin_register_recovery_assessment_fragment(
  p_fragment jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_fragment_id text := nullif(trim(p_fragment ->> 'fragment_id'), '');
  v_status text := coalesce(nullif(trim(p_fragment ->> 'status'), ''), 'draft');
  v_exercise_id uuid := nullif(p_fragment ->> 'exercise_id', '')::uuid;
  v_exercise_version_id uuid := nullif(p_fragment ->> 'exercise_version_id', '')::uuid;
  v_year_profiles smallint[];
  v_primary_axis text := nullif(trim(p_fragment ->> 'primary_axis'), '');
  v_secondary_axes text[];
  v_estimated_minutes integer := nullif(p_fragment ->> 'estimated_minutes', '')::integer;
  v_difficulty_band text := nullif(trim(p_fragment ->> 'difficulty_band'), '');
  v_school_task_family text := nullif(trim(p_fragment ->> 'school_task_family'), '');
  v_transfer_level text := nullif(trim(p_fragment ->> 'transfer_level'), '');
  v_content_source_policy text := nullif(trim(p_fragment ->> 'content_source_policy'), '');
  v_unseen_or_mixed boolean := coalesce((p_fragment ->> 'unseen_or_mixed_context')::boolean, false);
  v_form_family_key text := nullif(trim(p_fragment ->> 'form_family_key'), '');
  v_metadata jsonb := coalesce(p_fragment -> 'metadata', '{}'::jsonb);
  v_outcome_ids text[];
  v_assessment_modes text[];
  v_question_mappings jsonb := coalesce(p_fragment -> 'question_mappings', '[]'::jsonb);
  v_exercise_status text;
  v_version_status text;
  v_mapping jsonb;
  v_question_version_id uuid;
  v_outcome_id text;
  v_assessment_mode text;
  v_evidence_role text;
  v_production_evidence boolean;
  v_evidence_weight numeric;
  v_outcome_axis text;
  v_question_status text;
  v_mapping_count integer := 0;
  v_primary_outcome_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  if p_fragment is null or jsonb_typeof(p_fragment) <> 'object' then
    raise exception 'Assessment fragment payload must be a JSON object';
  end if;
  if v_fragment_id is null or v_fragment_id !~ '^RAF-[A-Z0-9_-]{4,80}$' then
    raise exception 'Invalid fragment_id';
  end if;
  if v_status not in ('draft', 'approved', 'deprecated') then
    raise exception 'Invalid fragment status';
  end if;
  if v_exercise_id is null or v_exercise_version_id is null then
    raise exception 'exercise_id and exercise_version_id are required';
  end if;

  select exercise.status, version.review_status
    into v_exercise_status, v_version_status
  from public.exercise_builder_exercises exercise
  join public.exercise_builder_exercise_versions version
    on version.id = v_exercise_version_id
    and version.exercise_id = exercise.id
  where exercise.id = v_exercise_id;

  if v_exercise_status is null then
    raise exception 'Exercise/version pair not found';
  end if;
  if v_status = 'approved' and (v_exercise_status <> 'published' or v_version_status <> 'approved') then
    raise exception 'Approved Recovery fragments require a published exercise with an approved version';
  end if;

  if jsonb_typeof(coalesce(p_fragment -> 'year_profiles', 'null'::jsonb)) <> 'array' then
    raise exception 'year_profiles must be an array';
  end if;
  select array_agg(distinct value::smallint order by value::smallint)
    into v_year_profiles
  from jsonb_array_elements_text(p_fragment -> 'year_profiles');
  if coalesce(cardinality(v_year_profiles), 0) = 0
     or cardinality(v_year_profiles) > 3
     or exists (select 1 from unnest(v_year_profiles) year where year not between 1 and 3) then
    raise exception 'year_profiles must contain one or more values from 1 to 3';
  end if;

  if not exists (
    select 1 from public.recovery_curriculum_axes axis
    where axis.axis_key = v_primary_axis and axis.active
  ) then
    raise exception 'Unknown or inactive primary_axis: %', v_primary_axis;
  end if;

  select coalesce(array_agg(distinct value order by value), '{}'::text[])
    into v_secondary_axes
  from jsonb_array_elements_text(coalesce(p_fragment -> 'secondary_axes', '[]'::jsonb));
  if v_primary_axis = any(v_secondary_axes) then
    raise exception 'primary_axis cannot also be a secondary axis';
  end if;
  if exists (
    select 1 from unnest(v_secondary_axes) secondary
    where not exists (
      select 1 from public.recovery_curriculum_axes axis
      where axis.axis_key = secondary and axis.active
    )
  ) then
    raise exception 'secondary_axes contains an unknown or inactive axis';
  end if;

  if v_estimated_minutes is null or v_estimated_minutes not between 1 and 60 then
    raise exception 'estimated_minutes must be between 1 and 60';
  end if;
  if v_difficulty_band is null or v_school_task_family is null or v_content_source_policy is null then
    raise exception 'difficulty_band, school_task_family and content_source_policy are required';
  end if;
  if v_transfer_level not in ('controlled_performance', 'transfer') then
    raise exception 'Invalid transfer_level';
  end if;
  if v_form_family_key is null or v_form_family_key !~ '^[a-z0-9][a-z0-9_-]{3,119}$' then
    raise exception 'Invalid form_family_key';
  end if;
  if jsonb_typeof(v_metadata) <> 'object' then
    raise exception 'metadata must be an object';
  end if;

  if jsonb_typeof(coalesce(p_fragment -> 'outcome_ids', 'null'::jsonb)) <> 'array' then
    raise exception 'outcome_ids must be an array';
  end if;
  select array_agg(distinct value order by value)
    into v_outcome_ids
  from jsonb_array_elements_text(p_fragment -> 'outcome_ids');
  if coalesce(cardinality(v_outcome_ids), 0) = 0 then
    raise exception 'At least one outcome_id is required';
  end if;
  if exists (
    select 1 from unnest(v_outcome_ids) outcome_id
    where not exists (
      select 1 from public.recovery_curriculum_outcomes outcome
      where outcome.outcome_id = outcome_id
        and outcome.status = 'approved'
    )
  ) then
    raise exception 'outcome_ids contains an unknown or unapproved outcome';
  end if;
  if exists (
    select 1
    from public.recovery_curriculum_outcomes outcome
    where outcome.outcome_id = any(v_outcome_ids)
      and outcome.competence_axis <> v_primary_axis
      and not outcome.competence_axis = any(v_secondary_axes)
  ) then
    raise exception 'Every outcome axis must be the fragment primary_axis or one of its secondary_axes';
  end if;
  select count(*) into v_primary_outcome_count
  from public.recovery_curriculum_outcomes outcome
  where outcome.outcome_id = any(v_outcome_ids)
    and outcome.competence_axis = v_primary_axis;
  if v_primary_outcome_count = 0 then
    raise exception 'At least one declared outcome must belong to primary_axis';
  end if;

  if jsonb_typeof(coalesce(p_fragment -> 'assessment_modes', 'null'::jsonb)) <> 'array' then
    raise exception 'assessment_modes must be an array';
  end if;
  select array_agg(distinct value order by value)
    into v_assessment_modes
  from jsonb_array_elements_text(p_fragment -> 'assessment_modes');
  if coalesce(cardinality(v_assessment_modes), 0) = 0 then
    raise exception 'At least one assessment_mode is required';
  end if;
  if exists (
    select 1 from unnest(v_assessment_modes) mode
    where not exists (
      select 1 from public.recovery_assessment_modes assessment
      where assessment.mode_key = mode and assessment.active
    )
  ) then
    raise exception 'assessment_modes contains an unknown or inactive mode';
  end if;

  if jsonb_typeof(v_question_mappings) <> 'array' or jsonb_array_length(v_question_mappings) = 0 then
    raise exception 'question_mappings must be a non-empty array';
  end if;

  -- Validate all question mappings before mutating the fragment.
  for v_mapping in select value from jsonb_array_elements(v_question_mappings)
  loop
    if jsonb_typeof(v_mapping) <> 'object' then
      raise exception 'Each question mapping must be an object';
    end if;
    v_question_version_id := nullif(v_mapping ->> 'question_version_id', '')::uuid;
    v_outcome_id := nullif(trim(v_mapping ->> 'outcome_id'), '');
    v_assessment_mode := nullif(trim(v_mapping ->> 'assessment_mode'), '');
    v_evidence_role := coalesce(nullif(trim(v_mapping ->> 'evidence_role'), ''), 'primary');
    v_production_evidence := coalesce((v_mapping ->> 'production_evidence')::boolean, false);
    v_evidence_weight := coalesce((v_mapping ->> 'evidence_weight')::numeric, 1);

    if v_question_version_id is null
       or not public.recovery_question_version_belongs_to_exercise_version(v_exercise_version_id, v_question_version_id) then
      raise exception 'Mapped question version does not belong to the fragment exercise version: %', v_question_version_id;
    end if;
    select review_status into v_question_status
    from public.exercise_builder_question_versions
    where id = v_question_version_id;
    if v_question_status is null then
      raise exception 'Question version not found: %', v_question_version_id;
    end if;
    if v_status = 'approved' and v_question_status <> 'approved' then
      raise exception 'Approved fragments require approved mapped question versions';
    end if;
    if v_outcome_id is null or not v_outcome_id = any(v_outcome_ids) then
      raise exception 'Question mapping outcome_id must be declared in outcome_ids';
    end if;
    if v_assessment_mode is null or not v_assessment_mode = any(v_assessment_modes) then
      raise exception 'Question mapping assessment_mode must be declared in assessment_modes';
    end if;
    if v_evidence_role not in ('primary', 'supporting') then
      raise exception 'Invalid question mapping evidence_role';
    end if;
    if v_evidence_weight <= 0 or v_evidence_weight > 1 then
      raise exception 'Question mapping evidence_weight must be > 0 and <= 1';
    end if;
    select competence_axis into v_outcome_axis
    from public.recovery_curriculum_outcomes
    where outcome_id = v_outcome_id;
    if v_evidence_role = 'primary' and v_outcome_axis <> v_primary_axis then
      raise exception 'Primary question evidence must target an outcome on fragment primary_axis';
    end if;
    v_mapping_count := v_mapping_count + 1;
  end loop;

  -- Every declared outcome and mode must be represented by at least one mapped question.
  if exists (
    select 1 from unnest(v_outcome_ids) declared_outcome
    where not exists (
      select 1 from jsonb_array_elements(v_question_mappings) mapping
      where mapping ->> 'outcome_id' = declared_outcome
    )
  ) then
    raise exception 'Every declared outcome_id must have at least one question mapping';
  end if;
  if exists (
    select 1 from unnest(v_assessment_modes) declared_mode
    where not exists (
      select 1 from jsonb_array_elements(v_question_mappings) mapping
      where mapping ->> 'assessment_mode' = declared_mode
    )
  ) then
    raise exception 'Every declared assessment_mode must have at least one question mapping';
  end if;

  insert into public.recovery_assessment_fragments (
    fragment_id, status, exercise_id, exercise_version_id, year_profiles,
    primary_axis, secondary_axes, estimated_minutes, difficulty_band,
    school_task_family, transfer_level, content_source_policy,
    unseen_or_mixed_context, form_family_key, active, metadata
  ) values (
    v_fragment_id, v_status, v_exercise_id, v_exercise_version_id, v_year_profiles,
    v_primary_axis, v_secondary_axes, v_estimated_minutes, v_difficulty_band,
    v_school_task_family, v_transfer_level, v_content_source_policy,
    v_unseen_or_mixed, v_form_family_key, v_status <> 'deprecated', v_metadata
  )
  on conflict (fragment_id) do update set
    status = excluded.status,
    exercise_id = excluded.exercise_id,
    exercise_version_id = excluded.exercise_version_id,
    year_profiles = excluded.year_profiles,
    primary_axis = excluded.primary_axis,
    secondary_axes = excluded.secondary_axes,
    estimated_minutes = excluded.estimated_minutes,
    difficulty_band = excluded.difficulty_band,
    school_task_family = excluded.school_task_family,
    transfer_level = excluded.transfer_level,
    content_source_policy = excluded.content_source_policy,
    unseen_or_mixed_context = excluded.unseen_or_mixed_context,
    form_family_key = excluded.form_family_key,
    active = excluded.active,
    metadata = excluded.metadata,
    updated_at = now();

  delete from public.recovery_assessment_fragment_questions where fragment_id = v_fragment_id;
  delete from public.recovery_assessment_fragment_modes where fragment_id = v_fragment_id;
  delete from public.recovery_assessment_fragment_outcomes where fragment_id = v_fragment_id;

  insert into public.recovery_assessment_fragment_modes(fragment_id, assessment_mode)
  select v_fragment_id, mode from unnest(v_assessment_modes) mode;

  insert into public.recovery_assessment_fragment_outcomes(fragment_id, outcome_id, evidence_role)
  select
    v_fragment_id,
    outcome.outcome_id,
    case when outcome.competence_axis = v_primary_axis then 'primary' else 'supporting' end
  from public.recovery_curriculum_outcomes outcome
  where outcome.outcome_id = any(v_outcome_ids);

  for v_mapping in select value from jsonb_array_elements(v_question_mappings)
  loop
    v_question_version_id := (v_mapping ->> 'question_version_id')::uuid;
    v_outcome_id := v_mapping ->> 'outcome_id';
    v_assessment_mode := v_mapping ->> 'assessment_mode';
    select competence_axis into v_outcome_axis
    from public.recovery_curriculum_outcomes
    where outcome_id = v_outcome_id;
    v_evidence_role := coalesce(
      nullif(trim(v_mapping ->> 'evidence_role'), ''),
      case when v_outcome_axis = v_primary_axis then 'primary' else 'supporting' end
    );
    v_production_evidence := coalesce((v_mapping ->> 'production_evidence')::boolean, false);
    v_evidence_weight := coalesce((v_mapping ->> 'evidence_weight')::numeric, 1);

    insert into public.recovery_assessment_fragment_questions(
      fragment_id, question_version_id, outcome_id, assessment_mode,
      evidence_role, production_evidence, evidence_weight
    ) values (
      v_fragment_id, v_question_version_id, v_outcome_id, v_assessment_mode,
      v_evidence_role, v_production_evidence, v_evidence_weight
    );
  end loop;

  return jsonb_build_object(
    'registered', true,
    'fragment_id', v_fragment_id,
    'status', v_status,
    'exercise_version_id', v_exercise_version_id,
    'outcome_count', cardinality(v_outcome_ids),
    'assessment_mode_count', cardinality(v_assessment_modes),
    'question_mapping_count', v_mapping_count,
    'readiness_v2_active', false
  );
end;
$$;

revoke all on function public.admin_register_recovery_assessment_fragment(jsonb) from public, anon;
grant execute on function public.admin_register_recovery_assessment_fragment(jsonb) to authenticated;

create or replace function public.sync_recovery_outcome_evidence_for_attempt_internal(
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt public.exercise_builder_attempts%rowtype;
  v_session public.recovery_plan_sessions%rowtype;
  v_fragment public.recovery_assessment_fragments%rowtype;
  v_evidence_source text;
  v_question record;
  v_score numeric;
  v_evidence_status text;
  v_evidence_key text;
  v_synced integer := 0;
  v_pending integer := 0;
  v_valid integer := 0;
begin
  select * into v_attempt
  from public.exercise_builder_attempts
  where id = p_attempt_id;

  if v_attempt.id is null or v_attempt.status <> 'submitted' then
    return jsonb_build_object('synced', false, 'reason', 'attempt_not_submitted');
  end if;

  select * into v_fragment
  from public.recovery_assessment_fragments fragment
  where fragment.exercise_version_id = v_attempt.exercise_version_id
    and fragment.status = 'approved'
    and fragment.active
  limit 1;

  if v_fragment.fragment_id is null then
    return jsonb_build_object('synced', false, 'reason', 'not_recovery_fragment');
  end if;

  select session.* into v_session
  from public.recovery_plan_sessions session
  where session.assignment_id = v_attempt.assignment_id
  order by session.created_at desc
  limit 1;

  if v_session.id is null then
    return jsonb_build_object('synced', false, 'reason', 'not_recovery_session');
  end if;

  v_evidence_source := case v_session.session_type
    when 'checkpoint' then 'checkpoint'
    when 'mock_intermediate' then 'mock_intermediate'
    when 'mock_final' then 'mock_final'
    else null
  end;

  if v_evidence_source is null then
    return jsonb_build_object('synced', false, 'reason', 'session_not_cumulative');
  end if;

  for v_question in
    select
      attempt_question.id as attempt_question_id,
      attempt_question.question_version_id,
      attempt_question.grading_result,
      attempt_question.teacher_comment,
      attempt_question.teacher_turn_reviews,
      attempt_question.reviewed_at,
      attempt_question.answered_at,
      mapping.outcome_id,
      mapping.assessment_mode,
      mapping.evidence_role,
      mapping.production_evidence,
      mapping.evidence_weight,
      outcome.competence_axis
    from public.exercise_builder_attempt_questions attempt_question
    join public.recovery_assessment_fragment_questions mapping
      on mapping.fragment_id = v_fragment.fragment_id
      and mapping.question_version_id = attempt_question.question_version_id
    join public.recovery_curriculum_outcomes outcome
      on outcome.outcome_id = mapping.outcome_id
      and outcome.status = 'approved'
    join public.recovery_enrollment_outcomes scoped
      on scoped.enrollment_id = v_session.enrollment_id
      and scoped.outcome_id = mapping.outcome_id
      and scoped.required
    where attempt_question.attempt_id = p_attempt_id
  loop
    if v_question.grading_result is null
       or coalesce(v_question.grading_result ->> 'status', 'pending_review') = 'pending_review'
       or coalesce((v_question.grading_result ->> 'max_points')::numeric, 0) <= 0 then
      v_evidence_status := 'pending_review';
      v_score := null;
      v_pending := v_pending + 1;
    else
      v_evidence_status := 'valid';
      v_score := round(
        100 * coalesce((v_question.grading_result ->> 'earned_points')::numeric, 0)
        / nullif((v_question.grading_result ->> 'max_points')::numeric, 0),
        2
      );
      v_score := greatest(0, least(100, coalesce(v_score, 0)));
      v_valid := v_valid + 1;
    end if;

    v_evidence_key := left(
      'recovery-v2:' || v_question.attempt_question_id::text || ':'
      || v_question.outcome_id || ':' || v_question.assessment_mode,
      240
    );

    insert into public.recovery_outcome_evidence (
      enrollment_id, outcome_id, session_id, exercise_attempt_id,
      attempt_question_id, fragment_id, evidence_source, primary_axis,
      assessment_mode, performance_level, evidence_status, score,
      rubric_dimensions, form_family_key, unseen_or_mixed_context,
      production_evidence, evidence_key, metadata, observed_at
    ) values (
      v_session.enrollment_id,
      v_question.outcome_id,
      v_session.id,
      p_attempt_id,
      v_question.attempt_question_id,
      v_fragment.fragment_id,
      v_evidence_source,
      v_question.competence_axis,
      v_question.assessment_mode,
      v_fragment.transfer_level,
      v_evidence_status,
      v_score,
      jsonb_strip_nulls(jsonb_build_object(
        'question_status', v_question.grading_result ->> 'status',
        'earned_points', v_question.grading_result -> 'earned_points',
        'max_points', v_question.grading_result -> 'max_points',
        'teacher_comment', v_question.teacher_comment,
        'teacher_turn_reviews', v_question.teacher_turn_reviews,
        'evidence_role', v_question.evidence_role,
        'evidence_weight', v_question.evidence_weight,
        'fragment_primary_axis', v_fragment.primary_axis
      )),
      v_fragment.form_family_key,
      v_fragment.unseen_or_mixed_context,
      v_question.production_evidence,
      v_evidence_key,
      jsonb_build_object(
        'exercise_version_id', v_fragment.exercise_version_id,
        'question_version_id', v_question.question_version_id,
        'school_task_family', v_fragment.school_task_family,
        'content_source_policy', v_fragment.content_source_policy
      ),
      coalesce(v_question.reviewed_at, v_attempt.submitted_at, v_question.answered_at, now())
    )
    on conflict (evidence_key) do update set
      evidence_status = excluded.evidence_status,
      score = excluded.score,
      rubric_dimensions = excluded.rubric_dimensions,
      unseen_or_mixed_context = excluded.unseen_or_mixed_context,
      production_evidence = excluded.production_evidence,
      metadata = excluded.metadata,
      observed_at = excluded.observed_at;

    v_synced := v_synced + 1;
  end loop;

  return jsonb_build_object(
    'synced', true,
    'attempt_id', p_attempt_id,
    'fragment_id', v_fragment.fragment_id,
    'session_id', v_session.id,
    'evidence_source', v_evidence_source,
    'evidence_rows', v_synced,
    'valid_rows', v_valid,
    'pending_review_rows', v_pending,
    'readiness_v2_active', false
  );
end;
$$;

revoke all on function public.sync_recovery_outcome_evidence_for_attempt_internal(uuid)
  from public, anon, authenticated;

create or replace function public.sync_recovery_outcome_evidence_attempt_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'submitted' then
    perform public.sync_recovery_outcome_evidence_for_attempt_internal(new.id);
  end if;
  return new;
end;
$$;

revoke all on function public.sync_recovery_outcome_evidence_attempt_trigger()
  from public, anon, authenticated;

drop trigger if exists exercise_builder_attempts_recovery_outcome_evidence_insert
  on public.exercise_builder_attempts;
create trigger exercise_builder_attempts_recovery_outcome_evidence_insert
after insert on public.exercise_builder_attempts
for each row execute function public.sync_recovery_outcome_evidence_attempt_trigger();

drop trigger if exists exercise_builder_attempts_recovery_outcome_evidence_submit
  on public.exercise_builder_attempts;
create trigger exercise_builder_attempts_recovery_outcome_evidence_submit
after update of status on public.exercise_builder_attempts
for each row
when (new.status = 'submitted')
execute function public.sync_recovery_outcome_evidence_attempt_trigger();

create or replace function public.sync_recovery_outcome_evidence_question_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.sync_recovery_outcome_evidence_for_attempt_internal(new.attempt_id);
  return new;
end;
$$;

revoke all on function public.sync_recovery_outcome_evidence_question_trigger()
  from public, anon, authenticated;

drop trigger if exists exercise_builder_attempt_questions_recovery_outcome_evidence
  on public.exercise_builder_attempt_questions;
create trigger exercise_builder_attempt_questions_recovery_outcome_evidence
after update of grading_result, reviewed_at, teacher_points_override, teacher_status_override
on public.exercise_builder_attempt_questions
for each row
when (
  new.grading_result is distinct from old.grading_result
  or new.reviewed_at is distinct from old.reviewed_at
  or new.teacher_points_override is distinct from old.teacher_points_override
  or new.teacher_status_override is distinct from old.teacher_status_override
)
execute function public.sync_recovery_outcome_evidence_question_trigger();

notify pgrst, 'reload schema';
