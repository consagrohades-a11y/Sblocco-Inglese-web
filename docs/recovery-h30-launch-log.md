# Recupero Debito H30 launch log

Audit date: 2026-08-14 (Europe/Rome)

Release deadline: 2026-08-15, approximately 13:50 (Europe/Rome)

Scope: product/runtime launch safety only

## Production facts observed before implementation

- Supabase project: `crzgvhonevrmkueajddy`, healthy, PostgreSQL 17.6.1.141, `eu-central-2`.
- Active Recovery topic catalog rows: 24.
- Active, published and approved materializable mappings: 24 topics for each of `recover`, `practice`, `school`, and `verify` (96 phase mappings total).
- Active/approved Curriculum v2 cumulative fragments: 0.
- Existing future Recovery session rows include unsupported cumulative/standalone types: 1 checkpoint, 5 error reviews, 1 intermediate mock, and 1 final mock. These are pre-existing plans; the launch change does not delete or rewrite evidence-bearing work.
- Existing mapped topic work is available in production: 24 topic rows for every launch phase.
- Sensitive Recovery RPCs are `SECURITY DEFINER`, owned by `postgres`, revoked from public/anon, granted to `authenticated`, and check authentication plus enrollment ownership where they write learner data.
- Recovery tables expose owner/admin read policies; client-side direct writes are not granted through learner policies.
- Stripe entitlement is granted by the signed webhook through `fulfill_stripe_checkout`; the success redirect does not insert an entitlement.

## Reproduced failure modes

1. All planner modes generated work that production could not currently materialize. Complete/intensive included cumulative checkpoint/mock work; SOS included standalone error review and checkpoint; every mode ended in a final mock.
2. Standalone error-review and cumulative session types have no active production mappings/fragments.
3. The production policy selector raised PostgreSQL `42702` because `primary_axis` could refer to both the `RETURNS TABLE` output variable and the temporary candidate-table column. The exact failure was reproduced by calling `select_recovery_assessment_fragment_policy_internal` for a production enrollment.
4. Repeated submit was protected by React busy state and an idempotent recovery API, but lacked a synchronous same-tick client guard.

## Launch decisions

- New and recalculated H30 plans use the explicit `h30_launch` runtime profile.
- The H30 profile generates only `topic` and `quick_review` sessions, which use the mapped Recover, Practice, School, and Verify phases.
- Weak required topics stay prioritised. Strong required school topics stay in the plan as quick-review/verification work.
- Standalone error review, checkpoint, intermediate mock, and final mock are disabled only in the H30 profile.
- The complete cumulative planner remains available behind the explicit `full_curriculum` profile for post-H30 activation.
- Existing in-progress/completed sessions and evidence remain untouched. Recalculation replaces only future `planned`/`available` rows, matching the existing database contract.
- Topic remediation and voluntary redo remain active and create fresh same-topic cycles rather than reusing the original verification attempt.

## Verification completed in the branch

- Dedicated launch regression suite covers the ten required H30 conditions.
- Existing Recovery plan validation remains active.
- The SQL fix is isolated in a new migration and has not been applied to production from this workstream.
- The new migration was compared with the existing production function definition; only the ambiguous `primary_axis` references differ.
- `npm run validate:recovery` passes.
- The full `npm run build` validation chain and Vite production build pass on Windows. The only build note is the existing large-chunk advisory.
- Final remote CI status is recorded in the PR before merge.

## Production actions after merge

1. Apply `20260814062121_fix_recovery_assessment_primary_axis_ambiguity.sql` to production Supabase.
2. Deploy the merged Vercel build.
3. Confirm the deployed client reports new plan metadata `runtimeProfile: h30_launch`.
4. Run the clean-learner acceptance checklist from diagnostic through one completed topic session and one failed-verify remediation cycle.
5. Re-run the exact cumulative selector SQL call and confirm it returns rows or an empty result without `42702`.
6. Verify Stripe test-mode checkout grants access only after the signed webhook completes.

## Post-H30 backlog

- Curate, approve, publish, and map cumulative checkpoint and mock fragment pools.
- Add launch content for standalone mixed error review or replace it permanently with topic-local remediation.
- Re-enable cumulative session capabilities only after production pool coverage and freshness gates pass.
- Run full deployed mock-exam feedback-suppression and result-breakdown acceptance tests.
- Decide how to retire or migrate pre-H30 future unsupported rows without altering evidence-bearing sessions.
