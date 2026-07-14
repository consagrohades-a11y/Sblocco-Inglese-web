-- Exercise Builder diagnostic events, learner summaries, and compact feedback.

create table public.exercise_builder_diagnostic_events (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles(id) on delete cascade,
  attempt_id uuid not null references public.exercise_builder_attempts(id) on delete cascade,
  attempt_question_id uuid not null references public.exercise_builder_attempt_questions(id) on delete cascade,
  question_version_id uuid not null references public.exercise_builder_question_versions(id) on delete restrict,
  diagnostic_code text not null references public.exercise_builder_diagnostic_codes(code) on delete restrict,
  opportunity_count numeric(10,3) not null default 0 check (opportunity_count >= 0),
  error_count numeric(10,3) not null default 0 check (error_count >= 0),
  answer_result text not null check (answer_result in ('correct', 'nearly_correct', 'incorrect', 'unanswered')),
  created_at timestamptz not null default now(),
  unique (attempt_question_id, diagnostic_code)
);

create index exercise_builder_diagnostic_events_learner_idx
  on public.exercise_builder_diagnostic_events(learner_id, diagnostic_code, created_at desc);
create index exercise_builder_diagnostic_events_attempt_idx
  on public.exercise_builder_diagnostic_events(attempt_id, diagnostic_code);

