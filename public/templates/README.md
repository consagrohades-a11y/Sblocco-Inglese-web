# Template index

`exercise-builder-template-index.json` lists every Exercise Builder import template exposed by the admin interface. The actual downloadable JSON files are generated from `src/lib/exerciseBuilderTemplatesV2.js` so the UI and validator use the same source of truth.

The `dialogue_roleplay_audio_per_turn` entry is a schema-v2 question template with one private audio recording per learner turn. It is validated through the same upload/import path as every other template.
