# Educational Content Block System

## Goal

`content_block` must support real teaching structure instead of forcing every explanation into one long `body` string. The system keeps legacy content working while allowing new blocks to describe pedagogy semantically and let the learner renderer decide presentation.

## Compatibility model

Legacy blocks remain valid:

```json
{
  "type": "content_block",
  "content": {
    "body": "Legacy teaching text"
  }
}
```

Structured blocks add an educational schema inside `question.content`:

```json
{
  "educational_schema_version": 1,
  "template_id": "educational-content-block-v1",
  "variant": "grammar",
  "body": "Compact fallback for legacy clients.",
  "intro": "Short learner-facing introduction.",
  "sections": []
}
```

If `sections` is absent or empty, `EducationalContentBlock` renders the old reading presentation. If `sections` is present, it uses the structured educational renderer.

## Supported variants

- `general`
- `grammar`
- `vocabulary`
- `functional_language`
- `dialogue`
- `pronunciation`
- `strategy`
- `recap`
- `instructions`

A variant describes authoring intent. It does not hardcode a lesson-specific layout.

## Supported section types

- `rule`
- `example`
- `mistake`
- `comparison`
- `tip`
- `pattern`
- `dialogue`
- `vocabulary`
- `recap`

Do not invent a new section type for one lesson. Add a reusable semantic type to the central contract only when a genuine cross-course need exists.

## Common fields

A section may use:

```json
{
  "key": "stable_optional_key",
  "type": "rule",
  "title": "Prima del nome",
  "body": "One concise explanation.",
  "examples": [
    {
      "text": "an expensive phone",
      "highlight": ["expensive"],
      "translation": ""
    }
  ]
}
```

`highlight` contains exact substrings of the associated example. The renderer decides how highlights look.

## Correct / incorrect contrast

Use semantic fields, not symbols or colours:

```json
{
  "type": "mistake",
  "title": "L’aggettivo non prende il plurale",
  "body": "In inglese l’aggettivo resta uguale anche con un nome plurale.",
  "correct": {
    "text": "blue eyes",
    "highlight": ["blue"]
  },
  "incorrect": {
    "text": "blues eyes",
    "highlight": ["blues"]
  }
}
```

Do not place `✅`, `❌`, CSS classes, HTML or colour instructions in the content.

## Dialogue section

```json
{
  "type": "dialogue",
  "title": "Nel contesto",
  "turns": [
    {
      "speaker": "Customer",
      "text": "Could I try this one?",
      "highlight": ["Could I"]
    },
    {
      "speaker": "Assistant",
      "text": "Of course. What size do you need?",
      "highlight": []
    }
  ]
}
```

## Vocabulary section

```json
{
  "type": "vocabulary",
  "title": "Espressioni utili",
  "items": [
    {
      "term": "make a decision",
      "meaning": "decidere",
      "example": "We need to make a decision today.",
      "highlight": ["make a decision"]
    }
  ]
}
```

## Authoring template

The downloadable file is:

`/templates/exercise-builder-educational-content-block-template.json`

It is intentionally self-contained. Its top-level `_template` object contains:

- purpose and workflow;
- invariant and editable fields;
- supported variants and section types;
- global pedagogical rules;
- length guidance;
- section contracts;
- variant-specific pedagogical contracts;
- highlight rules;
- invalid patterns.

The intended workflow is:

1. Download the template.
2. Give the complete file to the content generator/AI.
3. Specify the topic, CEFR level and teaching objective.
4. The generator reads `_template` and edits the allowed learner-content fields.
5. Import the returned JSON into Exercise Builder.
6. Exercise Builder validates both its normal question schema and the structured educational content contract.
7. Preview and publish.

The returned JSON should keep `_template`, so the file remains reusable and understandable in a new context.

## Generation invariants

Do not change:

- top-level `schema_version`;
- top-level `entity_type`;
- `_template`;
- `question.type`;
- `question.content.educational_schema_version`;
- `question.content.template_id`.

The generator may change lesson metadata, `variant`, `body`, `intro`, `sections` and tags as directed by `_template.generation_contract`.

## Validation

`src/lib/educationalContentBlock.js` owns the reusable semantic contract and normalisation helpers.

`src/lib/exerciseBuilderSchema.js` composes the existing Exercise Builder validator with educational validation. Structured content therefore fails import when it uses an unsupported section type or violates a required section contract.

Run:

```bash
npm run validate:educational-content
```

The production build also runs this check.

## Rendering

`src/components/exercises/EducationalContentBlock.jsx` is the only learner renderer for structured `content_block` sections.

The renderer is semantic:

- content says `type: "mistake"`;
- renderer decides border, typography, status labels and responsive layout;
- content never contains presentation-specific code.

Admin preview should continue to use the same exercise question renderer as the learner experience. Do not build a second independent structured-content renderer.

## Database/storage

No database migration is required for this first implementation as long as the existing Exercise Builder question content payload is stored as JSON/JSONB without stripping nested keys. The import round-trip validation verifies that `template_id`, `variant` and `sections` survive the existing normalisation path.

Before any future database constraint or generated-column work, inspect the production Supabase schema and migrations first.

## Next implementation phases

1. Add stronger semantic checks such as exact highlight-substring validation and length warnings.
2. Make grammar, vocabulary, functional-language, dialogue, pronunciation, strategy, recap and instructions authoring templates self-contained using the same `_template` contract pattern.
3. Update the guided-exercise template so its teaching page uses structured educational content by default.
4. Migrate Adjectives as the reference real lesson after the schema/renderer PR is accepted.
5. Audit the Exercise Shell separately: progress header, metadata, card width, validation copy and navigation row.
6. Migrate existing legacy content blocks gradually; do not require a bulk migration for deployment.
