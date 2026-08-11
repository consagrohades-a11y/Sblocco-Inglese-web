-- Recupero Debito Inglese: additive learner programme foundation.
-- Reuses existing auth, Stripe entitlements, Exercise Builder diagnostics and SRS.

alter table public.purchases
  drop constraint if exists purchases_pathway_check;
alter table public.purchases
  add constraint purchases_pathway_check
  check (pathway in ('colloquio', 'lavorare', 'parlare', 'estero', 'basi', 'recupero-debito'));

create table public.recovery_topic_catalog (
  topic_key text primary key check (topic_key ~ '^[a-z0-9-]+$'),
  label text not null,
  diagnostic_key text not null,
  sort_order integer not null check (sort_order > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.recovery_topic_catalog (topic_key, label, diagnostic_key, sort_order) values
  ('present-simple', 'Present Simple', 'present-simple', 10),
  ('present-continuous', 'Present Continuous', 'present-continuous', 20),
  ('present-simple-vs-present-continuous', 'Present Simple vs Present Continuous', 'present-tenses', 30),
  ('past-simple', 'Past Simple', 'past-simple', 40),
  ('past-continuous', 'Past Continuous', 'past-tenses', 50),
  ('present-perfect', 'Present Perfect', 'present-perfect', 60),
  ('past-simple-vs-present-perfect', 'Past Simple vs Present Perfect', 'past-present-perfect', 70),
  ('future-forms', 'Future forms', 'future-forms', 80),
  ('will', 'Will', 'future-forms', 90),
  ('going-to', 'Be going to', 'future-forms', 100),
  ('present-continuous-future', 'Present Continuous for future', 'future-forms', 110),
  ('comparatives', 'Comparatives', 'comparatives-superlatives', 120),
  ('superlatives', 'Superlatives', 'comparatives-superlatives', 130),
  ('modal-verbs', 'Modal verbs', 'modal-verbs', 140),
  ('countable-uncountable', 'Countable and uncountable nouns', 'quantifiers', 150),
  ('some-any', 'Some / any', 'quantifiers', 160),
  ('much-many-a-lot-of', 'Much / many / a lot of', 'quantifiers', 170),
  ('articles', 'Articles', 'articles-pronouns', 180),
  ('pronouns', 'Pronouns', 'articles-pronouns', 190),
  ('possessives', 'Possessives', 'articles-pronouns', 200),
  ('prepositions', 'Prepositions', 'prepositions', 210),
  ('question-formation', 'Question formation', 'questions-negatives', 220),
  ('negatives', 'Negatives', 'questions-negatives', 230),
  ('irregular-verbs', 'Irregular verbs', 'irregular-verbs', 240);

-- Correct answers are intentionally not exposed through table grants. The public
-- diagnostic submits only answer keys and is scored inside a security-definer RPC.
create table public.recovery_diagnostic_answer_keys (
  question_key text primary key check (question_key ~ '^rdq[0-9]{2}$'),
  diagnostic_key text not null,
  correct_option text not null,
  sort_order integer not null unique check (sort_order between 1 and 30)
);

insert into public.recovery_diagnostic_answer_keys (question_key, diagnostic_key, correct_option, sort_order) values
  ('rdq01', 'present-simple', 'b', 1),
  ('rdq02', 'present-simple', 'c', 2),
  ('rdq03', 'present-continuous', 'a', 3),
  ('rdq04', 'present-continuous', 'c', 4),
  ('rdq05', 'past-simple', 'b', 5),
  ('rdq06', 'past-simple', 'a', 6),
  ('rdq07', 'present-perfect', 'c', 7),
  ('rdq08', 'present-perfect', 'b', 8),
  ('rdq09', 'future-forms', 'a', 9),
  ('rdq10', 'future-forms', 'c', 10),
  ('rdq11', 'comparatives-superlatives', 'b', 11),
  ('rdq12', 'comparatives-superlatives', 'a', 12),
  ('rdq13', 'modal-verbs', 'c', 13),
  ('rdq14', 'modal-verbs', 'b', 14),
  ('rdq15', 'quantifiers', 'a', 15),
  ('rdq16', 'quantifiers', 'c', 16),
  ('rdq17', 'articles-pronouns', 'b', 17),
  ('rdq18', 'articles-pronouns', 'a', 18),
  ('rdq19', 'prepositions', 'c', 19),
  ('rdq20', 'prepositions', 'b', 20),
  ('rdq21', 'questions-negatives', 'a', 21),
  ('rdq22', 'questions-negatives', 'c', 22),
  ('rdq23', 'irregular-verbs', 'b', 23),
  ('rdq24', 'irregular-verbs', 'a', 24);

create table public.recovery_diagnostic_attempts (
  id uuid primary key default gen_random_uuid(),
  result_token uuid not null default gen_random_uuid() unique,
  user_id uuid references public.profiles(id) on delete set null,
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  topic_scores jsonb not null default '{}'::jsonb check (jsonb_typeof(topic_scores) = 'object'),
  overall_score numeric(5,2) not null check (overall_score between 0 and 100),
  source text not null default 'test-recupero-inglese' check (length(source) between 1 and 120),
  completed_at timestamptz not null default now(),
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create index recovery_diagnostic_attempts_user_idx
  on public.recovery_diagnostic_attempts(user_id, completed_at desc)
  where user_id is not null;

create table public.recovery_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  offer_id text not null default 'recupero-debito',
  diagnostic_attempt_id uuid references public.recovery_diagnostic_attempts(id) on delete set null,
  class_year smallint check (class_year between 1 and 5),
  exam_date date,
  mode text check (mode in ('complete', 'intensive', 'sos')),
  status text not null default 'onboarding' check (status in ('onboarding', 'active', 'completed', 'archived')),
  plan_version integer not null default 0 check (plan_version >= 0),
  last_planned_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'onboarding' or (class_year is not null and exam_date is not null and mode is not null))
);

create trigger recovery_enrollments_set_updated_at
before update on public.recovery_enrollments
for each row execute function public.set_updated_at();

create unique index recovery_enrollments_one_current_idx
  on public.recovery_enrollments(user_id)
  where status in ('onboarding', 'active');
create index recovery_enrollments_exam_idx
  on public.recovery_enrollments(status, exam_date);

create table public.recovery_student_topics (
  enrollment_id uuid not null references public.recovery_enrollments(id) on delete cascade,
  topic_key text not null references public.recovery_topic_catalog(topic_key) on delete restrict,
  required boolean not null default true,
  diagnostic_score numeric(5,2) check (diagnostic_score is null or diagnostic_score between 0 and 100),
  checkpoint_score numeric(5,2) check (checkpoint_score is null or checkpoint_score between 0 and 100),
  mock_score numeric(5,2) check (mock_score is null or mock_score between 0 and 100),
  mastery_score numeric(5,2) check (mastery_score is null or mastery_score between 0 and 100),
  repeated_errors integer not null default 0 check (repeated_errors >= 0),
  priority_score numeric(5,2) not null default 50 check (priority_score between 0 and 100),
  priority_band text not null default 'medium' check (priority_band in ('high', 'medium', 'low')),
  verification_only boolean not null default false,
  last_evidence_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (enrollment_id, topic_key)
);

create trigger recovery_student_topics_set_updated_at
before update on public.recovery_student_topics
for each row execute function public.set_updated_at();
create index recovery_student_topics_priority_idx
  on public.recovery_student_topics(enrollment_id, required, priority_score desc);

create table public.recovery_plan_sessions (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.recovery_enrollments(id) on delete cascade,
  sequence_index integer not null check (sequence_index > 0),
  session_type text not null check (session_type in ('topic', 'quick_review', 'error_review', 'checkpoint', 'mock_intermediate', 'mock_final')),
  topic_key text references public.recovery_topic_catalog(topic_key) on delete restrict,
  title text not null check (length(trim(title)) between 1 and 180),
  rationale text,
  estimated_minutes integer not null check (estimated_minutes between 5 and 180),
  priority_score numeric(5,2) check (priority_score is null or priority_score between 0 and 100),
  stages jsonb not null default '[]'::jsonb check (jsonb_typeof(stages) = 'array'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  status text not null default 'planned' check (status in ('planned', 'available', 'in_progress', 'completed', 'skipped')),
  assignment_id uuid references public.assignments(id) on delete set null,
  assignment_resource_id uuid references public.assignment_resources(id) on delete set null,
  score numeric(5,2) check (score is null or score between 0 and 100),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id, sequence_index),
  check ((session_type in ('topic', 'quick_review') and topic_key is not null) or session_type not in ('topic', 'quick_review'))
);

create trigger recovery_plan_sessions_set_updated_at
before update on public.recovery_plan_sessions
for each row execute function public.set_updated_at();
create index recovery_plan_sessions_queue_idx
  on public.recovery_plan_sessions(enrollment_id, status, sequence_index);

create table public.recovery_assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.recovery_enrollments(id) on delete cascade,
  session_id uuid not null references public.recovery_plan_sessions(id) on delete cascade,
  assessment_type text not null check (assessment_type in ('checkpoint', 'mock_intermediate', 'mock_final')),
  exercise_attempt_id uuid references public.exercise_builder_attempts(id) on delete set null,
  score numeric(5,2) check (score is null or score between 0 and 100),
  topic_scores jsonb not null default '{}'::jsonb check (jsonb_typeof(topic_scores) = 'object'),
  submitted_at timestamptz,
  feedback_released boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, assessment_type)
);

