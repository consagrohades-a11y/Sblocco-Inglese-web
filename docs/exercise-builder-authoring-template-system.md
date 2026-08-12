# Exercise Builder self-contained authoring templates

## Goal

Every JSON template downloaded from Exercise Builder must be usable in a fresh AI chat without repository access, hidden prompts or prior Sblocco Inglese context.

The downloaded JSON therefore contains two layers:

1. `_template`: the authoring contract for the AI;
2. the normal Exercise Builder payload (`question`, `pool`, `exercise`, or bundle arrays).

`_template` is authoring metadata only. Exercise Builder import continues to normalise the supported entity payload and does not persist `_template` as learner content.

## Download workflow

Recommended author workflow:

1. Download the template for the exact interaction type required.
2. Upload the JSON to an AI in a new chat.
3. Ask for the specific topic, CEFR level, learner profile, quantity and pedagogical goal.
4. The AI reads `_template`, edits the example payload, keeps the contract intact and returns strict JSON only.
5. Paste or upload the returned JSON into Exercise Builder.
6. Validate before creating the review batch.
7. Review pedagogical quality before promotion/publication.

Do not start from `multiple_choice` and ask the AI to silently convert it into another interaction type. Download the matching template instead.

## Contract location and ordering

All generated templates begin with:

```json
{
  "schema_version": 2,
  "entity_type": "...",
  "_template": { ... }
}
```

Keeping `_template` near the beginning is intentional: an AI sees the operating instructions before the example payload.

## Generic contract contents

Base templates are enriched by `src/lib/exerciseAuthoringTemplateContracts.js`.

Each generic `_template` contains:

- stable `template_id`, `template_version`, `template_key`, `entity_type` and, for questions, `question_type`;
- a strict JSON-only generation contract;
- invariant and editable field guidance;
- entity-level structural rules;
- question-type-specific rules;
- CEFR and Italian-learner pedagogical rules;
- metadata rules;
- grading rules;
- diagnostic-code safety rules;
- a pre-return validation checklist;
- explicit invalid patterns.

The structured educational content template keeps its richer dedicated contract from `educationalContentTemplate.js`.

## Question-type contracts

The generic system currently covers:

- `multiple_choice`
- `multiple_select`
- `gap_fill`
- `select_gap`
- `translation`
- `error_correction`
- `word_order`
- legacy/simple `content_block`
- `dialogue_choice`
- `reading_comprehension`
- `written_response`
- `dialogue_roleplay`
- `dialogue_roleplay_audio_per_turn`
- `audio_response`

The dedicated `educational_content_block` template covers structured theory/teaching content.

## Entity contracts

### Question

One stable question type per downloaded template. The AI may change pedagogical content and metadata but must not silently change the interaction type.

### Question pool

Pools may contain embedded questions or valid references. Embedded question client keys must be unique and the pool should remain pedagogically coherent.

### Exercise

Exercises must preserve section structure, valid references, feedback timing and a sensible pedagogical sequence.

### Guided exercise

The authoring contract requires explanation/context before scaffolded practice. Substantial new teaching content should use the structured educational content contract rather than a long legacy body.

### Bundle

Bundles must remain referentially closed: renamed client keys require every corresponding reference to be updated.

## Diagnostics

A fresh AI chat does not know the live diagnostic-code registry. Therefore the contract explicitly forbids inventing codes.

When approved codes are not supplied, generated content should use:

```json
"diagnostics": {
  "tested_codes": [],
  "fallback_error_code": null
}
```

This is preferable to creating plausible-looking codes that later fail promotion or pollute analytics.

## Static downloads and runtime downloads

Exercise Builder UI downloads are created from `stringifyExerciseBuilderTemplate()` at runtime.

The public `/templates/*.json` files are generated from the same source by:

```bash
npm run generate:exercise-templates
```

Production builds run generation before validation, so UI downloads and deployed static files use the same contract source.

The generated index exposes:

- `template_set_version`;
- `self_contained_authoring: true`;
- each template's authoring `template_id` and `template_version`.

## Validation

`npm run validate:exercise-authoring` verifies all manifest templates have a self-contained contract, place `_template` near the start, survive an Exercise Builder round trip and are present in the generated static downloads.

`npm run validate:exercise-templates` continues to validate Exercise Builder schema behaviour and static/template parity.

The production build runs generation and both validators before Vite compilation.

## Adding a future template

When adding a new template:

1. add the underlying Exercise Builder structure;
2. add it to the manifest;
3. add a question-type or entity contract when the existing generic contract is insufficient;
4. do not add presentation-specific instructions to JSON;
5. run `npm run generate:exercise-templates`;
6. run `npm run validate:exercise-authoring`;
7. run the full production build;
8. verify the deployed static JSON starts with `_template` and can round-trip through import.

A new manifest entry that lacks a usable authoring contract should be treated as a build failure, not as an acceptable partial template.
