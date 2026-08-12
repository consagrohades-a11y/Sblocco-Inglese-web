-- Mastery Engine v2 least-privilege hardening.
-- Learners must not be able to directly invoke SECURITY DEFINER mastery mutators.

revoke execute on function public.recalculate_recovery_topic_mastery(uuid, text) from authenticated;
revoke execute on function public.recovery_evidence_weight(text) from authenticated;

-- sync_recovery_session remains the learner-facing ownership-checked write boundary.
grant execute on function public.sync_recovery_session(uuid) to authenticated;

notify pgrst, 'reload schema';
