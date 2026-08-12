-- Recovery Curriculum v2 runtime foundation.
-- Additive only: this migration does not activate v2 readiness, assign outcomes to learners,
-- materialize cumulative assessments, or mutate topic mastery.

create table public.recovery_curriculum_axes (
  axis_key text primary key check (axis_key ~ '^[a-z][a-z0-9_]*$'),
  label_it text not null check (length(trim(label_it)) between 1 and 120),
  sort_order integer not null unique check (sort_order > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.recovery_curriculum_axes (axis_key, label_it, sort_order) values
  ('grammar_sentence_control', 'Grammatica e controllo della frase', 10),
  ('lexical_competence', 'Competenza lessicale', 20),
  ('reading', 'Comprensione scritta', 30),
  ('writing', 'Produzione scritta', 40),
  ('listening', 'Comprensione orale', 50),
  ('functional_communication', 'Comunicazione funzionale', 60);

create table public.recovery_assessment_modes (
  mode_key text primary key check (mode_key ~ '^[a-z][a-z0-9_]*$'),
  label_it text not null check (length(trim(label_it)) between 1 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.recovery_assessment_modes (mode_key, label_it) values
  ('controlled_gap_fill', 'Completamento controllato'),
  ('sentence_transformation', 'Trasformazione di frase'),
  ('error_correction', 'Correzione dell''errore'),
  ('sentence_building', 'Costruzione di frase'),
  ('translation_it_en', 'Traduzione italiano → inglese'),
  ('mixed_grammar', 'Grammatica mista'),
  ('reading_comprehension', 'Comprensione scritta'),
  ('guided_writing', 'Produzione scritta guidata'),
  ('independent_writing', 'Produzione scritta autonoma'),
  ('listening_comprehension', 'Comprensione orale'),
  ('functional_response', 'Risposta funzionale'),
  ('dialogue_interaction', 'Interazione / dialogo'),
  ('oral_response', 'Produzione orale'),
  ('cumulative_school_test', 'Verifica scolastica cumulativa'),
  ('recovery_mock', 'Simulazione recupero');

create table public.recovery_curriculum_outcomes (
  outcome_id text primary key check (outcome_id ~ '^RY[1-3]-(GRAM|LEX|READ|WRITE|LISTEN|COMM)-[0-9]{3}$'),
  curriculum_id text not null default 'recovery-years-1-3-v2'
    check (length(trim(curriculum_id)) between 1 and 120),
  schema_version integer not null default 1 check (schema_version > 0),
  school_year_profile smallint not null check (school_year_profile between 1 and 3),
  competence_axis text not null references public.recovery_curriculum_axes(axis_key) on delete restrict,
  cefr_target text not null check (cefr_target in ('A1+', 'A2', 'A2+', 'B1', 'B1+')),
  label_it text not null check (length(trim(label_it)) between 1 and 240),
  observable_outcome_it text not null check (length(trim(observable_outcome_it)) >= 20),
  programme_requirement text not null check (programme_requirement in ('default_core', 'default_if_assessed', 'programme_dependent')),
  blocking_candidate boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'active', 'deprecated')),
  source_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(source_payload) = 'object'),
  source_hash text check (source_hash is null or length(source_hash) between 16 and 128),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (outcome_id like 'RY1-%' and school_year_profile = 1)
    or (outcome_id like 'RY2-%' and school_year_profile = 2)
    or (outcome_id like 'RY3-%' and school_year_profile = 3)
  ),
  check (
    (outcome_id like '%-GRAM-%' and competence_axis = 'grammar_sentence_control')
    or (outcome_id like '%-LEX-%' and competence_axis = 'lexical_competence')
    or (outcome_id like '%-READ-%' and competence_axis = 'reading')
    or (outcome_id like '%-WRITE-%' and competence_axis = 'writing')
    or (outcome_id like '%-LISTEN-%' and competence_axis = 'listening')
    or (outcome_id like '%-COMM-%' and competence_axis = 'functional_communication')
  )
);

create trigger recovery_curriculum_outcomes_set_updated_at
before update on public.recovery_curriculum_outcomes
for each row execute function public.set_updated_at();

create index recovery_curriculum_outcomes_profile_idx
  on public.recovery_curriculum_outcomes(school_year_profile, competence_axis, status);

