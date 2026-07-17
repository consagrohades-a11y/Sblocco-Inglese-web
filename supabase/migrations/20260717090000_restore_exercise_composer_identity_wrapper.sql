-- Restore the identity-safe Exercise Composer wrapper after the additive
-- question_end migration replaced it with the legacy implementation.

do $migration$
declare
  v_definition text;
  v_identity_branch text := $old$
    v_public_id := public.next_exercise_builder_public_id('exercise');
    insert into public.exercise_builder_exercises (
      public_id, status, created_by
    ) values (
      v_public_id, 'draft', auth.uid()
    ) returning id into v_exercise_id;
    v_version_number := 1;$old$;
begin
  select replace(pg_get_functiondef(
    'public.admin_save_exercise_builder_exercise_version_legacy(uuid,jsonb,jsonb)'::regprocedure
  ), chr(13) || chr(10), chr(10))
  into v_definition;

  if position(v_identity_branch in v_definition) > 0 then
    v_definition := replace(
      v_definition,
      v_identity_branch,
      E'\n    raise exception ''Exercise identity is required.'';'
    );
  elsif position('Exercise identity is required.' in v_definition) = 0 then
    raise exception 'Unexpected legacy Exercise Composer identity branch.';
  end if;

  if position(
    'v_feedback_timing not in (''section_end'', ''exercise_end'', ''hidden'')'
    in v_definition
  ) > 0 then
    v_definition := replace(
      v_definition,
      'v_feedback_timing not in (''section_end'', ''exercise_end'', ''hidden'')',
      'v_feedback_timing not in (''question_end'', ''section_end'', ''exercise_end'', ''hidden'')'
    );
  elsif position(
    'v_feedback_timing not in (''question_end'', ''section_end'', ''exercise_end'', ''hidden'')'
    in v_definition
  ) = 0 then
    raise exception 'Unexpected legacy Exercise Composer feedback timing guard.';
  end if;

  execute v_definition;
end;
$migration$;

create or replace function public.admin_save_exercise_builder_exercise_version(
  p_exercise_id uuid,
  p_payload jsonb,
  p_sections jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exercise_id uuid := p_exercise_id;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if v_exercise_id is null then
    insert into public.exercise_builder_exercises (status, created_by)
    values ('draft', auth.uid())
    returning id into v_exercise_id;
  end if;

  return public.admin_save_exercise_builder_exercise_version_legacy(
    v_exercise_id,
    p_payload,
    p_sections
  );
end;
$$;

revoke all on function public.admin_save_exercise_builder_exercise_version(uuid, jsonb, jsonb) from public;
grant execute on function public.admin_save_exercise_builder_exercise_version(uuid, jsonb, jsonb) to authenticated;
