-- Assigned Exercise Builder player, immutable attempt snapshots, autosave, and server-side grading.

create extension if not exists fuzzystrmatch;

-- Exercise Builder resources are distinct from English Foundations and generated practice.
alter table public.assignment_resources
  add column if not exists exercise_config jsonb;

alter table public.assignment_resources
  drop constraint if exists assignment_resources_resource_type_check;
alter table public.assignment_resources
  add constraint assignment_resources_resource_type_check
  check (resource_type in ('grammar_unit', 'trainer', 'practice_session', 'custom_exercise'));

alter table public.assignment_resources
  drop constraint if exists assignment_resources_route_check;
alter table public.assignment_resources
  add constraint assignment_resources_route_check
  check (
    route in (
      '/levels/a1/be-basic-sentences',
      '/levels/a1/present-simple-normal-verbs',
      '/trainers/business-expression',
      '/trainers/general-expression',
      '/trainers/hospitality-expression',
      '/trainers/word-trainer',
      '/practice',
      '/exercises'
    )
  );

alter table public.assignment_resources
  drop constraint if exists assignment_resources_exercise_config_check;
alter table public.assignment_resources
  add constraint assignment_resources_exercise_config_check
  check (
    resource_type <> 'custom_exercise'
    or (
      route = '/exercises'
      and jsonb_typeof(exercise_config) = 'object'
      and nullif(exercise_config ->> 'exercise_id', '') is not null
      and nullif(exercise_config ->> 'exercise_version_id', '') is not null
    )
  );

