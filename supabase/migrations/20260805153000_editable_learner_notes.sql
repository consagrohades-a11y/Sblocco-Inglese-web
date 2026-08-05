-- Let admins correct or remove private learner notes while retaining edit metadata.

alter table public.learner_admin_notes
  add column if not exists updated_at timestamptz,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

drop policy if exists learner_admin_notes_admin_update on public.learner_admin_notes;
create policy learner_admin_notes_admin_update
on public.learner_admin_notes
for update
to authenticated
using (public.is_admin())
with check (
  public.is_admin()
  and updated_by = auth.uid()
  and char_length(trim(note)) between 1 and 5000
);

drop policy if exists learner_admin_notes_admin_delete on public.learner_admin_notes;
create policy learner_admin_notes_admin_delete
on public.learner_admin_notes
for delete
to authenticated
using (public.is_admin());

grant update, delete on public.learner_admin_notes to authenticated;

notify pgrst, 'reload schema';
