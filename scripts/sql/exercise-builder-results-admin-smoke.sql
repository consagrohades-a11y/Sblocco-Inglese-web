\set ON_ERROR_STOP on

create or replace function auth.uid()
returns uuid
language sql
stable
as $$ select '00000000-0000-0000-0000-000000000001'::uuid $$;

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000001', 'admin@example.test')
on conflict (id) do nothing;

insert into public.profiles (id, display_name, role, status)
values ('00000000-0000-0000-0000-000000000001', 'CI Admin', 'admin', 'active')
on conflict (id) do update set role = 'admin', status = 'active';

do $$
declare
  v_list jsonb;
begin
  if to_regprocedure('public.admin_list_exercise_builder_attempts(integer)') is null then
    raise exception 'Missing admin attempt list RPC.';
  end if;
  if to_regprocedure('public.admin_get_exercise_builder_attempt_detail(uuid)') is null then
    raise exception 'Missing admin attempt detail RPC.';
  end if;
  if to_regprocedure('public.admin_save_exercise_builder_attempt_review(uuid,jsonb,text,text)') is null then
    raise exception 'Missing admin attempt review RPC.';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'exercise_builder_attempt_questions'
      and column_name = 'automatic_grading_result'
  ) then raise exception 'Missing automatic grading preservation column.'; end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'exercise_builder_attempts'
      and column_name = 'review_status'
  ) then raise exception 'Missing attempt review status column.'; end if;

  v_list := public.admin_list_exercise_builder_attempts(10);
  if jsonb_typeof(v_list) <> 'array' then
    raise exception 'Admin attempt list must return a JSON array.';
  end if;
end;
$$;
