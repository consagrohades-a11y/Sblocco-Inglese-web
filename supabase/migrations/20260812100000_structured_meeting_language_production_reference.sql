-- Second production reference for the structured educational content-block system.
--
-- Q-00339 is the teaching page at the start of EX-00010, "Build the meeting
-- language". This deliberately exercises the functional-language variant rather
-- than another grammar lesson, proving that the shared semantic renderer is not
-- lesson-specific.
--
-- Preserve the old immutable question version for historical attempts and older
-- exercise versions. Create/reuse a new approved v2 structured version and pin
-- only the current EX-00010 exercise version to it.
--
-- The migration is idempotent and CI-safe. A fresh/schema-only database does not
-- contain production content such as Q-00339, so absence of that row is a no-op.
-- If the target exists but is internally inconsistent, fail loudly.

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
  where question.public_id = 'Q-00339';

  if v_question_id is null then
    raise notice 'Structured meeting-language migration: Q-00339 is not present; skipping production-reference data migration.';
    return;
  end if;

  if v_old_version_id is null then
    raise exception 'Structured meeting-language migration: Q-00339 exists but has no current version.';
  end if;

  select version.id
    into v_new_version_id
  from public.exercise_builder_question_versions version
  where version.question_id = v_question_id
    and version.schema_version = 2
    and version.question_type = 'content_block'
    and version.content ->> 'template_id' = 'educational-content-block-v1'
    and version.content ->> 'variant' = 'functional_language'
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
      raise exception 'Structured meeting-language migration: current Q-00339 version is not a content block.';
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
      'A practical meeting toolkit',
      'Use a simple structure to make a stronger contribution.',
      'Read the language guide before you begin.',
      'en',
      'A2',
      'beauty_product_meetings',
      v_source.subtopic,
      'interaction',
      'Organise a clear, diplomatic contribution in a product innovation meeting.',
      v_source.difficulty,
      $content$
      {
        "educational_schema_version": 1,
        "template_id": "educational-content-block-v1",
        "variant": "functional_language",
        "body": "Structure your contribution in three moves: state your point, add a reason or example, then move the discussion forward. Use diplomatic language to clarify, raise concerns, disagree, propose options and confirm next steps.",
        "intro": "Strong meeting contributions do more than state an opinion. Build your point, support it, then help the group decide what happens next.",
        "sections": [
          {
            "key": "pattern_three_part_contribution",
            "type": "pattern",
            "title": "Build a complete contribution",
            "body": "Use three moves so your contribution is clear and useful to the group.",
            "pattern": "point → reason/example → next step/question",
            "examples": [
              {
                "text": "From a user perspective, the main advantage is the easier application. This matters because customers can use it quickly. Could we test it with five users?",
                "highlight": [
                  "From a user perspective",
                  "This matters because",
                  "Could we test"
                ]
              }
            ]
          },
          {
            "key": "vocabulary_meeting_moves",
            "type": "vocabulary",
            "title": "Useful meeting moves",
            "body": "Choose the move that matches what you need to do in the discussion.",
            "items": [
              {
                "term": "Could you walk me through that?",
                "meaning": "Clarify a point or ask for more detail.",
                "example": "Could you walk me through the user-testing results?",
                "highlight": ["Could you walk me through"]
              },
              {
                "term": "My main concern is…",
                "meaning": "Raise a concern directly but professionally.",
                "example": "My main concern is the size of the applicator.",
                "highlight": ["My main concern is"]
              },
              {
                "term": "I see your point. However,…",
                "meaning": "Disagree diplomatically after acknowledging another view.",
                "example": "I see your point. However, I am not sure this format will work for travel sizes.",
                "highlight": ["I see your point. However"]
              },
              {
                "term": "One possibility would be to…",
                "meaning": "Propose an option without sounding too absolute.",
                "example": "One possibility would be to test both formats.",
                "highlight": ["One possibility would be to"]
              },
              {
                "term": "So, the next step is to…",
                "meaning": "Confirm the action the group has agreed to take.",
                "example": "So, the next step is to test the new applicator with users.",
                "highlight": ["So, the next step is to"]
              }
            ]
          },
          {
            "key": "dialogue_product_meeting",
            "type": "dialogue",
            "title": "Put the moves together",
            "body": "Notice how the speakers acknowledge an idea, add a concern and move toward a practical action.",
            "turns": [
              {
                "speaker": "Product Developer",
                "text": "The larger applicator gives us better product control.",
                "highlight": []
              },
              {
                "speaker": "Brand Manager",
                "text": "I see your point. However, my main concern is portability.",
                "highlight": ["I see your point. However", "my main concern is"]
              },
              {
                "speaker": "Product Developer",
                "text": "We could compare both sizes in the next user test.",
                "highlight": []
              },
              {
                "speaker": "Brand Manager",
                "text": "That makes sense. So, the next step is to test both formats with users.",
                "highlight": ["So, the next step is to"]
              }
            ]
          },
          {
            "key": "tip_extend_contribution",
            "type": "tip",
            "title": "Do not stop after one sentence",
            "body": "After your main point, add a reason, an example or a practical next step. This makes your contribution easier for the group to respond to."
          },
          {
            "key": "recap_meeting_language",
            "type": "recap",
            "title": "Before you practise",
            "points": [
              "Build contributions as point → support → next step.",
              "Clarify when you need more information.",
              "Acknowledge another view before a diplomatic disagreement.",
              "Turn concerns into options or concrete next steps."
            ]
          }
        ]
      }
      $content$::jsonb,
      v_source.grading,
      v_source.feedback,
      coalesce(v_source.tags, '{}'::text[]) || array['structured-educational', 'production-reference'],
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
  where exercise.public_id = 'EX-00010';

  if v_exercise_version_id is null then
    raise exception 'Structured meeting-language migration: current EX-00010 version was not found.';
  end if;

  select section.id
    into v_section_id
  from public.exercise_builder_sections section
  join public.exercise_builder_section_fixed_questions fixed
    on fixed.section_id = section.id
  where section.exercise_version_id = v_exercise_version_id
    and fixed.question_id = v_question_id
  order by section.sequence_index, fixed.sequence_index
  limit 1;

  if v_section_id is null then
    raise exception 'Structured meeting-language migration: Q-00339 is not pinned in current EX-00010.';
  end if;

  update public.exercise_builder_section_fixed_questions
  set question_version_id = v_new_version_id
  where section_id = v_section_id
    and question_id = v_question_id;

  if not found then
    raise exception 'Structured meeting-language migration: current EX-00010 pin could not be updated.';
  end if;
end;
$$;
