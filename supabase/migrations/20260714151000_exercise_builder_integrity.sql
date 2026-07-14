-- Additional Exercise Builder catalog integrity.

create or replace function public.validate_exercise_builder_collection_item()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.entity_type = 'question'
    and not exists (select 1 from public.exercise_builder_questions where id = new.entity_id) then
    raise exception 'Collection question does not exist.';
  elsif new.entity_type = 'question_pool'
    and not exists (select 1 from public.exercise_builder_pools where id = new.entity_id) then
    raise exception 'Collection pool does not exist.';
  elsif new.entity_type = 'exercise'
    and not exists (select 1 from public.exercise_builder_exercises where id = new.entity_id) then
    raise exception 'Collection exercise does not exist.';
  end if;

  return new;
end;
$$;

create trigger exercise_builder_collection_items_validate_entity
before insert or update on public.exercise_builder_collection_items
for each row execute function public.validate_exercise_builder_collection_item();

create or replace function public.guard_exercise_builder_identity_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if TG_TABLE_NAME = 'exercise_builder_questions' then
    if exists (select 1 from public.exercise_builder_pool_questions where question_id = old.id)
      or exists (select 1 from public.exercise_builder_section_fixed_questions where question_id = old.id)
      or exists (
        select 1 from public.exercise_builder_collection_items
        where entity_type = 'question' and entity_id = old.id
      ) then
      raise exception 'Archive this question instead. It is referenced by a pool, exercise, or collection.';
    end if;
  elsif TG_TABLE_NAME = 'exercise_builder_pools' then
    if exists (select 1 from public.exercise_builder_section_pool_rules where pool_id = old.id)
      or exists (
        select 1 from public.exercise_builder_collection_items
        where entity_type = 'question_pool' and entity_id = old.id
      ) then
      raise exception 'Archive this pool instead. It is referenced by an exercise or collection.';
    end if;
  elsif TG_TABLE_NAME = 'exercise_builder_exercises' then
    if exists (
      select 1 from public.exercise_builder_collection_items
      where entity_type = 'exercise' and entity_id = old.id
    ) then
      raise exception 'Archive this exercise instead. It is referenced by a collection.';
    end if;
  end if;

  return old;
end;
$$;

create trigger exercise_builder_exercises_guard_delete
before delete on public.exercise_builder_exercises
for each row execute function public.guard_exercise_builder_identity_delete();

-- Universal precision codes. Topic-specific learning codes remain editable data
-- and are added through the diagnostic registry as the curriculum grows.
insert into public.exercise_builder_diagnostic_codes (
  code,
  label,
  primary_skill,
  topic,
  group_key,
  severity,
  category,
  recommended_resources
)
values
  ('SPELLING', 'Spelling', 'spelling', 'precision', 'spelling', 'precision', 'precision', '[]'::jsonb),
  ('PUNCTUATION', 'Punctuation', 'writing', 'precision', 'punctuation', 'precision', 'precision', '[]'::jsonb),
  ('CAPITALIZATION', 'Capitalization', 'writing', 'precision', 'capitalization', 'precision', 'precision', '[]'::jsonb),
  ('APOSTROPHE', 'Apostrophes', 'writing', 'precision', 'apostrophe', 'precision', 'precision', '[]'::jsonb),
  ('SPACING', 'Spacing', 'writing', 'precision', 'spacing', 'precision', 'precision', '[]'::jsonb)
on conflict (code) do nothing;

insert into public.exercise_builder_diagnostic_messages (
  diagnostic_code,
  language,
  message_level,
  message_text
)
values
  ('SPELLING', 'it', 'reminder', 'Controlla lo spelling delle parole prima di inviare.'),
  ('SPELLING', 'en', 'reminder', 'Check the spelling of your words before submitting.'),
  ('PUNCTUATION', 'it', 'reminder', 'Controlla la punteggiatura e la fine delle frasi.'),
  ('PUNCTUATION', 'en', 'reminder', 'Check punctuation and sentence endings.'),
  ('CAPITALIZATION', 'it', 'reminder', 'Ricorda le maiuscole a inizio frase e nei nomi propri.'),
  ('CAPITALIZATION', 'en', 'reminder', 'Remember capital letters at the start of sentences and in proper names.'),
  ('APOSTROPHE', 'it', 'reminder', 'Controlla gli apostrofi nelle contrazioni.'),
  ('APOSTROPHE', 'en', 'reminder', 'Check apostrophes in contractions.'),
  ('SPACING', 'it', 'reminder', 'Controlla gli spazi tra le parole.'),
  ('SPACING', 'en', 'reminder', 'Check the spaces between words.')
on conflict (diagnostic_code, language, message_level) do nothing;
