-- Recupero Debito daily-plan security hardening.
-- Keep learner writes behind ownership-checked RPCs and avoid arbitrary entitlement probes.

revoke insert, update, delete on public.recovery_plan_days from authenticated;
grant select on public.recovery_plan_days to authenticated;

create or replace function public.has_active_recovery_entitlement(p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select case
    when auth.uid() is null then false
    when p_user_id = auth.uid() or public.is_admin() then
      exists (
        select 1
        from public.user_entitlements entitlement
        where entitlement.user_id = p_user_id
          and entitlement.status = 'active'
          and (entitlement.offer_id = 'recupero-debito' or entitlement.access_target = 'recupero-debito')
          and (entitlement.expires_at is null or entitlement.expires_at > now())
      )
      or exists (
        select 1
        from public.recovery_access_grants grant_row
        where grant_row.user_id = p_user_id
          and grant_row.status = 'active'
      )
    else false
  end;
$$;

revoke all on function public.has_active_recovery_entitlement(uuid) from public;
grant execute on function public.has_active_recovery_entitlement(uuid) to authenticated;

notify pgrst, 'reload schema';
