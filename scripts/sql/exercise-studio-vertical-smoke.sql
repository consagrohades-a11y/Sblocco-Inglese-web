\set ON_ERROR_STOP on

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.test_uid', true), '')::uuid
$$;

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-000000000001', 'studio-admin@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'studio-learner@example.test'),
  ('00000000-0000-0000-0000-000000000003', 'studio-learner-2@example.test')
on conflict (id) do nothing;

insert into public.profiles (id, display_name, role, status)
values
  ('00000000-0000-0000-0000-000000000001', 'Studio CI Admin', 'admin', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'Studio CI Learner', 'learner', 'active'),
  ('00000000-0000-0000-0000-000000000003', 'Studio CI Learner Two', 'learner', 'active')
on conflict (id) do update
set role = excluded.role,
    status = excluded.status,
    display_name = excluded.display_name;

select set_config('app.test_uid', '00000000-0000-0000-0000-000000000001', false);

do $$
declare
  v_draft_id uuid := gen_random_uuid();
  v_document jsonb;
  v_runtime jsonb;
  v_publish jsonb;
  v_assign jsonb;
  v_exercise_id uuid;
  v_assignment_id uuid;
  v_resource_id uuid;
  v_attempt_payload jsonb;
  v_attempt_id uuid;
  v_mcq_id uuid;
  v_selection_id uuid;
  v_writing_id uuid;
  v_review jsonb;
  v_group_id uuid := gen_random_uuid();
  v_group_assign jsonb;
  v_group_batch_id uuid;
  v_folder_id uuid := gen_random_uuid();
  v_child_folder_id uuid := gen_random_uuid();
  v_cycle_rejected boolean := false;
