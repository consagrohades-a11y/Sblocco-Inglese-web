# Recovery Wave 1 publication runbook

## Purpose

Recovery Wave 1 content is authored as canonical bundles under `content/recovery/wave-1/`. The learner must only receive exercises that have passed the real Exercise Builder validator, promotion pipeline, publishability checks, and Recovery mapping sync.

## Canonical admin flow

Open **Admin → Recupero Debito → Contenuti e mapping Recovery**.

Use **Pubblica Wave 1 validata** when the canonical repository bundles have already passed CI and are intended for production. The action:

1. skips any topic that already has all four active Recovery phases;
2. validates each remaining canonical bundle with `validateExerciseBuilderJson`;
3. creates or reuses the hash-addressed Exercise Builder import batch;
4. promotes only `valid` / `warning` import items;
5. publishes only promoted exercise entities through `admin_set_exercise_builder_status`;
6. therefore preserves the normal nested-question diagnostic and publishability checks;
7. calls `admin_sync_recovery_wave_mappings` only after publication;
8. reports the resulting number of ready topics.

The more cautious **Importa Wave 1 in review** action remains available when editorial review is still required. It must not publish automatically.

## Expected Wave 1 coverage

The first Recovery wave contains:

- Present Simple
- Present Continuous
- Present Simple vs Present Continuous
- Past Simple
- Irregular Verbs
- Present Perfect
- Past Simple vs Present Perfect
- Future Forms

A topic is learner-ready only when `recover`, `practice`, `school`, and `verify` all have active mappings to approved + published Exercise Builder versions.

## Learner behaviour

The daily plan is advisory for ordinary topic study. A learner can start a future topic session with **Studia in anticipo**. Checkpoints and mock exams remain schedule-controlled.

For an already consolidated topic, **Rivedi tutto** is a separate voluntary full-topic review path and must remain mastery-neutral.

## Verification v2 is separate

Publication of the canonical Wave 1 bundles does not by itself upgrade the existing 8-minute `verify` exercises. The stronger `verification-standard-v2` work remains a separate content revision: 12–15 minutes, at least 10 activities, broader format/subskill coverage, integrative items, connected context, and controlled production.

Do not describe a Wave 1 topic as verification-v2-ready until its `verify` exercise has actually been replaced or revised to meet that contract.
