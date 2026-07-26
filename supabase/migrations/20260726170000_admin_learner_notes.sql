-- Private chronological notes attached to learner profiles.
-- Notes are visible and writable only by authenticated admins.

create table if not exists public.learner_admin_notes (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid default auth.uid() references public.profiles(id) on delete set null,
  note text not null check (
    char_length(trim(note)) between 1 and 5000
  ),
  created_at timestamptz not null default now()
);

create index if not exists learner_admin_notes_learner_created_idx
  on public.learner_admin_notes(learner_id, created_at desc);

alter table public.learner_admin_notes enable row level security;

drop policy if exists learner_admin_notes_admin_select on public.learner_admin_notes;
create policy learner_admin_notes_admin_select
on public.learner_admin_notes
for select
to authenticated
using (public.is_admin());

drop policy if exists learner_admin_notes_admin_insert on public.learner_admin_notes;
create policy learner_admin_notes_admin_insert
on public.learner_admin_notes
for insert
to authenticated
with check (
  public.is_admin()
  and author_id = auth.uid()
  and exists (
    select 1
    from public.profiles as learner_profile
    where learner_profile.id = learner_id
      and learner_profile.role = 'learner'
  )
);

revoke all on public.learner_admin_notes from public;
grant select, insert on public.learner_admin_notes to authenticated;

notify pgrst, 'reload schema';
