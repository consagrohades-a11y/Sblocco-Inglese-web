# Template index

`exercise-builder-template-index.json` lists every Exercise Builder import template exposed by the admin interface. Every listed JSON file is also stored in this directory, so templates can be downloaded directly as well as through the admin interface. Run `npm run generate:exercise-templates` after changing `src/lib/exerciseBuilderTemplatesV2.js`.

Gap templates support long text and paragraphs through `content.text_template` markers such as `[[blank_1]]`. Word-order templates keep sentence punctuation in `content.terminal_punctuation`, outside the draggable tokens.

The `dialogue_roleplay_audio_per_turn` entry is a schema-v2 question template with one private audio recording per learner turn. It is validated through the same upload/import path as every other template.