begin
  v_document := jsonb_build_object(
    'schema_version', 1,
    'kind', 'learning_activity',
    'status', 'draft',
    'internal_title', 'Studio end-to-end smoke',
    'learner_title', 'A short Studio test',
    'level', 'A2',
    'topic', 'studio_smoke',
    'activity_type', 'lesson',
    'blocks', jsonb_build_array(
      jsonb_build_object('id', 'block_mcq', 'type', 'multiple_choice'),
      jsonb_build_object('id', 'block_vocab', 'type', 'vocabulary'),
      jsonb_build_object('id', 'block_selection', 'type', 'practice_selection'),
      jsonb_build_object('id', 'block_writing', 'type', 'written_response')
    )
  );

  insert into public.exercise_studio_folders (
    id,
    name,
    color_key,
    created_by,
    updated_by
  ) values (
    v_folder_id,
    'Studio CI Folder',
    'orange',
    auth.uid(),
    auth.uid()
  );

  insert into public.exercise_studio_folders (
    id,
    name,
    parent_id,
    color_key,
    created_by,
    updated_by
  ) values (
    v_child_folder_id,
    'Studio CI Child Folder',
    v_folder_id,
    'blue',
    auth.uid(),
    auth.uid()
  );

  if not exists (
    select 1
    from public.exercise_studio_folders parent
    join public.exercise_studio_folders child on child.parent_id = parent.id
    where parent.id = v_folder_id
      and parent.color_key = 'orange'
      and child.id = v_child_folder_id
      and child.color_key = 'blue'
  ) then
    raise exception 'Studio nested folder metadata did not persist.';
  end if;

  begin
    update public.exercise_studio_folders
    set parent_id = v_child_folder_id
    where id = v_folder_id;
  exception
    when others then
      if sqlerrm like 'A Studio folder cannot be moved inside one of its descendants.%' then
        v_cycle_rejected := true;
      else
        raise;
      end if;
  end;

  if not v_cycle_rejected then
    raise exception 'Studio folder cycle guard did not reject a parent-to-descendant move.';
  end if;

  insert into public.exercise_studio_drafts (
    id,
    internal_title,
    learner_title,
    level,
    topic,
    activity_type,
    status,
    origin,
    schema_version,
    document,
    created_by,
    updated_by,
    folder_id
  ) values (
    v_draft_id,
    'Studio end-to-end smoke',
    'A short Studio test',
    'A2',
    'studio_smoke',
    'lesson',
    'draft',
    'manual',
    1,
    v_document,
    auth.uid(),
    auth.uid(),
    v_folder_id
  );

  if not exists (
    select 1
    from public.exercise_studio_drafts
    where id = v_draft_id
      and folder_id = v_folder_id
  ) then
    raise exception 'Studio folder did not attach to the draft.';
  end if;

  v_runtime := jsonb_build_object(
    'schema_version', 2,
    'entity_type', 'exercise',
    'exercise', jsonb_build_object(
      'client_key', 'exercise_studio_smoke',
      'title', 'A short Studio test',
      'description', 'CI Studio vertical smoke test.',
      'instructions', 'Complete the activities in order.',
      'instruction_language', 'it',
      'level', 'A2',
      'topic', 'studio_smoke',
      'estimated_minutes', 5,
      'settings', jsonb_build_object(
        'display_mode', 'one_at_a_time',
        'feedback_timing', 'question_end',
        'show_score', true,
        'show_correct_answers', true,
        'show_explanations', true,
        'show_diagnostic_summary', true,
        'allow_retry', true
      ),
      'sections', jsonb_build_array(
        jsonb_build_object(
          'client_key', 'section_main',
          'title', 'A short Studio test',
          'instructions', 'Work through each block in order.',
          'selection_mode', 'fixed',
          'feedback_timing', 'question_end',
          'settings', '{}'::jsonb,
          'questions', jsonb_build_array(
            jsonb_build_object(
              'client_key', 'studio_block_mcq',
              'type', 'multiple_choice',
              'title', 'Multiple choice',
              'prompt', 'Have you ever ___ to Scotland?',
              'instructions', 'Choose one answer.',
              'instruction_language', 'it',
              'level', 'A2',
              'topic', 'studio_smoke',
              'subtopic', null,
              'primary_skill', 'grammar',
              'learning_objective', 'Choose the correct past participle.',
              'difficulty', 'standard',
              'content', jsonb_build_object(
                'options', jsonb_build_array(
                  jsonb_build_object('key', 'option_1', 'text', 'been', 'is_correct', true),
                  jsonb_build_object('key', 'option_2', 'text', 'went', 'is_correct', false)
                )
              ),
              'grading', jsonb_build_object(
                'mode', 'automatic',
                'weight', 1,
                'nearly_correct_multiplier', 0.5
              ),
              'feedback', jsonb_build_object(
                'explanation', 'After have, use the past participle.'
              ),
              'diagnostics', jsonb_build_object(
                'tested_codes', jsonb_build_array()
              ),
              'tags', jsonb_build_array('studio-smoke')
            ),
            jsonb_build_object(
              'client_key', 'studio_block_vocab',
              'type', 'content_block',
              'title', 'Vocabulary',
              'prompt', 'Language worth keeping',
              'instructions', '',
              'instruction_language', 'it',
              'level', 'A2',
              'topic', 'studio_smoke',
              'subtopic', null,
              'primary_skill', 'vocabulary',
              'learning_objective', 'Notice useful language before production.',
              'difficulty', 'standard',
              'content', jsonb_build_object(
                'presentation', 'vocabulary',
                'heading', 'Language worth keeping',
                'body', '',
                'entries', jsonb_build_array(
                  jsonb_build_object(
                    'term', 'deadline',
                    'meaning', 'the latest time something must be finished',
                    'translation', 'scadenza',
                    'example', 'We are working to a tight deadline.'
                  ),
                  jsonb_build_object(
                    'term', 'get something off my plate',
                    'meaning', 'remove a task or responsibility from your workload',
                    'translation', 'togliersi qualcosa da fare',
                    'example', 'I need to get this report off my plate today.'
                  )
                )
              ),
              'grading', jsonb_build_object(
                'mode', 'automatic',
                'weight', 0,
                'nearly_correct_multiplier', 0.5
              ),
              'feedback', jsonb_build_object(),
              'diagnostics', jsonb_build_object('tested_codes', jsonb_build_array()),
              'tags', jsonb_build_array('studio-smoke', 'vocabulary')
            ),
            jsonb_build_object(
              'client_key', 'studio_block_selection',
              'type', 'practice_selection',
              'title', 'Selection · no correct answer',
              'prompt', 'Which expression would you like to remember?',
              'instructions', 'Choose anything useful to you.',
              'instruction_language', 'it',
              'level', 'A2',
              'topic', 'studio_smoke',
              'subtopic', null,
              'primary_skill', 'vocabulary',
              'learning_objective', 'Select useful language without right-or-wrong grading.',
              'difficulty', 'standard',
              'content', jsonb_build_object(
                'selection_mode', 'multiple',
                'options', jsonb_build_array(
                  jsonb_build_object('key', 'option_1', 'text', 'deadline', 'vocab_bank', true, 'vocab_kind', 'word'),
                  jsonb_build_object('key', 'option_2', 'text', 'get something off my plate', 'vocab_bank', true, 'vocab_kind', 'chunk')
                )
              ),
              'grading', jsonb_build_object(
                'mode', 'ungraded',
                'weight', 0,
                'nearly_correct_multiplier', 0
              ),
              'feedback', jsonb_build_object(),
              'diagnostics', jsonb_build_object(
                'tested_codes', jsonb_build_array()
              ),
              'tags', jsonb_build_array('studio-smoke', 'vocabulary')
            ),
            jsonb_build_object(
              'client_key', 'studio_block_writing',
              'type', 'written_response',
              'title', 'Written Response',
              'prompt', 'Write two sentences about a trip.',
              'instructions', 'Write your answer.',
              'instruction_language', 'it',
              'level', 'A2',
              'topic', 'studio_smoke',
              'subtopic', null,
              'primary_skill', 'writing',
              'learning_objective', 'Produce a short connected response.',
              'difficulty', 'standard',
              'content', jsonb_build_object(
                'context', 'Tell a colleague about a trip.',
                'min_words', 5,
                'max_words', 80,
                'required_points', jsonb_build_array('Say where you went'),
                'rubric', jsonb_build_array(
                  jsonb_build_object('key', 'task', 'label', 'Task', 'max_points', 10)
                ),
                'model_answer', null
              ),
              'grading', jsonb_build_object(
                'mode', 'manual_review',
                'weight', 10
              ),
              'feedback', jsonb_build_object(),
              'diagnostics', jsonb_build_object(
                'tested_codes', jsonb_build_array()
              ),
              'tags', jsonb_build_array('studio-smoke', 'writing')
            )
          ),
          'question_refs', jsonb_build_array(),
          'pool_rules', jsonb_build_array()
        )
      ),
      'tags', jsonb_build_array('studio-smoke', 'lesson'),
      'foundation_links', jsonb_build_array()
    )
  );

  v_publish := public.admin_publish_exercise_studio_draft(v_draft_id, v_runtime);
  v_exercise_id := (v_publish ->> 'exercise_id')::uuid;

  if not exists (
    select 1
    from public.exercise_studio_drafts
    where id = v_draft_id
      and status = 'published'
      and exercise_id = v_exercise_id
      and (select count(*) from jsonb_object_keys(publication_map)) = 4
  ) then
    raise exception 'Studio publish did not link the immutable runtime back to the draft.';
  end if;

  if not exists (
    select 1
    from public.exercise_builder_exercises exercise
    join public.exercise_builder_exercise_versions version
      on version.id = exercise.current_version_id
    where exercise.id = v_exercise_id
      and exercise.status = 'published'
      and version.review_status = 'approved'
  ) then
    raise exception 'Studio publish did not create an approved published exercise.';
  end if;

  if (
    select count(*)
    from public.exercise_builder_question_versions question_version
    join public.exercise_builder_questions question
      on question.current_version_id = question_version.id
    where question_version.topic = 'studio_smoke'
      and question.status = 'published'
      and question_version.review_status = 'approved'
  ) <> 4 then
    raise exception 'Studio publish did not publish the four pinned question versions.';
  end if;

  if (
    select count(*)
    from public.exercise_builder_diagnostic_codes code
    join public.exercise_builder_diagnostic_messages message
      on message.diagnostic_code = code.code
     and message.language = 'it'
    where code.topic = 'studio_smoke'
      and code.status = 'active'
  ) < 2 then
    raise exception 'Studio publish did not auto-create learner-readable diagnostics.';
  end if;

  v_assign := public.admin_quick_assign_exercise(
    '00000000-0000-0000-0000-000000000002'::uuid,
    v_exercise_id,
    null,
    null,
    true,
    'passed',
    70,
    1,
    true,
    true,
    true,
    true,
    true
  );

  v_assignment_id := (v_assign ->> 'assignment_id')::uuid;
  v_resource_id := (v_assign ->> 'assignment_resource_id')::uuid;

  if not exists (
    select 1
    from public.assignment_resources resource
    where resource.id = v_resource_id
      and resource.assignment_id = v_assignment_id
      and resource.resource_type = 'custom_exercise'
      and resource.exercise_config ->> 'exercise_id' = v_exercise_id::text
      and nullif(resource.exercise_config ->> 'exercise_version_id', '') is not null
  ) then
    raise exception 'Quick Assign did not pin the published immutable exercise version.';
  end if;

  perform set_config('app.test_uid', '00000000-0000-0000-0000-000000000002', false);

  v_attempt_payload := public.open_assigned_exercise_attempt(
    v_assignment_id,
    v_resource_id,
    false
  );
  v_attempt_id := (v_attempt_payload #>> '{attempt,id}')::uuid;

  if v_attempt_id is null then
    raise exception 'Learner could not open the assigned Studio exercise.';
  end if;

  select id
  into v_mcq_id
  from public.exercise_builder_attempt_questions
  where attempt_id = v_attempt_id
    and question_snapshot ->> 'type' = 'multiple_choice'
  limit 1;

  select id
  into v_selection_id
  from public.exercise_builder_attempt_questions
  where attempt_id = v_attempt_id
    and question_snapshot ->> 'type' = 'practice_selection'
  limit 1;

  select id
  into v_writing_id
  from public.exercise_builder_attempt_questions
  where attempt_id = v_attempt_id
    and question_snapshot ->> 'type' = 'written_response'
  limit 1;

  if v_mcq_id is null or v_selection_id is null or v_writing_id is null then
    raise exception 'Learner attempt does not contain the expected Studio question types.';
  end if;

  perform public.save_exercise_builder_answer(
    v_attempt_id,
    v_mcq_id,
    to_jsonb('option_1'::text),
    0,
    0
  );

  perform public.save_exercise_builder_answer(
    v_attempt_id,
    v_selection_id,
    jsonb_build_array('option_1'),
    0,
    1
  );

  perform public.save_exercise_builder_answer(
    v_attempt_id,
    v_writing_id,
    to_jsonb('I have visited Rome. I went there last summer.'::text),
    0,
    1
  );

  perform public.submit_exercise_builder_attempt(v_attempt_id);

  if not exists (
    select 1
    from public.exercise_builder_attempt_questions
    where id = v_mcq_id
      and automatic_grading_result ->> 'status' = 'correct'
  ) then
    raise exception 'Studio automatic question was not graded correctly.';
  end if;

  if not exists (
    select 1
    from public.exercise_builder_attempt_questions
    where id = v_selection_id
      and automatic_grading_result ->> 'status' = 'ungraded'
      and coalesce((automatic_grading_result ->> 'ungraded')::boolean, false)
  ) then
    raise exception 'Studio practice selection did not remain explicitly ungraded.';
  end if;

  if exists (
    select 1
    from public.exercise_builder_diagnostic_events
    where attempt_question_id = v_selection_id
  ) then
    raise exception 'Ungraded Studio selection created diagnostic evidence.';
  end if;

  if exists (
    select 1
    from public.exercise_builder_attempt_questions
    where id = v_selection_id
      and jsonb_array_length(coalesce(question_snapshot #> '{diagnostics,tested_codes}', '[]'::jsonb)) > 0
  ) then
    raise exception 'Studio publishing attached diagnostics to an ungraded selection.';
  end if;


  if not exists (
    select 1
    from public.learner_vocab_bank_items
    where learner_id = '00000000-0000-0000-0000-000000000002'::uuid
      and bank_kind = 'word'
      and normalized_text = 'deadline'
      and english_meaning = 'the latest time something must be finished'
      and italian_support = 'scadenza'
      and source_attempt_id = v_attempt_id
      and activity_added = true
      and self_added = false
  ) then
    raise exception 'Studio completion did not add the vocabulary word to the learner bank with activity provenance.';
  end if;

  if not exists (
    select 1
    from public.learner_vocab_bank_items
    where learner_id = '00000000-0000-0000-0000-000000000002'::uuid
      and bank_kind = 'chunk'
      and normalized_text = 'get something off my plate'
      and source_attempt_id = v_attempt_id
      and activity_added = true
      and self_added = false
  ) then
    raise exception 'Studio completion did not infer and add the vocabulary chunk with activity provenance.';
  end if;

  if not exists (
    select 1
    from public.exercise_builder_attempt_questions
    where id = v_writing_id
      and automatic_grading_result ->> 'status' = 'pending_review'
      and coalesce((automatic_grading_result ->> 'review_required')::boolean, false)
  ) then
    raise exception 'Studio written response did not remain pending manual review.';
  end if;

  if not exists (
    select 1
    from public.exercise_builder_attempts
    where id = v_attempt_id
      and status = 'submitted'
      and review_status = 'unreviewed'
      and (result_summary ->> 'pending_review')::integer = 1
  ) then
    raise exception 'Studio mixed attempt did not preserve the manual-review gate.';
  end if;

  insert into public.learner_vocab_bank_items (
    learner_id,
    bank_kind,
    normalized_text,
    display_text,
    english_meaning,
    italian_support,
    topic,
    self_added,
    activity_added
  ) values (
    '00000000-0000-0000-0000-000000000002'::uuid,
    'chunk',
    'SHOULD_BE_NORMALISED',
    '  Take   something   on board  ',
    'accept and seriously consider an idea',
    'prendere in considerazione',
    'work',
    true,
    false
  );

  if not exists (
    select 1
    from public.learner_vocab_bank_items
    where learner_id = '00000000-0000-0000-0000-000000000002'::uuid
      and bank_kind = 'chunk'
      and normalized_text = 'take something on board'
      and display_text = 'Take   something   on board'
      and self_added = true
      and activity_added = false
      and self_added_at is not null
  ) then
    raise exception 'Self-added vocabulary was not normalized and provenance-flagged correctly.';
  end if;

  perform set_config('app.test_uid', '00000000-0000-0000-0000-000000000001', false);

  v_review := public.admin_save_exercise_builder_attempt_review(
    v_attempt_id,
    jsonb_build_array(
      jsonb_build_object(
        'attempt_question_id', v_writing_id,
        'status', 'correct',
        'comment', 'Clear and complete.'
      )
    ),
    'Studio smoke review complete.',
    'approved'
  );

  if not exists (
    select 1
    from public.exercise_builder_attempts
    where id = v_attempt_id
      and review_status = 'approved'
      and score = 100
      and (result_summary ->> 'pending_review')::integer = 0
  ) then
    raise exception 'Teacher review did not resolve the pending Studio production.';
  end if;

  if not exists (
    select 1
    from public.assignments
    where id = v_assignment_id
      and status = 'completed'
  ) then
    raise exception 'Reviewed passing Studio assignment was not completed.';
  end if;

  insert into public.learner_groups (
    id, name, slug, status, group_type, created_by
  ) values (
    v_group_id, 'Studio CI Group', 'studio-ci-group', 'active', 'cohort', auth.uid()
  );

  insert into public.learner_group_members (
    group_id, learner_id, membership_status, joined_at
  ) values
    (v_group_id, '00000000-0000-0000-0000-000000000002'::uuid, 'active', now()),
    (v_group_id, '00000000-0000-0000-0000-000000000003'::uuid, 'active', now());

  v_group_assign := public.admin_quick_assign_exercise_group(
    v_group_id,
    v_exercise_id,
    'Studio group smoke',
    null,
    true,
    'passed',
    70,
    1,
    true,
    true,
    true,
    true,
    true
  );

  v_group_batch_id := (v_group_assign ->> 'batch_id')::uuid;

  if coalesce((v_group_assign ->> 'assignment_count')::integer, 0) <> 2 then
    raise exception 'Studio group Quick Assign did not create one assignment per active member.';
  end if;

  if (
    select count(*)
    from public.assignments assignment
    join public.assignment_resources resource on resource.assignment_id = assignment.id
    where assignment.group_batch_id = v_group_batch_id
      and assignment.status = 'published'
      and resource.resource_type = 'custom_exercise'
      and resource.exercise_config ->> 'exercise_id' = v_exercise_id::text
      and resource.exercise_config ->> 'exercise_version_id' = v_publish ->> 'version_id'
  ) <> 2 then
    raise exception 'Studio group Quick Assign did not pin the same published version for each learner.';
  end if;

  delete from public.exercise_studio_folders
  where id = v_folder_id;

  if not exists (
    select 1
    from public.exercise_studio_drafts
    where id = v_draft_id
      and folder_id is null
  ) then
    raise exception 'Deleting a Studio folder did not safely return its activity to Unfiled.';
  end if;

  if not exists (
    select 1
    from public.exercise_studio_folders
    where id = v_child_folder_id
      and parent_id is null
      and color_key = 'blue'
  ) then
    raise exception 'Deleting a Studio parent folder did not safely return its child folder to the Library root.';
  end if;

  delete from public.exercise_studio_folders
  where id = v_child_folder_id;
end;
$$;
