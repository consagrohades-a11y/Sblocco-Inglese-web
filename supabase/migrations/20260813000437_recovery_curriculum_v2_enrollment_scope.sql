-- Recovery Curriculum v2 enrollment scope.
-- The official school recovery programme is authoritative. In the absence of
-- explicit programme overrides, only approved default_core outcomes for the
-- enrollment's school-year profile are inferred automatically.
-- This migration does not activate Readiness v2.

create or replace function public.sync_recovery_inferred_outcome_scope_internal(
  p_enrollment_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_class_year smallint;
  v_inserted integer := 0;
begin
  select class_year
    into v_class_year
  from public.recovery_enrollments
  where id = p_enrollment_id;

  if v_class_year is null then
    raise exception 'Recovery enrollment not found or class_year unavailable';
  end if;

  -- Refresh only inferred rows. Explicit school/manual rows are never deleted.
  delete from public.recovery_enrollment_outcomes
  where enrollment_id = p_enrollment_id
    and requirement_source = 'inferred_year_profile';

  insert into public.recovery_enrollment_outcomes (
    enrollment_id,
    outcome_id,
    required,
    requirement_source,
    requirement_note,
    metadata,
    created_by
  )
  select
    p_enrollment_id,
    outcome.outcome_id,
    true,
    'inferred_year_profile',
    format('Profilo Recovery v2 predefinito · %sª superiore', v_class_year),
    jsonb_build_object(
      'curriculum_id', outcome.curriculum_id,
      'school_year_profile', v_class_year,
      'inferred', true
    ),
    null
  from public.recovery_curriculum_outcomes outcome
  where outcome.curriculum_id = 'recovery-years-1-3-v2'
    and outcome.status = 'approved'
    and outcome.school_year_profile = v_class_year
    and outcome.programme_requirement = 'default_core'
  on conflict (enrollment_id, outcome_id) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke all on function public.sync_recovery_inferred_outcome_scope_internal(uuid) from public, anon, authenticated;

create or replace function public.refresh_recovery_enrollment_outcome_scope(
  p_enrollment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_class_year smallint;
  v_inserted integer;
  v_required integer;
  v_explicit integer;
  v_inferred integer;
begin
  select user_id, class_year
    into v_user_id, v_class_year
  from public.recovery_enrollments
  where id = p_enrollment_id;

  if v_user_id is null then
    raise exception 'Recovery enrollment not found';
  end if;

  if not public.is_admin() and v_user_id <> (select auth.uid()) then
    raise exception 'Not allowed to refresh this Recovery curriculum scope';
  end if;

  v_inserted := public.sync_recovery_inferred_outcome_scope_internal(p_enrollment_id);

  select
    count(*) filter (where required),
    count(*) filter (where requirement_source in ('school_programme', 'manual_override')),
    count(*) filter (where requirement_source = 'inferred_year_profile')
    into v_required, v_explicit, v_inferred
  from public.recovery_enrollment_outcomes
  where enrollment_id = p_enrollment_id;

  return jsonb_build_object(
    'enrollment_id', p_enrollment_id,
    'class_year', v_class_year,
    'inserted_inferred', v_inserted,
    'required_outcomes', coalesce(v_required, 0),
    'explicit_outcomes', coalesce(v_explicit, 0),
    'inferred_outcomes', coalesce(v_inferred, 0),
    'readiness_v2_active', false
  );
end;
$$;

create or replace function public.admin_set_recovery_enrollment_outcome_requirement(
  p_enrollment_id uuid,
  p_outcome_id text,
  p_required boolean,
  p_requirement_source text default 'school_programme',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_class_year smallint;
  v_outcome public.recovery_curriculum_outcomes%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_requirement_source not in ('school_programme', 'manual_override') then
    raise exception 'Explicit requirement source must be school_programme or manual_override';
  end if;

  select class_year into v_class_year
  from public.recovery_enrollments
  where id = p_enrollment_id;

  if v_class_year is null then
    raise exception 'Recovery enrollment not found';
  end if;

  select * into v_outcome
  from public.recovery_curriculum_outcomes
  where outcome_id = p_outcome_id
    and curriculum_id = 'recovery-years-1-3-v2'
    and status = 'approved';

  if v_outcome.outcome_id is null then
    raise exception 'Approved Curriculum v2 outcome not found: %', p_outcome_id;
  end if;

  insert into public.recovery_enrollment_outcomes (
    enrollment_id,
    outcome_id,
    required,
    requirement_source,
    requirement_note,
    metadata,
    created_by
  ) values (
    p_enrollment_id,
    p_outcome_id,
    p_required,
    p_requirement_source,
    nullif(trim(coalesce(p_note, '')), ''),
    jsonb_build_object(
      'curriculum_id', v_outcome.curriculum_id,
      'school_year_profile', v_outcome.school_year_profile,
      'programme_requirement', v_outcome.programme_requirement,
      'explicit', true
    ),
    (select auth.uid())
  )
  on conflict (enrollment_id, outcome_id) do update set
    required = excluded.required,
    requirement_source = excluded.requirement_source,
    requirement_note = excluded.requirement_note,
    metadata = excluded.metadata,
    created_by = excluded.created_by,
    updated_at = now();

  return jsonb_build_object(
    'enrollment_id', p_enrollment_id,
    'outcome_id', p_outcome_id,
    'required', p_required,
    'requirement_source', p_requirement_source,
    'programme_requirement', v_outcome.programme_requirement,
    'outcome_year_profile', v_outcome.school_year_profile,
    'enrollment_class_year', v_class_year
  );
end;
$$;

create or replace function public.admin_clear_recovery_enrollment_outcome_override(
  p_enrollment_id uuid,
  p_outcome_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer := 0;
  v_inserted integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  delete from public.recovery_enrollment_outcomes
  where enrollment_id = p_enrollment_id
    and outcome_id = p_outcome_id
    and requirement_source in ('school_programme', 'manual_override');

  get diagnostics v_deleted = row_count;
  v_inserted := public.sync_recovery_inferred_outcome_scope_internal(p_enrollment_id);

  return jsonb_build_object(
    'enrollment_id', p_enrollment_id,
    'outcome_id', p_outcome_id,
    'cleared_explicit_rows', v_deleted,
    'refreshed_inferred_rows', v_inserted,
    'readiness_v2_active', false
  );
end;
$$;

create or replace function public.get_recovery_enrollment_curriculum_scope(
  p_enrollment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_class_year smallint;
  v_outcomes jsonb;
  v_axes jsonb;
  v_required integer;
  v_total integer;
begin
  select user_id, class_year
    into v_user_id, v_class_year
  from public.recovery_enrollments
  where id = p_enrollment_id;

  if v_user_id is null then
    raise exception 'Recovery enrollment not found';
  end if;

  if not public.is_admin() and v_user_id <> (select auth.uid()) then
    raise exception 'Not allowed to read this Recovery curriculum scope';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'outcome_id', outcome.outcome_id,
      'school_year_profile', outcome.school_year_profile,
      'competence_axis', outcome.competence_axis,
      'cefr_target', outcome.cefr_target,
      'label_it', outcome.label_it,
      'observable_outcome_it', outcome.observable_outcome_it,
      'programme_requirement', outcome.programme_requirement,
      'blocking_candidate', outcome.blocking_candidate,
      'required', scoped.required,
      'requirement_source', scoped.requirement_source,
      'requirement_note', scoped.requirement_note
    ) order by outcome.competence_axis, outcome.outcome_id), '[]'::jsonb),
    count(*),
    count(*) filter (where scoped.required)
    into v_outcomes, v_total, v_required
  from public.recovery_enrollment_outcomes scoped
  join public.recovery_curriculum_outcomes outcome on outcome.outcome_id = scoped.outcome_id
  where scoped.enrollment_id = p_enrollment_id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'axis', axis_rows.competence_axis,
      'required_outcomes', axis_rows.required_outcomes,
      'blocking_outcomes', axis_rows.blocking_outcomes
    ) order by axis_rows.sort_order), '[]'::jsonb)
    into v_axes
  from (
    select
      outcome.competence_axis,
      axis.sort_order,
      count(*) filter (where scoped.required) as required_outcomes,
      count(*) filter (where scoped.required and outcome.blocking_candidate) as blocking_outcomes
    from public.recovery_enrollment_outcomes scoped
    join public.recovery_curriculum_outcomes outcome on outcome.outcome_id = scoped.outcome_id
    join public.recovery_curriculum_axes axis on axis.axis_key = outcome.competence_axis
    where scoped.enrollment_id = p_enrollment_id
      and scoped.required
    group by outcome.competence_axis, axis.sort_order
  ) axis_rows;

  return jsonb_build_object(
    'enrollment_id', p_enrollment_id,
    'class_year', v_class_year,
    'curriculum_id', 'recovery-years-1-3-v2',
    'required_outcome_count', coalesce(v_required, 0),
    'scoped_outcome_count', coalesce(v_total, 0),
    'active_axes', v_axes,
    'outcomes', v_outcomes,
    'readiness_v2_active', false
  );