create trigger recovery_assessment_attempts_set_updated_at
before update on public.recovery_assessment_attempts
for each row execute function public.set_updated_at();

alter table public.recovery_topic_catalog enable row level security;
alter table public.recovery_diagnostic_answer_keys enable row level security;
alter table public.recovery_diagnostic_attempts enable row level security;
alter table public.recovery_enrollments enable row level security;
alter table public.recovery_student_topics enable row level security;
alter table public.recovery_plan_sessions enable row level security;
alter table public.recovery_assessment_attempts enable row level security;

create policy recovery_topic_catalog_read
on public.recovery_topic_catalog for select to anon, authenticated
using (active = true or public.is_admin());
create policy recovery_topic_catalog_admin
on public.recovery_topic_catalog for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy recovery_diagnostic_answer_keys_admin
on public.recovery_diagnostic_answer_keys for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy recovery_diagnostic_attempts_owner_read
on public.recovery_diagnostic_attempts for select to authenticated
using (user_id = auth.uid() or public.is_admin());
create policy recovery_diagnostic_attempts_admin
on public.recovery_diagnostic_attempts for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy recovery_enrollments_owner_read
on public.recovery_enrollments for select to authenticated
using (user_id = auth.uid() or public.is_admin());
create policy recovery_enrollments_admin
on public.recovery_enrollments for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy recovery_student_topics_owner_read
on public.recovery_student_topics for select to authenticated
using (
  public.is_admin()
  or exists (select 1 from public.recovery_enrollments e where e.id = enrollment_id and e.user_id = auth.uid())
);
create policy recovery_student_topics_admin
on public.recovery_student_topics for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy recovery_plan_sessions_owner_read
on public.recovery_plan_sessions for select to authenticated
using (
  public.is_admin()
  or exists (select 1 from public.recovery_enrollments e where e.id = enrollment_id and e.user_id = auth.uid())
);
create policy recovery_plan_sessions_admin
on public.recovery_plan_sessions for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy recovery_assessment_attempts_owner_read
on public.recovery_assessment_attempts for select to authenticated
using (
  public.is_admin()
  or exists (select 1 from public.recovery_enrollments e where e.id = enrollment_id and e.user_id = auth.uid())
);
create policy recovery_assessment_attempts_admin
on public.recovery_assessment_attempts for all to authenticated
using (public.is_admin()) with check (public.is_admin());

