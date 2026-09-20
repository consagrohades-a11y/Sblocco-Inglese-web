create table if not exists public.exercise_studio_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercise_studio_folders_name_check
    check (char_length(btrim(name)) between 1 and 80)
);

create unique index if not exists exercise_studio_folders_name_unique_ci
  on public.exercise_studio_folders (lower(btrim(name)));

alter table public.exercise_studio_folders enable row level security;

drop policy if exists exercise_studio_folders_admin_all on public.exercise_studio_folders;
create policy exercise_studio_folders_admin_all
on public.exercise_studio_folders
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

revoke all on table public.exercise_studio_folders from anon;
grant select, insert, update, delete on table public.exercise_studio_folders to authenticated;

alter table public.exercise_studio_drafts
  add column if not exists folder_id uuid references public.exercise_studio_folders(id) on delete set null;

create index if not exists exercise_studio_drafts_folder_idx
  on public.exercise_studio_drafts (folder_id, updated_at desc);
