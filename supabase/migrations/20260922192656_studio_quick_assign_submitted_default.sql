-- Make submission the neutral Studio Quick Assign completion default.
-- Passing thresholds remain an explicit teacher choice.

create or replace function public.admin_quick_assign_exercise(
  p_learner_id uuid,
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
  p_show_diagnostic_summary boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment_id uuid;
  v_resource_id uuid;
  v_version_id uuid;
  v_title text;
  v_description text;
  v_estimated_minutes integer;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if p_learner_id is null then
    raise exception 'Learner is required.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_learner_id
      and role = 'learner'
      and status <> 'deleted'
  ) then
    raise exception 'Learner not found.';
  end if;

  if p_completion_rule not in ('passed', 'submitted', 'attempts') then
    raise exception 'Unsupported completion rule.';
  end if;

  if p_required_score is null or p_required_score < 0 or p_required_score > 100 then
    raise exception 'Required score must be between 0 and 100.';
  end if;

  if p_required_attempts is null or p_required_attempts < 1 then
    raise exception 'Required attempts must be at least 1.';
  end if;

  select
    version.id,
    version.title,
    version.description,
    version.estimated_minutes
  into
    v_version_id,
    v_title,
    v_description,
    v_estimated_minutes
  from public.exercise_builder_exercises exercise
  join public.exercise_builder_exercise_versions version
    on version.id = exercise.current_version_id
  where exercise.id = p_exercise_id
    and exercise.status = 'published'
    and version.review_status = 'approved'
  limit 1;

  if v_version_id is null then
    raise exception 'Published exercise not found.';
  end if;

  insert into public.assignments (
    learner_id,
    teacher_id,
    title,
    status,
    required,
    deadline_at,
    estimated_minutes,
    published_at,
    created_by
  ) values (
    p_learner_id,
    auth.uid(),
    coalesce(nullif(trim(p_assignment_title), ''), v_title),
    'published',
    coalesce(p_required, true),
    p_deadline_at,
    v_estimated_minutes,
    now(),
    auth.uid()
  )
  returning id into v_assignment_id;

  insert into public.assignment_resources (
    assignment_id,
    resource_key,
    resource_type,
    title,
    description,
    route,
    sequence_index,
    exercise_config
  ) values (
    v_assignment_id,
    'custom-exercise:' || p_exercise_id::text,
    'custom_exercise',
    v_title,
    v_description,
    '/exercises',
    1,
    jsonb_build_object(
      'exercise_id', p_exercise_id,
      'exercise_version_id', v_version_id,
      'completion_rule', p_completion_rule,
      'required_score', p_required_score,
      'required_attempts', p_required_attempts,
      'allow_retry', coalesce(p_allow_retry, true),
      'show_score', coalesce(p_show_score, true),
      'show_correct_answers', coalesce(p_show_correct_answers, true),
      'show_explanations', coalesce(p_show_explanations, true),
      'show_diagnostic_summary', coalesce(p_show_diagnostic_summary, true)
    )
  )
  returning id into v_resource_id;

  return jsonb_build_object(
    'assignment_id', v_assignment_id,
    'assignment_resource_id', v_resource_id,
    'exercise_id', p_exercise_id,
    'exercise_version_id', v_version_id,
    'learner_id', p_learner_id,
    'published_at', now()
  );
end;
$$;

revoke all on function public.admin_quick_assign_exercise(
  uuid, uuid, text, timestamptz, boolean, text, numeric, integer,
  boolean, boolean, boolean, boolean, boolean
) from public;
revoke all on function public.admin_quick_assign_exercise(
  uuid, uuid, text, timestamptz, boolean, text, numeric, integer,
  boolean, boolean, boolean, boolean, boolean
) from anon;
grant execute on function public.admin_quick_assign_exercise(
  uuid, uuid, text, timestamptz, boolean, text, numeric, integer,
  boolean, boolean, boolean, boolean, boolean
) to authenticated;

