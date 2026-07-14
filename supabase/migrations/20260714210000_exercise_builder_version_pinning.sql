-- Pin exact question and pool versions inside exercise versions.
-- This prevents future catalog edits from changing old exercises or assignments.

alter table public.exercise_builder_pool_versions
  add column if not exists review_status text not null default 'in_review'
  check (review_status in ('in_review', 'approved'));

alter table public.exercise_builder_pool_questions
  add column if not exists question_version_id uuid references public.exercise_builder_question_versions(id) on delete restrict;

alter table public.exercise_builder_section_fixed_questions
  add column if not exists question_version_id uuid references public.exercise_builder_question_versions(id) on delete restrict;

alter table public.exercise_builder_section_pool_rules
  add column if not exists pool_version_id uuid references public.exercise_builder_pool_versions(id) on delete restrict;

update public.exercise_builder_pool_questions membership
set question_version_id = question.current_version_id
from public.exercise_builder_questions question
where question.id = membership.question_id
  and membership.question_version_id is null;

update public.exercise_builder_section_fixed_questions fixed
set question_version_id = question.current_version_id
from public.exercise_builder_questions question
where question.id = fixed.question_id
  and fixed.question_version_id is null;

update public.exercise_builder_section_pool_rules rule
set pool_version_id = pool.current_version_id
from public.exercise_builder_pools pool
where pool.id = rule.pool_id
  and rule.pool_version_id is null;

update public.exercise_builder_pool_versions version
set review_status = 'approved'
where exists (
  select 1
  from public.exercise_builder_pools pool
  where pool.current_version_id = version.id
    and pool.status in ('approved', 'published')
) or exists (
  select 1
  from public.exercise_builder_section_pool_rules rule
  join public.exercise_builder_sections section on section.id = rule.section_id
  join public.exercise_builder_exercise_versions exercise_version on exercise_version.id = section.exercise_version_id
  join public.exercise_builder_exercises exercise on exercise.id = exercise_version.exercise_id
  where rule.pool_version_id = version.id
    and exercise.status in ('approved', 'published')
);

alter table public.exercise_builder_pool_questions
  alter column question_version_id set not null;
alter table public.exercise_builder_section_fixed_questions
  alter column question_version_id set not null;
alter table public.exercise_builder_section_pool_rules
  alter column pool_version_id set not null;

create or replace function public.pin_exercise_builder_pool_question_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.question_version_id is null then
    select current_version_id into new.question_version_id
    from public.exercise_builder_questions
    where id = new.question_id;
  end if;
  if not exists (
    select 1 from public.exercise_builder_question_versions
    where id = new.question_version_id and question_id = new.question_id
  ) then
    raise exception 'Question version does not belong to the selected question.';
  end if;
  return new;
end;
$$;

create or replace function public.pin_exercise_builder_fixed_question_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.question_version_id is null then
    select current_version_id into new.question_version_id
    from public.exercise_builder_questions
    where id = new.question_id;
  end if;
  if not exists (
    select 1 from public.exercise_builder_question_versions
    where id = new.question_version_id and question_id = new.question_id
  ) then
    raise exception 'Fixed question version does not belong to the selected question.';
  end if;
  return new;
end;
$$;

create or replace function public.pin_exercise_builder_section_pool_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.pool_version_id is null then
    select current_version_id into new.pool_version_id
    from public.exercise_builder_pools
    where id = new.pool_id;
  end if;
  if not exists (
    select 1 from public.exercise_builder_pool_versions
    where id = new.pool_version_id and pool_id = new.pool_id
  ) then
    raise exception 'Pool version does not belong to the selected pool.';
  end if;
  return new;
end;
$$;

drop trigger if exists exercise_builder_pool_questions_pin_version on public.exercise_builder_pool_questions;
create trigger exercise_builder_pool_questions_pin_version
before insert or update of question_id, question_version_id
on public.exercise_builder_pool_questions
for each row execute function public.pin_exercise_builder_pool_question_version();

