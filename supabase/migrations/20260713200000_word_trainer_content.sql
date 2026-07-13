-- Word Trainer authoring, batch import, and published-card delivery.
-- Apply after 20260713170000_admin_trainer_content.sql.

alter table public.learning_items
  add column if not exists review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected')),
  add column if not exists review_decision text
    check (review_decision is null or review_decision in ('approve', 'approve_after_edit', 'rewrite', 'merge', 'reclassify', 'reject')),
  add column if not exists review_notes text,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.words
  add column if not exists accepted_answers text[] not null default '{}',
  add column if not exists pronunciation_ipa_us text,
  add column if not exists pronunciation_learner_us text,
  add column if not exists example_1 text,
  add column if not exists example_2 text,
  add column if not exists usage_note text,
  add column if not exists tags text[] not null default '{}';

create or replace function public.admin_list_word_cards()
returns table (
  id uuid,
  public_id text,
  display_target text,
  level text,
  primary_domain text,
  topic text,
  priority text,
  status text,
  review_status text,
  review_decision text,
  review_notes text,
  reviewed_at timestamptz,
  lemma text,
  sense_label text,
  italian_meaning text,
  english_definition text,
  part_of_speech text,
  countability text,
  plural_form text,
  base_form text,
  past_form text,
  past_participle text,
  third_person_form text,
  ing_form text,
  register text,
  usage_channel text,
  common_collocations text[],
  common_mistakes text,
  accepted_answers text[],
  pronunciation_ipa_us text,
  pronunciation_learner_us text,
  example_1 text,
  example_2 text,
  usage_note text,
  tags text[],
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    li.id,
    li.public_id,
    li.display_target,
    li.level,
    li.primary_domain,
    li.topic,
    li.priority,
    li.status,
    li.review_status,
    li.review_decision,
    li.review_notes,
    li.reviewed_at,
    w.lemma,
    w.sense_label,
    w.italian_meaning,
    w.english_definition,
    w.part_of_speech,
    w.countability,
    w.plural_form,
    w.base_form,
    w.past_form,
    w.past_participle,
    w.third_person_form,
    w.ing_form,
    w.register,
    w.usage_channel,
    w.common_collocations,
    w.common_mistakes,
    w.accepted_answers,
    w.pronunciation_ipa_us,
    w.pronunciation_learner_us,
    w.example_1,
    w.example_2,
    w.usage_note,
    w.tags,
    li.updated_at
  from public.learning_items li
  join public.words w on w.id = li.id
  where public.is_admin()
    and li.item_type = 'word'
  order by li.updated_at desc;
$$;

revoke all on function public.admin_list_word_cards() from public;
grant execute on function public.admin_list_word_cards() to authenticated;

create or replace function public.admin_save_word_card(p_card jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requested_id uuid := nullif(p_card->>'id', '')::uuid;
  v_id uuid := coalesce(v_requested_id, gen_random_uuid());
  v_existing_id uuid;
  v_status text := coalesce(nullif(p_card->>'status', ''), 'draft');
  v_review_status text := coalesce(nullif(p_card->>'review_status', ''), 'pending');
  v_answers text[] := coalesce(array(select jsonb_array_elements_text(coalesce(p_card->'accepted_answers', '[]'::jsonb))), '{}');
  v_collocations text[] := coalesce(array(select jsonb_array_elements_text(coalesce(p_card->'common_collocations', p_card->'collocations', '[]'::jsonb))), '{}');
  v_tags text[] := coalesce(array(select jsonb_array_elements_text(coalesce(p_card->'tags', '[]'::jsonb))), '{}');
  v_public_id text := trim(coalesce(p_card->>'public_id', ''));
  v_lemma text := trim(coalesce(p_card->>'lemma', ''));
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if v_public_id = ''
    or v_lemma = ''
    or nullif(trim(p_card->>'italian_meaning'), '') is null
    or nullif(trim(p_card->>'english_definition'), '') is null
    or nullif(trim(p_card->>'part_of_speech'), '') is null
    or nullif(trim(p_card->>'topic'), '') is null then
    raise exception 'Complete all required word-card fields.';
  end if;

  if coalesce(p_card->>'level', '') not in ('A0', 'A1', 'A2', 'B1', 'B2', 'C1') then
    raise exception 'Invalid CEFR level.';
  end if;

  select id into v_existing_id
  from public.learning_items
  where public_id = v_public_id;

  if v_existing_id is not null and v_existing_id <> v_id then
    raise exception 'Public ID % already exists.', v_public_id;
  end if;

  if v_status = 'published' and (
    v_review_status <> 'approved'
    or coalesce(array_length(v_answers, 1), 0) = 0
    or nullif(trim(p_card->>'pronunciation_ipa_us'), '') is null
    or nullif(trim(p_card->>'example_1'), '') is null
    or nullif(trim(p_card->>'example_2'), '') is null
    or nullif(trim(p_card->>'usage_note'), '') is null
  ) then
    raise exception 'Published word cards must be approved and complete.';
  end if;

  insert into public.learning_items (
    id,
    public_id,
    item_type,
    display_target,
    level,
    primary_domain,
    topic,
    priority,
    status,
    review_status,
    review_decision,
    review_notes,
    reviewed_by,
    reviewed_at,
    created_by
  ) values (
    v_id,
    v_public_id,
    'word',
    v_lemma,
    p_card->>'level',
    coalesce(nullif(trim(p_card->>'primary_domain'), ''), 'general'),
    trim(p_card->>'topic'),
    coalesce(nullif(p_card->>'priority', ''), 'useful'),
    v_status,
    v_review_status,
    nullif(p_card->>'review_decision', ''),
    nullif(trim(p_card->>'review_notes'), ''),
    case when v_review_status = 'approved' then auth.uid() else null end,
    case when v_review_status = 'approved' then now() else null end,
    auth.uid()
  ) on conflict (id) do update set
    public_id = excluded.public_id,
    display_target = excluded.display_target,
    level = excluded.level,
    primary_domain = excluded.primary_domain,
    topic = excluded.topic,
    priority = excluded.priority,
    status = excluded.status,
    review_status = excluded.review_status,
    review_decision = excluded.review_decision,
    review_notes = excluded.review_notes,
    reviewed_by = case when excluded.review_status = 'approved' then auth.uid() else learning_items.reviewed_by end,
    reviewed_at = case when excluded.review_status = 'approved' then now() else learning_items.reviewed_at end;

  insert into public.words (
    id,
    lemma,
    sense_label,
    italian_meaning,
    english_definition,
    part_of_speech,
    countability,
    plural_form,
    base_form,
    past_form,
    past_participle,
    third_person_form,
    ing_form,
    register,
    usage_channel,
    common_collocations,
    common_mistakes,
    accepted_answers,
    pronunciation_ipa_us,
    pronunciation_learner_us,
    example_1,
    example_2,
    usage_note,
    tags
  ) values (
    v_id,
    v_lemma,
    nullif(trim(p_card->>'sense_label'), ''),
    trim(p_card->>'italian_meaning'),
    trim(p_card->>'english_definition'),
    trim(p_card->>'part_of_speech'),
    nullif(p_card->>'countability', ''),
    nullif(trim(p_card->>'plural_form'), ''),
    nullif(trim(p_card->>'base_form'), ''),
    nullif(trim(p_card->>'past_form'), ''),
    nullif(trim(p_card->>'past_participle'), ''),
    nullif(trim(p_card->>'third_person_form'), ''),
    nullif(trim(p_card->>'ing_form'), ''),
    coalesce(nullif(p_card->>'register', ''), 'neutral'),
    coalesce(nullif(p_card->>'usage_channel', ''), 'both'),
    v_collocations,
    nullif(trim(p_card->>'common_mistakes'), ''),
    v_answers,
    nullif(trim(p_card->>'pronunciation_ipa_us'), ''),
    nullif(trim(p_card->>'pronunciation_learner_us'), ''),
    nullif(trim(p_card->>'example_1'), ''),
    nullif(trim(p_card->>'example_2'), ''),
    nullif(trim(p_card->>'usage_note'), ''),
    v_tags
  ) on conflict (id) do update set
    lemma = excluded.lemma,
    sense_label = excluded.sense_label,
    italian_meaning = excluded.italian_meaning,
    english_definition = excluded.english_definition,
    part_of_speech = excluded.part_of_speech,
    countability = excluded.countability,
    plural_form = excluded.plural_form,
    base_form = excluded.base_form,
    past_form = excluded.past_form,
    past_participle = excluded.past_participle,
    third_person_form = excluded.third_person_form,
    ing_form = excluded.ing_form,
    register = excluded.register,
    usage_channel = excluded.usage_channel,
    common_collocations = excluded.common_collocations,
    common_mistakes = excluded.common_mistakes,
    accepted_answers = excluded.accepted_answers,
    pronunciation_ipa_us = excluded.pronunciation_ipa_us,
    pronunciation_learner_us = excluded.pronunciation_learner_us,
    example_1 = excluded.example_1,
    example_2 = excluded.example_2,
    usage_note = excluded.usage_note,
    tags = excluded.tags;

  return v_id;
end;
$$;

revoke all on function public.admin_save_word_card(jsonb) from public;
grant execute on function public.admin_save_word_card(jsonb) to authenticated;

create or replace function public.admin_import_word_cards(p_cards jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card jsonb;
  v_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if jsonb_typeof(p_cards) <> 'array' then
    raise exception 'Expected a JSON array of word cards.';
  end if;

  for v_card in select value from jsonb_array_elements(p_cards)
  loop
    perform public.admin_save_word_card(
      v_card
      || jsonb_build_object(
        'id', null,
        'status', 'draft',
        'review_status', 'pending',
        'review_decision', '',
        'review_notes', ''
      )
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.admin_import_word_cards(jsonb) from public;
grant execute on function public.admin_import_word_cards(jsonb) to authenticated;

create or replace function public.list_published_word_cards()
returns table (
  id uuid,
  public_id text,
  level text,
  category text,
  lemma text,
  part_of_speech text,
  italian_meaning text,
  english_definition text,
  pronunciation_ipa_us text,
  pronunciation_learner_us text,
  common_collocations text[],
  example_1 text,
  example_2 text,
  usage_note text,
  common_mistakes text,
  accepted_answers text[],
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
    li.topic as category,
    w.lemma,
    w.part_of_speech,
    w.italian_meaning,
    w.english_definition,
    w.pronunciation_ipa_us,
    w.pronunciation_learner_us,
    w.common_collocations,
    w.example_1,
    w.example_2,
    w.usage_note,
    w.common_mistakes,
    w.accepted_answers,
    w.tags
  from public.learning_items li
  join public.words w on w.id = li.id
  where li.item_type = 'word'
    and li.status = 'published'
  order by li.level, li.topic, li.public_id;
$$;

revoke all on function public.list_published_word_cards() from public;
grant execute on function public.list_published_word_cards() to anon, authenticated;
