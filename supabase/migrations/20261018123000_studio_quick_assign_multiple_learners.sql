-- Assign one published Studio activity to several individually selected learners.
-- Each learner receives an independent assignment, resource, attempt history and review flow.
-- Use the existing single-learner routine to avoid a second assignment implementation.
-- A function call is one transaction: a failure cannot leave a partially assigned selection.

create or replace function public.admin_quick_assign_exercise_learners(
  p_learner_ids uuid[],
  p_exercise_id uuid,
  p_assignment_title text default null,
  p_deadline_at timestamptz default null,
  p_required boolean default true,
  p_completion_rule text default 'submitted',
  p_required_score numeric default 70,
  p_required_attempts integer default 1,
  p_allow_retry boolean default true,
  p_show_score boolean default true,
  p_show_correct_answers boolean default true,
  p_show_explanations boolean default true,
  p_show_diagnostic_summary boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_learner_id uuid;
  v_assignment jsonb;
  v_assignment_ids uuid[] := array[]::uuid[];
  v_pinned_version_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if p_learner_ids is null or cardinality(p_learner_ids) = 0 then
    raise exception 'Choose at least one learner.';
  end if;

  if cardinality(p_learner_ids) > 100 then
    raise exception 'You can assign to at most 100 learners at a time.';
  end if;

  if exists (select 1 from unnest(p_learner_ids) as selected(id) where selected.id is null)
     or cardinality(p_learner_ids) <> (
       select count(distinct selected.id)
       from unnest(p_learner_ids) as selected(id)
     ) then
    raise exception 'Each learner must be selected once.';
  end if;

  if exists (
    select 1
    from unnest(p_learner_ids) as selected(id)
    where not exists (
      select 1
      from public.profiles profile
      where profile.id = selected.id
        and profile.role = 'learner'
        and profile.status = 'active'
    )
  ) then
    raise exception 'One or more learners are no longer active. Refresh the list.';
  end if;

  foreach v_learner_id in array p_learner_ids loop
    v_assignment := public.admin_quick_assign_exercise(
      p_learner_id => v_learner_id,
      p_exercise_id => p_exercise_id,
      p_assignment_title => p_assignment_title,
      p_deadline_at => p_deadline_at,
      p_required => p_required,
      p_completion_rule => p_completion_rule,
      p_required_score => p_required_score,
      p_required_attempts => p_required_attempts,
      p_allow_retry => p_allow_retry,
      p_show_score => p_show_score,
      p_show_correct_answers => p_show_correct_answers,
      p_show_explanations => p_show_explanations,
      p_show_diagnostic_summary => p_show_diagnostic_summary
    );
    v_assignment_ids := array_append(v_assignment_ids, (v_assignment ->> 'assignment_id')::uuid);
    v_pinned_version_id := (v_assignment ->> 'exercise_version_id')::uuid;
  end loop;

  return jsonb_build_object(
    'assignment_count', cardinality(v_assignment_ids),
    'assignment_ids', to_jsonb(v_assignment_ids),
    'learner_ids', to_jsonb(p_learner_ids),
    'exercise_id', p_exercise_id,
    'exercise_version_id', v_pinned_version_id
  );
end;
$$;

revoke all on function public.admin_quick_assign_exercise_learners(
  uuid[], uuid, text, timestamptz, boolean, text, numeric, integer,
  boolean, boolean, boolean, boolean, boolean
) from public, anon;
grant execute on function public.admin_quick_assign_exercise_learners(
  uuid[], uuid, text, timestamptz, boolean, text, numeric, integer,
  boolean, boolean, boolean, boolean, boolean
) to authenticated;

notify pgrst, 'reload schema';
