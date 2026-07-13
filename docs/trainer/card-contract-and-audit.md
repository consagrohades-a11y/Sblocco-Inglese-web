# Trainer card contract and audit workflow

## Scope

This module establishes the content-quality foundation for the Trainer. It does not migrate cards, write to Supabase, publish content, or change the learner-facing Trainer.

The first pilot dataset is:

```text
src/data/generalExpressionCards.js
250 General Expression cards
```

## Source format and reviewed format

The current JavaScript expression cards contain:

```text
id
type
level
category
expression
italian
pronunciation
example1
example2
note
```

These fields are sufficient to render the current reveal card, but they are not sufficient for final reviewed content, multiple practice modes, traceable approval, or safe publication.

The canonical reviewed contract is defined in:

```text
src/content/trainer/trainerCardContract.js
```

It aligns the current cards with the richer content template and the existing Supabase learning-content foundation. Important reviewed fields include:

- stable external key;
- Trainer domain;
- category and CEFR level;
- primary English target;
- natural Italian prompt;
- accepted alternative answers;
- pronunciation guide and optional reviewed IPA;
- usage note and communicative function;
- speech act and interaction role;
- realistic contexts and exclusions;
- register and usage channel;
- links to reviewed Sentence Bank examples;
- tags;
- review status and decision;
- reviewer notes and timestamps;
- publication status;
- original source file and source item ID.

The contract is not a second database model. It is the shared vocabulary used by:

1. the automated audit;
2. the future admin review interface;
3. the controlled import into the existing Supabase tables.

## Automated audit

Run:

```bash
pnpm run audit:general-expression
```

The command writes:

```text
reports/trainer-audit/general-expression-audit.json
reports/trainer-audit/general-expression-audit.md
```

The audit checks:

- required fields;
- supported item type and CEFR level;
- duplicate IDs;
- duplicate English targets;
- duplicate Italian prompts;
- near-duplicate English targets;
- missing or suspicious pronunciation;
- identical examples;
- examples that do not contain the target;
- examples with very little context;
- short Italian prompts;
- thin usage notes;
- repeated example templates;
- repeated usage notes;
- category and level distributions.

The JSON report is intended for the future admin review queue. It contains one audit record per source card, automated findings, possible duplicate IDs, and empty manual-review fields.

## Strict mode

Run:

```bash
pnpm run audit:general-expression:strict
```

Strict mode exits unsuccessfully when structural errors exist. Normal audit mode still writes the complete report and exits successfully because quality warnings are expected during the review phase.

## Manual review remains mandatory

Automated output must never be treated as approval. Every General Expression card must still be reviewed for:

- idiomatic and useful English;
- accurate and unambiguous Italian;
- accepted alternatives;
- realistic examples;
- pronunciation quality;
- plausible CEFR level;
- consistent category;
- communicative function and context;
- final decision and reviewer notes.

Allowed decisions are:

```text
approve
approve_after_edit
rewrite
merge
reclassify
reject
```

Allowed review statuses are:

```text
not_reviewed
in_review
approved
rejected
```

## Publication gate

No card may be migrated as published content unless:

- required fields pass validation;
- unresolved automated errors are cleared;
- manual review is complete;
- accepted alternatives are checked;
- examples are reviewed;
- category and level are approved;
- review status is approved.

## Next module

The next module should build the protected admin Trainer content list and review queue using the audit record shape. It should start read-only and support search, filters, warning display, duplicate navigation, and learner-facing preview before editing or publishing is added.