create or replace function public.admin_replace_assignment_resources(
  target_assignment_id uuid,
  resources jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  resource jsonb;
  config jsonb;
  custom_config jsonb;
  inserted_count integer := 0;
  resource_route text;
  resource_type_value text;
  resource_key_value text;
  resource_title_value text;
  sequence_value integer;
  exercise_id_value uuid;
  exercise_version_id_value uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;
  if not exists (select 1 from public.assignments where id = target_assignment_id) then
    raise exception 'Assignment not found.';
  end if;
  if resources is null or jsonb_typeof(resources) <> 'array' then
    raise exception 'Resources must be a JSON array.';
  end if;

  delete from public.assignment_resources where assignment_id = target_assignment_id;

  for resource in select value from jsonb_array_elements(resources)
  loop
    resource_key_value := nullif(trim(resource ->> 'key'), '');
    resource_type_value := nullif(trim(resource ->> 'type'), '');
    resource_title_value := nullif(trim(resource ->> 'title'), '');
    resource_route := nullif(trim(resource ->> 'route'), '');
    sequence_value := (resource ->> 'sequence_index')::integer;
    config := resource -> 'practice_config';
    custom_config := resource -> 'exercise_config';

    if resource_key_value is null or resource_title_value is null or resource_route is null then
      raise exception 'Every resource requires key, title, and route.';
    end if;
    if resource_type_value not in ('grammar_unit', 'trainer', 'practice_session', 'custom_exercise') then
      raise exception 'Unsupported resource type.';
    end if;
    if resource_route not in (
      '/levels/a1/be-basic-sentences', '/levels/a1/present-simple-normal-verbs',
      '/trainers/business-expression', '/trainers/general-expression',
      '/trainers/hospitality-expression', '/trainers/word-trainer', '/practice', '/exercises'
    ) then
      raise exception 'Unsupported resource route.';
    end if;
    if sequence_value is null or sequence_value <= 0 then
      raise exception 'Invalid resource sequence.';
    end if;

    if resource_type_value = 'practice_session' then
      if resource_route <> '/practice' or jsonb_typeof(config) <> 'object' then
        raise exception 'Invalid practice session.';
      end if;
      if config ->> 'trainer_id' not in ('word', 'mixed', 'general', 'business', 'hospitality') then
        raise exception 'Invalid practice trainer.';
      end if;
      if coalesce((config ->> 'question_count')::integer, 0) not between 1 and 50 then
        raise exception 'Invalid question count.';
      end if;
      if jsonb_typeof(config -> 'modes') <> 'array' or jsonb_array_length(config -> 'modes') = 0 then
        raise exception 'At least one exercise mode is required.';
      end if;
      if exists (
        select 1 from jsonb_array_elements_text(config -> 'modes') mode
        where mode not in ('italian_to_english', 'english_to_italian', 'multiple_choice', 'sentence_completion')
      ) then
        raise exception 'Invalid exercise mode.';
      end if;
      custom_config := null;
    elsif resource_type_value = 'custom_exercise' then
      if resource_route <> '/exercises' or jsonb_typeof(custom_config) <> 'object' then
        raise exception 'Invalid custom exercise resource.';
      end if;
      exercise_id_value := (custom_config ->> 'exercise_id')::uuid;
      exercise_version_id_value := (custom_config ->> 'exercise_version_id')::uuid;
      if not exists (
        select 1
        from public.exercise_builder_exercises e
        join public.exercise_builder_exercise_versions ev on ev.id = exercise_version_id_value
        where e.id = exercise_id_value
          and ev.exercise_id = e.id
          and e.status = 'published'
          and ev.review_status = 'approved'
      ) then
        raise exception 'Published Exercise Builder exercise not found.';
      end if;
      custom_config := jsonb_build_object(
        'exercise_id', exercise_id_value,
        'exercise_version_id', exercise_version_id_value,
        'completion_rule', coalesce(nullif(custom_config ->> 'completion_rule', ''), 'passed'),
        'required_score', greatest(0, least(100, coalesce((custom_config ->> 'required_score')::numeric, 70))),
        'required_attempts', greatest(1, coalesce((custom_config ->> 'required_attempts')::integer, 1)),
        'allow_retry', coalesce((custom_config ->> 'allow_retry')::boolean, true),
        'show_score', coalesce((custom_config ->> 'show_score')::boolean, true),
        'show_correct_answers', coalesce((custom_config ->> 'show_correct_answers')::boolean, true),
        'show_explanations', coalesce((custom_config ->> 'show_explanations')::boolean, true),
        'show_diagnostic_summary', coalesce((custom_config ->> 'show_diagnostic_summary')::boolean, true)
      );
      config := null;
    else
      config := null;
      custom_config := null;
    end if;

    insert into public.assignment_resources (
      assignment_id, resource_key, resource_type, title, description,
      route, sequence_index, practice_config, exercise_config
    ) values (
      target_assignment_id, resource_key_value, resource_type_value,
      resource_title_value, nullif(trim(resource ->> 'description'), ''),
      resource_route, sequence_value, config, custom_config
    );
    inserted_count := inserted_count + 1;
  end loop;

  return inserted_count;
end;
$$;

revoke all on function public.admin_replace_assignment_resources(uuid, jsonb) from public;
grant execute on function public.admin_replace_assignment_resources(uuid, jsonb) to authenticated;

-- Minimal catalog status workflow. Publishing an exercise approves and publishes
-- every currently referenced question and pool version as one reviewed unit.
create or replace function public.admin_set_exercise_builder_status(
  p_entity_type text,
  p_entity_id uuid,
  p_next_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version_id uuid;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_entity_type not in ('question', 'question_pool', 'exercise') then raise exception 'Unsupported entity type.'; end if;
  if p_next_status not in ('draft', 'in_review', 'approved', 'published', 'archived') then raise exception 'Unsupported status.'; end if;

  if p_entity_type = 'question' then
    select current_version_id into v_version_id from public.exercise_builder_questions where id = p_entity_id;
    if v_version_id is null then raise exception 'Question not found.'; end if;
    if p_next_status in ('approved', 'published') and not exists (
      select 1 from public.exercise_builder_question_versions
      where id = v_version_id
        and question_type = 'content_block'
        or (id = v_version_id and coalesce(jsonb_array_length(diagnostics -> 'tested_codes'), 0) > 0)
    ) then
      raise exception 'Evaluated questions require at least one diagnostic target before approval.';
    end if;
    update public.exercise_builder_question_versions
      set review_status = case when p_next_status in ('approved', 'published') then 'approved' else review_status end
      where id = v_version_id;
    update public.exercise_builder_questions
      set status = p_next_status,
          approved_by = case when p_next_status in ('approved', 'published') then auth.uid() else approved_by end,
          approved_at = case when p_next_status in ('approved', 'published') then now() else approved_at end
      where id = p_entity_id;
  elsif p_entity_type = 'question_pool' then
    select current_version_id into v_version_id from public.exercise_builder_pools where id = p_entity_id;
    if v_version_id is null then raise exception 'Pool not found.'; end if;
    if p_next_status in ('approved', 'published') and not exists (
      select 1 from public.exercise_builder_pool_questions where pool_version_id = v_version_id
    ) then raise exception 'A pool must contain at least one question.'; end if;
    update public.exercise_builder_pools
      set status = p_next_status,
          approved_by = case when p_next_status in ('approved', 'published') then auth.uid() else approved_by end,
          approved_at = case when p_next_status in ('approved', 'published') then now() else approved_at end
      where id = p_entity_id;
  else
    select current_version_id into v_version_id from public.exercise_builder_exercises where id = p_entity_id;
    if v_version_id is null then raise exception 'Exercise not found.'; end if;
    if p_next_status in ('approved', 'published') and not exists (
      select 1 from public.exercise_builder_sections where exercise_version_id = v_version_id
    ) then raise exception 'An exercise must contain at least one section.'; end if;

    if p_next_status in ('approved', 'published') then
      update public.exercise_builder_question_versions qv
        set review_status = 'approved'
      where qv.id in (
        select q.current_version_id
        from public.exercise_builder_questions q
        where q.id in (
          select fq.question_id
          from public.exercise_builder_section_fixed_questions fq
          join public.exercise_builder_sections s on s.id = fq.section_id
          where s.exercise_version_id = v_version_id
          union
          select pq.question_id
          from public.exercise_builder_pool_questions pq
          join public.exercise_builder_pools p on p.current_version_id = pq.pool_version_id
          join public.exercise_builder_section_pool_rules pr on pr.pool_id = p.id
          join public.exercise_builder_sections s on s.id = pr.section_id
          where s.exercise_version_id = v_version_id
        )
      );
      update public.exercise_builder_questions
        set status = p_next_status,
            approved_by = auth.uid(),
            approved_at = now()
      where id in (
        select fq.question_id
        from public.exercise_builder_section_fixed_questions fq
        join public.exercise_builder_sections s on s.id = fq.section_id
        where s.exercise_version_id = v_version_id
        union
        select pq.question_id
        from public.exercise_builder_pool_questions pq
        join public.exercise_builder_pools p on p.current_version_id = pq.pool_version_id
        join public.exercise_builder_section_pool_rules pr on pr.pool_id = p.id
        join public.exercise_builder_sections s on s.id = pr.section_id
        where s.exercise_version_id = v_version_id
      );
      update public.exercise_builder_pools
        set status = p_next_status,
            approved_by = auth.uid(),
            approved_at = now()
      where id in (
        select pr.pool_id
        from public.exercise_builder_section_pool_rules pr
        join public.exercise_builder_sections s on s.id = pr.section_id
        where s.exercise_version_id = v_version_id
      );
      update public.exercise_builder_exercise_versions set review_status = 'approved' where id = v_version_id;
    end if;

    update public.exercise_builder_exercises
      set status = p_next_status,
          approved_by = case when p_next_status in ('approved', 'published') then auth.uid() else approved_by end,
          approved_at = case when p_next_status in ('approved', 'published') then now() else approved_at end,
          published_at = case when p_next_status = 'published' then now() else published_at end
      where id = p_entity_id;
  end if;
end;
$$;

revoke all on function public.admin_set_exercise_builder_status(text, uuid, text) from public;
grant execute on function public.admin_set_exercise_builder_status(text, uuid, text) to authenticated;

create table public.exercise_builder_attempts (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  assignment_resource_id uuid not null references public.assignment_resources(id) on delete cascade,
  exercise_id uuid not null references public.exercise_builder_exercises(id) on delete restrict,
  exercise_version_id uuid not null references public.exercise_builder_exercise_versions(id) on delete restrict,
  attempt_number integer not null check (attempt_number > 0),
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  exercise_snapshot jsonb not null,
  current_section_index integer not null default 0 check (current_section_index >= 0),
  current_question_index integer not null default 0 check (current_question_index >= 0),
  earned_points numeric(12,3),
  max_points numeric(12,3),
  score numeric(7,3),
  result_summary jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (learner_id, assignment_resource_id, attempt_number)
);

create unique index exercise_builder_attempts_one_open_idx
  on public.exercise_builder_attempts(learner_id, assignment_resource_id)
  where status = 'in_progress';
create index exercise_builder_attempts_history_idx
  on public.exercise_builder_attempts(learner_id, exercise_id, submitted_at desc);

create trigger exercise_builder_attempts_set_updated_at
before update on public.exercise_builder_attempts
for each row execute function public.set_updated_at();

create table public.exercise_builder_attempt_sections (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exercise_builder_attempts(id) on delete cascade,
  source_section_id uuid not null references public.exercise_builder_sections(id) on delete restrict,
  sequence_index integer not null check (sequence_index >= 0),
  title text not null,
  instructions text,
  feedback_timing text not null check (feedback_timing in ('section_end', 'exercise_end', 'hidden')),
  settings jsonb not null default '{}'::jsonb,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  earned_points numeric(12,3),
  max_points numeric(12,3),
  completed_at timestamptz,
  unique (attempt_id, sequence_index)
);

create table public.exercise_builder_attempt_questions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exercise_builder_attempts(id) on delete cascade,
  attempt_section_id uuid not null references public.exercise_builder_attempt_sections(id) on delete cascade,
  sequence_index integer not null check (sequence_index >= 0),
  question_id uuid not null references public.exercise_builder_questions(id) on delete restrict,
  question_version_id uuid not null references public.exercise_builder_question_versions(id) on delete restrict,
  question_snapshot jsonb not null,
  answer jsonb,
  grading_result jsonb,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (attempt_section_id, sequence_index)
);

create index exercise_builder_attempt_questions_exposure_idx
  on public.exercise_builder_attempt_questions(question_id, created_at desc);

alter table public.exercise_builder_attempts enable row level security;
alter table public.exercise_builder_attempt_sections enable row level security;
alter table public.exercise_builder_attempt_questions enable row level security;

create policy exercise_builder_attempts_admin_all on public.exercise_builder_attempts
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy exercise_builder_attempt_sections_admin_all on public.exercise_builder_attempt_sections
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy exercise_builder_attempt_questions_admin_all on public.exercise_builder_attempt_questions
for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.exercise_builder_attempts to authenticated;
grant select, insert, update, delete on public.exercise_builder_attempt_sections to authenticated;
grant select, insert, update, delete on public.exercise_builder_attempt_questions to authenticated;

create or replace function public.exercise_builder_normalize_answer(p_value text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(
    regexp_replace(
      lower(replace(replace(coalesce(p_value, ''), '’', ''''), '‘', '''')),
      '[.,!?;:]+', '', 'g'
    ),
    '\s+', ' ', 'g'
  ));
$$;

create or replace function public.exercise_builder_full_question_snapshot(p_question_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'question_id', q.id,
    'question_version_id', qv.id,
    'public_id', q.public_id,
    'type', qv.question_type,
    'title', qv.title,
    'prompt', qv.prompt,
    'instructions', qv.instructions,
    'instruction_language', qv.instruction_language,
    'level', qv.level,
    'topic', qv.topic,
    'subtopic', qv.subtopic,
    'primary_skill', qv.primary_skill,
    'learning_objective', qv.learning_objective,
    'difficulty', qv.difficulty,
    'content', qv.content,
    'grading', qv.grading,
    'feedback', qv.feedback,
    'diagnostics', qv.diagnostics,
    'tags', to_jsonb(qv.tags)
  )
  from public.exercise_builder_questions q
  join public.exercise_builder_question_versions qv on qv.id = q.current_version_id
  where q.id = p_question_id
    and q.status = 'published'
    and qv.review_status = 'approved';
$$;

create or replace function public.exercise_builder_safe_question_snapshot(p_snapshot jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_type text := p_snapshot ->> 'type';
  v_content jsonb := coalesce(p_snapshot -> 'content', '{}'::jsonb);
  v_options jsonb;
  v_blanks jsonb;
begin
  if v_type in ('multiple_choice', 'multiple_select') then
    select coalesce(jsonb_agg(jsonb_build_object('key', value->>'key', 'text', value->>'text')), '[]'::jsonb)
      into v_options
    from jsonb_array_elements(coalesce(v_content -> 'options', '[]'::jsonb));
    v_content := (v_content - 'correct_answer') || jsonb_build_object('options', v_options);
  elsif v_type in ('gap_fill', 'select_gap') then
    select coalesce(jsonb_agg(
      jsonb_strip_nulls(jsonb_build_object(
        'key', value->>'key',
        'options', case when v_type = 'select_gap' then value->'options' else null end,
        'points', value->'points'
      ))
    ), '[]'::jsonb) into v_blanks
    from jsonb_array_elements(coalesce(v_content -> 'blanks', '[]'::jsonb));
    v_content := v_content || jsonb_build_object('blanks', v_blanks);
  elsif v_type in ('translation', 'error_correction') then
    v_content := v_content - 'accepted_answers';
  elsif v_type = 'word_order' then
    v_content := v_content - 'correct_order';
  end if;

  return (p_snapshot - 'feedback' - 'diagnostics' - 'grading') || jsonb_build_object('content', v_content);
end;
$$;

create or replace function public.exercise_builder_grade_answer(p_snapshot jsonb, p_answer jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_type text := p_snapshot ->> 'type';
  v_content jsonb := coalesce(p_snapshot -> 'content', '{}'::jsonb);
  v_grading jsonb := coalesce(p_snapshot -> 'grading', '{}'::jsonb);
  v_weight numeric := greatest(0.001, coalesce((v_grading ->> 'weight')::numeric, 1));
  v_nearly numeric := greatest(0, least(1, coalesce((v_grading ->> 'nearly_correct_multiplier')::numeric, 0.5)));
  v_status text := 'incorrect';
  v_earned numeric := 0;
  v_max numeric := v_weight;
  v_correct jsonb := null;
  v_expected text;
  v_submitted text;
  v_option jsonb;
  v_blank jsonb;
  v_key text;
  v_value text;
  v_accepted text;
  v_blank_points numeric;
  v_blank_earned numeric;
  v_blank_results jsonb := '[]'::jsonb;
  v_correct_count integer := 0;
  v_total_count integer := 0;
  v_nearly_count integer := 0;
  v_expected_array text[];
  v_submitted_array text[];
begin
  if v_type = 'content_block' then
    return jsonb_build_object('status', 'correct', 'earned_points', 0, 'max_points', 0, 'correct_answer', null);
  end if;

  if p_answer is null or p_answer = 'null'::jsonb or p_answer = '""'::jsonb or p_answer = '{}'::jsonb or p_answer = '[]'::jsonb then
    return jsonb_build_object('status', 'unanswered', 'earned_points', 0, 'max_points', v_max, 'correct_answer', null);
  end if;

  if v_type = 'multiple_choice' then
    select value into v_option
    from jsonb_array_elements(coalesce(v_content -> 'options', '[]'::jsonb))
    where coalesce((value ->> 'is_correct')::boolean, false)
    limit 1;
    v_expected := coalesce(v_option ->> 'key', v_option ->> 'text');
    v_submitted := trim(both '"' from p_answer::text);
    v_correct := to_jsonb(v_expected);
    if v_submitted = v_expected then v_status := 'correct'; v_earned := v_max; end if;
  elsif v_type = 'multiple_select' then
    select array_agg(value order by value) into v_expected_array
      from (
        select coalesce(value->>'key', value->>'text') value
        from jsonb_array_elements(coalesce(v_content -> 'options', '[]'::jsonb))
        where coalesce((value ->> 'is_correct')::boolean, false)
      ) selected;
    select array_agg(value order by value) into v_submitted_array
      from jsonb_array_elements_text(coalesce(p_answer, '[]'::jsonb));
    v_correct := to_jsonb(coalesce(v_expected_array, '{}'::text[]));
    if coalesce(v_submitted_array, '{}'::text[]) = coalesce(v_expected_array, '{}'::text[]) then
      v_status := 'correct'; v_earned := v_max;
    end if;
  elsif v_type in ('gap_fill', 'select_gap') then
    v_max := 0;
    for v_blank in select value from jsonb_array_elements(coalesce(v_content -> 'blanks', '[]'::jsonb))
    loop
      v_total_count := v_total_count + 1;
      v_key := v_blank ->> 'key';
      v_value := coalesce(p_answer ->> v_key, '');
      v_blank_points := greatest(0.001, coalesce((v_blank ->> 'points')::numeric, 1)) * v_weight;
      v_max := v_max + v_blank_points;
      v_blank_earned := 0;
      v_status := 'incorrect';
      for v_accepted in select value from jsonb_array_elements_text(coalesce(v_blank -> 'accepted_answers', '[]'::jsonb))
      loop
        if public.exercise_builder_normalize_answer(v_value) = public.exercise_builder_normalize_answer(v_accepted) then
          v_status := 'correct'; v_blank_earned := v_blank_points; exit;
        elsif length(public.exercise_builder_normalize_answer(v_value)) >= 4
          and levenshtein(public.exercise_builder_normalize_answer(v_value), public.exercise_builder_normalize_answer(v_accepted)) <= 1 then
          v_status := 'nearly_correct'; v_blank_earned := greatest(v_blank_earned, v_blank_points * v_nearly);
        end if;
      end loop;
      if v_status = 'correct' then v_correct_count := v_correct_count + 1;
      elsif v_status = 'nearly_correct' then v_nearly_count := v_nearly_count + 1; end if;
      v_earned := v_earned + v_blank_earned;
      v_blank_results := v_blank_results || jsonb_build_array(jsonb_build_object(
        'key', v_key,
        'status', v_status,
        'earned_points', v_blank_earned,
        'max_points', v_blank_points,
        'correct_answer', coalesce(v_blank -> 'accepted_answers', '[]'::jsonb)
      ));
    end loop;
    if v_correct_count = v_total_count then v_status := 'correct';
    elsif v_correct_count + v_nearly_count = v_total_count and v_nearly_count > 0 then v_status := 'nearly_correct';
    else v_status := 'incorrect'; end if;
    v_correct := v_blank_results;
  elsif v_type in ('translation', 'error_correction') then
    v_submitted := trim(both '"' from p_answer::text);
    v_correct := coalesce(v_content -> 'accepted_answers', '[]'::jsonb);
    for v_accepted in select value from jsonb_array_elements_text(coalesce(v_content -> 'accepted_answers', '[]'::jsonb))
    loop
      if public.exercise_builder_normalize_answer(v_submitted) = public.exercise_builder_normalize_answer(v_accepted) then
        v_status := 'correct'; v_earned := v_max; exit;
      elsif length(public.exercise_builder_normalize_answer(v_submitted)) >= 4
        and levenshtein(public.exercise_builder_normalize_answer(v_submitted), public.exercise_builder_normalize_answer(v_accepted)) <= 1 then
        v_status := 'nearly_correct'; v_earned := greatest(v_earned, v_max * v_nearly);
      end if;
    end loop;
  elsif v_type = 'word_order' then
    select string_agg(value, ' ' order by ordinality) into v_expected
      from jsonb_array_elements_text(coalesce(v_content -> 'correct_order', '[]'::jsonb)) with ordinality;
    if jsonb_typeof(p_answer) = 'array' then
      select string_agg(value, ' ' order by ordinality) into v_submitted
        from jsonb_array_elements_text(p_answer) with ordinality;
    else
      v_submitted := trim(both '"' from p_answer::text);
    end if;
    v_correct := coalesce(v_content -> 'correct_order', '[]'::jsonb);
    if public.exercise_builder_normalize_answer(v_submitted) = public.exercise_builder_normalize_answer(v_expected) then
      v_status := 'correct'; v_earned := v_max;
    end if;
  end if;

  return jsonb_build_object(
    'status', v_status,
    'earned_points', round(v_earned, 3),
    'max_points', round(v_max, 3),
    'correct_answer', v_correct,
    'explanation', coalesce(p_snapshot #> '{feedback,explanation}', p_snapshot #> '{feedback,incorrect}', 'null'::jsonb)
  );
end;
$$;

create or replace function public.exercise_builder_attempt_payload(p_attempt_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'attempt', jsonb_build_object(
      'id', a.id,
      'status', a.status,
      'attempt_number', a.attempt_number,
      'current_section_index', a.current_section_index,
      'current_question_index', a.current_question_index,
      'earned_points', a.earned_points,
      'max_points', a.max_points,
      'score', a.score,
      'result_summary', a.result_summary,
      'started_at', a.started_at,
      'submitted_at', a.submitted_at
    ),
    'exercise', a.exercise_snapshot,
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'sequence_index', s.sequence_index,
        'title', s.title,
        'instructions', s.instructions,
        'feedback_timing', s.feedback_timing,
        'settings', s.settings,
        'status', s.status,
        'earned_points', s.earned_points,
        'max_points', s.max_points,
        'questions', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', q.id,
            'sequence_index', q.sequence_index,
            'question', public.exercise_builder_safe_question_snapshot(q.question_snapshot),
            'answer', q.answer,
            'result', case
              when a.status = 'submitted' then q.grading_result
              when s.status = 'completed' and s.feedback_timing = 'section_end' then q.grading_result
              else null
            end
          ) order by q.sequence_index)
          from public.exercise_builder_attempt_questions q
          where q.attempt_section_id = s.id
        ), '[]'::jsonb)
      ) order by s.sequence_index)
      from public.exercise_builder_attempt_sections s
      where s.attempt_id = a.id
    ), '[]'::jsonb)
  )
  from public.exercise_builder_attempts a
  where a.id = p_attempt_id
    and (a.learner_id = auth.uid() or public.is_admin());
