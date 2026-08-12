# Structured content production migrations

Structured educational-content pilots are production **data/version migrations**, not table-schema changes. They intentionally preserve old immutable question versions and repin only the current exercise version.

## Canonical source of truth

The migration filename in `supabase/migrations/` is the canonical migration version. Production migration history and the repository filename must agree when a migration has already been registered by Supabase.

Current production references:

- `20260812075837_structured_adjectives_production_reference.sql`
- `20260812100000_structured_meeting_language_production_reference.sql`
- `20260812130000_structured_vocabulary_production_reference.sql`

The Adjectives version matches the migration version already registered in production. Meeting Language and Vocabulary were applied early as idempotent data operations; their canonical repository migrations remain unapplied in migration history and can later run normally. Because they detect the already-created structured question version, that normal application is a safe no-op that records the canonical migration version.

## Rules for future production-content migrations

1. Keep every data migration idempotent.
2. On a fresh/schema-only database, missing production catalog content must be an intentional no-op.
3. If the target production entity exists but is internally inconsistent, fail loudly rather than silently skipping it.
4. Never rewrite old question/exercise versions or historical attempt snapshots.
5. Prefer the normal repository migration flow for production changes.
6. If a data operation is applied ahead of the repository migration, keep the canonical migration file so the normal migration flow can later register it safely.
7. If a migration tool creates a different version from the repository filename, reconcile the repository filename immediately. Do not create two semantic migrations for the same production change.
8. Do not edit `supabase_migrations.schema_migrations` manually to manufacture alignment.

`npm run validate:structured-migrations` guards the three current structured-production references and prevents the stale Adjectives timestamp from returning.
