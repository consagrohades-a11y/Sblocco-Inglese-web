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
  v_question_id uuid := gen_random_uuid();
  v_pool_id uuid := gen_random_uuid();
  v_exercise_id uuid := gen_random_uuid();
  v_collection jsonb;
  v_collection_id uuid;
  v_detail jsonb;
  v_question_status text;
  v_pool_status text;
  v_exercise_status text;
begin
  insert into public.exercise_builder_questions (id, public_id, status, created_by)
  values (v_question_id, 'Q-98001', 'draft', auth.uid());
  insert into public.exercise_builder_pools (id, public_id, status, created_by)
  values (v_pool_id, 'POOL-98001', 'draft', auth.uid());
  insert into public.exercise_builder_exercises (id, public_id, status, created_by)
  values (v_exercise_id, 'EX-98001', 'draft', auth.uid());

  v_collection := public.admin_save_exercise_builder_collection(
    null,
    jsonb_build_object(
      'title', 'Collections smoke test',
      'description', 'Purely organizational group.',
      'catalog_status', 'active',
      'color_key', 'violet'
    ),
    jsonb_build_array(
      jsonb_build_object('entity_type', 'question', 'entity_id', v_question_id, 'sequence_index', 1),
      jsonb_build_object('entity_type', 'question_pool', 'entity_id', v_pool_id, 'sequence_index', 2),
      jsonb_build_object('entity_type', 'exercise', 'entity_id', v_exercise_id, 'sequence_index', 3)
    )
  );
  v_collection_id := (v_collection ->> 'id')::uuid;

  v_detail := public.admin_get_exercise_builder_collection_detail(v_collection_id);
  if v_detail is null or jsonb_array_length(v_detail -> 'items') <> 3 then
    raise exception 'Collection detail did not return all items.';
  end if;

  perform public.admin_save_exercise_builder_collection(
    v_collection_id,
    jsonb_build_object(
      'title', 'Collections smoke test updated',
      'catalog_status', 'active',
      'color_key', 'cyan'
    ),
    jsonb_build_array(
      jsonb_build_object('entity_type', 'exercise', 'entity_id', v_exercise_id, 'sequence_index', 1),
      jsonb_build_object('entity_type', 'question', 'entity_id', v_question_id, 'sequence_index', 2)
    )
  );

  v_detail := public.admin_get_exercise_builder_collection_detail(v_collection_id);
  if jsonb_array_length(v_detail -> 'items') <> 2 then
    raise exception 'Collection update did not replace its organizational items.';
  end if;
  if v_detail -> 'items' -> 0 ->> 'entity_type' <> 'exercise' then
    raise exception 'Collection order was not preserved.';
  end if;

  select status into v_question_status from public.exercise_builder_questions where id = v_question_id;
  select status into v_pool_status from public.exercise_builder_pools where id = v_pool_id;
  select status into v_exercise_status from public.exercise_builder_exercises where id = v_exercise_id;
  if v_question_status <> 'draft' or v_pool_status <> 'draft' or v_exercise_status <> 'draft' then
    raise exception 'Collection changes modified content lifecycle state.';
  end if;

  perform public.admin_set_exercise_builder_collection_status(v_collection_id, 'archived');
  if not exists (
    select 1 from public.exercise_builder_collections
    where id = v_collection_id and catalog_status = 'archived'
  ) then raise exception 'Collection archive status was not saved.'; end if;
end;
$$;
