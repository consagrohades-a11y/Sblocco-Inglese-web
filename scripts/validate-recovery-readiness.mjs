import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260812134712_recovery_readiness_v2.sql', 'utf8')
  .replace(/\r\n/g, '\n');
const api = readFileSync('src/lib/recoveryApi.js', 'utf8');
const report = readFileSync('src/pages/RecoveryReadiness.jsx', 'utf8');
const dashboard = readFileSync('src/pages/LearnerHome.jsx', 'utf8');

// Readiness is a backend-derived, explainable metric with history.
assert.match(migration, /create table public\.recovery_readiness_snapshots/);
assert.match(migration, /snapshot_key text not null unique/);
assert.match(migration, /create or replace function public\.get_recovery_readiness/);
assert.match(migration, /create or replace function public\.compute_recovery_readiness_internal/);

// The headline metric deliberately separates competence, evidence coverage,
// school-style assessment and recurring-error stability.
assert.match(migration, /\(v_mastery \* 0\.60\)/);
assert.match(migration, /\(v_coverage \* 0\.10\)/);
assert.match(migration, /\(v_assessment \* 0\.20\)/);
assert.match(migration, /\(v_error_stability \* 0\.10\)/);

// Completing plan items is shown for context, but is not part of the readiness formula.
const readinessFormula = migration.match(/v_readiness := round\(([\s\S]*?)\n\s*2\n\s*\);/)?.[1] || '';
assert.ok(readinessFormula, 'Readiness formula must be present.');
assert.doesNotMatch(readinessFormula, /v_plan_completion/);

// Mastery states cap how much an unverified topic can contribute.
for (const [state, cap] of [
  ['needs_recovery', 44],
  ['training', 69],
  ['almost_ready', 84],
  ['recovered', 100],
  ['needs_recheck', 64],
]) {
  assert.match(migration, new RegExp(`when '${state}' then ${cap}::numeric`));
}

// Confidence is independent from readiness: a score can be promising while evidence is still thin.
assert.match(migration, /v_confidence := round\(/);
assert.match(migration, /\(v_coverage \* 0\.70\)/);
assert.match(migration, /\(v_assessment_coverage \* 0\.30\)/);
assert.match(migration, /confidence_band/);

// Assessment maturity distinguishes checkpoint, intermediate mock and final mock.
assert.match(migration, /v_assessment := v_checkpoint \* 0\.65/);
assert.match(migration, /v_mock_type = 'mock_final'/);
assert.match(migration, /v_assessment := v_assessment_raw \* 0\.85/);
assert.match(migration, /v_assessment_raw := case[\s\S]*v_mock \* 0\.75[\s\S]*v_checkpoint \* 0\.25/);

// History is idempotent and captured at meaningful Recovery events.
assert.match(migration, /on conflict \(snapshot_key\) do nothing/);
assert.match(migration, /after update of plan_version on public\.recovery_enrollments/);
assert.match(migration, /after update of status on public\.recovery_plan_sessions/);
assert.match(migration, /'session:' \|\| new\.id::text \|\| ':completed'/);

// Internal calculators/mutators are not learner-callable. The protected getter is the only learner RPC here.
assert.match(migration, /revoke all on function public\.compute_recovery_readiness_internal\(uuid\) from public, anon, authenticated/);
assert.match(migration, /revoke all on function public\.capture_recovery_readiness\(uuid, text\) from public, anon, authenticated/);
assert.match(migration, /grant execute on function public\.get_recovery_readiness\(uuid\) to authenticated/);
assert.doesNotMatch(migration, /grant execute on function public\.capture_recovery_readiness/);

// Client pages must prefer the backend readiness payload; the old average is compatibility fallback only.
assert.match(api, /supabase\.rpc\('get_recovery_readiness'/);
assert.match(api, /readiness/);
assert.match(report, /access\.readiness/);
assert.match(dashboard, /access\.readiness/);
assert.match(report, /Non è una previsione del voto/);
assert.match(dashboard, /Non predice il voto/);

console.log('Recovery Readiness Engine v2 validation passed.');
