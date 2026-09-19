create table public.exercise_studio_drafts (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid references public.exercise_builder_exercises(id) on delete set null,
  internal_title text not null default '',
  learner_title text not null default '',
  level text not null default 'A2',
  topic text not null default '',
  activity_type text not null default 'exercise',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  origin text not null default 'manual'
    check (origin in ('manual', 'ai_import', 'duplicate')),
  schema_version integer not null default 1
    check (schema_version > 0),
  document jsonb not null default '{}'::jsonb
    check (jsonb_typeof(document) = 'object'),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exercise_studio_drafts_updated_idx
  on public.exercise_studio_drafts(status, updated_at desc);

create index exercise_studio_drafts_search_idx
  on public.exercise_studio_drafts(level, activity_type, topic);

alter table public.exercise_studio_drafts enable row level security;

revoke all on table public.exercise_studio_drafts from anon;
revoke all on table public.exercise_studio_drafts from authenticated;
grant select, insert, update, delete on table public.exercise_studio_drafts to authenticated;
grant select, insert, update, delete on table public.exercise_studio_drafts to service_role;

create policy exercise_studio_drafts_admin_all
on public.exercise_studio_drafts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

notify pgrst, 'reload schema';
