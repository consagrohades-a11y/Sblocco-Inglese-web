alter table public.exercise_studio_folders
  add column if not exists parent_id uuid references public.exercise_studio_folders(id) on delete set null,
  add column if not exists color_key text not null default 'sand';

alter table public.exercise_studio_folders
  drop constraint if exists exercise_studio_folders_color_key_check;

alter table public.exercise_studio_folders
  add constraint exercise_studio_folders_color_key_check
  check (color_key in ('sand', 'orange', 'navy', 'coral', 'gold', 'blue', 'rose'));

drop index if exists public.exercise_studio_folders_name_unique_ci;

create unique index if not exists exercise_studio_folders_root_name_unique_ci
  on public.exercise_studio_folders (lower(btrim(name)))
  where parent_id is null;

create unique index if not exists exercise_studio_folders_sibling_name_unique_ci
  on public.exercise_studio_folders (parent_id, lower(btrim(name)))
  where parent_id is not null;

create index if not exists exercise_studio_folders_parent_idx
  on public.exercise_studio_folders (parent_id, lower(btrim(name)));

create or replace function public.guard_exercise_studio_folder_parent()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_cycle boolean := false;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.id = new.parent_id then
    raise exception 'A Studio folder cannot contain itself.';
  end if;

  with recursive ancestors as (
    select folder.id, folder.parent_id
    from public.exercise_studio_folders folder
    where folder.id = new.parent_id

    union all

    select folder.id, folder.parent_id
    from public.exercise_studio_folders folder
    join ancestors on ancestors.parent_id = folder.id
  )
  select exists (
    select 1
    from ancestors
    where id = new.id
  )
  into v_cycle;

  if v_cycle then
    raise exception 'A Studio folder cannot be moved inside one of its descendants.';
  end if;

  return new;
end;
$$;

drop trigger if exists exercise_studio_folders_parent_guard on public.exercise_studio_folders;
create trigger exercise_studio_folders_parent_guard
before insert or update of parent_id on public.exercise_studio_folders
for each row execute function public.guard_exercise_studio_folder_parent();

notify pgrst, 'reload schema';