create table public.recovery_enrollment_outcomes (
  enrollment_id uuid not null references public.recovery_enrollments(id) on delete cascade,
  outcome_id text not null references public.recovery_curriculum_outcomes(outcome_id) on delete restrict,
  required boolean not null default true,
  requirement_source text not null check (requirement_source in ('school_programme', 'inferred_year_profile', 'manual_override')),
  requirement_note text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (enrollment_id, outcome_id)
);

create trigger recovery_enrollment_outcomes_set_updated_at
before update on public.recovery_enrollment_outcomes
for each row execute function public.set_updated_at();

create index recovery_enrollment_outcomes_required_idx
  on public.recovery_enrollment_outcomes(enrollment_id, required, outcome_id);

create table public.recovery_assessment_fragments (
  fragment_id text primary key check (fragment_id ~ '^RAF-[A-Z0-9_-]{4,80}$'),
  status text not null default 'draft' check (status in ('draft', 'approved', 'deprecated')),
  exercise_id uuid not null references public.exercise_builder_exercises(id) on delete restrict,
  exercise_version_id uuid not null references public.exercise_builder_exercise_versions(id) on delete restrict,
  year_profiles smallint[] not null check (
    cardinality(year_profiles) between 1 and 3
    and year_profiles <@ array[1,2,3]::smallint[]
  ),
  primary_axis text not null references public.recovery_curriculum_axes(axis_key) on delete restrict,
  secondary_axes text[] not null default '{}'::text[],
  estimated_minutes integer not null check (estimated_minutes between 1 and 60),
  difficulty_band text not null check (length(trim(difficulty_band)) between 1 and 40),
  school_task_family text not null check (length(trim(school_task_family)) between 1 and 80),
  transfer_level text not null check (transfer_level in ('controlled_performance', 'transfer')),
  content_source_policy text not null check (length(trim(content_source_policy)) between 3 and 240),
  form_family_key text not null check (form_family_key ~ '^[a-z0-9][a-z0-9_-]{3,119}$'),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exercise_version_id),
  check (not (primary_axis = any(secondary_axes))),
  check (cardinality(secondary_axes) <= 5)
);

create trigger recovery_assessment_fragments_set_updated_at
before update on public.recovery_assessment_fragments
for each row execute function public.set_updated_at();

create index recovery_assessment_fragments_selection_idx
  on public.recovery_assessment_fragments(status, active, primary_axis, estimated_minutes);
create index recovery_assessment_fragments_form_family_idx
  on public.recovery_assessment_fragments(form_family_key, active);

create table public.recovery_assessment_fragment_outcomes (
  fragment_id text not null references public.recovery_assessment_fragments(fragment_id) on delete cascade,
  outcome_id text not null references public.recovery_curriculum_outcomes(outcome_id) on delete restrict,
  evidence_role text not null default 'primary' check (evidence_role in ('primary', 'supporting')),
  created_at timestamptz not null default now(),
  primary key (fragment_id, outcome_id)
);

create index recovery_assessment_fragment_outcomes_outcome_idx
  on public.recovery_assessment_fragment_outcomes(outcome_id, evidence_role, fragment_id);

create table public.recovery_assessment_fragment_modes (
  fragment_id text not null references public.recovery_assessment_fragments(fragment_id) on delete cascade,
  assessment_mode text not null references public.recovery_assessment_modes(mode_key) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (fragment_id, assessment_mode)
);

create index recovery_assessment_fragment_modes_mode_idx
  on public.recovery_assessment_fragment_modes(assessment_mode, fragment_id);

create table public.recovery_outcome_evidence (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.recovery_enrollments(id) on delete cascade,
  outcome_id text not null references public.recovery_curriculum_outcomes(outcome_id) on delete restrict,
  session_id uuid references public.recovery_plan_sessions(id) on delete set null,
  recovery_assessment_attempt_id uuid references public.recovery_assessment_attempts(id) on delete set null,
  exercise_attempt_id uuid references public.exercise_builder_attempts(id) on delete set null,
  attempt_question_id uuid references public.exercise_builder_attempt_questions(id) on delete set null,
  fragment_id text references public.recovery_assessment_fragments(fragment_id) on delete set null,
  evidence_source text not null check (evidence_source in ('topic_verify', 'checkpoint', 'mock_intermediate', 'mock_final')),
  primary_axis text not null references public.recovery_curriculum_axes(axis_key) on delete restrict,
  assessment_mode text not null references public.recovery_assessment_modes(mode_key) on delete restrict,
  performance_level text not null check (performance_level in ('knowledge', 'controlled_performance', 'transfer')),
  evidence_status text not null default 'valid' check (evidence_status in ('pending_review', 'valid', 'void')),
  score numeric(5,2) check (score is null or score between 0 and 100),
  rubric_dimensions jsonb not null default '{}'::jsonb check (jsonb_typeof(rubric_dimensions) = 'object'),
  form_family_key text not null check (form_family_key ~ '^[a-z0-9][a-z0-9_-]{3,119}$'),
  unseen_or_mixed_context boolean not null default false,
  production_evidence boolean not null default false,
  evidence_key text not null unique check (length(evidence_key) between 8 and 240),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (
    (evidence_status = 'pending_review' and score is null)
    or (evidence_status = 'valid' and score is not null)
    or evidence_status = 'void'
  )
);

