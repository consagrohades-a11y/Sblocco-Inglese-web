-- Keep the original pool version schema compatible with the visual Pool Builder.

alter table public.exercise_builder_pool_versions
  add column if not exists title text;

alter table public.exercise_builder_pool_versions
  add column if not exists selection_defaults jsonb not null default '{}'::jsonb;

update public.exercise_builder_pool_versions
set title = name
where title is null;

create or replace function public.sync_exercise_builder_pool_version_title()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if nullif(trim(new.title), '') is null then
    new.title := new.name;
  end if;
  if nullif(trim(new.name), '') is null then
    new.name := new.title;
  end if;
  if nullif(trim(new.title), '') is null or nullif(trim(new.name), '') is null then
    raise exception 'Pool version title is required.';
  end if;
  return new;
end;
$$;

drop trigger if exists exercise_builder_pool_versions_sync_title
on public.exercise_builder_pool_versions;
create trigger exercise_builder_pool_versions_sync_title
before insert or update of title, name
on public.exercise_builder_pool_versions
for each row execute function public.sync_exercise_builder_pool_version_title();

alter table public.exercise_builder_pool_versions
  alter column title set not null;

alter table public.exercise_builder_pool_versions
  drop constraint if exists exercise_builder_pool_versions_selection_defaults_check;
alter table public.exercise_builder_pool_versions
  add constraint exercise_builder_pool_versions_selection_defaults_check
  check (jsonb_typeof(selection_defaults) = 'object');
