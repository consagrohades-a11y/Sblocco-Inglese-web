-- Keep the currently deployed legacy Question Editor compatible with catalogs
-- that accidentally pass a question_version_id instead of a question_id.
-- The function still returns the stable question identity in the response.

create or replace function public.admin_get_exercise_builder_question_detail(p_question_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with resolved_question as (
    select question.id as question_id
    from public.exercise_builder_questions question
    where question.id = p_question_id

    union all

    select version.question_id
    from public.exercise_builder_question_versions version
    where version.id = p_question_id
      and not exists (
        select 1
        from public.exercise_builder_questions question
        where question.id = p_question_id
      )

    limit 1
  )
  select jsonb_build_object(
    'id', question.id,
    'public_id', question.public_id,
    'status', question.status,
    'version_id', version.id,
    'version_number', version.version_number,
    'review_status', version.review_status,
    'question_type', version.question_type,
    'title', version.title,
    'prompt', version.prompt,
    'instructions', version.instructions,
    'instruction_language', version.instruction_language,
    'level', version.level,
    'topic', version.topic,
    'subtopic', version.subtopic,
    'primary_skill', version.primary_skill,
    'learning_objective', version.learning_objective,
    'difficulty', version.difficulty,
    'content', version.content,
    'grading', version.grading,
    'feedback', version.feedback,
    'diagnostics', version.diagnostics,
    'tags', to_jsonb(version.tags),
    'media', version.media
  )
  from resolved_question resolved
  join public.exercise_builder_questions question
    on question.id = resolved.question_id
  join public.exercise_builder_question_versions version
    on version.id = question.current_version_id
  where public.is_admin();
$$;

revoke all on function public.admin_get_exercise_builder_question_detail(uuid) from public;
grant execute on function public.admin_get_exercise_builder_question_detail(uuid) to authenticated;
