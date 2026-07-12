-- Sblocco Inglese Trainer initial database foundation.
-- Review-only migration: do not apply to production until schema and RLS are approved.
-- Security assumptions:
-- 1. Browser clients use only Supabase anon/publishable keys.
-- 2. Admin authorization is represented by public.profiles.role = 'admin'.
-- 3. The first admin profile must be created through a trusted manual/admin process outside this migration.
-- 4. RLS, not client code, protects learner-specific data and unpublished content.

create extension if not exists pgcrypto;

-- Shared helpers.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Admin lookup intentionally uses a protected profiles field instead of hardcoded email.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

-- User profiles and learner-teacher relationships.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  interface_language text not null default 'it'
    check (interface_language in ('it', 'en')),
  timezone text not null default 'Europe/Rome',
  role text not null default 'learner'
    check (role in ('learner', 'admin')),
  status text not null default 'active'
    check (status in ('active', 'suspended', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table public.teaching_relationships (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  relationship_type text not null
    check (relationship_type in ('preply', 'public_cohort', 'company_cohort', 'private_programme')),
  status text not null default 'active'
    check (status in ('active', 'paused', 'ended')),
  starts_at date not null default current_date,
  ends_at date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at),
  check (learner_id <> teacher_id)
);

create trigger teaching_relationships_set_updated_at
before update on public.teaching_relationships
for each row execute function public.set_updated_at();

-- Learning content identity and word/expression extensions.

create table public.learning_items (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  item_type text not null check (item_type in ('word', 'expression')),
  display_target text not null,
  level text not null check (level in ('A0', 'A1', 'A2', 'B1', 'B2', 'C1')),
  primary_domain text not null,
  topic text,
  priority text not null
    check (priority in ('essential', 'high_frequency', 'useful', 'specialised', 'advanced_low_frequency')),
  priority_rank integer check (priority_rank is null or priority_rank > 0),
  status text not null default 'draft'
    check (status in ('draft', 'review_needed', 'approved', 'published', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger learning_items_set_updated_at
before update on public.learning_items
for each row execute function public.set_updated_at();

create table public.words (
  id uuid primary key references public.learning_items(id) on delete cascade,
  lemma text not null,
  sense_label text,
  italian_meaning text not null,
  english_definition text not null,
  part_of_speech text not null,
  countability text check (countability in ('countable', 'uncountable', 'both')),
  plural_form text,
  base_form text,
  past_form text,
  past_participle text,
  third_person_form text,
  ing_form text,
  register text check (register in ('informal', 'neutral', 'professional', 'formal')),
  usage_channel text not null default 'both'
    check (usage_channel in ('spoken', 'written', 'both')),
  common_collocations text[] not null default '{}',
  common_mistakes text,
  metadata jsonb not null default '{}'::jsonb
);

create table public.expressions (
  id uuid primary key references public.learning_items(id) on delete cascade,
  canonical_text text not null,
  canonical_pattern text,
  italian_meaning text not null,
  english_explanation text not null,
  communicative_function text not null,
  speech_act text,
  interaction_role text,
  speaker_role text,
  listener_role text,
  primary_context text not null,
  register text not null check (register in ('informal', 'neutral', 'professional', 'formal')),
  usage_channel text not null default 'both'
    check (usage_channel in ('spoken', 'written', 'both')),
  tone text,
  suitable_responses text[] not null default '{}',
  unsuitable_alternatives text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb
);

-- Sentence bank and reviewed links to learning items.

create table public.sentence_bank_entries (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  sentence_text text not null,
  purpose text not null
    check (purpose in (
      'teaching_example',
      'recognition',
      'reverse_recall',
      'gap_fill',
      'collocation',
      'confusable_contrast',
      'false_friend_correction',
      'dialogue_prompt',
      'dialogue_response',
      'register_contrast',
      'production_prompt',
      'assessment'
    )),
  context text not null,
  domain text not null,
  level text not null check (level in ('A0', 'A1', 'A2', 'B1', 'B2', 'C1')),
  speaker_role text,
  listener_role text,
  linked_prompt_id uuid references public.sentence_bank_entries(id) on delete set null,
  provenance text not null,
  status text not null default 'draft'
    check (status in ('draft', 'review_needed', 'approved', 'published', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger sentence_bank_entries_set_updated_at
before update on public.sentence_bank_entries
for each row execute function public.set_updated_at();

create table public.learning_item_sentence_links (
  id uuid primary key default gen_random_uuid(),
  learning_item_id uuid not null references public.learning_items(id) on delete cascade,
  sentence_id uuid not null references public.sentence_bank_entries(id) on delete cascade,
  link_role text not null
    check (link_role in ('target', 'supporting', 'accepted_answer', 'distractor_source', 'contrast_item')),
  created_at timestamptz not null default now(),
  unique (learning_item_id, sentence_id, link_role)
);

-- Collections and stable item references.

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  title text not null,
  description text,
  collection_type text not null
    check (collection_type in ('reusable', 'starter_pack', 'specialist', 'lesson', 'temporary_custom', 'assignment_snapshot')),
  status text not null default 'draft'
    check (status in ('draft', 'review_needed', 'approved', 'published', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger collections_set_updated_at
before update on public.collections
for each row execute function public.set_updated_at();

create table public.collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  learning_item_id uuid not null references public.learning_items(id) on delete restrict,
  sequence_index integer not null check (sequence_index > 0),
  introduction_state text not null default 'new_unexplained'
    check (introduction_state in ('new_unexplained', 'introduced_in_class', 'already_familiar', 'review_only', 'test_immediately')),
  required boolean not null default true,
  created_at timestamptz not null default now(),
  unique (collection_id, learning_item_id),
  unique (collection_id, sequence_index)
);

-- Assignments are admin-authored and learner-readable. Assignment items snapshot the assigned content.

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  teaching_relationship_id uuid references public.teaching_relationships(id) on delete set null,
  title text not null,
  reason text,
  learner_note text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'completed', 'archived')),
  required boolean not null default true,
  deadline_at timestamptz,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  published_at timestamptz,
  access_ends_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger assignments_set_updated_at
before update on public.assignments
for each row execute function public.set_updated_at();

create table public.assignment_items (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  learning_item_id uuid references public.learning_items(id) on delete restrict,
  collection_id uuid references public.collections(id) on delete restrict,
  sequence_index integer not null check (sequence_index > 0),
  required boolean not null default true,
  introduction_state text not null default 'new_unexplained'
    check (introduction_state in ('new_unexplained', 'introduced_in_class', 'already_familiar', 'review_only', 'test_immediately')),
  created_at timestamptz not null default now(),
  check (
    (learning_item_id is not null and collection_id is null)
    or (learning_item_id is null and collection_id is not null)
  ),
  unique (assignment_id, sequence_index)
);

create or replace function public.can_read_assignment(target_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.assignments
    where id = target_assignment_id
      and (
        learner_id = auth.uid()
        or teacher_id = auth.uid()
        or public.is_admin()
      )
  );
$$;

-- Learner SRS state, immutable review history, and immutable applied attempts.

create table public.learner_srs_state (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles(id) on delete cascade,
  learning_item_id uuid not null references public.learning_items(id) on delete cascade,
  state text not null default 'new'
    check (state in ('new', 'introduced', 'learning', 'reviewing', 'due', 'strong', 'mastered', 'lapsed', 'suspended')),
  due_at timestamptz,
  interval_days integer not null default 0 check (interval_days >= 0),
  ease_factor numeric(4,2) not null default 2.50 check (ease_factor >= 1.00),
  difficulty numeric(4,2) not null default 0.00 check (difficulty >= 0.00),
  repetitions integer not null default 0 check (repetitions >= 0),
  lapses integer not null default 0 check (lapses >= 0),
  last_rating text check (last_rating in ('again', 'hard', 'good', 'easy')),
  last_objective_result text check (last_objective_result in ('correct', 'nearly_correct', 'incorrect', 'skipped')),
  last_reviewed_at timestamptz,
  source text not null default 'learner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (learner_id, learning_item_id)
);

create trigger learner_srs_state_set_updated_at
before update on public.learner_srs_state
for each row execute function public.set_updated_at();

create table public.learner_review_history (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles(id) on delete cascade,
  learning_item_id uuid not null references public.learning_items(id) on delete cascade,
  assignment_item_id uuid references public.assignment_items(id) on delete set null,
  sentence_id uuid references public.sentence_bank_entries(id) on delete set null,
  review_direction text not null,
  submitted_response text,
  objective_result text not null
    check (objective_result in ('correct', 'nearly_correct', 'incorrect', 'skipped')),
  self_rating text check (self_rating in ('again', 'hard', 'good', 'easy')),
  response_time_ms integer check (response_time_ms is null or response_time_ms >= 0),
  previous_due_at timestamptz,
  next_due_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.applied_practice_attempts (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles(id) on delete cascade,
  learning_item_id uuid references public.learning_items(id) on delete set null,
  sentence_id uuid references public.sentence_bank_entries(id) on delete set null,
  assignment_item_id uuid references public.assignment_items(id) on delete set null,
  exercise_type text not null,
  context text,
  submitted_response text,
  result text not null
    check (result in ('correct', 'nearly_correct', 'incorrect', 'skipped')),
  score numeric(5,2) check (score is null or (score >= 0 and score <= 100)),
  attempt_number integer not null default 1 check (attempt_number > 0),
  hints_used integer not null default 0 check (hints_used >= 0),
  response_time_ms integer check (response_time_ms is null or response_time_ms >= 0),
  created_at timestamptz not null default now()
);

-- Indexes for common learner, content, publication, and assignment access paths.

create index profiles_role_idx on public.profiles(role);
create index profiles_status_idx on public.profiles(status);

create index teaching_relationships_learner_idx on public.teaching_relationships(learner_id);
create index teaching_relationships_teacher_idx on public.teaching_relationships(teacher_id);
create index teaching_relationships_status_idx on public.teaching_relationships(status);

create index learning_items_type_status_idx on public.learning_items(item_type, status);
create index learning_items_level_idx on public.learning_items(level);
create index learning_items_domain_idx on public.learning_items(primary_domain);

create index sentence_bank_entries_status_idx on public.sentence_bank_entries(status);
create index sentence_bank_entries_purpose_idx on public.sentence_bank_entries(purpose);
create index learning_item_sentence_links_item_idx on public.learning_item_sentence_links(learning_item_id);
create index learning_item_sentence_links_sentence_idx on public.learning_item_sentence_links(sentence_id);

create index collections_status_idx on public.collections(status);
create index collection_items_collection_idx on public.collection_items(collection_id, sequence_index);
create index collection_items_learning_item_idx on public.collection_items(learning_item_id);

create index assignments_learner_status_idx on public.assignments(learner_id, status);
create index assignments_teacher_idx on public.assignments(teacher_id);
create index assignments_deadline_idx on public.assignments(deadline_at);
create index assignment_items_assignment_idx on public.assignment_items(assignment_id, sequence_index);
create index assignment_items_learning_item_idx on public.assignment_items(learning_item_id);

create index learner_srs_state_due_idx on public.learner_srs_state(learner_id, due_at);
create index learner_srs_state_item_idx on public.learner_srs_state(learning_item_id);
create index learner_review_history_learner_created_idx on public.learner_review_history(learner_id, created_at desc);
create index learner_review_history_item_idx on public.learner_review_history(learning_item_id);
create index applied_practice_attempts_learner_created_idx on public.applied_practice_attempts(learner_id, created_at desc);
create index applied_practice_attempts_item_idx on public.applied_practice_attempts(learning_item_id);

-- RLS is enabled on all tables in this foundation, including public content tables.

alter table public.profiles enable row level security;
alter table public.teaching_relationships enable row level security;
alter table public.learning_items enable row level security;
alter table public.words enable row level security;
alter table public.expressions enable row level security;
alter table public.sentence_bank_entries enable row level security;
alter table public.learning_item_sentence_links enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_items enable row level security;
alter table public.learner_srs_state enable row level security;
alter table public.learner_review_history enable row level security;
alter table public.applied_practice_attempts enable row level security;

-- Profiles and relationships: learners see themselves; admins can administer.

create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles_insert_own_learner"
on public.profiles
for insert
to authenticated
with check (id = auth.uid() and role = 'learner' and status = 'active');

create policy "profiles_update_own_safe_fields"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and role = 'learner');

create policy "profiles_admin_all"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "teaching_relationships_select_related_or_admin"
on public.teaching_relationships
for select
to authenticated
using (learner_id = auth.uid() or teacher_id = auth.uid() or public.is_admin());

create policy "teaching_relationships_admin_all"
on public.teaching_relationships
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Published learning content is readable with the publishable key; only admins write content.

create policy "learning_items_read_published"
on public.learning_items
for select
to anon, authenticated
using (status = 'published');

create policy "learning_items_admin_all"
on public.learning_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "words_read_published_parent"
on public.words
for select
to anon, authenticated
using (
  exists (
    select 1 from public.learning_items
    where learning_items.id = words.id
      and learning_items.item_type = 'word'
      and learning_items.status = 'published'
  )
);

create policy "words_admin_all"
on public.words
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "expressions_read_published_parent"
on public.expressions
for select
to anon, authenticated
using (
  exists (
    select 1 from public.learning_items
    where learning_items.id = expressions.id
      and learning_items.item_type = 'expression'
      and learning_items.status = 'published'
  )
);

create policy "expressions_admin_all"
on public.expressions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "sentence_bank_entries_read_published"
on public.sentence_bank_entries
for select
to anon, authenticated
using (status = 'published');

create policy "sentence_bank_entries_admin_all"
on public.sentence_bank_entries
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "learning_item_sentence_links_read_published"
on public.learning_item_sentence_links
for select
to anon, authenticated
using (
  exists (
    select 1 from public.learning_items
    where learning_items.id = learning_item_sentence_links.learning_item_id
      and learning_items.status = 'published'
  )
  and exists (
    select 1 from public.sentence_bank_entries
    where sentence_bank_entries.id = learning_item_sentence_links.sentence_id
      and sentence_bank_entries.status = 'published'
  )
);

create policy "learning_item_sentence_links_admin_all"
on public.learning_item_sentence_links
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "collections_read_published"
on public.collections
for select
to anon, authenticated
using (status = 'published');

create policy "collections_admin_all"
on public.collections
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "collection_items_read_published_collection_and_item"
on public.collection_items
for select
to anon, authenticated
using (
  exists (
    select 1 from public.collections
    where collections.id = collection_items.collection_id
      and collections.status = 'published'
  )
  and exists (
    select 1 from public.learning_items
    where learning_items.id = collection_items.learning_item_id
      and learning_items.status = 'published'
  )
);

create policy "collection_items_admin_all"
on public.collection_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Assignments and learner activity: learners access only their own rows; admins can administer.

create policy "assignments_select_related_or_admin"
on public.assignments
for select
to authenticated
using (learner_id = auth.uid() or teacher_id = auth.uid() or public.is_admin());

create policy "assignments_admin_all"
on public.assignments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "assignment_items_select_if_assignment_readable"
on public.assignment_items
for select
to authenticated
using (public.can_read_assignment(assignment_id));

create policy "assignment_items_admin_all"
on public.assignment_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "learner_srs_state_select_own_or_admin"
on public.learner_srs_state
for select
to authenticated
using (learner_id = auth.uid() or public.is_admin());

create policy "learner_srs_state_insert_own"
on public.learner_srs_state
for insert
to authenticated
with check (learner_id = auth.uid());

create policy "learner_srs_state_update_own"
on public.learner_srs_state
for update
to authenticated
using (learner_id = auth.uid())
with check (learner_id = auth.uid());

create policy "learner_srs_state_admin_all"
on public.learner_srs_state
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "learner_review_history_select_own_or_admin"
on public.learner_review_history
for select
to authenticated
using (learner_id = auth.uid() or public.is_admin());

create policy "learner_review_history_insert_own"
on public.learner_review_history
for insert
to authenticated
with check (learner_id = auth.uid());

create policy "learner_review_history_admin_select"
on public.learner_review_history
for select
to authenticated
using (public.is_admin());

create policy "applied_practice_attempts_select_own_or_admin"
on public.applied_practice_attempts
for select
to authenticated
using (learner_id = auth.uid() or public.is_admin());

create policy "applied_practice_attempts_insert_own"
on public.applied_practice_attempts
for insert
to authenticated
with check (learner_id = auth.uid());

create policy "applied_practice_attempts_admin_select"
on public.applied_practice_attempts
for select
to authenticated
using (public.is_admin());

-- Explicit grants keep anonymous users read-only and only for published-content tables.
-- Authenticated grants are still constrained by RLS policies above.

grant usage on schema public to anon, authenticated;

grant select on
  public.learning_items,
  public.words,
  public.expressions,
  public.sentence_bank_entries,
  public.learning_item_sentence_links,
  public.collections,
  public.collection_items
to anon;

grant select, insert, update, delete on
  public.profiles,
  public.teaching_relationships,
  public.learning_items,
  public.words,
  public.expressions,
  public.sentence_bank_entries,
  public.learning_item_sentence_links,
  public.collections,
  public.collection_items,
  public.assignments,
  public.assignment_items,
  public.learner_srs_state,
  public.learner_review_history,
  public.applied_practice_attempts
to authenticated;