create index recovery_outcome_evidence_outcome_idx
  on public.recovery_outcome_evidence(enrollment_id, outcome_id, evidence_status, observed_at desc);
create index recovery_outcome_evidence_axis_idx
  on public.recovery_outcome_evidence(enrollment_id, primary_axis, evidence_status, observed_at desc);
create index recovery_outcome_evidence_form_family_idx
  on public.recovery_outcome_evidence(enrollment_id, outcome_id, form_family_key, observed_at desc);
create index recovery_outcome_evidence_attempt_idx
  on public.recovery_outcome_evidence(exercise_attempt_id)
  where exercise_attempt_id is not null;

alter table public.recovery_curriculum_axes enable row level security;
alter table public.recovery_assessment_modes enable row level security;
alter table public.recovery_curriculum_outcomes enable row level security;
alter table public.recovery_enrollment_outcomes enable row level security;
alter table public.recovery_assessment_fragments enable row level security;
alter table public.recovery_assessment_fragment_outcomes enable row level security;
alter table public.recovery_assessment_fragment_modes enable row level security;
alter table public.recovery_outcome_evidence enable row level security;

create policy recovery_curriculum_axes_authenticated_read
on public.recovery_curriculum_axes for select to authenticated
using (true);

create policy recovery_assessment_modes_authenticated_read
on public.recovery_assessment_modes for select to authenticated
using (true);

create policy recovery_curriculum_outcomes_authenticated_read
on public.recovery_curriculum_outcomes for select to authenticated
using (true);

create policy recovery_assessment_fragments_authenticated_read
on public.recovery_assessment_fragments for select to authenticated
using (true);

create policy recovery_assessment_fragment_outcomes_authenticated_read
on public.recovery_assessment_fragment_outcomes for select to authenticated
using (true);

create policy recovery_assessment_fragment_modes_authenticated_read
on public.recovery_assessment_fragment_modes for select to authenticated
using (true);

create policy recovery_enrollment_outcomes_owner_read
on public.recovery_enrollment_outcomes for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.recovery_enrollments enrollment
    where enrollment.id = enrollment_id
      and enrollment.user_id = (select auth.uid())
  )
);

create policy recovery_outcome_evidence_owner_read
on public.recovery_outcome_evidence for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.recovery_enrollments enrollment
    where enrollment.id = enrollment_id
      and enrollment.user_id = (select auth.uid())
  )
);

revoke all privileges on table public.recovery_curriculum_axes from anon, authenticated;
revoke all privileges on table public.recovery_assessment_modes from anon, authenticated;
revoke all privileges on table public.recovery_curriculum_outcomes from anon, authenticated;
revoke all privileges on table public.recovery_enrollment_outcomes from anon, authenticated;
revoke all privileges on table public.recovery_assessment_fragments from anon, authenticated;
revoke all privileges on table public.recovery_assessment_fragment_outcomes from anon, authenticated;
revoke all privileges on table public.recovery_assessment_fragment_modes from anon, authenticated;
revoke all privileges on table public.recovery_outcome_evidence from anon, authenticated;

grant select on table public.recovery_curriculum_axes to authenticated;
grant select on table public.recovery_assessment_modes to authenticated;
grant select on table public.recovery_curriculum_outcomes to authenticated;
grant select on table public.recovery_enrollment_outcomes to authenticated;
grant select on table public.recovery_assessment_fragments to authenticated;
grant select on table public.recovery_assessment_fragment_outcomes to authenticated;
grant select on table public.recovery_assessment_fragment_modes to authenticated;
grant select on table public.recovery_outcome_evidence to authenticated;

notify pgrst, 'reload schema';
