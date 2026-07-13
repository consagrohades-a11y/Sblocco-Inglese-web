-- Link existing app activities to assignments without exposing private admin data.

create table if not exists public.assignment_resources (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  resource_key text not null,
  resource_type text not null check (resource_type in ('grammar_unit', 'trainer')),
  title text not null,
  description text,
  route text not null,
  sequence_index integer not null check (sequence_index > 0),
  created_at timestamptz not null default now(),
  unique (assignment_id, resource_key),
  unique (assignment_id, sequence_index),
  check (
    route in (
      '/levels/a1/be-basic-sentences',
      '/levels/a1/present-simple-normal-verbs',
      '/trainers/business-expression',
      '/trainers/general-expression',
      '/trainers/hospitality-expression',
      '/trainers/word-trainer'
    )
  )
);

create index if not exists assignment_resources_assignment_idx
  on public.assignment_resources(assignment_id, sequence_index);

alter table public.assignment_resources enable row level security;

drop policy if exists "assignment_resources_select_if_assignment_readable" on public.assignment_resources;
create policy "assignment_resources_select_if_assignment_readable"
on public.assignment_resources
for select
to authenticated
using (public.can_read_assignment(assignment_id));

drop policy if exists "assignment_resources_admin_all" on public.assignment_resources;
create policy "assignment_resources_admin_all"
on public.assignment_resources
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.assignment_resources to authenticated;

create or replace function public.admin_replace_assignment_resources(
  target_assignment_id uuid,
  resources jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  resource jsonb;
  inserted_count integer := 0;
  resource_route text;
  resource_type_value text;
  resource_key_value text;
  resource_title_value text;
  sequence_value integer;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if not exists (
    select 1 from public.assignments where id = target_assignment_id
  ) then
    raise exception 'Assignment not found.';
  end if;

  if resources is null or jsonb_typeof(resources) <> 'array' then
    raise exception 'Resources must be a JSON array.';
  end if;

  delete from public.assignment_resources
  where assignment_id = target_assignment_id;

  for resource in select value from jsonb_array_elements(resources)
  loop
    resource_key_value := nullif(trim(resource ->> 'key'), '');
    resource_type_value := nullif(trim(resource ->> 'type'), '');
    resource_title_value := nullif(trim(resource ->> 'title'), '');
    resource_route := nullif(trim(resource ->> 'route'), '');
    sequence_value := (resource ->> 'sequence_index')::integer;

    if resource_key_value is null or resource_title_value is null or resource_route is null then
      raise exception 'Every resource requires key, title, and route.';
    end if;

    if resource_type_value not in ('grammar_unit', 'trainer') then
      raise exception 'Unsupported resource type.';
    end if;

    if resource_route not in (
      '/levels/a1/be-basic-sentences',
      '/levels/a1/present-simple-normal-verbs',
      '/trainers/business-expression',
      '/trainers/general-expression',
      '/trainers/hospitality-expression',
      '/trainers/word-trainer'
    ) then
      raise exception 'Unsupported resource route.';
    end if;

    if sequence_value is null or sequence_value <= 0 then
      raise exception 'Invalid resource sequence.';
    end if;

    insert into public.assignment_resources (
      assignment_id,
      resource_key,
      resource_type,
      title,
      description,
      route,
      sequence_index
    ) values (
      target_assignment_id,
      resource_key_value,
      resource_type_value,
      resource_title_value,
      nullif(trim(resource ->> 'description'), ''),
      resource_route,
      sequence_value
    );

    inserted_count := inserted_count + 1;
  end loop;

  return inserted_count;
end;
$$;

revoke all on function public.admin_replace_assignment_resources(uuid, jsonb) from public;
grant execute on function public.admin_replace_assignment_resources(uuid, jsonb) to authenticated;