grant select on public.recovery_topic_catalog to anon, authenticated;
grant select on public.recovery_diagnostic_attempts, public.recovery_enrollments, public.recovery_student_topics, public.recovery_plan_sessions, public.recovery_assessment_attempts to authenticated;
grant select, insert, update, delete on public.recovery_topic_catalog, public.recovery_diagnostic_answer_keys, public.recovery_diagnostic_attempts, public.recovery_enrollments, public.recovery_student_topics, public.recovery_plan_sessions, public.recovery_assessment_attempts to authenticated;

create or replace function public.submit_public_recovery_diagnostic(
  p_answers jsonb,
  p_source text default 'test-recupero-inglese'
)
returns table (id uuid, result_token uuid, overall_score numeric, topic_scores jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_answer_count integer;
  v_overall numeric;
  v_scores jsonb;
  v_id uuid;
  v_token uuid;
begin
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Invalid answers.';
  end if;

  select count(*) into v_answer_count
  from public.recovery_diagnostic_answer_keys k
  where nullif(p_answers ->> k.question_key, '') is not null;

  if v_answer_count <> (select count(*) from public.recovery_diagnostic_answer_keys) then
    raise exception 'Complete all diagnostic questions before submitting.';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_answers) answer_key
    where not exists (select 1 from public.recovery_diagnostic_answer_keys k where k.question_key = answer_key)
  ) then
    raise exception 'Unknown diagnostic question.';
  end if;

  select round(100.0 * avg(case when p_answers ->> k.question_key = k.correct_option then 1 else 0 end), 0)
  into v_overall
  from public.recovery_diagnostic_answer_keys k;

  select coalesce(jsonb_object_agg(scores.diagnostic_key, scores.score), '{}'::jsonb)
  into v_scores
  from (
    select
      k.diagnostic_key,
      round(100.0 * avg(case when p_answers ->> k.question_key = k.correct_option then 1 else 0 end), 0) as score
    from public.recovery_diagnostic_answer_keys k
    group by k.diagnostic_key
    order by k.diagnostic_key
  ) scores;

  insert into public.recovery_diagnostic_attempts (answers, topic_scores, overall_score, source)
  values (
    p_answers,
    v_scores,
    v_overall,
    left(coalesce(nullif(trim(p_source), ''), 'test-recupero-inglese'), 120)
  )
  returning recovery_diagnostic_attempts.id, recovery_diagnostic_attempts.result_token into v_id, v_token;

  return query select v_id, v_token, v_overall, v_scores;
