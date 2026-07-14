-- Exercise Builder foundation.
-- This system is intentionally separate from English Foundations, Trainer SRS,
-- and the existing generated practice engine. Imported JSON enters a staging
-- area first. Public IDs are assigned only when reviewed content is promoted.

create extension if not exists pgcrypto;

-- Reuse the smallest available five-digit number only after an identity row has
-- been physically deleted. Deletion guards and future historical references
-- prevent unsafe reuse.
create or replace function public.assign_exercise_builder_public_number()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  next_number integer;
begin
  if new.public_number is not null then
    return new;
  end if;

  if TG_TABLE_NAME not in (
    'exercise_builder_questions',
    'exercise_builder_pools',
    'exercise_builder_exercises',
    'exercise_builder_collections'
  ) then
    raise exception 'Unsupported Exercise Builder identity table: %', TG_TABLE_NAME;
  end if;

  perform pg_advisory_xact_lock(hashtext('exercise-builder:' || TG_TABLE_NAME));

  execute format(
    'select candidate
       from generate_series(1, 99999) candidate
      where not exists (
        select 1 from public.%I existing
        where existing.public_number = candidate
      )
      order by candidate
      limit 1',
    TG_TABLE_NAME
  ) into next_number;

  if next_number is null then
    raise exception 'No five-digit public IDs remain for %', TG_TABLE_NAME;
  end if;

  new.public_number := next_number;
  return new;
end;
$$;

-- Import staging. JSON IDs are ignored by the application and never persisted
-- as database identifiers.
create table public.exercise_builder_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_name text not null default 'Pasted JSON',
  schema_version integer not null check (schema_version > 0),
  entity_type text not null check (entity_type in ('question', 'question_pool', 'exercise', 'bundle')),
  status text not null default 'validated'
    check (status in ('validated', 'in_review', 'partially_imported', 'imported', 'discarded')),
  raw_payload jsonb not null,
  valid_count integer not null default 0 check (valid_count >= 0),
  warning_count integer not null default 0 check (warning_count >= 0),
  invalid_count integer not null default 0 check (invalid_count >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger exercise_builder_import_batches_set_updated_at
before update on public.exercise_builder_import_batches
for each row execute function public.set_updated_at();

create table public.exercise_builder_import_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.exercise_builder_import_batches(id) on delete cascade,
  item_index integer not null check (item_index >= 0),
  client_key text,
  entity_type text not null check (entity_type in ('question', 'question_pool', 'exercise')),
  validation_status text not null check (validation_status in ('valid', 'warning', 'invalid')),
  selected boolean not null default true,
  payload jsonb not null,
  errors jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  promoted_entity_id uuid,
  created_at timestamptz not null default now(),
  unique (batch_id, item_index)
);

create index exercise_builder_import_items_batch_idx
  on public.exercise_builder_import_items(batch_id, item_index);
create index exercise_builder_import_items_review_idx
  on public.exercise_builder_import_items(validation_status, selected);

-- Stable question identities and immutable reviewed versions.
create table public.exercise_builder_questions (
  id uuid primary key default gen_random_uuid(),
  public_number integer not null unique check (public_number between 1 and 99999),
  public_id text generated always as ('Q-' || lpad(public_number::text, 5, '0')) stored,
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'approved', 'published', 'archived')),
  current_version_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger exercise_builder_questions_assign_public_number
before insert on public.exercise_builder_questions
for each row execute function public.assign_exercise_builder_public_number();
create trigger exercise_builder_questions_set_updated_at
before update on public.exercise_builder_questions
for each row execute function public.set_updated_at();

