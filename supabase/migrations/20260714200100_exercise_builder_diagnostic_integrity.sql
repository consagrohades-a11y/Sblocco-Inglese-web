-- Every detected error also represents at least one diagnostic opportunity.

create or replace function public.normalize_exercise_builder_diagnostic_event()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.opportunity_count := greatest(coalesce(new.opportunity_count, 0), coalesce(new.error_count, 0));
  return new;
end;
$$;

create trigger exercise_builder_diagnostic_events_normalize
before insert or update on public.exercise_builder_diagnostic_events
for each row execute function public.normalize_exercise_builder_diagnostic_event();
