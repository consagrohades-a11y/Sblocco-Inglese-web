alter table public.admin_speaking_sessions
  add column if not exists control_id text;

alter table public.admin_speaking_sessions
  drop constraint if exists admin_speaking_sessions_levels_check;

alter table public.admin_speaking_sessions
  add constraint admin_speaking_sessions_levels_check
  check (levels <@ array['A0','A1','A1+','A2','B1','B1+','B2','C1','C2','Mixed']::text[]);

create unique index if not exists admin_speaking_sessions_open_control_activity_idx
  on public.admin_speaking_sessions(control_id, activity_id, learner_id)
  where control_id is not null and ended_at is null;

create or replace function public.admin_start_or_resume_speaking_session(
  p_learner_id uuid,
  p_activity_id uuid,
  p_levels text[] default '{}'::text[],
  p_control_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_session_id uuid;
  v_levels text[];
  v_control_id text := nullif(btrim(coalesce(p_control_id, '')), '');
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;

  if not exists (
    select 1 from public.profiles profile
    where profile.id = p_learner_id and profile.role = 'learner' and profile.status = 'active'
  ) then raise exception 'Active learner not found.'; end if;

  if not exists (
    select 1 from public.admin_speaking_activities activity
    where activity.id = p_activity_id and activity.status <> 'archived'
  ) then raise exception 'Speaking activity not found.'; end if;

  select coalesce(array_agg(case when level = 'MIXED' then 'Mixed' else level end order by level), '{}'::text[])
  into v_levels
  from (
    select distinct upper(btrim(raw_level)) as level
    from unnest(coalesce(p_levels, '{}'::text[])) as raw_level
    where upper(btrim(raw_level)) = any(array['A0','A1','A1+','A2','B1','B1+','B2','C1','C2','MIXED']::text[])
  ) cleaned;

  if v_control_id is not null then
    select session.id into v_session_id
    from public.admin_speaking_sessions session
    where session.control_id = v_control_id
      and session.activity_id = p_activity_id
      and session.learner_id = p_learner_id
      and session.ended_at is null
      and session.started_by = auth.uid()
    order by session.started_at desc
    limit 1;

    if v_session_id is not null then
      update public.admin_speaking_sessions set levels = v_levels where id = v_session_id;
      return v_session_id;
    end if;
  end if;

  begin
    insert into public.admin_speaking_sessions (learner_id, activity_id, levels, started_by, control_id)
    values (p_learner_id, p_activity_id, v_levels, auth.uid(), v_control_id)
    returning id into v_session_id;
  exception when unique_violation then
    select session.id into v_session_id
    from public.admin_speaking_sessions session
    where session.control_id = v_control_id
      and session.activity_id = p_activity_id
      and session.learner_id = p_learner_id
      and session.ended_at is null
      and session.started_by = auth.uid()
    order by session.started_at desc
    limit 1;
  end;

  return v_session_id;
end;
$function$;

revoke all on function public.admin_start_or_resume_speaking_session(uuid, uuid, text[], text) from public;
grant execute on function public.admin_start_or_resume_speaking_session(uuid, uuid, text[], text) to authenticated;

create or replace function public.admin_finish_speaking_control(p_control_id text)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare v_count integer := 0;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  update public.admin_speaking_sessions
  set ended_at = now()
  where control_id = nullif(btrim(coalesce(p_control_id, '')), '')
    and started_by = auth.uid()
    and ended_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

revoke all on function public.admin_finish_speaking_control(text) from public;
grant execute on function public.admin_finish_speaking_control(text) to authenticated;

create or replace function public.admin_get_speaking_presenter_activity(p_activity_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare v_result jsonb;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;

  select jsonb_strip_nulls(jsonb_build_object(
    'id', activity.id,
    'title', activity.title,
    'summary', activity.summary,
    'activity_type', activity.activity_type,
    'levels', activity.levels,
    'goals', activity.goals,
    'tags', activity.tags,
    'duration_minutes', activity.duration_minutes,
    'group_size', activity.group_size,
    'instructions', activity.instructions,
    'status', activity.status,
    'student_intro', activity.student_intro,
    'student_steps', activity.student_steps,
    'useful_language', activity.useful_language,
    'presenter_style', activity.presenter_style,
    'prompts', coalesce((
      select jsonb_agg(
        case
          when jsonb_typeof(prompt_item) = 'string' then
            jsonb_build_object('text', prompt_item #>> '{}', 'levels', activity.levels)
          else
            jsonb_strip_nulls(jsonb_build_object(
              'text', prompt_item ->> 'text',
              'levels', prompt_item -> 'levels',
              'student_support', prompt_item -> 'student_support',
              'challenge', prompt_item -> 'challenge',
              'format', prompt_item ->> 'format',
              'title', prompt_item ->> 'title',
              'instructions', prompt_item ->> 'instructions',
              'situation', prompt_item ->> 'situation',
              'outcome', prompt_item ->> 'outcome',
              'support', prompt_item -> 'support',
              'role_swap', prompt_item -> 'role_swap',
              'roles', case
                when jsonb_typeof(prompt_item -> 'roles') = 'array' then (
                  select coalesce(jsonb_agg(
                    jsonb_strip_nulls(jsonb_build_object(
                      'key', role_item ->> 'key',
                      'name', role_item ->> 'name',
                      'goal', role_item ->> 'goal'
                    )) order by role_ordinality
                  ), '[]'::jsonb)
                  from jsonb_array_elements(prompt_item -> 'roles') with ordinality
                    as role_rows(role_item, role_ordinality)
                )
                else null
              end,
              'material', prompt_item -> 'material'
            ))
        end
        order by prompt_ordinality
      )
      from jsonb_array_elements(coalesce(activity.prompts, '[]'::jsonb)) with ordinality
        as prompt_rows(prompt_item, prompt_ordinality)
    ), '[]'::jsonb)
  ))
  into v_result
  from public.admin_speaking_activities activity
  where activity.id = p_activity_id and activity.status <> 'archived';

  if v_result is null then raise exception 'Speaking activity not found.'; end if;
  return v_result;
end;
$function$;

revoke all on function public.admin_get_speaking_presenter_activity(uuid) from public;
grant execute on function public.admin_get_speaking_presenter_activity(uuid) to authenticated;