create table public.exercise_builder_question_versions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.exercise_builder_questions(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  schema_version integer not null default 1 check (schema_version > 0),
  question_type text not null check (question_type in (
    'multiple_choice',
    'multiple_select',
    'gap_fill',
    'select_gap',
    'translation',
    'error_correction',
    'word_order',
    'content_block'
  )),
  title text,
  prompt text not null,
  instructions text,
  instruction_language text not null default 'it' check (instruction_language in ('it', 'en')),
  level text not null check (level in ('A0', 'A1', 'A1+', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C2', 'Mixed')),
  topic text not null,
  subtopic text,
  primary_skill text not null check (primary_skill in (
    'grammar', 'vocabulary', 'reading', 'writing', 'functional_language', 'spelling', 'word_order'
  )),
  learning_objective text not null,
  difficulty text not null default 'standard' check (difficulty in ('support', 'standard', 'challenge')),
  content jsonb not null default '{}'::jsonb,
  grading jsonb not null default '{"mode":"automatic","weight":1}'::jsonb,
  feedback jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  foundation_links jsonb not null default '[]'::jsonb,
  review_status text not null default 'in_review'
    check (review_status in ('in_review', 'approved', 'rejected')),
  source_import_item_id uuid references public.exercise_builder_import_items(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (question_id, version_number)
);

alter table public.exercise_builder_questions
  add constraint exercise_builder_questions_current_version_fk
  foreign key (current_version_id)
  references public.exercise_builder_question_versions(id)
  on delete set null;

create index exercise_builder_question_versions_catalog_idx
  on public.exercise_builder_question_versions(level, topic, question_type, review_status);
create index exercise_builder_question_versions_tags_idx
  on public.exercise_builder_question_versions using gin(tags);

-- Diagnostic registry. Messages and aggregation rules live outside exercises so
-- they can be reused consistently across the entire platform.
create table public.exercise_builder_diagnostic_codes (
  code text primary key check (code = upper(code) and code ~ '^[A-Z0-9_]+$'),
  label text not null,
  primary_skill text not null,
  topic text not null,
  subtopic text,
  group_key text,
  severity text not null default 'minor' check (severity in ('precision', 'minor', 'major')),
  category text not null default 'learning' check (category in ('learning', 'precision')),
  recommended_resources jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger exercise_builder_diagnostic_codes_set_updated_at
before update on public.exercise_builder_diagnostic_codes
for each row execute function public.set_updated_at();

create table public.exercise_builder_diagnostic_messages (
  id uuid primary key default gen_random_uuid(),
  diagnostic_code text not null references public.exercise_builder_diagnostic_codes(code) on delete cascade,
  language text not null check (language in ('it', 'en')),
  message_level text not null check (message_level in ('reminder', 'weakness', 'subtopic_review', 'topic_review')),
  message_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (diagnostic_code, language, message_level)
);

create trigger exercise_builder_diagnostic_messages_set_updated_at
before update on public.exercise_builder_diagnostic_messages
for each row execute function public.set_updated_at();

create table public.exercise_builder_diagnostic_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  topic text not null,
  priority integer not null default 0,
  trigger_config jsonb not null,
  output_config jsonb not null,
  suppress_specific_messages boolean not null default true,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger exercise_builder_diagnostic_rules_set_updated_at
before update on public.exercise_builder_diagnostic_rules
for each row execute function public.set_updated_at();

create table public.exercise_builder_question_diagnostic_targets (
  question_version_id uuid not null references public.exercise_builder_question_versions(id) on delete cascade,
  diagnostic_code text not null references public.exercise_builder_diagnostic_codes(code) on delete restrict,
  target_role text not null default 'tested' check (target_role in ('tested', 'fallback', 'precision')),
  opportunity_count numeric(8,2) not null default 1 check (opportunity_count > 0),
  primary key (question_version_id, diagnostic_code, target_role)
);

create table public.exercise_builder_answer_error_mappings (
  id uuid primary key default gen_random_uuid(),
  question_version_id uuid not null references public.exercise_builder_question_versions(id) on delete cascade,
  answer_key text,
  matcher_type text not null check (matcher_type in ('exact', 'normalized_exact', 'one_of', 'regex', 'option')),
  matcher_config jsonb not null,
  diagnostic_code text not null references public.exercise_builder_diagnostic_codes(code) on delete restrict,
  priority integer not null default 0,
  created_at timestamptz not null default now()
);

create index exercise_builder_answer_error_mappings_question_idx
  on public.exercise_builder_answer_error_mappings(question_version_id, priority desc);

-- Reusable pools and versioned membership.
create table public.exercise_builder_pools (
  id uuid primary key default gen_random_uuid(),
  public_number integer not null unique check (public_number between 1 and 99999),
  public_id text generated always as ('POOL-' || lpad(public_number::text, 5, '0')) stored,
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'approved', 'published', 'archived')),
  current_version_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger exercise_builder_pools_assign_public_number
before insert on public.exercise_builder_pools
for each row execute function public.assign_exercise_builder_public_number();
create trigger exercise_builder_pools_set_updated_at
before update on public.exercise_builder_pools
for each row execute function public.set_updated_at();

create table public.exercise_builder_pool_versions (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.exercise_builder_pools(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  name text not null,
  description text,
  level text not null check (level in ('A0', 'A1', 'A1+', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C2', 'Mixed')),
  topic text not null,
  subtopic text,
  primary_skill text,
  tags text[] not null default '{}',
  foundation_links jsonb not null default '[]'::jsonb,
  source_import_item_id uuid references public.exercise_builder_import_items(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (pool_id, version_number)
);

alter table public.exercise_builder_pools
  add constraint exercise_builder_pools_current_version_fk
  foreign key (current_version_id)
  references public.exercise_builder_pool_versions(id)
  on delete set null;

create table public.exercise_builder_pool_questions (
  pool_version_id uuid not null references public.exercise_builder_pool_versions(id) on delete cascade,
  question_id uuid not null references public.exercise_builder_questions(id) on delete restrict,
  pinned boolean not null default false,
  selection_weight numeric(8,3) not null default 1 check (selection_weight > 0),
  sequence_index integer,
  metadata jsonb not null default '{}'::jsonb,
  primary key (pool_version_id, question_id)
);

-- Versioned exercises composed of sections, fixed questions, and pool rules.
create table public.exercise_builder_exercises (
  id uuid primary key default gen_random_uuid(),
  public_number integer not null unique check (public_number between 1 and 99999),
  public_id text generated always as ('EX-' || lpad(public_number::text, 5, '0')) stored,
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'approved', 'published', 'archived')),
  current_version_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger exercise_builder_exercises_assign_public_number
before insert on public.exercise_builder_exercises
for each row execute function public.assign_exercise_builder_public_number();
create trigger exercise_builder_exercises_set_updated_at
before update on public.exercise_builder_exercises
for each row execute function public.set_updated_at();

create table public.exercise_builder_exercise_versions (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercise_builder_exercises(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  schema_version integer not null default 1 check (schema_version > 0),
  title text not null,
  description text,
  instructions text not null,
  instruction_language text not null default 'it' check (instruction_language in ('it', 'en')),
  level text not null check (level in ('A0', 'A1', 'A1+', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C2', 'Mixed')),
  topic text not null,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  settings jsonb not null default '{"display_mode":"one_at_a_time","feedback_timing":"section_end","show_score":true,"show_correct_answers":true,"show_explanations":true,"show_diagnostic_summary":true,"allow_retry":true}'::jsonb,
  tags text[] not null default '{}',
  foundation_links jsonb not null default '[]'::jsonb,
  review_status text not null default 'in_review'
    check (review_status in ('in_review', 'approved', 'rejected')),
  source_import_item_id uuid references public.exercise_builder_import_items(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (exercise_id, version_number)
);

alter table public.exercise_builder_exercises
  add constraint exercise_builder_exercises_current_version_fk
  foreign key (current_version_id)
  references public.exercise_builder_exercise_versions(id)
  on delete set null;

create table public.exercise_builder_sections (
  id uuid primary key default gen_random_uuid(),
  exercise_version_id uuid not null references public.exercise_builder_exercise_versions(id) on delete cascade,
  sequence_index integer not null check (sequence_index >= 0),
  title text not null,
  instructions text,
  selection_mode text not null check (selection_mode in ('fixed', 'pool', 'mixed')),
  feedback_timing text not null default 'section_end'
    check (feedback_timing in ('section_end', 'exercise_end', 'hidden')),
  settings jsonb not null default '{}'::jsonb,
  unique (exercise_version_id, sequence_index)
);

create table public.exercise_builder_section_fixed_questions (
  section_id uuid not null references public.exercise_builder_sections(id) on delete cascade,
  question_id uuid not null references public.exercise_builder_questions(id) on delete restrict,
  sequence_index integer not null check (sequence_index >= 0),
  required boolean not null default true,
  primary key (section_id, question_id),
  unique (section_id, sequence_index)
);

create table public.exercise_builder_section_pool_rules (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.exercise_builder_sections(id) on delete cascade,
  pool_id uuid not null references public.exercise_builder_pools(id) on delete restrict,
  question_count integer not null check (question_count > 0),
  selection_strategy text not null default 'balanced'
    check (selection_strategy in ('random', 'avoid_recent', 'unseen_first', 'balanced')),
  filters jsonb not null default '{}'::jsonb,
  distribution_rules jsonb not null default '{}'::jsonb,
  prevent_duplicate_questions boolean not null default true,
  sequence_index integer not null default 0 check (sequence_index >= 0),
  unique (section_id, pool_id, sequence_index)
);

-- Catalog collections group questions, pools, and exercises without affecting
-- their behavior or English Foundations progress.
create table public.exercise_builder_collections (
  id uuid primary key default gen_random_uuid(),
  public_number integer not null unique check (public_number between 1 and 99999),
  public_id text generated always as ('COL-' || lpad(public_number::text, 5, '0')) stored,
  name text not null,
  description text,
  level text check (level in ('A0', 'A1', 'A1+', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C2', 'Mixed')),
  topic text,
  tags text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger exercise_builder_collections_assign_public_number
before insert on public.exercise_builder_collections
for each row execute function public.assign_exercise_builder_public_number();
create trigger exercise_builder_collections_set_updated_at
before update on public.exercise_builder_collections
for each row execute function public.set_updated_at();

create table public.exercise_builder_collection_items (
  collection_id uuid not null references public.exercise_builder_collections(id) on delete cascade,
  entity_type text not null check (entity_type in ('question', 'question_pool', 'exercise')),
  entity_id uuid not null,
  sequence_index integer,
  created_at timestamptz not null default now(),
  primary key (collection_id, entity_type, entity_id)
);

-- Prevent physical deletion of stable identities while referenced by active
-- catalog structures. Historical attempt references will be added to this guard
-- when the learner renderer is introduced.
create or replace function public.guard_exercise_builder_identity_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if TG_TABLE_NAME = 'exercise_builder_questions' then
    if exists (select 1 from public.exercise_builder_pool_questions where question_id = old.id)
      or exists (select 1 from public.exercise_builder_section_fixed_questions where question_id = old.id) then
      raise exception 'Archive this question instead. It is referenced by a pool or exercise.';
    end if;
  elsif TG_TABLE_NAME = 'exercise_builder_pools' then
    if exists (select 1 from public.exercise_builder_section_pool_rules where pool_id = old.id) then
      raise exception 'Archive this pool instead. It is referenced by an exercise.';
    end if;
  end if;

  return old;
end;
$$;

create trigger exercise_builder_questions_guard_delete
before delete on public.exercise_builder_questions
for each row execute function public.guard_exercise_builder_identity_delete();
create trigger exercise_builder_pools_guard_delete
before delete on public.exercise_builder_pools
for each row execute function public.guard_exercise_builder_identity_delete();

-- Admin-only access for the builder foundation. Learner policies are added with
-- the renderer and will expose only snapshotted content assigned to that learner.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'exercise_builder_import_batches',
    'exercise_builder_import_items',
    'exercise_builder_questions',
    'exercise_builder_question_versions',
    'exercise_builder_diagnostic_codes',
    'exercise_builder_diagnostic_messages',
    'exercise_builder_diagnostic_rules',
    'exercise_builder_question_diagnostic_targets',
    'exercise_builder_answer_error_mappings',
    'exercise_builder_pools',
    'exercise_builder_pool_versions',
    'exercise_builder_pool_questions',
    'exercise_builder_exercises',
    'exercise_builder_exercise_versions',
    'exercise_builder_sections',
    'exercise_builder_section_fixed_questions',
    'exercise_builder_section_pool_rules',
    'exercise_builder_collections',
    'exercise_builder_collection_items'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      table_name || '_admin_all',
      table_name
    );
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end;
$$;
