-- Recupero Debito daily-plan least-privilege lockdown.
-- Learners read their own rows through RLS; writes stay behind ownership-checked RPCs.

revoke all privileges on table public.recovery_plan_days from anon, authenticated;
grant select on table public.recovery_plan_days to authenticated;

notify pgrst, 'reload schema';
