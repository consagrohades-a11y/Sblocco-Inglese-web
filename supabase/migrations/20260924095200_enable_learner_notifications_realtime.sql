do $realtime$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'learner_notifications'
  ) then
    execute 'alter publication supabase_realtime add table public.learner_notifications';
  end if;
end;
$realtime$;