create table public.exercise_builder_attempt_diagnostic_summaries (
  attempt_id uuid primary key references public.exercise_builder_attempts(id) on delete cascade,
  learner_id uuid not null references public.profiles(id) on delete cascade,
  language text not null default 'it' check (language in ('it', 'en')),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger exercise_builder_attempt_diagnostic_summaries_updated_at
before update on public.exercise_builder_attempt_diagnostic_summaries
for each row execute function public.set_updated_at();

create table public.exercise_builder_learner_diagnostic_summaries (
  learner_id uuid not null references public.profiles(id) on delete cascade,
  diagnostic_code text not null references public.exercise_builder_diagnostic_codes(code) on delete restrict,
  total_opportunities numeric(12,3) not null default 0,
  total_errors numeric(12,3) not null default 0,
  recent_opportunities numeric(12,3) not null default 0,
  recent_errors numeric(12,3) not null default 0,
  error_rate numeric(8,5) not null default 0,
  recent_error_rate numeric(8,5) not null default 0,
  diagnostic_status text not null default 'not_enough_data'
    check (diagnostic_status in ('not_enough_data', 'emerging_weakness', 'weakness', 'improving', 'stable', 'mastered')),
  first_detected_at timestamptz,
  last_detected_at timestamptz,
  last_improved_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (learner_id, diagnostic_code)
);

alter table public.exercise_builder_diagnostic_events enable row level security;
alter table public.exercise_builder_attempt_diagnostic_summaries enable row level security;
alter table public.exercise_builder_learner_diagnostic_summaries enable row level security;

create policy exercise_builder_diagnostic_events_admin_all
on public.exercise_builder_diagnostic_events for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy exercise_builder_diagnostic_events_learner_select
on public.exercise_builder_diagnostic_events for select to authenticated
using (learner_id = auth.uid());

create policy exercise_builder_attempt_diagnostic_summaries_admin_all
on public.exercise_builder_attempt_diagnostic_summaries for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy exercise_builder_attempt_diagnostic_summaries_learner_select
on public.exercise_builder_attempt_diagnostic_summaries for select to authenticated
using (learner_id = auth.uid());

create policy exercise_builder_learner_diagnostic_summaries_admin_all
on public.exercise_builder_learner_diagnostic_summaries for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy exercise_builder_learner_diagnostic_summaries_learner_select
on public.exercise_builder_learner_diagnostic_summaries for select to authenticated
using (learner_id = auth.uid());

grant select on public.exercise_builder_diagnostic_events to authenticated;
grant select on public.exercise_builder_attempt_diagnostic_summaries to authenticated;
grant select on public.exercise_builder_learner_diagnostic_summaries to authenticated;

create or replace function public.exercise_builder_diagnostic_message(
  p_code text,
  p_language text,
  p_level text
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select message_text
  from public.exercise_builder_diagnostic_messages
  where diagnostic_code = p_code
    and language in (case when p_language in ('it', 'en') then p_language else 'it' end, 'it')
  order by
    case when language = case when p_language in ('it', 'en') then p_language else 'it' end then 0 else 1 end,
    case message_level
      when p_level then 0
      when 'weakness' then 1
      when 'reminder' then 2
      when 'subtopic_review' then 3
      else 4
    end
  limit 1;
$$;

create or replace function public.exercise_builder_diagnostic_answer_text(
  p_answer jsonb,
  p_answer_key text default null
)
returns text
language plpgsql
immutable
as $$
begin
  if p_answer is null or p_answer = 'null'::jsonb then return ''; end if;
  if p_answer_key is not null and jsonb_typeof(p_answer) = 'object' then
    return coalesce(p_answer ->> p_answer_key, '');
  end if;
  if jsonb_typeof(p_answer) = 'string' then
    return trim(both '"' from p_answer::text);
  end if;
  if jsonb_typeof(p_answer) = 'array' then
    return coalesce((select string_agg(value, ' ' order by ordinality) from jsonb_array_elements_text(p_answer) with ordinality), '');
  end if;
  return p_answer::text;
end;
$$;

create or replace function public.exercise_builder_diagnostic_mapping_matches(
  p_mapping jsonb,
  p_answer jsonb
)
returns boolean
language plpgsql
immutable
as $$
declare
  v_type text := coalesce(nullif(p_mapping ->> 'matcher_type', ''), 'normalized_exact');
  v_key text := nullif(p_mapping ->> 'answer_key', '');
  v_config jsonb := coalesce(p_mapping -> 'matcher_config', '{}'::jsonb);
  v_answer text := public.exercise_builder_diagnostic_answer_text(p_answer, v_key);
  v_expected text;
begin
  if v_type = 'option' then
    v_expected := coalesce(v_config ->> 'option_key', v_key);
    if jsonb_typeof(p_answer) = 'array' then
      return exists (select 1 from jsonb_array_elements_text(p_answer) selected where selected = v_expected);
    end if;
    return v_answer = v_expected;
  elsif v_type = 'exact' then
    v_expected := coalesce(v_config ->> 'value', v_key, '');
    return v_answer = v_expected;
  elsif v_type = 'normalized_exact' then
    v_expected := coalesce(v_config ->> 'value', v_key, '');
    return public.exercise_builder_normalize_answer(v_answer) = public.exercise_builder_normalize_answer(v_expected);
  elsif v_type = 'one_of' then
    return exists (
      select 1 from jsonb_array_elements_text(coalesce(v_config -> 'values', '[]'::jsonb)) expected
      where public.exercise_builder_normalize_answer(v_answer) = public.exercise_builder_normalize_answer(expected)
    );
  elsif v_type = 'regex' then
    return v_answer ~ coalesce(nullif(v_config ->> 'pattern', ''), 'a^');
  end if;
  return false;
end;
$$;

create or replace function public.exercise_builder_attempt_diagnostic_json(
  p_attempt_id uuid,
  p_language text default 'it'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_language text := case when p_language in ('it', 'en') then p_language else 'it' end;
  v_rule record;
  v_main jsonb := null;
  v_secondary jsonb := '[]'::jsonb;
  v_precision jsonb := '[]'::jsonb;
  v_main_code text;
  v_main_topic text;
  v_suppress boolean := false;
  v_message text;
  v_level text;
  v_topic_errors numeric;
  v_topic_opportunities numeric;
  v_topic_rate numeric;
  v_required_groups jsonb;
begin
  for v_rule in
    select r.*
    from public.exercise_builder_diagnostic_rules r
    where r.status = 'active'
    order by r.priority desc, r.rule_key
  loop
    select
      sum(e.error_count),
      sum(e.opportunity_count),
      case when sum(e.opportunity_count) > 0 then sum(e.error_count) / sum(e.opportunity_count) else 0 end
      into v_topic_errors, v_topic_opportunities, v_topic_rate
    from public.exercise_builder_diagnostic_events e
    join public.exercise_builder_diagnostic_codes c on c.code = e.diagnostic_code
    where e.attempt_id = p_attempt_id
      and c.category = 'learning'
      and c.topic = v_rule.topic;

    if coalesce(v_topic_errors, 0) <= 0 then continue; end if;
    if (
      select count(distinct e.diagnostic_code)
      from public.exercise_builder_diagnostic_events e
      join public.exercise_builder_diagnostic_codes c on c.code = e.diagnostic_code
      where e.attempt_id = p_attempt_id and e.error_count > 0 and c.category = 'learning' and c.topic = v_rule.topic
    ) < coalesce((v_rule.trigger_config ->> 'minimum_distinct_error_codes')::integer, 1) then continue; end if;
    if (
      select count(distinct coalesce(c.group_key, c.subtopic, c.code))
      from public.exercise_builder_diagnostic_events e
      join public.exercise_builder_diagnostic_codes c on c.code = e.diagnostic_code
      where e.attempt_id = p_attempt_id and e.error_count > 0 and c.category = 'learning' and c.topic = v_rule.topic
    ) < coalesce((v_rule.trigger_config ->> 'minimum_distinct_groups')::integer, 1) then continue; end if;
    if v_topic_rate < coalesce((v_rule.trigger_config ->> 'minimum_error_rate')::numeric, 0) then continue; end if;

    v_required_groups := coalesce(v_rule.trigger_config -> 'required_groups', '[]'::jsonb);
    if exists (
      select 1 from jsonb_array_elements_text(v_required_groups) required_group
      where not exists (
        select 1
        from public.exercise_builder_diagnostic_events e
        join public.exercise_builder_diagnostic_codes c on c.code = e.diagnostic_code
        where e.attempt_id = p_attempt_id and e.error_count > 0
          and c.topic = v_rule.topic
          and coalesce(c.group_key, c.subtopic, c.code) = required_group
      )
    ) then continue; end if;

    v_main_code := nullif(v_rule.output_config ->> 'diagnostic_code', '');
    v_main_topic := v_rule.topic;
    v_level := coalesce(nullif(v_rule.output_config ->> 'message_level', ''), 'topic_review');
    v_message := coalesce(
      v_rule.output_config #>> array['messages', v_language],
      v_rule.output_config #>> '{messages,it}',
      public.exercise_builder_diagnostic_message(v_main_code, v_language, v_level)
    );
    v_main := jsonb_strip_nulls(jsonb_build_object(
      'source', 'rule',
      'rule_key', v_rule.rule_key,
      'code', v_main_code,
      'topic', v_main_topic,
      'level', v_level,
      'message', v_message,
      'errors', v_topic_errors,
      'opportunities', v_topic_opportunities,
      'error_rate', round(v_topic_rate, 4)
    ));
    v_suppress := v_rule.suppress_specific_messages;
    exit;
  end loop;

  if v_main is null then
    select
      e.diagnostic_code,
      c.topic,
      case
        when sum(e.error_count) >= 2 and sum(e.error_count) / nullif(sum(e.opportunity_count), 0) >= 0.30 then 'weakness'
        else 'reminder'
      end,
      sum(e.error_count),
      sum(e.opportunity_count),
      sum(e.error_count) / nullif(sum(e.opportunity_count), 0)
      into v_main_code, v_main_topic, v_level, v_topic_errors, v_topic_opportunities, v_topic_rate
    from public.exercise_builder_diagnostic_events e
    join public.exercise_builder_diagnostic_codes c on c.code = e.diagnostic_code
    where e.attempt_id = p_attempt_id and e.error_count > 0 and c.category = 'learning'
    group by e.diagnostic_code, c.topic, c.severity
    order by case c.severity when 'major' then 3 when 'minor' then 2 else 1 end desc,
             sum(e.error_count) desc,
             sum(e.error_count) / nullif(sum(e.opportunity_count), 0) desc
    limit 1;

    if v_main_code is not null then
      v_message := public.exercise_builder_diagnostic_message(v_main_code, v_language, v_level);
      v_main := jsonb_build_object(
        'source', 'code',
        'code', v_main_code,
        'topic', v_main_topic,
        'level', v_level,
        'message', v_message,
        'errors', v_topic_errors,
        'opportunities', v_topic_opportunities,
        'error_rate', round(coalesce(v_topic_rate, 0), 4)
      );
    end if;
  end if;

  select coalesce(jsonb_agg(item), '[]'::jsonb) into v_secondary
  from (
    select jsonb_build_object(
      'code', stats.diagnostic_code,
      'topic', stats.topic,
      'level', stats.message_level,
      'message', public.exercise_builder_diagnostic_message(stats.diagnostic_code, v_language, stats.message_level),
      'errors', stats.errors,
      'opportunities', stats.opportunities,
      'error_rate', round(stats.error_rate, 4)
    ) item
    from (
      select e.diagnostic_code, c.topic,
             sum(e.error_count) errors,
             sum(e.opportunity_count) opportunities,
             sum(e.error_count) / nullif(sum(e.opportunity_count), 0) error_rate,
             case when sum(e.error_count) >= 2 and sum(e.error_count) / nullif(sum(e.opportunity_count), 0) >= 0.30 then 'weakness' else 'reminder' end message_level,
             c.severity
      from public.exercise_builder_diagnostic_events e
      join public.exercise_builder_diagnostic_codes c on c.code = e.diagnostic_code
      where e.attempt_id = p_attempt_id and e.error_count > 0 and c.category = 'learning'
        and (v_main_code is null or e.diagnostic_code <> v_main_code)
        and (not v_suppress or v_main_topic is null or c.topic <> v_main_topic)
      group by e.diagnostic_code, c.topic, c.severity
      order by case c.severity when 'major' then 3 when 'minor' then 2 else 1 end desc,
               sum(e.error_count) desc
      limit 2
    ) stats
  ) messages;

  select coalesce(jsonb_agg(item), '[]'::jsonb) into v_precision
  from (
    select jsonb_build_object(
      'code', stats.diagnostic_code,
      'message', public.exercise_builder_diagnostic_message(stats.diagnostic_code, v_language, 'reminder'),
      'errors', stats.errors,
      'opportunities', stats.opportunities
    ) item
    from (
      select e.diagnostic_code, sum(e.error_count) errors, sum(e.opportunity_count) opportunities
      from public.exercise_builder_diagnostic_events e
      join public.exercise_builder_diagnostic_codes c on c.code = e.diagnostic_code
      where e.attempt_id = p_attempt_id and e.error_count > 0 and c.category = 'precision'
      group by e.diagnostic_code
      order by sum(e.error_count) desc
      limit 3
    ) stats
  ) precision_messages;

  return jsonb_build_object(
    'main', v_main,
    'secondary', v_secondary,
    'precision', v_precision,
    'has_diagnostics', v_main is not null or jsonb_array_length(v_precision) > 0
  );
end;
$$;

create or replace function public.record_exercise_builder_attempt_diagnostics(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
  v_question record;
  v_code text;
  v_mapping jsonb;
  v_option jsonb;
  v_matched boolean;
  v_language text;
  v_summary jsonb;
begin
  select a.*, coalesce(p.interface_language, 'it') interface_language
    into v_attempt
  from public.exercise_builder_attempts a
  join public.profiles p on p.id = a.learner_id
  where a.id = p_attempt_id and a.status = 'submitted';
  if v_attempt.id is null then raise exception 'Submitted attempt not found.'; end if;

  delete from public.exercise_builder_diagnostic_events where attempt_id = p_attempt_id;

  for v_question in
    select aq.*, aq.question_snapshot -> 'diagnostics' diagnostics,
           aq.question_snapshot -> 'content' content
    from public.exercise_builder_attempt_questions aq
    where aq.attempt_id = p_attempt_id
  loop
    for v_code in
      select value from jsonb_array_elements_text(coalesce(v_question.diagnostics -> 'tested_codes', '[]'::jsonb))
    loop
      if exists (select 1 from public.exercise_builder_diagnostic_codes where code = v_code and status = 'active') then
        insert into public.exercise_builder_diagnostic_events (
          learner_id, attempt_id, attempt_question_id, question_version_id,
          diagnostic_code, opportunity_count, error_count, answer_result
        ) values (
          v_attempt.learner_id, p_attempt_id, v_question.id, v_question.question_version_id,
          v_code, 1, 0, coalesce(v_question.grading_result ->> 'status', 'unanswered')
        ) on conflict (attempt_question_id, diagnostic_code) do update
          set opportunity_count = greatest(exercise_builder_diagnostic_events.opportunity_count, excluded.opportunity_count),
              answer_result = excluded.answer_result;
      end if;
    end loop;

    if coalesce(v_question.grading_result ->> 'status', 'unanswered') in ('correct', 'unanswered') then
      continue;
    end if;

    v_matched := false;

    if coalesce(v_question.question_snapshot ->> 'type', '') in ('multiple_choice', 'multiple_select') then
      for v_option in select value from jsonb_array_elements(coalesce(v_question.content -> 'options', '[]'::jsonb))
      loop
        v_code := nullif(v_option ->> 'error_code', '');
        if v_code is not null
          and exists (select 1 from public.exercise_builder_diagnostic_codes where code = v_code and status = 'active')
          and public.exercise_builder_diagnostic_mapping_matches(
            jsonb_build_object(
              'matcher_type', 'option',
              'answer_key', v_option ->> 'key',
              'matcher_config', jsonb_build_object('option_key', v_option ->> 'key')
            ),
            v_question.answer
          ) then
          insert into public.exercise_builder_diagnostic_events (
            learner_id, attempt_id, attempt_question_id, question_version_id,
            diagnostic_code, opportunity_count, error_count, answer_result
          ) values (
            v_attempt.learner_id, p_attempt_id, v_question.id, v_question.question_version_id,
            v_code, 0, 1, v_question.grading_result ->> 'status'
          ) on conflict (attempt_question_id, diagnostic_code) do update
            set error_count = greatest(exercise_builder_diagnostic_events.error_count, 1),
                answer_result = excluded.answer_result;
          v_matched := true;
        end if;
      end loop;
    end if;

    for v_mapping in select value from jsonb_array_elements(coalesce(v_question.diagnostics -> 'answer_error_mappings', '[]'::jsonb))
    loop
      v_code := nullif(v_mapping ->> 'error_code', '');
      if v_code is not null
        and exists (select 1 from public.exercise_builder_diagnostic_codes where code = v_code and status = 'active')
        and public.exercise_builder_diagnostic_mapping_matches(v_mapping, v_question.answer) then
        insert into public.exercise_builder_diagnostic_events (
          learner_id, attempt_id, attempt_question_id, question_version_id,
          diagnostic_code, opportunity_count, error_count, answer_result
        ) values (
          v_attempt.learner_id, p_attempt_id, v_question.id, v_question.question_version_id,
          v_code, 0, 1, v_question.grading_result ->> 'status'
        ) on conflict (attempt_question_id, diagnostic_code) do update
          set error_count = greatest(exercise_builder_diagnostic_events.error_count, 1),
              answer_result = excluded.answer_result;
        v_matched := true;
      end if;
    end loop;

    if v_question.grading_result ->> 'status' = 'nearly_correct'
      and exists (select 1 from public.exercise_builder_diagnostic_codes where code = 'SPELLING' and status = 'active') then
      insert into public.exercise_builder_diagnostic_events (
        learner_id, attempt_id, attempt_question_id, question_version_id,
        diagnostic_code, opportunity_count, error_count, answer_result
      ) values (
        v_attempt.learner_id, p_attempt_id, v_question.id, v_question.question_version_id,
        'SPELLING', 1, 1, 'nearly_correct'
      ) on conflict (attempt_question_id, diagnostic_code) do update
        set opportunity_count = greatest(exercise_builder_diagnostic_events.opportunity_count, 1),
            error_count = greatest(exercise_builder_diagnostic_events.error_count, 1),
            answer_result = excluded.answer_result;
      v_matched := true;
    end if;

    if not v_matched then
      v_code := nullif(v_question.diagnostics ->> 'fallback_error_code', '');
      if v_code is null then
        select value into v_code
        from jsonb_array_elements_text(coalesce(v_question.diagnostics -> 'tested_codes', '[]'::jsonb))
        limit 1;
      end if;
      if v_code is not null and exists (
        select 1 from public.exercise_builder_diagnostic_codes where code = v_code and status = 'active'
      ) then
        insert into public.exercise_builder_diagnostic_events (
          learner_id, attempt_id, attempt_question_id, question_version_id,
          diagnostic_code, opportunity_count, error_count, answer_result
        ) values (
          v_attempt.learner_id, p_attempt_id, v_question.id, v_question.question_version_id,
          v_code, 0, 1, v_question.grading_result ->> 'status'
        ) on conflict (attempt_question_id, diagnostic_code) do update
          set error_count = greatest(exercise_builder_diagnostic_events.error_count, 1),
              answer_result = excluded.answer_result;
      end if;
    end if;
  end loop;

  insert into public.exercise_builder_learner_diagnostic_summaries (
    learner_id, diagnostic_code, total_opportunities, total_errors,
    recent_opportunities, recent_errors, error_rate, recent_error_rate,
    diagnostic_status, first_detected_at, last_detected_at, last_improved_at, updated_at
  )
  select
    v_attempt.learner_id,
    events.diagnostic_code,
    sum(events.opportunity_count),
    sum(events.error_count),
    sum(events.opportunity_count) filter (where events.created_at >= now() - interval '90 days'),
    sum(events.error_count) filter (where events.created_at >= now() - interval '90 days'),
    case when sum(events.opportunity_count) > 0 then sum(events.error_count) / sum(events.opportunity_count) else 0 end,
    case when sum(events.opportunity_count) filter (where events.created_at >= now() - interval '90 days') > 0
      then (sum(events.error_count) filter (where events.created_at >= now() - interval '90 days'))
        / (sum(events.opportunity_count) filter (where events.created_at >= now() - interval '90 days'))
      else 0 end,
    case
      when sum(events.opportunity_count) < 3 then 'not_enough_data'
      when sum(events.error_count) / nullif(sum(events.opportunity_count), 0) >= 0.50 then 'weakness'
      when sum(events.error_count) / nullif(sum(events.opportunity_count), 0) >= 0.30 then 'emerging_weakness'
      when sum(events.opportunity_count) >= 10 and sum(events.error_count) / nullif(sum(events.opportunity_count), 0) < 0.10 then 'mastered'
      else 'stable'
    end,
    min(events.created_at) filter (where events.error_count > 0),
    max(events.created_at) filter (where events.error_count > 0),
    null,
    now()
  from public.exercise_builder_diagnostic_events events
  where events.learner_id = v_attempt.learner_id
  group by events.diagnostic_code
  on conflict (learner_id, diagnostic_code) do update set
    total_opportunities = excluded.total_opportunities,
    total_errors = excluded.total_errors,
    recent_opportunities = excluded.recent_opportunities,
    recent_errors = excluded.recent_errors,
    error_rate = excluded.error_rate,
    recent_error_rate = excluded.recent_error_rate,
    diagnostic_status = excluded.diagnostic_status,
    first_detected_at = coalesce(exercise_builder_learner_diagnostic_summaries.first_detected_at, excluded.first_detected_at),
    last_detected_at = excluded.last_detected_at,
    updated_at = now();

  v_language := case when v_attempt.interface_language in ('it', 'en') then v_attempt.interface_language else 'it' end;
  v_summary := public.exercise_builder_attempt_diagnostic_json(p_attempt_id, v_language);

  insert into public.exercise_builder_attempt_diagnostic_summaries (attempt_id, learner_id, language, summary)
  values (p_attempt_id, v_attempt.learner_id, v_language, v_summary)
  on conflict (attempt_id) do update set language = excluded.language, summary = excluded.summary, updated_at = now();

  update public.exercise_builder_attempts
  set result_summary = result_summary || jsonb_build_object('diagnostic_summary', v_summary)
  where id = p_attempt_id;

  return v_summary;
end;
$$;

create or replace function public.exercise_builder_after_attempt_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'submitted' and old.status is distinct from new.status then
    perform public.record_exercise_builder_attempt_diagnostics(new.id);
  end if;
  return new;
end;
$$;

create trigger exercise_builder_attempts_build_diagnostics
after update of status on public.exercise_builder_attempts
for each row execute function public.exercise_builder_after_attempt_submitted();

create or replace function public.admin_rebuild_exercise_builder_diagnostics(p_attempt_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
  v_count integer := 0;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  for v_attempt in
    select id from public.exercise_builder_attempts
    where status = 'submitted' and (p_attempt_id is null or id = p_attempt_id)
    order by submitted_at
  loop
    perform public.record_exercise_builder_attempt_diagnostics(v_attempt.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.get_exercise_builder_learner_diagnostics(p_learner_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'code', s.diagnostic_code,
    'label', c.label,
    'primary_skill', c.primary_skill,
    'topic', c.topic,
    'subtopic', c.subtopic,
    'group_key', c.group_key,
    'category', c.category,
    'severity', c.severity,
    'total_opportunities', s.total_opportunities,
    'total_errors', s.total_errors,
    'error_rate', s.error_rate,
    'recent_opportunities', s.recent_opportunities,
    'recent_errors', s.recent_errors,
    'recent_error_rate', s.recent_error_rate,
    'status', s.diagnostic_status,
    'last_detected_at', s.last_detected_at,
    'recommended_resources', c.recommended_resources
  ) order by
    case s.diagnostic_status when 'weakness' then 1 when 'emerging_weakness' then 2 when 'not_enough_data' then 3 when 'stable' then 4 else 5 end,
    s.recent_error_rate desc), '[]'::jsonb)
  from public.exercise_builder_learner_diagnostic_summaries s
  join public.exercise_builder_diagnostic_codes c on c.code = s.diagnostic_code
  where s.learner_id = p_learner_id
    and (p_learner_id = auth.uid() or public.is_admin());
$$;

revoke all on function public.exercise_builder_diagnostic_message(text, text, text) from public;
revoke all on function public.exercise_builder_diagnostic_answer_text(jsonb, text) from public;
revoke all on function public.exercise_builder_diagnostic_mapping_matches(jsonb, jsonb) from public;
revoke all on function public.exercise_builder_attempt_diagnostic_json(uuid, text) from public;
revoke all on function public.record_exercise_builder_attempt_diagnostics(uuid) from public;
revoke all on function public.admin_rebuild_exercise_builder_diagnostics(uuid) from public;
revoke all on function public.get_exercise_builder_learner_diagnostics(uuid) from public;
grant execute on function public.admin_rebuild_exercise_builder_diagnostics(uuid) to authenticated;
grant execute on function public.get_exercise_builder_learner_diagnostics(uuid) to authenticated;
