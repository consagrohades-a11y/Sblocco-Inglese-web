import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260812151054_recovery_assessment_materialization_scope.sql', 'utf8');

assert.match(migration, /left join public\.recovery_student_topics required_topic/);
assert.match(migration, /required_topic\.required/);
for (const phase of ['checkpoint', 'mock_intermediate', 'mock_final']) {
  assert.match(migration, new RegExp(`mapping\\.phase = '${phase}'[\\s\\S]*mapping\\.topic_key is null or required_topic\\.topic_key is not null`));
}
assert.match(migration, /order by phase_order, scope_order, topic_priority desc/);
assert.match(migration, /v_budget_minutes := greatest\(5, coalesce\(v_session\.estimated_minutes, 30\)\)/);
assert.match(migration, /v_minutes_used \+ v_mapping_minutes > v_budget_minutes/);
assert.match(migration, /estimated_materialized_minutes/);
assert.match(migration, /session_budget_minutes/);
assert.match(migration, /'recovery_topic_key', v_mapping\.topic_key/);
assert.match(migration, /'allow_retry', not v_is_mock/);
assert.match(migration, /'show_correct_answers', not v_is_mock/);

console.log('Recovery assessment materialization scope validation passed.');