end;
$$;

create or replace function public.get_public_recovery_diagnostic(p_token uuid)
returns table (overall_score numeric, topic_scores jsonb, completed_at timestamptz)
language sql
security definer
set search_path = ''
stable
as $$
  select attempt.overall_score, attempt.topic_scores, attempt.completed_at
  from public.recovery_diagnostic_attempts attempt
  where attempt.result_token = p_token
  limit 1;
$$;

create or replace function public.claim_recovery_diagnostic(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;

  update public.recovery_diagnostic_attempts attempt
  set user_id = auth.uid(), claimed_at = coalesce(attempt.claimed_at, now())
  where attempt.result_token = p_token
    and (attempt.user_id is null or attempt.user_id = auth.uid())
  returning attempt.id into v_id;

  if v_id is null then raise exception 'Diagnostic result not found or already claimed.'; end if;
  return v_id;
end;
$$;

create or replace function public.has_active_recovery_entitlement(p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_entitlements entitlement
    where entitlement.user_id = p_user_id
      and entitlement.status = 'active'
      and (entitlement.offer_id = 'recupero-debito' or entitlement.access_target = 'recupero-debito')
      and (entitlement.expires_at is null or entitlement.expires_at > now())
  );
$$;

create or replace function public.configure_recovery_enrollment(
  p_class_year integer,
  p_exam_date date,
  p_topic_keys text[],
  p_mode text,
  p_diagnostic_token uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enrollment_id uuid;
  v_diagnostic_id uuid;
  v_diagnostic_scores jsonb := '{}'::jsonb;
  v_topic_key text;
  v_diagnostic_key text;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not public.has_active_recovery_entitlement(auth.uid()) then raise exception 'Recupero Debito entitlement required.'; end if;
  if p_class_year not between 1 and 5 then raise exception 'Invalid class year.'; end if;
  if p_exam_date is null or p_exam_date < current_date then raise exception 'Exam date must be today or later.'; end if;
  if p_mode not in ('complete', 'intensive', 'sos') then raise exception 'Invalid recovery mode.'; end if;
  if coalesce(array_length(p_topic_keys, 1), 0) = 0 then raise exception 'Select at least one school topic.'; end if;
  if exists (
    select 1 from unnest(p_topic_keys) selected(topic_key)
    where not exists (select 1 from public.recovery_topic_catalog catalog where catalog.topic_key = selected.topic_key and catalog.active)
  ) then raise exception 'Unknown recovery topic.'; end if;

  if p_diagnostic_token is not null then
    v_diagnostic_id := public.claim_recovery_diagnostic(p_diagnostic_token);
    select attempt.topic_scores into v_diagnostic_scores
    from public.recovery_diagnostic_attempts attempt
    where attempt.id = v_diagnostic_id;
  else
    select attempt.id, attempt.topic_scores into v_diagnostic_id, v_diagnostic_scores
    from public.recovery_diagnostic_attempts attempt
    where attempt.user_id = auth.uid()
    order by attempt.completed_at desc
    limit 1;
  end if;

  select enrollment.id into v_enrollment_id
  from public.recovery_enrollments enrollment
  where enrollment.user_id = auth.uid()
    and enrollment.status in ('onboarding', 'active')
  order by enrollment.created_at desc
  limit 1
  for update;

  if v_enrollment_id is null then
    insert into public.recovery_enrollments (
      user_id, offer_id, diagnostic_attempt_id, class_year, exam_date, mode, status
    ) values (
      auth.uid(), 'recupero-debito', v_diagnostic_id, p_class_year, p_exam_date, p_mode, 'active'
    ) returning id into v_enrollment_id;
  else
    update public.recovery_enrollments
    set diagnostic_attempt_id = coalesce(v_diagnostic_id, diagnostic_attempt_id),
        class_year = p_class_year,
        exam_date = p_exam_date,
        mode = p_mode,
        status = 'active'
    where id = v_enrollment_id;
  end if;

  update public.recovery_student_topics
  set required = false
  where enrollment_id = v_enrollment_id;

  foreach v_topic_key in array p_topic_keys
  loop
    select catalog.diagnostic_key into v_diagnostic_key
    from public.recovery_topic_catalog catalog
    where catalog.topic_key = v_topic_key;

    insert into public.recovery_student_topics (
      enrollment_id, topic_key, required, diagnostic_score, last_evidence_at
    ) values (
      v_enrollment_id,
      v_topic_key,
      true,
      case when v_diagnostic_scores ? v_diagnostic_key then (v_diagnostic_scores ->> v_diagnostic_key)::numeric else null end,
      case when v_diagnostic_scores ? v_diagnostic_key then now() else null end
    )
    on conflict (enrollment_id, topic_key) do update set
      required = true,
      diagnostic_score = coalesce(excluded.diagnostic_score, recovery_student_topics.diagnostic_score),
      last_evidence_at = coalesce(excluded.last_evidence_at, recovery_student_topics.last_evidence_at);
  end loop;

  return v_enrollment_id;
end;
$$;

create or replace function public.replace_recovery_plan(
  p_enrollment_id uuid,
  p_mode text,
  p_topic_states jsonb,
  p_sessions jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_inserted integer := 0;
  v_first_new_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if p_mode not in ('complete', 'intensive', 'sos') then raise exception 'Invalid recovery mode.'; end if;
  if jsonb_typeof(p_topic_states) <> 'array' or jsonb_typeof(p_sessions) <> 'array' then raise exception 'Invalid recovery plan payload.'; end if;
  if not exists (
    select 1 from public.recovery_enrollments enrollment
    where enrollment.id = p_enrollment_id and enrollment.user_id = auth.uid() and enrollment.status = 'active'
  ) then raise exception 'Recovery enrollment not found.'; end if;

  for v_item in select value from jsonb_array_elements(p_topic_states)
  loop
    update public.recovery_student_topics topic
    set diagnostic_score = coalesce((v_item ->> 'diagnosticScore')::numeric, topic.diagnostic_score),
        checkpoint_score = coalesce((v_item ->> 'checkpointScore')::numeric, topic.checkpoint_score),
        mock_score = coalesce((v_item ->> 'mockScore')::numeric, topic.mock_score),
        mastery_score = coalesce((v_item ->> 'masteryScore')::numeric, topic.mastery_score),
        repeated_errors = greatest(0, coalesce((v_item ->> 'repeatedErrors')::integer, topic.repeated_errors)),
        priority_score = greatest(0, least(100, coalesce((v_item ->> 'priorityScore')::numeric, topic.priority_score))),
        priority_band = coalesce(nullif(v_item ->> 'priorityBand', ''), topic.priority_band),
        verification_only = coalesce((v_item ->> 'verificationOnly')::boolean, topic.verification_only),
        last_evidence_at = now()
    where topic.enrollment_id = p_enrollment_id
      and topic.topic_key = v_item ->> 'topicKey'
      and topic.required;
  end loop;

  delete from public.recovery_plan_sessions session
  where session.enrollment_id = p_enrollment_id
    and session.status in ('planned', 'available');

  for v_item in select value from jsonb_array_elements(p_sessions)
  loop
    if coalesce((v_item ->> 'sequenceIndex')::integer, 0) <= 0 then raise exception 'Invalid session sequence.'; end if;
    if v_item ->> 'sessionType' not in ('topic', 'quick_review', 'error_review', 'checkpoint', 'mock_intermediate', 'mock_final') then raise exception 'Invalid recovery session type.'; end if;

    insert into public.recovery_plan_sessions (
      enrollment_id, sequence_index, session_type, topic_key, title, rationale,
      estimated_minutes, priority_score, stages, metadata, status
    ) values (
      p_enrollment_id,
      (v_item ->> 'sequenceIndex')::integer,
      v_item ->> 'sessionType',
      nullif(v_item ->> 'topicKey', ''),
      left(v_item ->> 'title', 180),
      nullif(v_item ->> 'rationale', ''),
      greatest(5, least(180, coalesce((v_item ->> 'estimatedMinutes')::integer, 30))),
      case when nullif(v_item ->> 'priorityScore', '') is null then null else greatest(0, least(100, (v_item ->> 'priorityScore')::numeric)) end,
      coalesce(v_item -> 'stages', '[]'::jsonb),
      coalesce(v_item -> 'metadata', '{}'::jsonb),
      'planned'
    )
    returning id into v_first_new_id;
    v_inserted := v_inserted + 1;
  end loop;

  update public.recovery_plan_sessions session
  set status = 'available'
  where session.id = (
    select queued.id
    from public.recovery_plan_sessions queued
    where queued.enrollment_id = p_enrollment_id and queued.status = 'planned'
    order by queued.sequence_index
    limit 1
  )
  and not exists (
    select 1 from public.recovery_plan_sessions active
    where active.enrollment_id = p_enrollment_id and active.status in ('available', 'in_progress') and active.id <> session.id
  );

  update public.recovery_enrollments
  set mode = p_mode, plan_version = plan_version + 1, last_planned_at = now()
  where id = p_enrollment_id;

  return v_inserted;
end;
$$;

revoke all on function public.submit_public_recovery_diagnostic(jsonb, text) from public;
revoke all on function public.get_public_recovery_diagnostic(uuid) from public;
revoke all on function public.claim_recovery_diagnostic(uuid) from public;
revoke all on function public.has_active_recovery_entitlement(uuid) from public;
revoke all on function public.configure_recovery_enrollment(integer, date, text[], text, uuid) from public;
revoke all on function public.replace_recovery_plan(uuid, text, jsonb, jsonb) from public;

grant execute on function public.submit_public_recovery_diagnostic(jsonb, text) to anon, authenticated;
grant execute on function public.get_public_recovery_diagnostic(uuid) to anon, authenticated;
grant execute on function public.claim_recovery_diagnostic(uuid) to authenticated;
grant execute on function public.has_active_recovery_entitlement(uuid) to authenticated;
grant execute on function public.configure_recovery_enrollment(integer, date, text[], text, uuid) to authenticated;
grant execute on function public.replace_recovery_plan(uuid, text, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
