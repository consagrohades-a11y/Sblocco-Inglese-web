-- Cover Recovery Mastery v2 foreign keys used for evidence lookup and cleanup.
create index if not exists recovery_mastery_evidence_topic_key_idx
  on public.recovery_mastery_evidence(topic_key);
create index if not exists recovery_mastery_evidence_exercise_attempt_idx
  on public.recovery_mastery_evidence(exercise_attempt_id)
  where exercise_attempt_id is not null;
notify pgrst, 'reload schema';