create or replace function public.admin_quick_assign_exercise_group(
  p_group_id uuid,
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
  p_show_diagnostic_summary boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid;
  v_assignment_id uuid;
  v_resource_id uuid;
  v_version_id uuid;
  v_title text;
  v_description text;
  v_estimated_minutes integer;
  v_member record;
  v_assignment_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if not exists (
    select 1
    from public.learner_groups
    where id = p_group_id
      and status <> 'archived'
  ) then
    raise exception 'Active group not found.';
  end if;

  if p_completion_rule not in ('passed', 'submitted', 'attempts') then
    raise exception 'Unsupported completion rule.';
  end if;

  if p_required_score is null or p_required_score < 0 or p_required_score > 100 then
    raise exception 'Required score must be between 0 and 100.';
  end if;

  if p_required_attempts is null or p_required_attempts < 1 then
    raise exception 'Required attempts must be at least 1.';
  end if;

  select
    version.id,
    version.title,
    version.description,
    version.estimated_minutes
  into
    v_version_id,
    v_title,
    v_description,
    v_estimated_minutes
  from public.exercise_builder_exercises exercise
  join public.exercise_builder_exercise_versions version
    on version.id = exercise.current_version_id
  where exercise.id = p_exercise_id
    and exercise.status = 'published'
    and version.review_status = 'approved'
  limit 1;

  if v_version_id is null then
    raise exception 'Published exercise not found.';
  end if;

  if not exists (
    select 1
    from public.learner_group_members member
    join public.profiles profile on profile.id = member.learner_id
    where member.group_id = p_group_id
      and member.membership_status = 'active'
      and profile.role = 'learner'
      and profile.status = 'active'
  ) then
    raise exception 'Group has no active learners.';
  end if;

  insert into public.assignment_group_batches (
    group_id,
    source_assignment_id,
    title,
    status,
    required,
    deadline_at,
    estimated_minutes,
    learner_note,
    admin_note,
    created_by
  ) values (
    p_group_id,
    null,
    coalesce(nullif(trim(p_assignment_title), ''), v_title),
    'published',
    coalesce(p_required, true),
    p_deadline_at,
    v_estimated_minutes,
    null,
    'Created from Learning Studio Quick Assign',
    auth.uid()
  )
  returning id into v_batch_id;

  for v_member in
    select member.learner_id
    from public.learner_group_members member
    join public.profiles profile on profile.id = member.learner_id
    where member.group_id = p_group_id
      and member.membership_status = 'active'
      and profile.role = 'learner'
      and profile.status = 'active'
    order by member.created_at
  loop
    insert into public.assignments (
      learner_id,
      teacher_id,
      title,
      status,
      required,
      deadline_at,
      estimated_minutes,
      published_at,
      created_by,
      group_batch_id
    ) values (
      v_member.learner_id,
      auth.uid(),
      coalesce(nullif(trim(p_assignment_title), ''), v_title),
      'published',
      coalesce(p_required, true),
      p_deadline_at,
      v_estimated_minutes,
      now(),
      auth.uid(),
      v_batch_id
    )
    returning id into v_assignment_id;

    insert into public.assignment_resources (
      assignment_id,
      resource_key,
      resource_type,
      title,
      description,
      route,
      sequence_index,
      exercise_config
    ) values (
      v_assignment_id,
      'custom-exercise:' || p_exercise_id::text,
      'custom_exercise',
      v_title,
      v_description,
      '/exercises',
      1,
      jsonb_build_object(
        'exercise_id', p_exercise_id,
        'exercise_version_id', v_version_id,
        'completion_rule', p_completion_rule,
        'required_score', p_required_score,
        'required_attempts', p_required_attempts,
        'allow_retry', coalesce(p_allow_retry, true),
        'show_score', coalesce(p_show_score, true),
        'show_correct_answers', coalesce(p_show_correct_answers, true),
        'show_explanations', coalesce(p_show_explanations, true),
        'show_diagnostic_summary', coalesce(p_show_diagnostic_summary, true)
      )
    )
    returning id into v_resource_id;

    v_assignment_count := v_assignment_count + 1;
  end loop;

  return jsonb_build_object(
    'batch_id', v_batch_id,
    'group_id', p_group_id,
    'assignment_count', v_assignment_count,
    'exercise_id', p_exercise_id,
    'exercise_version_id', v_version_id,
    'published_at', now()
  );
end;
$$;

revoke all on function public.admin_quick_assign_exercise_group(
  uuid, uuid, text, timestamptz, boolean, text, numeric, integer,
  boolean, boolean, boolean, boolean, boolean
) from public;
revoke all on function public.admin_quick_assign_exercise_group(
  uuid, uuid, text, timestamptz, boolean, text, numeric, integer,
  boolean, boolean, boolean, boolean, boolean
) from anon;
grant execute on function public.admin_quick_assign_exercise_group(
  uuid, uuid, text, timestamptz, boolean, text, numeric, integer,
  boolean, boolean, boolean, boolean, boolean
) to authenticated;

notify pgrst, 'reload schema';
