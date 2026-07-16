# Learner groups and assignment batches

Learner groups are an admin-only organizational layer. A learner may be an active member of more than one group, and archiving a group never deletes memberships, assignments, attempts, analytics, or feedback.

## Group assignments

The admin chooses an existing assignment with publishable content as the source for a group batch. The database creates a separate assignment for every active member and copies the source assignment's pinned resources, Exercise Builder versions, collection snapshots, and SRS scope.

The generated assignments share only `group_batch_id`. Each learner still has an independent status, deadline, progress, attempt, score, review, and notification flow. Adding a learner to a group later does not silently create historical assignments.

## Privacy

Group tables are protected by admin-only RLS policies. Learners continue to read assignments through the existing ownership rules and cannot enumerate groups, memberships, other members, or their work. Group membership does not change Exercise Builder audio permissions.

## Release

Apply `supabase/migrations/20260716033000_learner_groups_and_assignment_batches.sql` before deploying the matching frontend. The migration is additive and does not rewrite existing assignments.
