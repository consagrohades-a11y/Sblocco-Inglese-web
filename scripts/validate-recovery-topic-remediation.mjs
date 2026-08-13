import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { recoveryRemediationPolicy, RECOVERY_TOPIC_RECOVERED_THRESHOLD, RECOVERY_TOPIC_STRONG_THRESHOLD } from '../src/lib/recoveryRemediationPolicy.js';

const MIGRATION = 'supabase/migrations/20260813100500_recovery_topic_remediation_loop.sql';
const sql = readFileSync(MIGRATION, 'utf8');
const sqlCode = sql.replace(/^\s*--.*$/gm, '');
const api = readFileSync('src/lib/recoveryApi.js', 'utf8');
const workspace = readFileSync('src/pages/RecoveryWorkspace.jsx', 'utf8');
const session = readFileSync('src/pages/RecoverySession.jsx', 'utf8');
const assignmentFollowup = readFileSync('src/components/recovery/RecoveryAssignmentFollowup.jsx', 'utf8');
const fullReview = readFileSync('supabase/migrations/20260812153329_recovery_full_topic_review.sql', 'utf8');
const standard = JSON.parse(readFileSync('content/recovery/verification-standard-v2.json', 'utf8'));
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

assert.equal(RECOVERY_TOPIC_RECOVERED_THRESHOLD, 80);
assert.equal(RECOVERY_TOPIC_STRONG_THRESHOLD, 90);
assert.equal(standard.mastery_thresholds.recovered, 80);
assert.equal(standard.mastery_thresholds.strong, 90);

// 1-5. Score bands and adaptive stages.
assert.deepEqual(recoveryRemediationPolicy(42), { band: 'insufficient', remediationRequired: true, stages: ['recupera','allenati','modalita_scuola','mini_verifica'], primaryAction: 'Ricomincia il recupero' });
assert.deepEqual(recoveryRemediationPolicy(64), { band: 'weak', remediationRequired: true, stages: ['allenati','modalita_scuola','mini_verifica'], primaryAction: 'Allenati di nuovo' });
assert.deepEqual(recoveryRemediationPolicy(76), { band: 'almost_recovered', remediationRequired: true, stages: ['modalita_scuola','mini_verifica'], primaryAction: 'Ripassa e riprova' });
assert.equal(recoveryRemediationPolicy(81).remediationRequired, false);
assert.equal(recoveryRemediationPolicy(81).band, 'recovered');
assert.equal(recoveryRemediationPolicy(94).remediationRequired, false);
assert.equal(recoveryRemediationPolicy(94).band, 'strong');

// 6. Same verify evidence cannot create two remediation sessions.
assert.match(sql, /create unique index if not exists recovery_plan_sessions_cycle_source_evidence_uidx/i);
assert.match(sql, /metadata ->> 'source_mastery_evidence_id'/);
assert.match(sql, /where evidence.id = p_evidence_id/);
assert.ok(sql.includes("'existing', true") && sql.includes("'session_id', v_existing.id"));

// 7. A second distinct mini-check increments the cycle rather than mutating the old session.
assert.match(sql, /evidence.evidence_type = 'mini_check'/);
assert.ok(sql.includes('select count(*) + 1') && sql.includes('into v_cycle'));
assert.doesNotMatch(sqlCode, /set status = 'available'[\s\S]{0,180}where id = p_session_id/i, 'Old completed source session must not be reopened.');

// 8. Old mastery evidence remains append-only.
assert.doesNotMatch(sqlCode, /delete from public.recovery_mastery_evidence/i);
assert.doesNotMatch(sqlCode, /update public.recovery_mastery_evidence/i);
assert.match(sql, /source_mastery_evidence_id/);

// 9. True voluntary redo is a new full Recovery cycle that can create fresh evidence through normal sync.
assert.match(sql, /create or replace function public.start_recovery_topic_redo/i);
assert.match(sql, /'voluntary_redo', true/);
assert.ok(sql.includes(`'["recupera","allenati","modalita_scuola","mini_verifica"]'::jsonb`));
assert.match(workspace, /Rifai il percorso/);
assert.match(session, /Rifai tutto il percorso/);

