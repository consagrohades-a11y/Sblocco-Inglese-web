-- Fix identity creation in the visual Question Editor, Pool Builder, and
-- Exercise Composer. The original save functions attempted to call an
-- undefined next_exercise_builder_public_id(text) helper and then insert into
-- public_id, which is a generated column. The existing BEFORE INSERT trigger
-- already assigns public_number safely, so wrappers create the identity first
-- and delegate the version save to the original implementation.

-- Question Editor
DO $$
BEGIN
  IF to_regprocedure('public.admin_save_exercise_builder_question_version_legacy(uuid,jsonb)') IS NULL THEN
    ALTER FUNCTION public.admin_save_exercise_builder_question_version(uuid, jsonb)
      RENAME TO admin_save_exercise_builder_question_version_legacy;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.admin_save_exercise_builder_question_version(
  p_question_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question_id uuid := p_question_id;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;

  IF v_question_id IS NULL THEN
    INSERT INTO public.exercise_builder_questions (status, created_by)
    VALUES ('draft', auth.uid())
    RETURNING id INTO v_question_id;
  END IF;

  RETURN public.admin_save_exercise_builder_question_version_legacy(
    v_question_id,
    p_payload
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_exercise_builder_question_version(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_save_exercise_builder_question_version(uuid, jsonb) TO authenticated;

-- Pool Builder
DO $$
BEGIN
  IF to_regprocedure('public.admin_save_exercise_builder_pool_version_legacy(uuid,jsonb,jsonb)') IS NULL THEN
    ALTER FUNCTION public.admin_save_exercise_builder_pool_version(uuid, jsonb, jsonb)
      RENAME TO admin_save_exercise_builder_pool_version_legacy;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.admin_save_exercise_builder_pool_version(
  p_pool_id uuid,
  p_payload jsonb,
  p_memberships jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pool_id uuid := p_pool_id;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;

  IF v_pool_id IS NULL THEN
    INSERT INTO public.exercise_builder_pools (status, created_by)
    VALUES ('draft', auth.uid())
    RETURNING id INTO v_pool_id;
  END IF;

  RETURN public.admin_save_exercise_builder_pool_version_legacy(
    v_pool_id,
    p_payload,
    p_memberships
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_exercise_builder_pool_version(uuid, jsonb, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_save_exercise_builder_pool_version(uuid, jsonb, jsonb) TO authenticated;

-- Exercise Composer
DO $$
BEGIN
  IF to_regprocedure('public.admin_save_exercise_builder_exercise_version_legacy(uuid,jsonb,jsonb)') IS NULL THEN
    ALTER FUNCTION public.admin_save_exercise_builder_exercise_version(uuid, jsonb, jsonb)
      RENAME TO admin_save_exercise_builder_exercise_version_legacy;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.admin_save_exercise_builder_exercise_version(
  p_exercise_id uuid,
  p_payload jsonb,
  p_sections jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exercise_id uuid := p_exercise_id;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;

  IF v_exercise_id IS NULL THEN
    INSERT INTO public.exercise_builder_exercises (status, created_by)
    VALUES ('draft', auth.uid())
    RETURNING id INTO v_exercise_id;
  END IF;

  RETURN public.admin_save_exercise_builder_exercise_version_legacy(
    v_exercise_id,
    p_payload,
    p_sections
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_exercise_builder_exercise_version(uuid, jsonb, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_save_exercise_builder_exercise_version(uuid, jsonb, jsonb) TO authenticated;
