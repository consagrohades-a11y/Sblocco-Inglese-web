-- Avoid duplicate permissive SELECT policies on Recovery plan days.
-- The owner policy already includes admins and is sufficient for authenticated reads.

drop policy if exists recovery_plan_days_admin on public.recovery_plan_days;

notify pgrst, 'reload schema';