end;
$$;

-- Keep the inferred fallback synchronized for future enrollments and class-year changes.
create or replace function public.sync_recovery_enrollment_outcome_scope_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.sync_recovery_inferred_outcome_scope_internal(new.id);
  return new;
end;
$$;

revoke all on function public.sync_recovery_enrollment_outcome_scope_trigger() from public, anon, authenticated;

drop trigger if exists recovery_enrollments_sync_curriculum_v2_scope on public.recovery_enrollments;
create trigger recovery_enrollments_sync_curriculum_v2_scope
after insert or update of class_year on public.recovery_enrollments
for each row execute function public.sync_recovery_enrollment_outcome_scope_trigger();

-- Backfill only inferred default-core scope for existing enrollments. Explicit rows would win on conflict.
do $$
declare
  enrollment record;
begin
  for enrollment in
    select id from public.recovery_enrollments where class_year between 1 and 3
  loop
    perform public.sync_recovery_inferred_outcome_scope_internal(enrollment.id);
  end loop;
end;
$$;

revoke all on function public.refresh_recovery_enrollment_outcome_scope(uuid) from public, anon;
revoke all on function public.admin_set_recovery_enrollment_outcome_requirement(uuid, text, boolean, text, text) from public, anon;
revoke all on function public.admin_clear_recovery_enrollment_outcome_override(uuid, text) from public, anon;
revoke all on function public.get_recovery_enrollment_curriculum_scope(uuid) from public, anon;

grant execute on function public.refresh_recovery_enrollment_outcome_scope(uuid) to authenticated;
grant execute on function public.admin_set_recovery_enrollment_outcome_requirement(uuid, text, boolean, text, text) to authenticated;
grant execute on function public.admin_clear_recovery_enrollment_outcome_override(uuid, text) to authenticated;
grant execute on function public.get_recovery_enrollment_curriculum_scope(uuid) to authenticated;

notify pgrst, 'reload schema';
