-- Admin Trainer content authoring and review workflow.
-- Apply after 20260712210000_initial_trainer_foundation.sql.

alter table public.learning_items
  add column if not exists review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected')),
  add column if not exists review_decision text
    check (review_decision is null or review_decision in ('approve', 'approve_after_edit', 'rewrite', 'merge', 'reclassify', 'reject')),
  add column if not exists review_notes text,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.expressions
  add column if not exists accepted_answers text[] not null default '{}',
  add column if not exists pronunciation_ipa_us text,
  add column if not exists pronunciation_learner_us text,
  add column if not exists example_1 text,
  add column if not exists example_2 text,
  add column if not exists usage_note text,
  add column if not exists collocations text[] not null default '{}',
  add column if not exists tags text[] not null default '{}';

create or replace function public.admin_list_expression_cards()
returns table (
  id uuid, public_id text, display_target text, level text, primary_domain text,
  topic text, priority text, status text, review_status text,
  review_decision text, review_notes text, reviewed_at timestamptz,
  canonical_text text, italian_meaning text, english_explanation text,
  communicative_function text, primary_context text, register text,
  usage_channel text, tone text, accepted_answers text[],
  pronunciation_ipa_us text, pronunciation_learner_us text,
  example_1 text, example_2 text, usage_note text,
  collocations text[], tags text[], updated_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select li.id, li.public_id, li.display_target, li.level, li.primary_domain,
    li.topic, li.priority, li.status, li.review_status,
    li.review_decision, li.review_notes, li.reviewed_at,
    e.canonical_text, e.italian_meaning, e.english_explanation,
    e.communicative_function, e.primary_context, e.register,
    e.usage_channel, e.tone, e.accepted_answers,
    e.pronunciation_ipa_us, e.pronunciation_learner_us,
    e.example_1, e.example_2, e.usage_note,
    e.collocations, e.tags, li.updated_at
  from public.learning_items li
  join public.expressions e on e.id = li.id
  where public.is_admin() and li.item_type = 'expression'
  order by li.updated_at desc;
$$;

revoke all on function public.admin_list_expression_cards() from public;
grant execute on function public.admin_list_expression_cards() to authenticated;

create or replace function public.admin_save_expression_card(p_card jsonb)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid := coalesce(nullif(p_card->>'id', '')::uuid, gen_random_uuid());
  v_status text := coalesce(p_card->>'status', 'draft');
  v_review_status text := coalesce(p_card->>'review_status', 'pending');
  v_answers text[] := coalesce(array(select jsonb_array_elements_text(coalesce(p_card->'accepted_answers', '[]'::jsonb))), '{}');
  v_collocations text[] := coalesce(array(select jsonb_array_elements_text(coalesce(p_card->'collocations', '[]'::jsonb))), '{}');
  v_tags text[] := coalesce(array(select jsonb_array_elements_text(coalesce(p_card->'tags', '[]'::jsonb))), '{}');
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;

  if nullif(trim(p_card->>'public_id'), '') is null
    or nullif(trim(p_card->>'canonical_text'), '') is null
    or nullif(trim(p_card->>'italian_meaning'), '') is null
    or nullif(trim(p_card->>'english_explanation'), '') is null
    or nullif(trim(p_card->>'communicative_function'), '') is null
    or nullif(trim(p_card->>'primary_context'), '') is null then
    raise exception 'Complete all required card fields.';
  end if;

  if v_status = 'published' and (
    v_review_status <> 'approved'
    or coalesce(array_length(v_answers, 1), 0) = 0
    or nullif(trim(p_card->>'example_1'), '') is null
    or nullif(trim(p_card->>'example_2'), '') is null
    or nullif(trim(p_card->>'usage_note'), '') is null
    or nullif(trim(p_card->>'pronunciation_ipa_us'), '') is null
  ) then
    raise exception 'Published cards must be approved and complete.';
  end if;

  insert into public.learning_items (
    id, public_id, item_type, display_target, level, primary_domain, topic,
    priority, status, review_status, review_decision, review_notes,
    reviewed_by, reviewed_at, created_by
  ) values (
    v_id, trim(p_card->>'public_id'), 'expression', trim(p_card->>'canonical_text'),
    p_card->>'level', coalesce(nullif(trim(p_card->>'primary_domain'), ''), 'general'),
    nullif(trim(p_card->>'topic'), ''), coalesce(p_card->>'priority', 'useful'),
    v_status, v_review_status, nullif(p_card->>'review_decision', ''),
    nullif(trim(p_card->>'review_notes'), ''),
    case when v_review_status = 'approved' then auth.uid() else null end,
    case when v_review_status = 'approved' then now() else null end,
    auth.uid()
  ) on conflict (id) do update set
    public_id = excluded.public_id, display_target = excluded.display_target,
    level = excluded.level, primary_domain = excluded.primary_domain,
    topic = excluded.topic, priority = excluded.priority, status = excluded.status,
    review_status = excluded.review_status, review_decision = excluded.review_decision,
    review_notes = excluded.review_notes,
    reviewed_by = case when excluded.review_status = 'approved' then auth.uid() else learning_items.reviewed_by end,
    reviewed_at = case when excluded.review_status = 'approved' then now() else learning_items.reviewed_at end;

  insert into public.expressions (
    id, canonical_text, italian_meaning, english_explanation,
    communicative_function, primary_context, register, usage_channel, tone,
    accepted_answers, pronunciation_ipa_us, pronunciation_learner_us,
    example_1, example_2, usage_note, collocations, tags
  ) values (
    v_id, trim(p_card->>'canonical_text'), trim(p_card->>'italian_meaning'),
    trim(p_card->>'english_explanation'), trim(p_card->>'communicative_function'),
    trim(p_card->>'primary_context'), coalesce(p_card->>'register', 'neutral'),
    coalesce(p_card->>'usage_channel', 'both'), nullif(trim(p_card->>'tone'), ''),
    v_answers, nullif(trim(p_card->>'pronunciation_ipa_us'), ''),
    nullif(trim(p_card->>'pronunciation_learner_us'), ''),
    nullif(trim(p_card->>'example_1'), ''), nullif(trim(p_card->>'example_2'), ''),
    nullif(trim(p_card->>'usage_note'), ''), v_collocations, v_tags
  ) on conflict (id) do update set
    canonical_text = excluded.canonical_text, italian_meaning = excluded.italian_meaning,
    english_explanation = excluded.english_explanation,
    communicative_function = excluded.communicative_function,
    primary_context = excluded.primary_context, register = excluded.register,
    usage_channel = excluded.usage_channel, tone = excluded.tone,
    accepted_answers = excluded.accepted_answers,
    pronunciation_ipa_us = excluded.pronunciation_ipa_us,
    pronunciation_learner_us = excluded.pronunciation_learner_us,
    example_1 = excluded.example_1, example_2 = excluded.example_2,
    usage_note = excluded.usage_note, collocations = excluded.collocations,
    tags = excluded.tags;

  return v_id;
end;
$$;

revoke all on function public.admin_save_expression_card(jsonb) from public;
grant execute on function public.admin_save_expression_card(jsonb) to authenticated;
