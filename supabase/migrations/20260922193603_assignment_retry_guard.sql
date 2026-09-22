-- Assignment configurations that require multiple attempts must remain runnable.
-- The teacher chooses the number of attempts; the system guarantees retry access.

create or replace function public.normalize_assignment_exercise_retry_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.resource_type = 'custom_exercise'
    and coalesce(new.exercise_config ->> 'completion_rule', 'submitted') = 'attempts'
    and greatest(1, coalesce((new.exercise_config ->> 'required_attempts')::integer, 1)) > 1 then
    new.exercise_config := jsonb_set(
      coalesce(new.exercise_config, '{}'::jsonb),
      '{allow_retry}',
      'true'::jsonb,
      true
    );
  end if;

  return new;
end;
$$;

revoke all on function public.normalize_assignment_exercise_retry_guard() from public;

drop trigger if exists assignment_resources_retry_guard on public.assignment_resources;
create trigger assignment_resources_retry_guard
before insert or update of resource_type, exercise_config
on public.assignment_resources
for each row execute function public.normalize_assignment_exercise_retry_guard();

notify pgrst, 'reload schema';
