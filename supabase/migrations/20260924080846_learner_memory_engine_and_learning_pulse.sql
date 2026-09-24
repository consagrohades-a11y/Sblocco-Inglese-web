alter table public.learner_vocab_bank_items
  add column if not exists recall_strength integer not null default 0 check (recall_strength between 0 and 5),
  add column if not exists recall_count integer not null default 0 check (recall_count >= 0),
  add column if not exists forgotten_count integer not null default 0 check (forgotten_count >= 0),
  add column if not exists last_recall_rating text check (last_recall_rating is null or last_recall_rating in ('remembered', 'again')),
  add column if not exists last_recalled_at timestamptz,
  add column if not exists next_review_at timestamptz not null default now();

create index if not exists learner_vocab_bank_due_idx
on public.learner_vocab_bank_items (learner_id, next_review_at, recall_strength);

create or replace function public.learner_rate_vocab_recall(p_item_id uuid, p_rating text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.learner_vocab_bank_items%rowtype;
  v_strength integer;
  v_next_review timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if p_rating not in ('remembered', 'again') then raise exception 'Unsupported recall rating.'; end if;

  select * into v_item
  from public.learner_vocab_bank_items
  where id = p_item_id
  for update;

  if v_item.id is null then raise exception 'Vocabulary item not found.'; end if;
  if v_item.learner_id <> auth.uid() then raise exception 'Access denied.'; end if;

  if p_rating = 'again' then
    v_strength := greatest(0, coalesce(v_item.recall_strength, 0) - 1);
    v_next_review := now() + interval '12 hours';
  else
    v_strength := least(5, coalesce(v_item.recall_strength, 0) + 1);
    v_next_review := now() + case v_strength
      when 1 then interval '1 day'
      when 2 then interval '3 days'
      when 3 then interval '7 days'
      when 4 then interval '14 days'
      else interval '30 days'
    end;
  end if;

  update public.learner_vocab_bank_items
  set recall_strength = v_strength,
      recall_count = recall_count + 1,
      forgotten_count = forgotten_count + case when p_rating = 'again' then 1 else 0 end,
      last_recall_rating = p_rating,
      last_recalled_at = now(),
      next_review_at = v_next_review,
      updated_at = now()
  where id = p_item_id
  returning * into v_item;

  return jsonb_build_object(
    'id', v_item.id,
    'recall_strength', v_item.recall_strength,
    'recall_count', v_item.recall_count,
    'forgotten_count', v_item.forgotten_count,
    'last_recall_rating', v_item.last_recall_rating,
    'last_recalled_at', v_item.last_recalled_at,
    'next_review_at', v_item.next_review_at
  );
end;
$$;

revoke all on function public.learner_rate_vocab_recall(uuid, text) from public;
grant execute on function public.learner_rate_vocab_recall(uuid, text) to authenticated;

create or replace function public.learner_get_learning_pulse()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_learner_id uuid := auth.uid();
  v_latest_attempt jsonb;
  v_due_count integer := 0;
  v_total_vocab integer := 0;
begin
  if v_learner_id is null then raise exception 'Authentication required.'; end if;

  if not exists (select 1 from public.profiles where id = v_learner_id and role = 'learner') then
    raise exception 'Learner access required.';
  end if;

  select count(*), count(*) filter (where next_review_at <= now())
  into v_total_vocab, v_due_count
  from public.learner_vocab_bank_items
  where learner_id = v_learner_id;

  select jsonb_build_object(
    'attempt_id', attempt.id,
    'assignment_id', attempt.assignment_id,
    'resource_id', attempt.assignment_resource_id,
    'title', coalesce(nullif(attempt.exercise_snapshot ->> 'title', ''), 'Esercizio'),
    'submitted_at', attempt.submitted_at,
    'score', case
      when attempt.review_status = 'reviewed'
        or coalesce((attempt.result_summary ->> 'pending_review')::integer, 0) > 0
      then null else attempt.score end,
    'pending_review', coalesce((attempt.result_summary ->> 'pending_review')::integer, 0),
    'review_status', attempt.review_status,
    'mistake_count',
      coalesce((attempt.result_summary ->> 'incorrect')::integer, 0)
      + coalesce((attempt.result_summary ->> 'nearly_correct')::integer, 0)
      + coalesce((attempt.result_summary ->> 'unanswered')::integer, 0),
    'focus_available',
      coalesce((attempt.result_summary ->> 'pending_review')::integer, 0) = 0
      and attempt.review_status <> 'reviewed'
  )
  into v_latest_attempt
  from public.exercise_builder_attempts attempt
  where attempt.learner_id = v_learner_id
    and attempt.status = 'submitted'
  order by attempt.submitted_at desc nulls last, attempt.updated_at desc
  limit 1;

  return jsonb_build_object(
    'memory', jsonb_build_object('due_count', v_due_count, 'total_count', v_total_vocab),
    'latest_attempt', v_latest_attempt
  );
end;
$$;

revoke all on function public.learner_get_learning_pulse() from public;
grant execute on function public.learner_get_learning_pulse() to authenticated;
