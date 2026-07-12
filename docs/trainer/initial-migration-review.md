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
- Child extension triggers reject `words` rows whose parent `learning_items.item_type` is not `word`, and `expressions` rows whose parent type is not `expression`.
- A parent-side `learning_items_protect_item_type` trigger rejects changing `learning_items.item_type` away from `word` while a related `words` row exists, or away from `expression` while a related `expressions` row exists. Item type changes remain valid only before an incompatible extension row exists.
- `learning_item_sentence_links` connects reusable sentences to reusable content items without duplicating sentences.
- `collection_items` references both `collections` and `learning_items`.
- `assignments` reference the assigned learner, optional teacher, and optional teaching relationship.
- `assignment_items` reference either a learning item or a collection, but never both.
- `learner_srs_state` is unique per learner and learning item.
- `learner_review_history` and `applied_practice_attempts` are append-only by policy.

## RLS Behaviour

RLS is enabled on every table in the migration.

Admin authorization uses `public.profiles.role = 'admin'` via the `public.is_admin()` helper. No email address, secret key, service-role key, or database password is hardcoded.

Security-definer helper functions use `set search_path = public`. Execute permission is revoked from `PUBLIC` and granted only to `authenticated` for:

- `public.is_admin()`
- `public.can_read_assignment(uuid)`
- `public.can_read_assigned_learning_item(uuid)`
- `public.can_read_assigned_collection(uuid)`
- `public.can_read_assigned_sentence(uuid)`

Public content read behaviour:

- Anonymous and authenticated clients can read only published rows from `learning_items`, `words`, `expressions`, `sentence_bank_entries`, `learning_item_sentence_links`, `collections`, and `collection_items`.
- Child tables such as `words`, `expressions`, sentence links, and collection items check the published status of their parent rows.
- Anonymous collection reads are restricted to published `reusable`, `starter_pack`, and `specialist` collections. `temporary_custom`, `assignment_snapshot`, and `lesson` collections are not anonymously readable.

Learner data behaviour:

- Learners can read only their own profile, SRS state, review history, applied attempts, and currently accessible assignments.
- Learner-visible assignments must belong to the learner, have `status` of `published` or `completed`, have `published_at` in the past when set, and have `access_ends_at` in the future when set.
- Learners can insert their own SRS state, review history, and applied-practice attempts.
- Learners can update their own SRS state.
- Review history and applied attempts intentionally have no learner update or delete policies.
- Learners can update only `display_name`, `interface_language`, and `timezone` on their own profile. A `BEFORE UPDATE` trigger rejects authenticated non-admin changes to `id`, `role`, `status`, `created_at`, or client-supplied `updated_at`. The separate timestamp trigger remains responsible for setting `updated_at`.

Assignment-based private content behaviour:

- Authenticated learners can read non-public learning items, word records, expression records, collections, collection items, sentence links, and sentence entries only when the content is part of one of their currently accessible assignments.
- Direct assignment items can entitle one learning item.
- Collection assignment items can entitle the assigned collection, its collection items, the collection's learning items, and linked sentence-bank entries.
- Assigned private content is not granted to `anon`; it is available only through authenticated RLS policies using security-definer yes/no helper functions.
- Expired assignments immediately stop granting private content access because the helper functions require `access_ends_at` to be null or later than `now()`.

Admin behaviour:

- Admin-authorized users can create and modify learning content, sentence-bank entries, collections, assignments, relationship records, and progress records through RLS policies.
- Anonymous users have no write grants and no write policies.

## First-Admin Bootstrap Procedure

The migration intentionally does not hardcode an email address or create an admin user.

After the migration is reviewed and applied in a controlled environment, the first admin must be bootstrapped through a trusted server-side process that uses Supabase dashboard access, a local SQL console, or another privileged deployment-only path.

Exact intended procedure:

1. Create or invite the first administrator through Supabase Auth.
2. Confirm the user's UUID from `auth.users`.
3. Insert or update exactly one matching `public.profiles` row with `role = 'admin'` and `status = 'active'` from the trusted SQL context. The profile-protection trigger allows this no-JWT privileged bootstrap path while continuing to reject authenticated learner role/status edits.
4. Verify the row belongs to the intended user before granting any admin UI access.
5. Do not expose this operation through the browser client.

Example SQL for the trusted console only:

```sql
insert into public.profiles (id, display_name, interface_language, timezone, role, status)
values ('<auth-user-uuid>', 'Rhema', 'it', 'Europe/Rome', 'admin', 'active')
on conflict (id) do update
set role = 'admin',
    status = 'active',
    updated_at = now();
```

This bootstrap SQL must not be embedded in client code, migrations with real user IDs, or public documentation with a real UUID.

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
- Assigned private content is safe for the assigned authenticated learner to read until the assignment expires.
- The migration prepares the foundation only; it does not import existing JavaScript trainer content.
- Assignment content can initially reference learning items or collections. More complex exercise-version assignments can be added in a later migration.

## Direct Learner Progress Write Risks

The migration currently allows authenticated learners to insert their own SRS review history and applied-practice attempts, and to update their own current SRS state.

Remaining risks:

- A malicious authenticated learner could submit inaccurate progress events for their own account.
- Client-side scoring could be manipulated until review writes move behind trusted RPC functions.
- SRS scheduling fields on `learner_srs_state` could be client-influenced.

Recommended future hardening:

- Move review-event creation and SRS-state updates into RPC functions.
- Validate objective result, rating, timing, and schedule transitions server-side.
- Consider append-only progress tables with admin/RPC-only mutation for derived state.
- Keep direct table writes only for early internal testing if that operational risk is accepted.

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

Static type-integrity validation performed for review:

- Child-to-parent direction: confirm `words_enforce_learning_item_type` and `expressions_enforce_learning_item_type` execute `public.enforce_learning_item_extension_type()` before insert or update on child extension tables.
- Parent-to-child direction: confirm `learning_items_protect_item_type` executes `public.protect_learning_item_type()` before update of `item_type` on `public.learning_items`.
- The child trigger function checks the parent `learning_items.item_type` before accepting child rows.
- The parent trigger function checks for existing `words` or `expressions` rows before allowing `learning_items.item_type` to change.
