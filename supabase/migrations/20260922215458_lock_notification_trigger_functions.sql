revoke all on function public.archive_resolved_exercise_submission_notification() from public;
revoke execute on function public.archive_resolved_exercise_submission_notification() from anon, authenticated;

revoke all on function public.archive_started_assignment_notification() from public;
revoke execute on function public.archive_started_assignment_notification() from anon, authenticated;

revoke all on function public.archive_unpublished_review_notification() from public;
revoke execute on function public.archive_unpublished_review_notification() from anon, authenticated;

revoke all on function public.publish_exercise_review_notification() from public;
revoke execute on function public.publish_exercise_review_notification() from anon, authenticated;

notify pgrst, 'reload schema';
