# Exercise Builder import templates

The admin import page supports schema version 1 for existing content and schema version 2 for every current question type.

## Available question templates

- `multiple_choice`
- `multiple_select`
- `gap_fill`
- `select_gap`
- `translation`
- `error_correction`
- `word_order`
- `content_block`
- `dialogue_choice`
- `reading_comprehension`
- `written_response`
- `dialogue_roleplay`
- `audio_response`

Each question template is available from the **Template JSON** menu in Exercise Builder. The same menu also provides:

- a pool containing every supported type;
- a complete integrated exercise;
- a bundle containing questions, a pool and an exercise connected through stable `client_key` references.

The bundle avoids duplicating nested questions. Pools and exercise sections use `question_refs` that resolve the top-level question `client_key` values during promotion.

## Validation

Run:

```bash
npm run validate:exercise-templates
```

The production build runs this validation before Vite. It checks that every supported question type has a template, every manifest entry resolves, all templates pass the current importer, and the complete bundle includes every supported type.
