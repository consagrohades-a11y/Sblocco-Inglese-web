-- Published Expression delivery and secure learner practice-attempt recording.

create or replace function public.list_published_expression_cards(p_domain text default null)
returns table (
  id uuid,
  public_id text,
  level text,
  primary_domain text,
  category text,
  canonical_text text,
  italian_meaning text,
  english_explanation text,
  communicative_function text,
  primary_context text,
  register text,
  usage_channel text,
  tone text,
  accepted_answers text[],
  pronunciation_ipa_us text,
  pronunciation_learner_us text,
  example_1 text,
  example_2 text,
  usage_note text,
  collocations text[],
  tags text[]
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    li.id,
    li.public_id,
    li.level,
    li.primary_domain,
    li.topic as category,
    e.canonical_text,
    e.italian_meaning,
    e.english_explanation,
    e.communicative_function,
    e.primary_context,
    e.register,
    e.usage_channel,
    e.tone,
    e.accepted_answers,
    e.pronunciation_ipa_us,
    e.pronunciation_learner_us,
    e.example_1,
    e.example_2,
    e.usage_note,
    e.collocations,
    e.tags
  from public.learning_items li
  join public.expressions e on e.id = li.id
  where li.item_type = 'expression'
    and li.status = 'published'
    and (p_domain is null or li.primary_domain = p_domain)
  order by li.level, li.topic, li.public_id;
$$;

revoke all on function public.list_published_expression_cards(text) from public;
grant execute on function public.list_published_expression_cards(text) to anon, authenticated;

create or replace function public.record_practice_attempt(
  p_learning_item_id uuid,
  p_exercise_type text,
  p_result text,
  p_score numeric,
  p_context text default null,
  p_submitted_response text default null,
  p_response_time_ms integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if p_result not in ('correct', 'nearly_correct', 'incorrect', 'skipped') then
    raise exception 'Invalid practice result.';
  end if;

  if p_score is null or p_score < 0 or p_score > 100 then
    raise exception 'Invalid practice score.';
  end if;

  if p_response_time_ms is not null and p_response_time_ms < 0 then
    raise exception 'Invalid response time.';
  end if;

  if not exists (
    select 1
    from public.learning_items
    where id = p_learning_item_id
      and status = 'published'
  ) then
    raise exception 'Published learning item not found.';
  end if;

  insert into public.applied_practice_attempts (
    learner_id,
    learning_item_id,
    exercise_type,
    context,
    submitted_response,
    result,
    score,
    response_time_ms
  ) values (
    auth.uid(),
    p_learning_item_id,
    p_exercise_type,
    p_context,
    p_submitted_response,
    p_result,
    p_score,
    p_response_time_ms
  )
  returning id into v_attempt_id;

  return v_attempt_id;
end;
$$;

revoke all on function public.record_practice_attempt(uuid, text, text, numeric, text, text, integer) from public;
grant execute on function public.record_practice_attempt(uuid, text, text, numeric, text, text, integer) to authenticated;
