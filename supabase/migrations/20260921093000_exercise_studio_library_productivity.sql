alter table public.exercise_studio_drafts
  add column if not exists pinned_at timestamptz;

create index if not exists exercise_studio_drafts_pinned_idx
  on public.exercise_studio_drafts (pinned_at desc)
  where pinned_at is not null;

create or replace function public.admin_bulk_patch_exercise_studio_tags(
  p_draft_ids uuid[],
  p_add_tags text[] default '{}'::text[],
  p_remove_tags text[] default '{}'::text[]
)
returns table (
  id uuid,
  tags jsonb,
  updated_at timestamptz
)
language sql
security invoker
set search_path = public, pg_temp
as $$
  with target as (
    select
      d.id,
      array(
        select chosen.tag
        from (
          select distinct on (lower(candidate.tag))
            candidate.tag
          from (
            select nullif(btrim(existing.value), '') as tag
            from jsonb_array_elements_text(coalesce(d.document -> 'tags', '[]'::jsonb)) as existing(value)

            union all

            select nullif(btrim(addition.value), '') as tag
            from unnest(coalesce(p_add_tags, '{}'::text[])) as addition(value)
          ) as candidate
          where candidate.tag is not null
            and not exists (
              select 1
              from unnest(coalesce(p_remove_tags, '{}'::text[])) as removal(value)
              where lower(btrim(removal.value)) = lower(candidate.tag)
            )
          order by lower(candidate.tag), candidate.tag
        ) as chosen
        order by lower(chosen.tag), chosen.tag
      ) as next_tags
    from public.exercise_studio_drafts d
    where d.id = any(coalesce(p_draft_ids, '{}'::uuid[]))
  )
  update public.exercise_studio_drafts d
  set
    document = jsonb_set(d.document, '{tags}', to_jsonb(target.next_tags), true),
    updated_by = auth.uid(),
    updated_at = now()
  from target
  where d.id = target.id
  returning d.id, d.document -> 'tags', d.updated_at;
$$;

revoke all on function public.admin_bulk_patch_exercise_studio_tags(uuid[], text[], text[]) from public;
revoke all on function public.admin_bulk_patch_exercise_studio_tags(uuid[], text[], text[]) from anon;
grant execute on function public.admin_bulk_patch_exercise_studio_tags(uuid[], text[], text[]) to authenticated;

notify pgrst, 'reload schema';
