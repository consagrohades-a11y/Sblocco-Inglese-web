# Sblocco Inglese Trainer Schema Freeze Checklist

## Content identity

- [ ] Stable public IDs are permanent.
- [ ] Word senses are separated correctly.
- [ ] Expression pragmatic uses are separated correctly.
- [ ] A0-C1 levels are supported.
- [ ] Domains can expand without restructuring core tables.
- [ ] Required provenance exists.

## Sentence Bank

- [ ] Sentences are separate reusable records.
- [ ] Sentence purposes cover teaching, exercises, dialogue, and assessment.
- [ ] Speaker and listener roles are supported.
- [ ] Dialogue links are supported.
- [ ] Sentence-to-item many-to-many links are supported.
- [ ] Published sentences require review and provenance.

## Collections and packs

- [ ] Reusable collections are supported.
- [ ] Ordered packs are supported.
- [ ] Fixed collection versions are supported.
- [ ] Dynamic collections can be snapshotted.
- [ ] Introduction states are supported.

## Exercises

- [ ] Word and Expression exercise types are represented.
- [ ] Exercises link to items and sentences.
- [ ] Near-correct evaluation is supported.
- [ ] Timers are optional.
- [ ] Distractors are reviewable.
- [ ] Exercise versions remain stable in assignments.

## SRS and applied performance

- [ ] One current SRS state exists per learner and item.
- [ ] Review history is immutable.
- [ ] Applied attempts are immutable.
- [ ] Applied metrics remain separate from SRS.
- [ ] Response time is supported.
- [ ] Objective and self-rated difficulty can coexist.

## Assignments

- [ ] Only active taught relationships receive new assignments.
- [ ] Individual and cohort recipients are supported.
- [ ] Cohort exceptions are supported.
- [ ] Multiple components are supported.
- [ ] Completion rules are configurable.
- [ ] Access expiry preserves progress and history.

## Access

- [ ] Free, Core, Complete, one-time, and programme access can coexist.
- [ ] Entitlements combine.
- [ ] Expired access does not delete data.
- [ ] Restored access restores prior progress.
- [ ] Product-content rules are not hardcoded into user roles.

## Administration

- [ ] Spreadsheet imports create drafts, not published content.
- [ ] Validation errors and warnings are stored.
- [ ] Admin-only notes remain private.
- [ ] Version history is retained.
- [ ] Archived content remains referentially valid.

## Security preparation

- [ ] Learners can access only their own progress.
- [ ] Learners can access only eligible content.
- [ ] Admin operations require admin privileges.
- [ ] Unpublished content is not exposed.
- [ ] Assignment recipient rules are enforceable through Supabase RLS.

## Final decision

- [ ] All validation examples pass.
- [ ] No core field depends on arbitrary notes.
- [ ] No schema ambiguity remains.
- [ ] The schema is approved for Codex implementation.
