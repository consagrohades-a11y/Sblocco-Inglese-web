import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workspace = readFileSync('src/pages/RecoveryWorkspace.jsx', 'utf8');
const materialization = readFileSync('supabase/migrations/20260812151054_recovery_assessment_materialization_scope.sql', 'utf8');

assert.match(workspace, /function canStudyAhead\(session\)/);
assert.match(workspace, /session\?\.status === 'planned'/);
assert.match(workspace, /\['topic', 'quick_review'\]\.includes\(session\.session_type\)/);
assert.match(workspace, /Studia in anticipo/);
assert.match(workspace, /Studia in anticipo.*completa una sessione reale del tuo piano/s);
assert.match(workspace, /Checkpoint e simulazioni restano invece legati al percorso consigliato/);
assert.doesNotMatch(workspace, /\['topic', 'quick_review', 'checkpoint'/, 'Study-ahead must not unlock checkpoints.');
assert.doesNotMatch(workspace, /\['topic', 'quick_review', 'mock_/, 'Study-ahead must not unlock mock exams.');

assert.match(materialization, /v_session\.session_type = 'topic'/);
assert.match(materialization, /v_session\.session_type = 'quick_review'/);
assert.match(materialization, /if v_session\.assignment_id is not null then/);
assert.match(materialization, /set assignment_id = v_assignment_id/);

console.log('Recovery study-ahead access validated: topic sessions may be opened early; assessments remain scheduled.');
