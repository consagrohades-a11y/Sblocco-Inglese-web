-- The learner must enter through open_assigned_exercise_attempt so completed
-- results remain stable until a new attempt is explicitly requested.

revoke execute on function public.get_or_create_assigned_exercise_attempt(uuid, uuid) from authenticated;
revoke all on function public.get_or_create_assigned_exercise_attempt(uuid, uuid) from public;
