# Initial Supabase Migration Review

## Purpose

This document reviews the first Supabase migration prepared for the Sblocco Inglese Trainer database foundation.

The migration is code-only. It must not be applied to production until the schema, RLS model, and first-admin process are approved.

Migration file:

```text
supabase/migrations/20260712210000_initial_trainer_foundation.sql
```

## Tables Created

### Identity and Relationships

- `profiles`: authenticated user profile records linked to `auth.users`, including display settings, account status, and a protected `role` field.
- `teaching_relationships`: learner-teacher relationship records for Preply, cohort, company, and private-programme assignment eligibility.

### Learning Content

- `learning_items`: shared stable identity for word and expression items, including `public_id`, item type, level, domain, priority, and publication status.
- `words`: word-specific extension data for one trainable lexical sense.
- `expressions`: expression-specific extension data for one trainable pragmatic expression or pattern.

### Sentence Bank

- `sentence_bank_entries`: reusable reviewed sentences and utterances, including purpose, context, domain, level, provenance, dialogue linkage, and publication status.
- `learning_item_sentence_links`: many-to-many links between learning items and sentence-bank entries, with roles such as target, supporting, accepted answer, distractor source, and contrast item.

### Collections and Assignments

- `collections`: reusable collections, starter packs, specialist sets, lesson sets, temporary custom sets, and assignment snapshots.
- `collection_items`: ordered learning-item references inside collections.
- `assignments`: admin-authored learner assignments with deadline, note, publication, and access-expiration fields.
- `assignment_items`: ordered assignment components referencing either one learning item or one collection.

### Learner Progress

- `learner_srs_state`: one current SRS state per learner and learning item.
- `learner_review_history`: immutable SRS review event history.
- `applied_practice_attempts`: immutable applied-practice attempt history.

## Important Relationships

- `profiles.id` references `auth.users.id`.
- `teaching_relationships.learner_id` and `teacher_id` reference `profiles.id`.
- `words.id` and `expressions.id` reference `learning_items.id`, preserving separate learner-facing systems while sharing identity.
- `learning_item_sentence_links` connects reusable sentences to reusable content items without duplicating sentences.
- `collection_items` references both `collections` and `learning_items`.
- `assignments` reference the assigned learner, optional teacher, and optional teaching relationship.
- `assignment_items` reference either a learning item or a collection, but never both.
- `learner_srs_state` is unique per learner and learning item.
- `learner_review_history` and `applied_practice_attempts` are append-only by policy.

## RLS Behaviour

RLS is enabled on every table in the migration.

Admin authorization uses `public.profiles.role = 'admin'` via the `public.is_admin()` helper. No email address, secret key, service-role key, or database password is hardcoded.

Public content read behaviour:

- Anonymous and authenticated clients can read only published rows from `learning_items`, `words`, `expressions`, `sentence_bank_entries`, `learning_item_sentence_links`, `collections`, and `collection_items`.
- Child tables such as `words`, `expressions`, sentence links, and collection items check the published status of their parent rows.

Learner data behaviour:

- Learners can read only their own profile, SRS state, review history, applied attempts, and assignments.
- Learners can insert their own SRS state, review history, and applied-practice attempts.
- Learners can update their own SRS state.
- Review history and applied attempts intentionally have no learner update or delete policies.

Admin behaviour:

- Admin-authorized users can create and modify learning content, sentence-bank entries, collections, assignments, relationship records, and progress records through RLS policies.
- Anonymous users have no write grants and no write policies.

## Indexes

The migration adds indexes for:

- profile role and status checks;
- relationship lookups by learner, teacher, and status;
- content filtering by type, status, level, and domain;
- sentence filtering by status and purpose;
- item-to-sentence link lookups from either side;
- collection item ordering;
- assignment lists by learner, teacher, status, and deadline;
- due SRS queues by learner and due date;
- review and applied-attempt history ordered by learner and creation time.

## Assumptions

- The first admin profile will be created through a trusted manual process after auth is configured.
- `profiles.role` is treated as protected data; normal learners cannot promote themselves through the provided RLS policies.
- Published content is safe to read through the Supabase publishable browser key.
- Draft, review-needed, approved-but-unpublished, and archived content must not be visible to anonymous learners.
- The migration prepares the foundation only; it does not import existing JavaScript trainer content.
- Assignment content can initially reference learning items or collections. More complex exercise-version assignments can be added in a later migration.

## Unresolved Questions

- Whether `teacher_id` should eventually support non-admin teachers or remain admin-only for the first release.
- Whether collections need immutable `collection_versions` before the first learner-facing assignment workflow ships.
- Whether assignments should snapshot item versions once content versioning is introduced.
- Whether `profiles.role` should be supplemented by Supabase `app_metadata` for defense in depth.
- Whether progress writes should eventually happen only through RPC functions instead of direct table inserts from authenticated clients.

## Future Apply Commands

Do not run these commands yet. They are listed only for the eventual review-approved deployment path.

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

For a local-only review database, the eventual commands would be:

```bash
supabase start
supabase migration up
supabase db lint
```

## Validation Notes

This migration should be reviewed statically before any database connection is used. Recommended checks:

```bash
supabase db lint
supabase migration list
```

Those commands require the Supabase CLI and an intentional local or linked project context.