// 10. Existing Rivedi tutto remains a non-plan, non-mastery review.
assert.match(fullReview, /start_recovery_topic_full_review/);
assert.doesNotMatch(fullReview, /insert into public.recovery_plan_sessions/i);
assert.doesNotMatch(fullReview, /update public.recovery_student_topics/i);
assert.match(fullReview, /'mastery_unchanged', true/);
assert.match(workspace, /Rivedi tutto/);
assert.match(workspace, /“Rifai il percorso” crea invece un nuovo ciclo reale/);

// 11. Existing needs_recheck state schedules targeted school + verify without a new mastery state.
assert.deepEqual(recoveryRemediationPolicy(85, { needsRecheck: true }).stages, ['modalita_scuola','mini_verifica']);
assert.match(sql, /new.mastery_state = 'needs_recheck'/);
assert.match(sql, /'mastery_needs_recheck'/);
assert.ok(sql.includes(`v_stages := '["modalita_scuola","mini_verifica"]'::jsonb`));
assert.doesNotMatch(sqlCode, /add constraint[\s\S]*mastery_state/i);

// 12. Cumulative assessment/readiness/Curriculum v2 surfaces remain untouched.
assert.doesNotMatch(sqlCode, /create or replace function public.sync_recovery_session/i);
assert.doesNotMatch(sqlCode, /create or replace function public.materialize_recovery_session/i);
assert.doesNotMatch(sqlCode, /(insert into|update|delete from) public.recovery_outcome_evidence/i);
assert.doesNotMatch(sqlCode, /(insert into|update|delete from) public.recovery_assessment_fragments/i);
assert.doesNotMatch(sqlCode, /recovery_readiness_snapshots|capture_recovery_readiness|calculate_recovery_readiness/i);
assert.doesNotMatch(sqlCode, /recovery_reward|gamification|award_exercise_milestones/i);

// Topic-cycle materialization follows session.stages rather than hard-coding one remediation shape.
assert.ok(sql.includes('jsonb_array_elements_text(v_session.stages)'));
assert.match(sql, /when 'allenati' then 'practice'/);
assert.match(sql, /when 'modalita_scuola' then 'school'/);
assert.match(sql, /when 'mini_verifica' then 'verify'/);
assert.match(sql, /'allow_retry', v_mapping.phase <> 'verify'/);

// UI/RPC integration.
for (const symbol of ['startRecoveryTopicCycleSession', 'startRecoveryTopicRedo', 'loadRecoveryTopicFollowup']) assert.match(api, new RegExp(symbol));
assert.match(assignmentFollowup, /Verifica argomento/);
assert.match(assignmentFollowup, /Rifai tutto il percorso/);
assert.match(session, /followup.remediation_required/);
assert.match(workspace, /remediation_level === 'insufficient'/);

// Retake-form gap: current source bundles use fixed verification sections. This validator reports the gap; it does not randomize them.
const waveDirs = readdirSync('content/recovery').filter((entry) => /^wave-\d+$/.test(entry));
let verifyCount = 0;
let fixedVerifyCount = 0;
for (const wave of waveDirs) {
  for (const file of readdirSync(path.join('content/recovery', wave)).filter((name) => name.endsWith('.bundle.json'))) {
    const bundle = JSON.parse(readFileSync(path.join('content/recovery', wave, file), 'utf8'));
    const verify = (bundle.exercises || []).find((exercise) => String(exercise.client_key || '').endsWith('_verify'));
    if (!verify) continue;
    verifyCount += 1;
    const fixedOnly = (verify.sections || []).every((section) => section.selection_mode === 'fixed' && !(section.pool_rules || []).length);
    if (fixedOnly) fixedVerifyCount += 1;
  }
}
assert.ok(verifyCount >= 24, 'Expected the live Recovery topic verification catalogue.');
assert.ok(fixedVerifyCount > 0, 'If all verifications become pool-backed, update the documented retake-repetition gap.');

assert.equal(pkg.scripts['validate:recovery-remediation'], 'node scripts/validate-recovery-topic-remediation.mjs');
assert.match(pkg.scripts.build, /validate:recovery-remediation/);

console.log(`Recovery topic remediation loop validated: 12 required behavior/safety cases. Source verify audit: ${fixedVerifyCount}/${verifyCount} verification bundles are fixed-only and may repeat on a new cycle.`);
