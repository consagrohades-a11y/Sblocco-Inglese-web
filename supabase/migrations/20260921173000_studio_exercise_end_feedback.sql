-- Learning Studio: release learner results after the whole activity is submitted.
-- This is intentionally scoped to Studio-authored exercises. Recovery keeps its own
-- phase-specific feedback timing.

update public.exercise_studio_drafts
set document = jsonb_set(
      jsonb_set(
        document,
        '{settings}',
        case
          when jsonb_typeof(document -> 'settings') = 'object' then document -> 'settings'
          else '{}'::jsonb
        end,
        true
      ),
      '{settings,feedback_timing}',
      '"exercise_end"'::jsonb,
      true
    ),
    updated_at = now()
where coalesce(document #>> '{settings,feedback_timing}', '') <> 'exercise_end';

-- Apply the product-level timing change to existing Studio-published runtime versions
-- so already assigned Studio activities follow the same learner experience.
update public.exercise_builder_exercise_versions ev
set settings = jsonb_set(
      case
        when jsonb_typeof(ev.settings) = 'object' then ev.settings
        else '{}'::jsonb
      end,
      '{feedback_timing}',
      '"exercise_end"'::jsonb,
      true
    )
where exists (
  select 1
  from public.exercise_studio_drafts d
  where d.exercise_id = ev.exercise_id
)
and coalesce(ev.settings ->> 'feedback_timing', '') <> 'exercise_end';

update public.exercise_builder_sections s
set feedback_timing = 'exercise_end'
where coalesce(s.feedback_timing, '') <> 'exercise_end'
  and exists (
    select 1
    from public.exercise_builder_exercise_versions ev
    join public.exercise_studio_drafts d
      on d.exercise_id = ev.exercise_id
    where ev.id = s.exercise_version_id
  );

do $patch$
declare
  v_definition text;
  v_old text := '''feedback_timing'', coalesce(v_section ->> ''feedback_timing'', ''question_end'')';
  v_new text := '''feedback_timing'', coalesce(v_section ->> ''feedback_timing'', ''exercise_end'')';
begin
  select pg_get_functiondef('public.admin_publish_exercise_studio_draft(uuid,jsonb)'::regprocedure)
    into v_definition;

  if position(v_new in v_definition) = 0 then
    if position(v_old in v_definition) = 0 then
      raise exception 'Unexpected admin_publish_exercise_studio_draft feedback timing definition.';
    end if;

    execute replace(v_definition, v_old, v_new);
  end if;
end;
$patch$;

notify pgrst, 'reload schema';
