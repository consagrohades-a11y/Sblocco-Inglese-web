-- Forward-only canonical name for the Recovery checkpoint manifest registrar.
-- PostgreSQL truncated the original over-63-byte identifier when the historical migration ran.

alter function public.admin_register_recovery_assessment_fragment_manifest_from_impor(uuid, jsonb)
  rename to admin_register_recovery_checkpoint_manifest;

revoke all on function public.admin_register_recovery_checkpoint_manifest(uuid, jsonb)
  from public, anon;

grant execute on function public.admin_register_recovery_checkpoint_manifest(uuid, jsonb)
  to authenticated;

notify pgrst, 'reload schema';
