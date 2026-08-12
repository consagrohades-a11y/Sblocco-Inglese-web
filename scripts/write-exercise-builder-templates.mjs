import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  EXERCISE_BUILDER_TEMPLATE_VERSION,
  exerciseBuilderTemplateManifest,
  exerciseBuilderTemplates,
  stringifyExerciseBuilderTemplate,
} from '../src/lib/exerciseBuilderSchema.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(root, 'public', 'templates');

await mkdir(outputDirectory, { recursive: true });
for (const item of exerciseBuilderTemplateManifest) {
  await writeFile(path.join(outputDirectory, item.fileName), `${stringifyExerciseBuilderTemplate(item.key)}\n`, 'utf8');
}

const index = {
  schema_version: 2,
  template_set_version: EXERCISE_BUILDER_TEMPLATE_VERSION,
  self_contained_authoring: true,
  templates: exerciseBuilderTemplateManifest.map((item) => ({
    key: item.key,
    entity_type: item.entityType,
    file_name: item.fileName,
    template_id: exerciseBuilderTemplates[item.key]?._template?.template_id || null,
    template_version: exerciseBuilderTemplates[item.key]?._template?.template_version || null,
  })),
};
await writeFile(path.join(outputDirectory, 'exercise-builder-template-index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');

console.log(`Wrote ${exerciseBuilderTemplateManifest.length} self-contained exercise templates to public/templates.`);
