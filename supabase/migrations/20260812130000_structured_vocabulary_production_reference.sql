-- Third production reference for the structured educational content-block system.
-- Converts Q-01011 (20 core verbs) from one long markdown table into a semantic
-- vocabulary teaching block while preserving its immutable v1 for history.
--
-- Production content is not present in schema-only CI databases, so absence of
-- Q-01011 is an intentional no-op. If the target exists but is inconsistent,
-- the migration still fails loudly.
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
  where question.public_id = 'Q-01011';

  if v_question_id is null then
    raise notice 'Structured vocabulary migration: Q-01011 is not present; skipping production-reference data migration.';
    return;
  end if;

  if v_old_version_id is null then
    raise exception 'Structured vocabulary migration: Q-01011 exists but has no current version.';
  end if;

  select version.id
    into v_new_version_id
  from public.exercise_builder_question_versions version
  where version.question_id = v_question_id
    and version.schema_version = 2
    and version.question_type = 'content_block'
    and version.content ->> 'template_id' = 'educational-content-block-v1'
    and version.content ->> 'variant' = 'vocabulary'
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
      raise exception 'Structured vocabulary migration: current Q-01011 version is not a content block.';
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
      '20 verbi fondamentali',
      'Impara i verbi nelle forme che ti servono davvero',
      'Studia significato, forma con he/she/it e forma in -ing attraverso esempi completi.',
      'it',
      'A1+',
      'present_tenses_contrast',
      'core_verbs',
      'vocabulary',
      'Recognise and use 20 high-frequency verbs in their base, third-person singular and -ing forms.',
      v_source.difficulty,
      $content$
      {
        "educational_schema_version": 1,
        "template_id": "educational-content-block-v1",
        "variant": "vocabulary",
        "body": "Studia 20 verbi frequenti insieme alle forme che incontrerai nel Present Simple e Present Continuous. Non memorizzare solo la traduzione: osserva la terza persona, la forma in -ing e un esempio naturale.",
        "intro": "Per usare bene i tempi presenti, un verbo deve diventare qualcosa che riconosci dentro una frase, non una traduzione isolata.",
        "sections": [
          {
            "key": "vocabulary_core_verbs_1",
            "type": "vocabulary",
            "title": "Verbi 1–10",
            "body": "Leggi ogni verbo come una piccola famiglia di forme: base → he/she/it → -ing.",
            "items": [
              {"term":"be → is → being","meaning":"essere, stare","example":"She is at work.","highlight":["is"]},
              {"term":"have → has → having","meaning":"avere","example":"He has a meeting at ten.","highlight":["has"]},
              {"term":"do → does → doing","meaning":"fare, svolgere","example":"I do my homework after dinner.","highlight":["do"]},
              {"term":"go → goes → going","meaning":"andare","example":"We go to work by bus.","highlight":["go"]},
              {"term":"work → works → working","meaning":"lavorare","example":"She works in Milan.","highlight":["works"]},
              {"term":"live → lives → living","meaning":"vivere, abitare","example":"They live near Rome.","highlight":["live"]},
              {"term":"study → studies → studying","meaning":"studiare","example":"He studies English every evening.","highlight":["studies"]},
              {"term":"make → makes → making","meaning":"fare, creare, produrre","example":"I am making dinner now.","highlight":["making"]},
              {"term":"get → gets → getting","meaning":"ricevere, ottenere, arrivare","example":"She gets home at six.","highlight":["gets"]},
              {"term":"take → takes → taking","meaning":"prendere, portare","example":"He takes the train to work.","highlight":["takes"]}
            ]
          },
          {
            "key": "vocabulary_core_verbs_2",
            "type": "vocabulary",
            "title": "Verbi 11–20",
            "body": "Continua a collegare forma e contesto: l’esempio ti aiuta a ricordare come il verbo viene usato davvero.",
            "items": [
              {"term":"start → starts → starting","meaning":"iniziare","example":"The lesson starts at nine.","highlight":["starts"]},
              {"term":"finish → finishes → finishing","meaning":"finire","example":"Work finishes at five today.","highlight":["finishes"]},
              {"term":"eat → eats → eating","meaning":"mangiare","example":"We eat lunch together.","highlight":["eat"]},
              {"term":"drink → drinks → drinking","meaning":"bere","example":"I drink tea every morning.","highlight":["drink"]},
              {"term":"read → reads → reading","meaning":"leggere","example":"She is reading a message now.","highlight":["reading"]},
              {"term":"write → writes → writing","meaning":"scrivere","example":"He writes many emails at work.","highlight":["writes"]},
              {"term":"speak → speaks → speaking","meaning":"parlare","example":"They speak English at work.","highlight":["speak"]},
              {"term":"watch → watches → watching","meaning":"guardare","example":"We are watching a film.","highlight":["watching"]},
              {"term":"listen → listens → listening","meaning":"ascoltare","example":"I listen to podcasts on the train.","highlight":["listen to"]},
              {"term":"wait → waits → waiting","meaning":"aspettare","example":"She is waiting outside.","highlight":["waiting"]}
            ]
          },
          {
            "key": "pattern_third_person",
            "type": "pattern",
            "title": "Quando il soggetto è he, she o it",
            "body": "Nel Present Simple la forma cambia: normalmente aggiungi -s; alcuni verbi prendono -es o cambiano -y in -ies.",
            "pattern": "I/you/we/they + base verb · he/she/it + -s / -es / -ies",
            "examples": [
              {"text":"I work here. → She works here.","highlight":["works"]},
              {"text":"They watch TV. → He watches TV.","highlight":["watches"]},
              {"text":"I study English. → She studies English.","highlight":["studies"]}
            ]
          },
          {
            "key": "pattern_ing_forms",
            "type": "pattern",
            "title": "Costruire la forma in -ing",
            "body": "La forma più comune aggiunge -ing, ma alcuni verbi cambiano ortografia. Impara questi cambiamenti insieme al verbo, non come una lista separata.",
            "pattern": "work → working · make → making · get → getting",
            "examples": [
              {"text":"She is working today.","highlight":["working"]},
              {"text":"We are making dinner.","highlight":["making"]},
              {"text":"It is getting late.","highlight":["getting"]}
            ]
          },
          {
            "key": "tip_do_make_listen",
            "type": "tip",
            "title": "Tre combinazioni da non tradurre parola per parola",
            "body": "Do e make possono entrambi significare “fare”: do è frequente con attività e compiti, make con creare o produrre. Listen richiede normalmente to davanti a ciò che ascolti.",
            "examples": [
              {"text":"do homework","highlight":["do"]},
              {"text":"make dinner","highlight":["make"]},
              {"text":"listen to music","highlight":["listen to"]}
            ]
          },
          {
            "key": "recap_core_verbs",
            "type": "recap",
            "title": "Prima di continuare",
            "points": [
              "Impara il verbo dentro una frase, non solo con la traduzione.",
              "Riconosci la forma speciale con he/she/it.",
              "Collega ogni verbo alla sua forma in -ing.",
              "Ricorda le combinazioni: do homework, make dinner, listen to music."
            ]
          }
        ]
      }
      $content$::jsonb,
      v_source.grading,
      v_source.feedback,
      coalesce(v_source.tags, '{}'::text[]) || array['structured-educational', 'vocabulary', 'production-reference'],
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
  where exercise.public_id = 'EX-00055';

  if v_exercise_version_id is null then
    raise exception 'Structured vocabulary migration: current EX-00055 version was not found.';
  end if;

  select section.id
    into v_section_id
  from public.exercise_builder_sections section
  join public.exercise_builder_section_fixed_questions fixed on fixed.section_id = section.id
  where section.exercise_version_id = v_exercise_version_id
    and fixed.question_id = v_question_id
  order by section.sequence_index, fixed.sequence_index
  limit 1;

  if v_section_id is null then
    raise exception 'Structured vocabulary migration: Q-01011 is not pinned in current EX-00055.';
  end if;

  update public.exercise_builder_section_fixed_questions
  set question_version_id = v_new_version_id
  where section_id = v_section_id
    and question_id = v_question_id;

  if not found then
    raise exception 'Structured vocabulary migration: current EX-00055 pin could not be updated.';
  end if;
end;
$$;