drop trigger if exists exercise_builder_fixed_questions_pin_version on public.exercise_builder_section_fixed_questions;
create trigger exercise_builder_fixed_questions_pin_version
before insert or update of question_id, question_version_id
on public.exercise_builder_section_fixed_questions
for each row execute function public.pin_exercise_builder_fixed_question_version();

drop trigger if exists exercise_builder_section_pools_pin_version on public.exercise_builder_section_pool_rules;
create trigger exercise_builder_section_pools_pin_version
before insert or update of pool_id, pool_version_id
on public.exercise_builder_section_pool_rules
for each row execute function public.pin_exercise_builder_section_pool_version();

create or replace function public.exercise_builder_full_question_snapshot(
  p_question_id uuid,
  p_question_version_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'question_id', question.id,
    'question_version_id', version.id,
    'public_id', question.public_id,
    'type', version.question_type,
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
    'tags', to_jsonb(version.tags)
  )
  from public.exercise_builder_questions question
  join public.exercise_builder_question_versions version
    on version.id = p_question_version_id and version.question_id = question.id
  where question.id = p_question_id
    and version.review_status = 'approved';
$$;

create or replace function public.get_or_create_assigned_exercise_attempt(
  p_assignment_id uuid,
  p_resource_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resource record;
  v_attempt_id uuid;
  v_attempt_number integer;
  v_exercise_snapshot jsonb;
  v_section record;
  v_attempt_section_id uuid;
  v_fixed record;
  v_rule record;
  v_candidate record;
  v_sequence integer;
  v_needed integer;
  v_inserted integer;
  v_question_snapshot jsonb;
  v_latest_submitted uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;

  select assignment.learner_id,
         assignment.status assignment_status,
         resource.exercise_config,
         (resource.exercise_config ->> 'exercise_id')::uuid exercise_id,
         (resource.exercise_config ->> 'exercise_version_id')::uuid exercise_version_id
    into v_resource
  from public.assignments assignment
  join public.assignment_resources resource on resource.assignment_id = assignment.id
  where assignment.id = p_assignment_id
    and resource.id = p_resource_id
    and resource.resource_type = 'custom_exercise'
    and resource.route = '/exercises'
    and assignment.status in ('published', 'completed')
    and (assignment.learner_id = auth.uid() or public.is_admin());

  if v_resource.exercise_id is null then raise exception 'Assigned exercise not found.'; end if;

  select id into v_attempt_id
  from public.exercise_builder_attempts
  where learner_id = v_resource.learner_id
    and assignment_resource_id = p_resource_id
    and status = 'in_progress'
  limit 1;
  if v_attempt_id is not null then
    return public.exercise_builder_attempt_payload(v_attempt_id);
  end if;

  select id into v_latest_submitted
  from public.exercise_builder_attempts
  where learner_id = v_resource.learner_id
    and assignment_resource_id = p_resource_id
    and status = 'submitted'
  order by attempt_number desc
  limit 1;
  if v_latest_submitted is not null
    and coalesce((v_resource.exercise_config ->> 'allow_retry')::boolean, true) = false then
    return public.exercise_builder_attempt_payload(v_latest_submitted);
  end if;

  select jsonb_build_object(
    'id', exercise.id,
    'version_id', version.id,
    'public_id', exercise.public_id,
    'title', version.title,
    'description', version.description,
    'instructions', version.instructions,
    'instruction_language', version.instruction_language,
    'level', version.level,
    'topic', version.topic,
    'estimated_minutes', version.estimated_minutes,
    'settings', version.settings || jsonb_build_object(
      'show_score', coalesce((v_resource.exercise_config ->> 'show_score')::boolean, true),
      'show_correct_answers', coalesce((v_resource.exercise_config ->> 'show_correct_answers')::boolean, true),
      'show_explanations', coalesce((v_resource.exercise_config ->> 'show_explanations')::boolean, true),
      'show_diagnostic_summary', coalesce((v_resource.exercise_config ->> 'show_diagnostic_summary')::boolean, true),
      'allow_retry', coalesce((v_resource.exercise_config ->> 'allow_retry')::boolean, true)
    )
  ) into v_exercise_snapshot
  from public.exercise_builder_exercises exercise
  join public.exercise_builder_exercise_versions version
    on version.id = v_resource.exercise_version_id and version.exercise_id = exercise.id
  where exercise.id = v_resource.exercise_id
    and version.review_status = 'approved';

  if v_exercise_snapshot is null then
    raise exception 'The assigned exercise version is unavailable.';
  end if;

  select coalesce(max(attempt_number), 0) + 1 into v_attempt_number
  from public.exercise_builder_attempts
  where learner_id = v_resource.learner_id
    and assignment_resource_id = p_resource_id;

  insert into public.exercise_builder_attempts (
    learner_id, assignment_id, assignment_resource_id, exercise_id,
    exercise_version_id, attempt_number, exercise_snapshot
  ) values (
    v_resource.learner_id, p_assignment_id, p_resource_id,
    v_resource.exercise_id, v_resource.exercise_version_id,
    v_attempt_number, v_exercise_snapshot
  ) returning id into v_attempt_id;

  create temporary table if not exists exercise_builder_selected_questions (
    question_id uuid primary key
  ) on commit drop;
  truncate exercise_builder_selected_questions;

  for v_section in
    select *
    from public.exercise_builder_sections
    where exercise_version_id = v_resource.exercise_version_id
    order by sequence_index
  loop
    insert into public.exercise_builder_attempt_sections (
      attempt_id, source_section_id, sequence_index, title,
      instructions, feedback_timing, settings
    ) values (
      v_attempt_id, v_section.id, v_section.sequence_index, v_section.title,
      v_section.instructions, v_section.feedback_timing, v_section.settings
    ) returning id into v_attempt_section_id;

    v_sequence := 0;

    for v_fixed in
      select fixed.question_id, fixed.question_version_id
      from public.exercise_builder_section_fixed_questions fixed
      where fixed.section_id = v_section.id
      order by fixed.sequence_index
    loop
      if not exists (
        select 1 from exercise_builder_selected_questions selected
        where selected.question_id = v_fixed.question_id
      ) then
        v_question_snapshot := public.exercise_builder_full_question_snapshot(
          v_fixed.question_id,
          v_fixed.question_version_id
        );
        if v_question_snapshot is null then
          raise exception 'A fixed question version is not approved.';
        end if;
        insert into public.exercise_builder_attempt_questions (
          attempt_id, attempt_section_id, sequence_index,
          question_id, question_version_id, question_snapshot
        ) values (
          v_attempt_id, v_attempt_section_id, v_sequence,
          v_fixed.question_id, v_fixed.question_version_id, v_question_snapshot
        );
        insert into exercise_builder_selected_questions values (v_fixed.question_id)
          on conflict do nothing;
        v_sequence := v_sequence + 1;
      end if;
    end loop;

    for v_rule in
      select rule.*, pool_version.review_status
      from public.exercise_builder_section_pool_rules rule
      join public.exercise_builder_pool_versions pool_version
        on pool_version.id = rule.pool_version_id
       and pool_version.pool_id = rule.pool_id
      where rule.section_id = v_section.id
        and pool_version.review_status = 'approved'
      order by rule.sequence_index
    loop
      v_needed := v_rule.question_count;
      v_inserted := 0;

      for v_candidate in
        select membership.question_id, membership.question_version_id
        from public.exercise_builder_pool_questions membership
        join public.exercise_builder_question_versions question_version
          on question_version.id = membership.question_version_id
         and question_version.question_id = membership.question_id
         and question_version.review_status = 'approved'
        where membership.pool_version_id = v_rule.pool_version_id
          and membership.pinned
          and not exists (
            select 1 from exercise_builder_selected_questions selected
            where selected.question_id = membership.question_id
          )
        order by coalesce(membership.sequence_index, 999999), membership.question_id
        limit v_needed
      loop
        v_question_snapshot := public.exercise_builder_full_question_snapshot(
          v_candidate.question_id,
          v_candidate.question_version_id
        );
        insert into public.exercise_builder_attempt_questions (
          attempt_id, attempt_section_id, sequence_index,
          question_id, question_version_id, question_snapshot
        ) values (
          v_attempt_id, v_attempt_section_id, v_sequence,
          v_candidate.question_id, v_candidate.question_version_id, v_question_snapshot
        );
        insert into exercise_builder_selected_questions values (v_candidate.question_id)
          on conflict do nothing;
        v_sequence := v_sequence + 1;
        v_inserted := v_inserted + 1;
      end loop;

      v_needed := v_needed - v_inserted;
      if v_needed > 0 then
        for v_candidate in
          select membership.question_id,
                 membership.question_version_id,
                 coalesce(history.exposure_count, 0) exposure_count,
                 history.last_seen
          from public.exercise_builder_pool_questions membership
          join public.exercise_builder_question_versions question_version
            on question_version.id = membership.question_version_id
           and question_version.question_id = membership.question_id
           and question_version.review_status = 'approved'
          left join lateral (
            select count(*) exposure_count, max(attempt_question.created_at) last_seen
            from public.exercise_builder_attempt_questions attempt_question
            join public.exercise_builder_attempts attempt
              on attempt.id = attempt_question.attempt_id
            where attempt.learner_id = v_resource.learner_id
              and attempt_question.question_id = membership.question_id
          ) history on true
          where membership.pool_version_id = v_rule.pool_version_id
            and not exists (
              select 1 from exercise_builder_selected_questions selected
              where selected.question_id = membership.question_id
            )
            and (
              not (v_rule.filters ? 'question_types')
              or question_version.question_type in (
                select value from jsonb_array_elements_text(v_rule.filters -> 'question_types')
              )
            )
            and (
              not (v_rule.filters ? 'difficulty')
              or question_version.difficulty in (
                select value from jsonb_array_elements_text(v_rule.filters -> 'difficulty')
              )
            )
            and (
              not (v_rule.filters ? 'tags')
              or question_version.tags && public.exercise_builder_jsonb_text_array(v_rule.filters -> 'tags')
            )
          order by
            case when v_rule.selection_strategy in ('unseen_first', 'avoid_recent', 'balanced')
              then coalesce(history.exposure_count, 0) end asc,
            case when v_rule.selection_strategy in ('avoid_recent', 'balanced')
              then history.last_seen end asc nulls first,
            random()
          limit v_needed
        loop
          v_question_snapshot := public.exercise_builder_full_question_snapshot(
            v_candidate.question_id,
            v_candidate.question_version_id
          );
          insert into public.exercise_builder_attempt_questions (
            attempt_id, attempt_section_id, sequence_index,
            question_id, question_version_id, question_snapshot
          ) values (
            v_attempt_id, v_attempt_section_id, v_sequence,
            v_candidate.question_id, v_candidate.question_version_id, v_question_snapshot
          );
          insert into exercise_builder_selected_questions values (v_candidate.question_id)
            on conflict do nothing;
          v_sequence := v_sequence + 1;
          v_inserted := v_inserted + 1;
        end loop;
      end if;

      if v_inserted < v_rule.question_count then
        raise exception 'Pool version % cannot provide % unique approved questions.',
          v_rule.pool_version_id, v_rule.question_count;
      end if;
    end loop;

    if v_sequence = 0 then
      raise exception 'An exercise section produced no questions.';
    end if;
  end loop;

  return public.exercise_builder_attempt_payload(v_attempt_id);
end;
$$;

revoke all on function public.exercise_builder_full_question_snapshot(uuid, uuid) from public;
revoke all on function public.get_or_create_assigned_exercise_attempt(uuid, uuid) from public;