$$;

create or replace function public.get_or_create_assigned_exercise_attempt(
  p_assignment_id uuid,
  p_resource_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resource record;
  v_attempt_id uuid;
  v_attempt_number integer;
  v_exercise_snapshot jsonb;
  v_section record;
  v_attempt_section_id uuid;
  v_fixed record;
  v_rule record;
  v_candidate record;
  v_sequence integer;
  v_needed integer;
  v_inserted integer;
  v_question_snapshot jsonb;
  v_latest_submitted uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;

  select a.learner_id, a.status assignment_status, r.exercise_config,
         (r.exercise_config ->> 'exercise_id')::uuid exercise_id,
         (r.exercise_config ->> 'exercise_version_id')::uuid exercise_version_id
    into v_resource
  from public.assignments a
  join public.assignment_resources r on r.assignment_id = a.id
  where a.id = p_assignment_id
    and r.id = p_resource_id
    and r.resource_type = 'custom_exercise'
    and r.route = '/exercises'
    and a.status in ('published', 'completed')
    and (a.learner_id = auth.uid() or public.is_admin());

  if v_resource.exercise_id is null then raise exception 'Assigned exercise not found.'; end if;

  select id into v_attempt_id
  from public.exercise_builder_attempts
  where learner_id = v_resource.learner_id
    and assignment_resource_id = p_resource_id
    and status = 'in_progress'
  limit 1;
  if v_attempt_id is not null then return public.exercise_builder_attempt_payload(v_attempt_id); end if;

  select id into v_latest_submitted
  from public.exercise_builder_attempts
  where learner_id = v_resource.learner_id and assignment_resource_id = p_resource_id and status = 'submitted'
  order by attempt_number desc limit 1;
  if v_latest_submitted is not null and coalesce((v_resource.exercise_config ->> 'allow_retry')::boolean, true) = false then
    return public.exercise_builder_attempt_payload(v_latest_submitted);
  end if;

  select jsonb_build_object(
    'id', e.id,
    'version_id', ev.id,
    'public_id', e.public_id,
    'title', ev.title,
    'description', ev.description,
    'instructions', ev.instructions,
    'instruction_language', ev.instruction_language,
    'level', ev.level,
    'topic', ev.topic,
    'estimated_minutes', ev.estimated_minutes,
    'settings', ev.settings || jsonb_build_object(
      'show_score', coalesce((v_resource.exercise_config ->> 'show_score')::boolean, true),
      'show_correct_answers', coalesce((v_resource.exercise_config ->> 'show_correct_answers')::boolean, true),
      'show_explanations', coalesce((v_resource.exercise_config ->> 'show_explanations')::boolean, true),
      'show_diagnostic_summary', coalesce((v_resource.exercise_config ->> 'show_diagnostic_summary')::boolean, true)
    )
  ) into v_exercise_snapshot
  from public.exercise_builder_exercises e
  join public.exercise_builder_exercise_versions ev on ev.id = v_resource.exercise_version_id
  where e.id = v_resource.exercise_id and ev.exercise_id = e.id
    and ev.review_status = 'approved';
  if v_exercise_snapshot is null then raise exception 'The assigned exercise version is unavailable.'; end if;

  select coalesce(max(attempt_number), 0) + 1 into v_attempt_number
  from public.exercise_builder_attempts
  where learner_id = v_resource.learner_id and assignment_resource_id = p_resource_id;

  insert into public.exercise_builder_attempts (
    learner_id, assignment_id, assignment_resource_id, exercise_id, exercise_version_id,
    attempt_number, exercise_snapshot
  ) values (
    v_resource.learner_id, p_assignment_id, p_resource_id, v_resource.exercise_id,
    v_resource.exercise_version_id, v_attempt_number, v_exercise_snapshot
  ) returning id into v_attempt_id;

  create temporary table if not exists exercise_builder_selected_questions (
    question_id uuid primary key
  ) on commit drop;
  truncate exercise_builder_selected_questions;

  for v_section in
    select * from public.exercise_builder_sections
    where exercise_version_id = v_resource.exercise_version_id
    order by sequence_index
  loop
    insert into public.exercise_builder_attempt_sections (
      attempt_id, source_section_id, sequence_index, title, instructions, feedback_timing, settings
    ) values (
      v_attempt_id, v_section.id, v_section.sequence_index, v_section.title,
      v_section.instructions, v_section.feedback_timing, v_section.settings
    ) returning id into v_attempt_section_id;
    v_sequence := 0;

    for v_fixed in
      select fq.question_id
      from public.exercise_builder_section_fixed_questions fq
      where fq.section_id = v_section.id
      order by fq.sequence_index
    loop
      if not exists (select 1 from exercise_builder_selected_questions where question_id = v_fixed.question_id) then
        v_question_snapshot := public.exercise_builder_full_question_snapshot(v_fixed.question_id);
        if v_question_snapshot is null then raise exception 'A fixed question is not published.'; end if;
        insert into public.exercise_builder_attempt_questions (
          attempt_id, attempt_section_id, sequence_index, question_id, question_version_id, question_snapshot
        ) values (
          v_attempt_id, v_attempt_section_id, v_sequence, v_fixed.question_id,
          (v_question_snapshot ->> 'question_version_id')::uuid, v_question_snapshot
        );
        insert into exercise_builder_selected_questions values (v_fixed.question_id) on conflict do nothing;
        v_sequence := v_sequence + 1;
      end if;
    end loop;

    for v_rule in
      select pr.*, p.current_version_id pool_version_id
      from public.exercise_builder_section_pool_rules pr
      join public.exercise_builder_pools p on p.id = pr.pool_id
      where pr.section_id = v_section.id and p.status = 'published'
      order by pr.sequence_index
    loop
      v_needed := v_rule.question_count;
      v_inserted := 0;

      for v_candidate in
        select pq.question_id
        from public.exercise_builder_pool_questions pq
        join public.exercise_builder_questions q on q.id = pq.question_id and q.status = 'published'
        join public.exercise_builder_question_versions qv on qv.id = q.current_version_id and qv.review_status = 'approved'
        where pq.pool_version_id = v_rule.pool_version_id
          and pq.pinned
          and not exists (select 1 from exercise_builder_selected_questions selected where selected.question_id = pq.question_id)
        order by coalesce(pq.sequence_index, 999999), q.public_number
        limit v_needed
      loop
        v_question_snapshot := public.exercise_builder_full_question_snapshot(v_candidate.question_id);
        insert into public.exercise_builder_attempt_questions (
          attempt_id, attempt_section_id, sequence_index, question_id, question_version_id, question_snapshot
        ) values (
          v_attempt_id, v_attempt_section_id, v_sequence, v_candidate.question_id,
          (v_question_snapshot ->> 'question_version_id')::uuid, v_question_snapshot
        );
        insert into exercise_builder_selected_questions values (v_candidate.question_id) on conflict do nothing;
        v_sequence := v_sequence + 1;
        v_inserted := v_inserted + 1;
      end loop;

      v_needed := v_needed - v_inserted;
      if v_needed > 0 then
        for v_candidate in
          select pq.question_id,
                 coalesce(history.exposure_count, 0) exposure_count,
                 history.last_seen
          from public.exercise_builder_pool_questions pq
          join public.exercise_builder_questions q on q.id = pq.question_id and q.status = 'published'
          join public.exercise_builder_question_versions qv on qv.id = q.current_version_id and qv.review_status = 'approved'
          left join lateral (
            select count(*) exposure_count, max(aq.created_at) last_seen
            from public.exercise_builder_attempt_questions aq
            join public.exercise_builder_attempts a on a.id = aq.attempt_id
            where a.learner_id = v_resource.learner_id and aq.question_id = pq.question_id
          ) history on true
          where pq.pool_version_id = v_rule.pool_version_id
            and not exists (select 1 from exercise_builder_selected_questions selected where selected.question_id = pq.question_id)
            and (
              not (v_rule.filters ? 'question_types')
              or qv.question_type in (select value from jsonb_array_elements_text(v_rule.filters -> 'question_types'))
            )
            and (
              not (v_rule.filters ? 'difficulty')
              or qv.difficulty in (select value from jsonb_array_elements_text(v_rule.filters -> 'difficulty'))
            )
            and (
              not (v_rule.filters ? 'tags')
              or qv.tags && public.exercise_builder_jsonb_text_array(v_rule.filters -> 'tags')
            )
          order by
            case when v_rule.selection_strategy in ('unseen_first', 'avoid_recent', 'balanced') then coalesce(history.exposure_count, 0) end asc,
            case when v_rule.selection_strategy in ('avoid_recent', 'balanced') then history.last_seen end asc nulls first,
            random()
          limit v_needed
        loop
          v_question_snapshot := public.exercise_builder_full_question_snapshot(v_candidate.question_id);
          insert into public.exercise_builder_attempt_questions (
            attempt_id, attempt_section_id, sequence_index, question_id, question_version_id, question_snapshot
          ) values (
            v_attempt_id, v_attempt_section_id, v_sequence, v_candidate.question_id,
            (v_question_snapshot ->> 'question_version_id')::uuid, v_question_snapshot
          );
          insert into exercise_builder_selected_questions values (v_candidate.question_id) on conflict do nothing;
          v_sequence := v_sequence + 1;
          v_inserted := v_inserted + 1;
        end loop;
      end if;

      if v_inserted < v_rule.question_count then
        raise exception 'Pool % cannot provide % unique published questions.', v_rule.pool_id, v_rule.question_count;
      end if;
    end loop;

    if v_sequence = 0 then raise exception 'An exercise section produced no questions.'; end if;
  end loop;

  return public.exercise_builder_attempt_payload(v_attempt_id);
end;
$$;

create or replace function public.save_exercise_builder_answer(
  p_attempt_id uuid,
  p_attempt_question_id uuid,
  p_answer jsonb,
  p_current_section_index integer,
  p_current_question_index integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.exercise_builder_attempts
    where id = p_attempt_id and learner_id = auth.uid() and status = 'in_progress'
  ) then raise exception 'Open attempt not found.'; end if;
  if not exists (
    select 1 from public.exercise_builder_attempt_questions
    where id = p_attempt_question_id and attempt_id = p_attempt_id
  ) then raise exception 'Attempt question not found.'; end if;

  update public.exercise_builder_attempt_questions
    set answer = p_answer, answered_at = now()
    where id = p_attempt_question_id and attempt_id = p_attempt_id;
  update public.exercise_builder_attempts
    set current_section_index = greatest(0, p_current_section_index),
        current_question_index = greatest(0, p_current_question_index)
    where id = p_attempt_id;
  return public.exercise_builder_attempt_payload(p_attempt_id);
end;
$$;

create or replace function public.complete_exercise_builder_section(
  p_attempt_id uuid,
  p_section_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question record;
  v_earned numeric := 0;
  v_max numeric := 0;
  v_result jsonb;
begin
  if not exists (
    select 1 from public.exercise_builder_attempts a
    join public.exercise_builder_attempt_sections s on s.attempt_id = a.id
    where a.id = p_attempt_id and a.learner_id = auth.uid() and a.status = 'in_progress' and s.id = p_section_id
  ) then raise exception 'Open section not found.'; end if;

  for v_question in
    select * from public.exercise_builder_attempt_questions
    where attempt_id = p_attempt_id and attempt_section_id = p_section_id
  loop
    v_result := public.exercise_builder_grade_answer(v_question.question_snapshot, v_question.answer);
    update public.exercise_builder_attempt_questions set grading_result = v_result where id = v_question.id;
    v_earned := v_earned + coalesce((v_result ->> 'earned_points')::numeric, 0);
    v_max := v_max + coalesce((v_result ->> 'max_points')::numeric, 0);
  end loop;

  update public.exercise_builder_attempt_sections
    set status = 'completed', earned_points = v_earned, max_points = v_max, completed_at = now()
    where id = p_section_id and attempt_id = p_attempt_id;
  return public.exercise_builder_attempt_payload(p_attempt_id);
end;
$$;

create or replace function public.submit_exercise_builder_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
  v_question record;
  v_result jsonb;
  v_earned numeric := 0;
  v_max numeric := 0;
  v_score numeric := 0;
  v_config jsonb;
  v_complete boolean := false;
  v_correct integer := 0;
  v_nearly integer := 0;
  v_incorrect integer := 0;
  v_unanswered integer := 0;
begin
  select * into v_attempt from public.exercise_builder_attempts
  where id = p_attempt_id and learner_id = auth.uid() and status = 'in_progress';
  if v_attempt.id is null then raise exception 'Open attempt not found.'; end if;

  for v_question in select * from public.exercise_builder_attempt_questions where attempt_id = p_attempt_id
  loop
    v_result := public.exercise_builder_grade_answer(v_question.question_snapshot, v_question.answer);
    update public.exercise_builder_attempt_questions set grading_result = v_result where id = v_question.id;
    v_earned := v_earned + coalesce((v_result ->> 'earned_points')::numeric, 0);
    v_max := v_max + coalesce((v_result ->> 'max_points')::numeric, 0);
    case v_result ->> 'status'
      when 'correct' then v_correct := v_correct + 1;
      when 'nearly_correct' then v_nearly := v_nearly + 1;
      when 'unanswered' then v_unanswered := v_unanswered + 1;
      else v_incorrect := v_incorrect + 1;
    end case;
  end loop;
  v_score := case when v_max > 0 then round((v_earned / v_max) * 100, 3) else 100 end;

  update public.exercise_builder_attempt_sections s
    set status = 'completed',
        earned_points = summary.earned,
        max_points = summary.maximum,
        completed_at = coalesce(s.completed_at, now())
  from (
    select attempt_section_id, sum(coalesce((grading_result ->> 'earned_points')::numeric, 0)) earned,
           sum(coalesce((grading_result ->> 'max_points')::numeric, 0)) maximum
    from public.exercise_builder_attempt_questions
    where attempt_id = p_attempt_id group by attempt_section_id
  ) summary
  where s.id = summary.attempt_section_id;

  update public.exercise_builder_attempts
    set status = 'submitted', earned_points = v_earned, max_points = v_max, score = v_score,
        result_summary = jsonb_build_object(
          'correct', v_correct, 'nearly_correct', v_nearly,
          'incorrect', v_incorrect, 'unanswered', v_unanswered
        ), submitted_at = now()
    where id = p_attempt_id;

  select exercise_config into v_config from public.assignment_resources where id = v_attempt.assignment_resource_id;
  if coalesce(v_config ->> 'completion_rule', 'passed') = 'submitted' then v_complete := true;
  elsif coalesce(v_config ->> 'completion_rule', 'passed') = 'attempts' then
    v_complete := v_attempt.attempt_number >= greatest(1, coalesce((v_config ->> 'required_attempts')::integer, 1));
  else
    v_complete := v_score >= greatest(0, least(100, coalesce((v_config ->> 'required_score')::numeric, 70)));
  end if;
  if v_complete then
    update public.assignments set status = 'completed'
      where id = v_attempt.assignment_id and learner_id = auth.uid();
  end if;

  return public.exercise_builder_attempt_payload(p_attempt_id);
end;
$$;

revoke all on function public.get_or_create_assigned_exercise_attempt(uuid, uuid) from public;
revoke all on function public.save_exercise_builder_answer(uuid, uuid, jsonb, integer, integer) from public;
revoke all on function public.complete_exercise_builder_section(uuid, uuid) from public;
revoke all on function public.submit_exercise_builder_attempt(uuid) from public;
revoke all on function public.exercise_builder_attempt_payload(uuid) from public;
grant execute on function public.get_or_create_assigned_exercise_attempt(uuid, uuid) to authenticated;
grant execute on function public.save_exercise_builder_answer(uuid, uuid, jsonb, integer, integer) to authenticated;
grant execute on function public.complete_exercise_builder_section(uuid, uuid) to authenticated;
grant execute on function public.submit_exercise_builder_attempt(uuid) to authenticated;
grant execute on function public.exercise_builder_attempt_payload(uuid) to authenticated;

-- Stable identities may no longer be physically deleted after they appear in attempts.
create or replace function public.guard_exercise_builder_identity_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if TG_TABLE_NAME = 'exercise_builder_questions' then
    if exists (select 1 from public.exercise_builder_pool_questions where question_id = old.id)
      or exists (select 1 from public.exercise_builder_section_fixed_questions where question_id = old.id)
      or exists (select 1 from public.exercise_builder_attempt_questions where question_id = old.id) then
      raise exception 'Archive this question instead. It is referenced by a pool, exercise, or attempt.';
    end if;
  elsif TG_TABLE_NAME = 'exercise_builder_pools' then
    if exists (select 1 from public.exercise_builder_section_pool_rules where pool_id = old.id) then
      raise exception 'Archive this pool instead. It is referenced by an exercise.';
    end if;
  elsif TG_TABLE_NAME = 'exercise_builder_exercises' then
    if exists (select 1 from public.exercise_builder_attempts where exercise_id = old.id)
      or exists (
        select 1 from public.assignment_resources
        where resource_type = 'custom_exercise' and exercise_config ->> 'exercise_id' = old.id::text
      ) then
      raise exception 'Archive this exercise instead. It is assigned or has attempt history.';
    end if;
  end if;
  return old;
end;
$$;

drop trigger if exists exercise_builder_exercises_guard_delete on public.exercise_builder_exercises;
create trigger exercise_builder_exercises_guard_delete
before delete on public.exercise_builder_exercises
for each row execute function public.guard_exercise_builder_identity_delete();
