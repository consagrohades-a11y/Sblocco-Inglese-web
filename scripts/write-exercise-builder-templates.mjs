import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  exerciseBuilderTemplateManifest,
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
  templates: exerciseBuilderTemplateManifest.map((item) => ({
    key: item.key,
    entity_type: item.entityType,
    file_name: item.fileName,
  })),
};
await writeFile(path.join(outputDirectory, 'exercise-builder-template-index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');

console.log(`Wrote ${exerciseBuilderTemplateManifest.length} exercise templates to public/templates.`);
