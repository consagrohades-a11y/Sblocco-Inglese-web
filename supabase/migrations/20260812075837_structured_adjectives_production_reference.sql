-- First production reference for the structured educational content-block system.
--
-- Q-00524 is the teaching page at the start of section "1. Adjectives" in the
-- published A1 grammar mini-course (EX-00022). Preserve the old immutable
-- question version for historical attempts and older exercise versions, create
-- a new approved v2 structured version, and pin only the current exercise
-- version to it.
--
-- This migration is idempotent: if a structured educational version already
-- exists for Q-00524, it reuses that version instead of creating another one.
-- It is also safe on schema-only/fresh databases (including migration CI): when
-- the production content catalog is absent and Q-00524 does not exist, it is a
-- deliberate no-op. If Q-00524 exists but is internally inconsistent, it still
-- fails loudly instead of hiding a partial production-data problem.

do $$
declare
  v_question_id uuid;
  v_old_version_id uuid;
  v_new_version_id uuid;
  v_next_version integer;
  v_exercise_version_id uuid;
  v_section_id uuid;
  v_source public.exercise_builder_question_versions%rowtype;
begin
  select question.id, question.current_version_id
    into v_question_id, v_old_version_id
  from public.exercise_builder_questions question
  where question.public_id = 'Q-00524';

  if v_question_id is null then
    raise notice 'Structured Adjectives migration: Q-00524 is not present; skipping production-reference data migration.';
    return;
  end if;

  if v_old_version_id is null then
    raise exception 'Structured Adjectives migration: Q-00524 exists but has no current version.';
  end if;

  select version.id
    into v_new_version_id
  from public.exercise_builder_question_versions version
  where version.question_id = v_question_id
    and version.schema_version = 2
    and version.question_type = 'content_block'
    and version.content ->> 'template_id' = 'educational-content-block-v1'
    and version.content ->> 'variant' = 'grammar'
    and jsonb_typeof(version.content -> 'sections') = 'array'
    and jsonb_array_length(version.content -> 'sections') > 0
  order by version.version_number desc
  limit 1;

  if v_new_version_id is null then
    select *
      into v_source
    from public.exercise_builder_question_versions
    where id = v_old_version_id;

    if v_source.id is null or v_source.question_type <> 'content_block' then
      raise exception 'Structured Adjectives migration: current Q-00524 version is not a content block.';
    end if;

    select coalesce(max(version_number), 0) + 1
      into v_next_version
    from public.exercise_builder_question_versions
    where question_id = v_question_id;

    insert into public.exercise_builder_question_versions (
      question_id,
      version_number,
      schema_version,
      question_type,
      title,
      prompt,
      instructions,
      instruction_language,
      level,
      topic,
      subtopic,
      primary_skill,
      learning_objective,
      difficulty,
      content,
      grading,
      feedback,
      tags,
      foundation_links,
      review_status,
      source_import_item_id,
      created_by,
      diagnostics,
      media
    ) values (
      v_question_id,
      v_next_version,
      2,
      'content_block',
      'Adjectives: forma e posizione',
      'Prima di iniziare',
      'Leggi la spiegazione e osserva gli esempi.',
      'it',
      'A1',
      'adjectives',
      'position_and_form',
      'grammar',
      'Recognise where English adjectives go, keep their form unchanged, and place very/quite correctly.',
      v_source.difficulty,
      '{
        "educational_schema_version": 1,
        "template_id": "educational-content-block-v1",
        "variant": "grammar",
        "body": "Gli aggettivi descrivono persone e cose. In inglese vengono normalmente prima del nome oppure dopo be e verbi come look, feel, sound, smell e taste. Non cambiano al plurale. Very e quite vengono prima dell’aggettivo.",
        "intro": "In inglese la posizione dell’aggettivo è più fissa che in italiano e la sua forma non cambia quando il nome diventa plurale.",
        "sections": [
          {
            "key": "rule_before_noun",
            "type": "rule",
            "title": "Prima del nome",
            "body": "Quando un aggettivo descrive direttamente un nome, viene normalmente prima del nome.",
            "examples": [
              { "text": "an expensive phone", "highlight": ["expensive"] },
              { "text": "a comfortable chair", "highlight": ["comfortable"] }
            ]
          },
          {
            "key": "rule_after_linking_verb",
            "type": "rule",
            "title": "Dopo be, look, feel…",
            "body": "L’aggettivo può venire dopo be e dopo verbi che descrivono uno stato o un’impressione, come look, feel, sound, smell e taste.",
            "examples": [
              { "text": "The phone is expensive.", "highlight": ["expensive"] },
              { "text": "You look tired.", "highlight": ["tired"] },
              { "text": "The soup smells delicious.", "highlight": ["delicious"] }
            ]
          },
          {
            "key": "pattern_adjective_noun",
            "type": "pattern",
            "title": "Lo schema utile",
            "body": "Quando descrivi direttamente una persona o una cosa, pensa a questo ordine.",
            "pattern": "adjective + noun",
            "examples": [
              { "text": "blue eyes", "highlight": ["blue"] }
            ]
          },
          {
            "key": "mistake_no_plural",
            "type": "mistake",
            "title": "L’aggettivo non prende il plurale",
            "body": "Anche con un nome plurale, l’aggettivo inglese resta invariato.",
            "correct": { "text": "blue eyes", "highlight": ["blue"] },
            "incorrect": { "text": "blues eyes", "highlight": ["blues"] }
          },
          {
            "key": "rule_very_quite",
            "type": "rule",
            "title": "Very e quite",
            "body": "Very e quite vengono prima dell’aggettivo e ne modificano l’intensità.",
            "examples": [
              { "text": "a very expensive car", "highlight": ["very expensive"] },
              { "text": "The exercise is quite difficult.", "highlight": ["quite difficult"] }
            ]
          },
          {
            "key": "recap",
            "type": "recap",
            "title": "Prima di esercitarti",
            "points": [
              "Adjective + noun: a small room.",
              "Dopo be/look/feel: The room is small.",
              "L’aggettivo non cambia al plurale.",
              "Very/quite + adjective: very expensive."
            ]
          }
        ]
      }'::jsonb,
      v_source.grading,
      v_source.feedback,
      v_source.tags || array['structured-educational', 'production-reference'],
      v_source.foundation_links,
      'approved',
      null,
      v_source.created_by,
      v_source.diagnostics,
      v_source.media
    )
    returning id into v_new_version_id;
  end if;

  update public.exercise_builder_questions
  set current_version_id = v_new_version_id,
      status = 'published',
      approved_by = coalesce(approved_by, created_by),
      approved_at = now(),
      updated_at = now()
  where id = v_question_id;

  select exercise.current_version_id
    into v_exercise_version_id
  from public.exercise_builder_exercises exercise
  where exercise.public_id = 'EX-00022';

  if v_exercise_version_id is null then
    raise exception 'Structured Adjectives migration: current EX-00022 version was not found.';
  end if;

  select section.id
    into v_section_id
  from public.exercise_builder_sections section
  where section.exercise_version_id = v_exercise_version_id
    and section.title = '1. Adjectives'
  order by section.sequence_index
  limit 1;

  if v_section_id is null then
    raise exception 'Structured Adjectives migration: section 1. Adjectives was not found on current EX-00022.';
  end if;

  update public.exercise_builder_section_fixed_questions
  set question_version_id = v_new_version_id
  where section_id = v_section_id
    and question_id = v_question_id;

  if not found then
    raise exception 'Structured Adjectives migration: Q-00524 is not pinned in the current Adjectives section.';
  end if;
end;
$$;
