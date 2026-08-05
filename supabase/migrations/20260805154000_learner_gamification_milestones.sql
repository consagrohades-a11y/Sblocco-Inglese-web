-- One-time, private learner milestones for SRS, Exercise Builder, and Targeted Practice.

alter table public.learner_notifications
  add column if not exists milestone_key text;

alter table public.learner_notifications
  drop constraint if exists learner_notifications_notification_type_check;

alter table public.learner_notifications
  add constraint learner_notifications_notification_type_check
  check (notification_type in (
    'exercise_review_published',
    'milestone_srs',
    'milestone_exercise',
    'milestone_practice'
  ));

create unique index if not exists learner_notifications_milestone_key_idx
  on public.learner_notifications(learner_id, milestone_key)
  where milestone_key is not null;

create or replace function public.create_learner_milestone(
  p_learner_id uuid,
  p_notification_type text,
  p_milestone_key text,
  p_title text,
  p_message text,
  p_route text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
begin
  if p_notification_type not in ('milestone_srs', 'milestone_exercise', 'milestone_practice') then
    raise exception 'Invalid milestone notification type.';
  end if;

  insert into public.learner_notifications (
    learner_id, notification_type, milestone_key, title, message, route
  ) values (
    p_learner_id, p_notification_type, p_milestone_key, p_title, p_message, p_route
  )
  on conflict (learner_id, milestone_key) where milestone_key is not null
  do nothing
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

create or replace function public.award_srs_milestones()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviews integer;
  v_mastered integer;
  v_study_days integer;
begin
  select count(*) into v_reviews
  from public.learner_review_history
  where learner_id = new.learner_id;

  if v_reviews in (10, 25, 50, 100, 250, 500) then
    perform public.create_learner_milestone(
      new.learner_id,
      'milestone_srs',
      'srs_reviews_' || v_reviews::text,
      case
        when v_reviews = 10 then 'A lovely start! ✨'
        when v_reviews = 25 then 'Tiny win, big progress! 🌱'
        when v_reviews = 50 then 'Fifty reviews! ⭐'
        when v_reviews = 100 then 'A hundred reviews! 🎉'
        else 'Your memory muscles are growing! 💪'
      end,
      'You have completed ' || v_reviews::text || ' SRS reviews. Every review is making your English stronger.',
      '/trainers'
    );
  end if;

  select count(*) into v_mastered
  from public.learner_srs_state
  where learner_id = new.learner_id
    and state = 'mastered';

  if v_mastered in (5, 10, 25, 50) then
    perform public.create_learner_milestone(
      new.learner_id,
      'milestone_srs',
      'srs_mastered_' || v_mastered::text,
      'These words are yours now! 🧠',
      'You have moved ' || v_mastered::text || ' cards into mastered. That is real long-term progress.',
      '/progressi'
    );
  end if;

  select count(distinct (created_at at time zone 'Europe/Rome')::date) into v_study_days
  from public.learner_review_history
  where learner_id = new.learner_id;

  if v_study_days in (3, 7, 14, 30) then
    perform public.create_learner_milestone(
      new.learner_id,
      'milestone_srs',
      'study_days_' || v_study_days::text,
      'Consistency looks good on you! 🌿',
      'You have practised on ' || v_study_days::text || ' different days. Small sessions really do add up.',
      '/progressi'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists learner_review_history_milestones on public.learner_review_history;
create trigger learner_review_history_milestones
after insert on public.learner_review_history
for each row execute function public.award_srs_milestones();

create or replace function public.exercise_attempt_is_final_for_milestones(
  p_status text,
  p_review_status text,
  p_result_summary jsonb,
  p_score numeric
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select p_status = 'submitted'
    and p_score is not null
    and (
      p_review_status = 'approved'
      or coalesce((p_result_summary ->> 'pending_review')::integer, 0) = 0
    );
$$;

create or replace function public.award_exercise_milestones()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_high_exercises integer;
  v_prior_best numeric;
  v_route text;
  v_title text;
begin
  if not public.exercise_attempt_is_final_for_milestones(new.status, new.review_status, new.result_summary, new.score) then
    return new;
  end if;

  v_route := '/exercises?assignmentId=' || new.assignment_id::text
    || '&resourceId=' || new.assignment_resource_id::text
    || '&attemptId=' || new.id::text;
  v_title := coalesce(nullif(new.exercise_snapshot ->> 'title', ''), 'this exercise');

  select max(attempt.score) into v_prior_best
  from public.exercise_builder_attempts attempt
  where attempt.learner_id = new.learner_id
    and attempt.id <> new.id
    and public.exercise_attempt_is_final_for_milestones(
      attempt.status, attempt.review_status, attempt.result_summary, attempt.score
    );

  if new.score = 100 then
    perform public.create_learner_milestone(
      new.learner_id,
      'milestone_exercise',
      'exercise_first_perfect',
      'Perfect score! 🏆',
      'You got 100% on ' || v_title || '. That deserves a little celebration.',
      v_route
    );
  end if;

  select count(distinct attempt.exercise_id) into v_high_exercises
  from public.exercise_builder_attempts attempt
  where attempt.learner_id = new.learner_id
    and attempt.score >= 90
    and public.exercise_attempt_is_final_for_milestones(
      attempt.status, attempt.review_status, attempt.result_summary, attempt.score
    );

  if v_high_exercises in (1, 3, 5, 10) then
    perform public.create_learner_milestone(
      new.learner_id,
      'milestone_exercise',
      'exercise_high_' || v_high_exercises::text,
      case when v_high_exercises = 1 then 'Star performance! 🌟' else 'You are on a roll! 🚀' end,
      case
        when v_high_exercises = 1 then 'You earned your first exercise score above 90%.'
        else 'You have scored at least 90% in ' || v_high_exercises::text || ' different exercises.'
      end,
      v_route
    );
  end if;

  if v_prior_best is not null and new.score >= v_prior_best + 10 then
    perform public.create_learner_milestone(
      new.learner_id,
      'milestone_exercise',
      'exercise_personal_best_' || new.id::text,
      'New personal best! ✨',
      'Your best exercise score jumped from ' || round(v_prior_best)::text || '% to ' || round(new.score)::text || '%.',
      v_route
    );
  end if;

  return new;
end;
$$;

drop trigger if exists exercise_attempt_insert_milestones on public.exercise_builder_attempts;
create trigger exercise_attempt_insert_milestones
after insert on public.exercise_builder_attempts
for each row execute function public.award_exercise_milestones();

drop trigger if exists exercise_attempt_update_milestones on public.exercise_builder_attempts;
create trigger exercise_attempt_update_milestones
after update of status, score, review_status on public.exercise_builder_attempts
for each row execute function public.award_exercise_milestones();

create or replace function public.award_targeted_practice_milestones()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_required integer;
  v_answered integer;
  v_average numeric;
  v_route text;
begin
  if new.assignment_id is null or new.assignment_resource_id is null then
    return new;
  end if;

  select greatest(1, coalesce((resource.practice_config ->> 'question_count')::integer, 1))
    into v_required
  from public.assignment_resources resource
  where resource.id = new.assignment_resource_id
    and resource.assignment_id = new.assignment_id
    and resource.resource_type = 'practice_session';

  if v_required is null then return new; end if;

  select count(*), round(avg(score), 0)
    into v_answered, v_average
  from public.applied_practice_attempts
  where learner_id = new.learner_id
    and assignment_id = new.assignment_id
    and assignment_resource_id = new.assignment_resource_id;

  if v_answered >= v_required then
    v_route := '/practice?assignmentId=' || new.assignment_id::text
      || '&resourceId=' || new.assignment_resource_id::text;
    perform public.create_learner_milestone(
      new.learner_id,
      'milestone_practice',
      'practice_complete_' || new.assignment_resource_id::text,
      'Vocabulary mission complete! 🎯',
      'You completed all ' || v_required::text || ' questions with ' || coalesce(v_average, 0)::text || '% accuracy.',
      v_route
    );
  end if;

  return new;
end;
$$;

drop trigger if exists targeted_practice_attempt_milestones on public.applied_practice_attempts;
create trigger targeted_practice_attempt_milestones
after insert on public.applied_practice_attempts
for each row execute function public.award_targeted_practice_milestones();

create or replace function public.get_learner_milestone_progress()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_reviews integer;
  v_mastered integer;
  v_next integer;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;

  select count(*) into v_reviews
  from public.learner_review_history
  where learner_id = auth.uid();

  select count(*) into v_mastered
  from public.learner_srs_state
  where learner_id = auth.uid() and state = 'mastered';

  select threshold into v_next
  from unnest(array[10, 25, 50, 100, 250, 500]) threshold
  where threshold > v_reviews
  order by threshold
  limit 1;

  return jsonb_build_object(
    'srs_reviews', v_reviews,
    'mastered_cards', v_mastered,
    'next_srs_milestone', v_next,
    'reviews_to_next_milestone', case when v_next is null then 0 else v_next - v_reviews end
  );
end;
$$;

revoke all on function public.create_learner_milestone(uuid, text, text, text, text, text) from public;
revoke all on function public.award_srs_milestones() from public;
revoke all on function public.exercise_attempt_is_final_for_milestones(text, text, jsonb, numeric) from public;
revoke all on function public.award_exercise_milestones() from public;
revoke all on function public.award_targeted_practice_milestones() from public;
revoke all on function public.get_learner_milestone_progress() from public;
grant execute on function public.get_learner_milestone_progress() to authenticated;

notify pgrst, 'reload schema';
