import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const migrationDir = new URL('../supabase/migrations/', import.meta.url);
const files = await readdir(migrationDir);
const failures = [];

const required = [
  '20260812075837_structured_adjectives_production_reference.sql',
  '20260812100000_structured_meeting_language_production_reference.sql',
  '20260812130000_structured_vocabulary_production_reference.sql',
];

const forbidden = [
  '20260812074500_structured_adjectives_production_reference.sql',
];

for (const file of required) {
  if (!files.includes(file)) {
    failures.push(`Missing canonical structured production migration: ${file}`);
    continue;
  }
  const source = await readFile(new URL(file, migrationDir), 'utf8');
  for (const marker of [
    'educational-content-block-v1',
    'schema_version = 2',
    'skipping production-reference data migration',
  ]) {
    if (!source.includes(marker)) failures.push(`${file}: missing idempotent production marker: ${marker}`);
  }
}

for (const file of forbidden) {
  if (files.includes(file)) failures.push(`Stale migration filename must not return: ${file}`);
}

const structuredPilotFiles = files.filter((file) => /structured_.*_production_reference\.sql$/.test(file));
for (const file of structuredPilotFiles) {
  const timestamp = path.basename(file).slice(0, 14);
  if (!/^\d{14}$/.test(timestamp)) failures.push(`${file}: expected a 14-digit canonical migration version.`);
}

if (failures.length) {
  console.error('Structured production migration validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Validated ${required.length} canonical structured production migrations and migration-version alignment guards.`);
