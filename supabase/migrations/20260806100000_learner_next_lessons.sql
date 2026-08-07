-- One current next-lesson plan per learner, managed by admins and visible to that learner.

create table if not exists public.learner_next_lessons (
  learner_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null check (char_length(trim(plan)) between 1 and 5000),
  scheduled_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists learner_next_lessons_set_updated_at on public.learner_next_lessons;
create trigger learner_next_lessons_set_updated_at
before update on public.learner_next_lessons
for each row execute function public.set_updated_at();

alter table public.learner_next_lessons enable row level security;

drop policy if exists learner_next_lessons_select_own_or_admin on public.learner_next_lessons;
create policy learner_next_lessons_select_own_or_admin
on public.learner_next_lessons
for select
to authenticated
using (learner_id = auth.uid() or public.is_admin());

drop policy if exists learner_next_lessons_admin_insert on public.learner_next_lessons;
create policy learner_next_lessons_admin_insert
on public.learner_next_lessons
for insert
to authenticated
with check (
  public.is_admin()
  and created_by = auth.uid()
  and updated_by = auth.uid()
  and exists (
    select 1
    from public.profiles learner
    where learner.id = learner_id
      and learner.role = 'learner'
  )
);

drop policy if exists learner_next_lessons_admin_update on public.learner_next_lessons;
create policy learner_next_lessons_admin_update
on public.learner_next_lessons
for update
to authenticated
using (public.is_admin())
with check (
  public.is_admin()
  and updated_by = auth.uid()
  and exists (
    select 1
    from public.profiles learner
    where learner.id = learner_id
      and learner.role = 'learner'
  )
);

drop policy if exists learner_next_lessons_admin_delete on public.learner_next_lessons;
create policy learner_next_lessons_admin_delete
on public.learner_next_lessons
for delete
to authenticated
using (public.is_admin());

revoke all on public.learner_next_lessons from public;
grant select, insert, update, delete on public.learner_next_lessons to authenticated;

notify pgrst, 'reload schema';
