import fs from 'node:fs';
import assert from 'node:assert/strict';

const contractPath = 'content/recovery/curriculum-v2/outcome-materializer-contract.json';
const migrationPath = 'supabase/migrations/20260813081530_recovery_curriculum_v2_outcome_materializer.sql';
const hardeningMigrationPath = 'supabase/migrations/20260813155200_recovery_curriculum_v2_materializer_hardening.sql';

const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const sql = fs.readFileSync(migrationPath, 'utf8');
const hardeningSql = fs.readFileSync(hardeningMigrationPath, 'utf8');

assert.equal(contract.contract_id, 'recovery-curriculum-v2-outcome-materializer-v1');
assert.equal(contract.rollout_policy.readiness_v2_active, false);
assert.equal(contract.axis_coverage.checkpoint.grammar_time_share_ceiling, 0.6);
assert.equal(contract.axis_coverage.mock_intermediate.grammar_time_share_ceiling, 0.55);
assert.equal(contract.axis_coverage.mock_final.grammar_time_share_ceiling, 0.5);
assert.equal(contract.axis_coverage.mock_final.rollout_minimum_distinct_axes_when_available, 3);
assert.equal(contract.minimum_composition_gate.checkpoint.minimum_fragment_count, 3);
assert.equal(contract.minimum_composition_gate.mock_intermediate.minimum_fragment_count, 4);
assert.equal(contract.minimum_composition_gate.mock_final.minimum_fragment_count, 4);
assert.match(contract.minimum_composition_gate.mock_intermediate.blocking_axis_policy, /valid fresh composition/i);
assert.match(contract.minimum_composition_gate.mock_final.blocking_axis_policy, /programme-required blocking axis/i);

for (const expected of [
  'recovery_v2_assessment_pool_status_internal',
  'select_recovery_assessment_fragments_internal',
  'materialize_recovery_session',
  "fragment.status = 'approved'",
  "exercise.status = 'published'",
  "version.review_status = 'approved'",
  "fragment.transfer_level = 'transfer'",
  "mapped.evidence_role = 'primary'",
  "used.form_family_key = fragment.form_family_key",
  "recovery_form_family_key",
  "recovery_materializer",
  "curriculum_v2_fragments",
  "legacy_mapping_fallback",
  "insufficient_fresh_v2_fragment_coverage",
  "final_mock_missing_blocking_axis_coverage",
  "'checkpoint' then 0.60",
  "'mock_intermediate' then 0.55",
  "'mock_final' then 0.50",
  "'allow_retry', not v_is_mock",
  "'show_correct_answers', not v_is_mock",
  "metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object"
]) {
  assert.ok(sql.includes(expected), `Missing materializer contract marker: ${expected}`);
}

assert.match(sql, /v_use_v2_fragments\s*:=\s*coalesce\(\(v_pool_status ->> 'ready'\)::boolean, false\) or v_v2_started/);
assert.match(sql, /resource\.exercise_config ->> 'recovery_materializer' = 'curriculum_v2_fragments'/);
assert.match(sql, /v_required_blocking_axes/);
assert.match(sql, /v_missing_blocking_axes/);
assert.match(sql, /mock_final[\s\S]*final_mock_missing_blocking_axis_coverage/);

assert.ok(sql.includes("'Verifica di percorso · Parte '"));
assert.ok(sql.includes("'Simulazione · Parte '"));
assert.ok(sql.includes("'Simulazione finale · Parte '"));
assert.ok(!sql.includes('recovery_outcome_label'));

for (const forbidden of [
  'display_label',
  'estimated_duration',
  'scheduled_date',
  'topic_label',
  'materialization_state',
  "status = 'blocked'"
]) {
  assert.ok(!sql.includes(forbidden), `Stale schema marker must not be used: ${forbidden}`);
}

for (const required of [
  'learner_note',
  'deadline_at',
  'estimated_minutes',
  "route, sequence_index, exercise_config",
  "'/exercises'"
]) {
  assert.ok(sql.includes(required), `Current production schema marker missing: ${required}`);
}

assert.ok(!/create or replace function public\.get_recovery_readiness\s*\(/i.test(sql));
assert.ok(!/recovery_readiness_snapshots/i.test(sql));

for (const expected of [
  'select_recovery_assessment_fragment_candidates_internal',
  'select_recovery_assessment_fragment_policy_internal',
  'select_recovery_assessment_fragments_internal',
  'recovery_v2_assessment_pool_status_internal',
  'admin_preview_recovery_v2_cumulative_materialization',
  "when 'checkpoint' then 3",
  'else 4',
  "'curriculum_v2_ready'",
  "'legacy_fallback'",
  "'insufficient_fresh_evidence'",
  "'pool_exhausted_or_no_valid_fresh_composition'",
  "'missing_required_blocking_axis_coverage'",
  "'blocking_axis_not_feasible_with_current_pool'",
  "'blocking_axis_selector_omission'",
  "'grammar_ceiling_exception_profile_provenance_unavailable'",
  "'CONTENT POOL INSUFFICIENT'",
  "'required_outcomes'",
  "'selected_fragments'",
  "'coverage'",
  "'grammar_share'",
  "'grammar_ceiling'",
  "'freshness'",
  "'warnings'",
  "'readiness_v2_active', false",
]) {
  assert.ok(hardeningSql.includes(expected), `Missing hardening contract marker: ${expected}`);
}

assert.match(hardeningSql, /v_fragment_count >= v_min_fragment_count/);
assert.match(hardeningSql, /cardinality\(v_missing_blocking_axes\) = 0/);
assert.match(hardeningSql, /v_grammar_exception_applies or v_grammar_share <= v_grammar_ceiling/);
assert.match(hardeningSql, /p_session_type = 'mock_intermediate'\s+and v_active_axis_count < 3/);
assert.match(hardeningSql, /with recursive ordered as materialized/);
assert.match(hardeningSql, /p_required_axes <@ composition\.axes/);
assert.match(hardeningSql, /language plpgsql\s+security definer\s+set search_path = public, pg_temp/g);
for (const internalSignature of [
  'select_recovery_assessment_fragment_policy_internal(uuid, text, integer)',
  'recovery_v2_blocking_axis_feasible_internal(text[], integer, integer, integer, numeric, boolean)',
  'recovery_v2_assessment_pool_status_internal(uuid, text, integer)',
]) {
  assert.ok(hardeningSql.includes(`revoke all on function public.${internalSignature}`), `Internal RPC must be revoked: ${internalSignature}`);
}
assert.match(hardeningSql, /if not public\.is_admin\(\) then[\s\S]*?Admin access required/);
assert.match(hardeningSql, /revoke all on function public\.admin_preview_recovery_v2_cumulative_materialization[\s\S]*?grant execute[\s\S]*?to authenticated/);
assert.doesNotMatch(hardeningSql, /grant execute[^;]*admin_preview_recovery_v2_cumulative_materialization[^;]*to anon/i);

for (const diagnosticField of contract.diagnostic_output.required_fields) {
  assert.ok(hardeningSql.includes(`'${diagnosticField}'`), `Missing diagnostic output field: ${diagnosticField}`);
}

for (const forbidden of [
  'compute_recovery_readiness',
  'recovery_readiness_snapshots',
  'needs_recheck',
  'remediation',
  'Math.random',
]) {
  assert.ok(!hardeningSql.includes(forbidden), `Forbidden cross-workstream marker in hardening migration: ${forbidden}`);
}

const sessionRules = {
  checkpoint: { minimumFragments: 3, minimumAxes: 2, grammarCeiling: 0.6, blockingPolicy: 'none' },
  mock_intermediate: { minimumFragments: 4, minimumAxes: 3, grammarCeiling: 0.55, blockingPolicy: 'feasible' },
  mock_final: { minimumFragments: 4, minimumAxes: 3, grammarCeiling: 0.5, blockingPolicy: 'feasible' },
};

function evaluateComposition({
  sessionType,
  activeAxes,
  blockingAxes = activeAxes,
  fragments,
  budget,
  v2Started = false,
  feasibleBlockingAxes = blockingAxes,
  selectorSelectedAxes = null,
  profile = null,
}) {
  const rule = sessionRules[sessionType];
  const selectedAxes = [...new Set(fragments.map((fragment) => fragment.axis))];
  const formFamilies = fragments.map((fragment) => fragment.formFamily);
  const minutes = fragments.reduce((total, fragment) => total + fragment.minutes, 0);
  const grammarMinutes = fragments
    .filter((fragment) => fragment.axis === 'grammar_sentence_control')
    .reduce((total, fragment) => total + fragment.minutes, 0);
  const grammarShare = minutes ? grammarMinutes / minutes : 0;
  const minimumAxes = Math.min(activeAxes.length, rule.minimumAxes);
  const missingBlockingAxes = rule.blockingPolicy !== 'none'
    ? blockingAxes.filter((axis) => !selectedAxes.includes(axis))
    : [];
  const infeasibleBlockingAxes = missingBlockingAxes.filter((axis) => !feasibleBlockingAxes.includes(axis));
  const selectorOmittedBlockingAxes = missingBlockingAxes.filter((axis) => feasibleBlockingAxes.includes(axis));
  const profileHasProvenance = Boolean(profile?.grammarDominant && profile?.provenance);
  const canonicalGrammarOnly = activeAxes.length === 1 && activeAxes[0] === GRAMMAR;
  const grammarException = canonicalGrammarOnly
    || (sessionType === 'mock_intermediate' && activeAxes.length < 3)
    || profileHasProvenance;
  const valid = fragments.length >= rule.minimumFragments
    && selectedAxes.length >= minimumAxes
    && selectorOmittedBlockingAxes.length === 0
    && minutes <= budget
    && new Set(formFamilies).size === formFamilies.length
    && (grammarException || grammarShare <= rule.grammarCeiling);

  const poolInsufficient = infeasibleBlockingAxes.length > 0;
  const selectorInvalid = selectorOmittedBlockingAxes.length > 0
    || Boolean(selectorSelectedAxes && feasibleBlockingAxes.some((axis) => !selectorSelectedAxes.includes(axis)));

  const effectiveValid = valid && !poolInsufficient && !selectorInvalid;
  return {
    valid: effectiveValid,
    status: effectiveValid ? 'curriculum_v2_ready' : (v2Started ? 'insufficient_fresh_evidence' : 'legacy_fallback'),
    selectedAxes,
    missingBlockingAxes,
    minutes,
    grammarShare,
    grammarException,
    missingProfileProvenance: Boolean(profile?.grammarDominant && !profile?.provenance),
    poolInsufficient,
    selectorInvalid,
    semanticReason: selectorInvalid
      ? 'blocking_axis_selector_omission'
      : (poolInsufficient ? 'blocking_axis_not_feasible_with_current_pool' : null),
  };
}

const fragment = (id, axis, minutes, formFamily = id) => ({ id, axis, minutes, formFamily });
const GRAMMAR = 'grammar_sentence_control';
const READING = 'reading';
const WRITING = 'writing';
const LISTENING = 'listening';

// B2b scenario matrix. These policy tests supplement the SQL contract checks above.
assert.equal(evaluateComposition({
  sessionType: 'checkpoint', activeAxes: [GRAMMAR], budget: 28,
  fragments: [fragment('g1', GRAMMAR, 5), fragment('g2', GRAMMAR, 5), fragment('g3', GRAMMAR, 5)],
}).valid, true, '1. grammar-only checkpoint must allow a valid grammar-heavy composition');

assert.equal(evaluateComposition({
  sessionType: 'checkpoint', activeAxes: [GRAMMAR, READING], budget: 28,
  fragments: [fragment('g1', GRAMMAR, 5), fragment('g2', GRAMMAR, 5), fragment('g3', GRAMMAR, 5)],
}).valid, false, '2. grammar + reading must not silently omit reading');

assert.deepEqual(evaluateComposition({
  sessionType: 'mock_final', activeAxes: [GRAMMAR, READING, WRITING], blockingAxes: [WRITING], budget: 55,
  fragments: [fragment('g1', GRAMMAR, 5), fragment('g2', GRAMMAR, 5), fragment('r1', READING, 10), fragment('r2', READING, 10)],
}).missingBlockingAxes, [WRITING], '3. final mock without required writing must expose insufficient pool');

assert.equal(evaluateComposition({
  sessionType: 'checkpoint', activeAxes: [GRAMMAR, READING], budget: 28,
  fragments: [fragment('g1', GRAMMAR, 5), fragment('r1', READING, 8), fragment('r2', READING, 8)],
}).selectedAxes.includes(LISTENING), false, '4. listening must not be imposed when inactive');

assert.equal(evaluateComposition({
  sessionType: 'mock_final', activeAxes: [GRAMMAR, READING, LISTENING], budget: 55,
  fragments: [fragment('g1', GRAMMAR, 5), fragment('r1', READING, 10), fragment('l1', LISTENING, 10), fragment('l2', LISTENING, 10)],
}).valid, true, '5. programme override can activate listening and require its coverage');

assert.equal(evaluateComposition({
  sessionType: 'checkpoint', activeAxes: [GRAMMAR, READING], budget: 28,
  fragments: [fragment('g1', GRAMMAR, 5), fragment('r1', READING, 8)],
}).status, 'legacy_fallback', '6. partial pool must retain legacy fallback');

assert.equal(evaluateComposition({
  sessionType: 'checkpoint', activeAxes: [GRAMMAR, READING], budget: 28,
  fragments: [fragment('g1', GRAMMAR, 5), fragment('r1', READING, 8), fragment('r2', READING, 8)],
}).status, 'curriculum_v2_ready', '7. sufficient pool must activate v2');

assert.equal(evaluateComposition({
  sessionType: 'mock_final', activeAxes: [GRAMMAR, READING, WRITING], budget: 55,
  fragments: [fragment('g1', GRAMMAR, 5), fragment('r1', READING, 10), fragment('w1', WRITING, 15), fragment('w2', WRITING, 10)],
}).valid, true, '8. final mock must cover every active blocking axis');

assert.equal(evaluateComposition({
  sessionType: 'mock_final', activeAxes: [GRAMMAR, READING, WRITING], budget: 55,
  fragments: [fragment('g1', GRAMMAR, 20), fragment('g2', GRAMMAR, 15), fragment('r1', READING, 10), fragment('w1', WRITING, 10)],
}).valid, false, '9. grammar ceiling must be enforced');

const alternateFamily = [fragment('reading-form-b', READING, 10, 'reading-b')]
  .find((candidate) => candidate.formFamily !== 'reading-a');
assert.equal(alternateFamily.formFamily, 'reading-b', '10. an unused form family must be preferred over a used family');

assert.equal(evaluateComposition({
  sessionType: 'checkpoint', activeAxes: [GRAMMAR, READING], budget: 28, v2Started: true,
  fragments: [fragment('g1', GRAMMAR, 5), fragment('r1', READING, 8)],
}).status, 'insufficient_fresh_evidence', '11. exhausted pool must not silently repeat or fall back after v2 starts');

assert.equal(evaluateComposition({
  sessionType: 'checkpoint', activeAxes: [GRAMMAR, READING], budget: 20,
  fragments: [fragment('g1', GRAMMAR, 7), fragment('r1', READING, 8), fragment('r2', READING, 8)],
}).valid, false, '12. time budget must be respected');

assert.match(sql, /fragment_id text primary key/i, '13. duplicate fragment registration is structurally rejected/upserted');
assert.match(sql, /mapped\.evidence_role = 'primary'/i, '14. question-level outcome mappings remain part of selection compatibility');
assert.match(
  fs.readFileSync('supabase/migrations/20260813001536_recovery_curriculum_v2_fragment_evidence.sql', 'utf8'),
  /v_evidence_status := 'pending_review'[\s\S]*?v_score := null/i,
  '15. pending manual review remains non-scored evidence',
);
assert.doesNotMatch(hardeningSql, /create or replace function public\.get_recovery_readiness|compute_recovery_readiness/i, '16. learner-facing readiness is unchanged');
assert.doesNotMatch(hardeningSql, /needs_recheck|recovery_topic_remediation|verify_retry/i, '17. remediation loop is unchanged');
assert.match(hardeningSql, /select_recovery_assessment_fragment_candidates_internal/i, '18. legacy and existing cumulative selection paths remain reusable');

// B2b hardening scenarios 19-38.
const validIntermediate = [
  fragment('g1', GRAMMAR, 6), fragment('r1', READING, 10),
  fragment('w1', WRITING, 14), fragment('r2', READING, 8),
];
assert.equal(evaluateComposition({
  sessionType: 'mock_intermediate', activeAxes: [GRAMMAR, READING, WRITING], blockingAxes: [WRITING],
  feasibleBlockingAxes: [WRITING], fragments: validIntermediate, budget: 45,
}).valid, true, '19. intermediate includes a feasible blocking writing axis');

assert.equal(evaluateComposition({
  sessionType: 'mock_intermediate', activeAxes: [GRAMMAR, READING, WRITING], blockingAxes: [WRITING],
  feasibleBlockingAxes: [], fragments: validIntermediate.filter((item) => item.axis !== WRITING), budget: 24,
}).semanticReason, 'blocking_axis_not_feasible_with_current_pool', '20. non-composable blocking writing is pool insufficiency');

assert.equal(evaluateComposition({
  sessionType: 'mock_intermediate', activeAxes: [GRAMMAR, READING, WRITING], blockingAxes: [WRITING],
  feasibleBlockingAxes: [WRITING], selectorSelectedAxes: [GRAMMAR, READING],
  fragments: validIntermediate, budget: 45,
}).semanticReason, 'blocking_axis_selector_omission', '21. feasible selector omission is invalid');

assert.equal(evaluateComposition({
  sessionType: 'mock_final', activeAxes: [GRAMMAR, READING, WRITING], blockingAxes: [WRITING],
  feasibleBlockingAxes: [WRITING], fragments: validIntermediate, budget: 55,
}).valid, true, '22. final includes available blocking writing');

assert.equal(evaluateComposition({
  sessionType: 'mock_final', activeAxes: [GRAMMAR, READING, WRITING], blockingAxes: [WRITING],
  feasibleBlockingAxes: [], fragments: validIntermediate.filter((item) => item.axis !== WRITING), budget: 55, v2Started: true,
}).status, 'insufficient_fresh_evidence', '23. final without fresh writing after activation is explicitly insufficient');

assert.equal(evaluateComposition({
  sessionType: 'checkpoint', activeAxes: [GRAMMAR, READING, WRITING], budget: 28,
  fragments: [fragment('g1', GRAMMAR, 13), fragment('r1', READING, 4), fragment('w1', WRITING, 4)],
}).valid, false, '24. checkpoint with multiple axes enforces 60 percent');

assert.equal(evaluateComposition({
  sessionType: 'checkpoint', activeAxes: [GRAMMAR], budget: 28,
  fragments: [fragment('g1', GRAMMAR, 8), fragment('g2', GRAMMAR, 8), fragment('g3', GRAMMAR, 8)],
}).grammarException, true, '25. grammar-only checkpoint has a canonical exception');

assert.equal(evaluateComposition({
  sessionType: 'mock_intermediate', activeAxes: [GRAMMAR, READING, WRITING], blockingAxes: [], budget: 50,
  fragments: [fragment('g1', GRAMMAR, 24), fragment('g2', GRAMMAR, 8), fragment('r1', READING, 8), fragment('w1', WRITING, 8)],
}).valid, false, '26. intermediate with three axes enforces 55 percent');

assert.equal(evaluateComposition({
  sessionType: 'mock_intermediate', activeAxes: [GRAMMAR, READING], blockingAxes: [], budget: 50,
  fragments: [fragment('g1', GRAMMAR, 12), fragment('g2', GRAMMAR, 12), fragment('r1', READING, 6), fragment('r2', READING, 6)],
}).grammarException, true, '27. intermediate with two axes uses the blueprint exception');

assert.equal(evaluateComposition({
  sessionType: 'mock_intermediate', activeAxes: [GRAMMAR, READING, WRITING], blockingAxes: [], budget: 50,
  profile: { grammarDominant: true, provenance: 'official_school_assessment' },
  fragments: [fragment('g1', GRAMMAR, 12), fragment('g2', GRAMMAR, 12), fragment('r1', READING, 6), fragment('w1', WRITING, 6)],
}).grammarException, true, '28. stored canonical profile provenance can justify intermediate exception');

const unprovenIntermediate = evaluateComposition({
  sessionType: 'mock_intermediate', activeAxes: [GRAMMAR, READING, WRITING], blockingAxes: [], budget: 50,
  profile: { grammarDominant: true },
  fragments: [fragment('g1', GRAMMAR, 12), fragment('g2', GRAMMAR, 12), fragment('r1', READING, 6), fragment('w1', WRITING, 6)],
});
assert.equal(unprovenIntermediate.valid, false, '29a. unproven intermediate profile exception fails closed');
assert.equal(unprovenIntermediate.missingProfileProvenance, true, '29b. missing profile provenance is diagnosed');

assert.equal(evaluateComposition({
  sessionType: 'mock_final', activeAxes: [GRAMMAR, READING, WRITING], blockingAxes: [], budget: 55,
  fragments: [fragment('g1', GRAMMAR, 15), fragment('g2', GRAMMAR, 10), fragment('r1', READING, 8), fragment('w1', WRITING, 8)],
}).valid, false, '30. normal final enforces 50 percent');

assert.equal(evaluateComposition({
  sessionType: 'mock_final', activeAxes: [GRAMMAR, READING, WRITING], blockingAxes: [], budget: 55,
  profile: { grammarDominant: true, provenance: 'official_school_assessment' },
  fragments: [fragment('g1', GRAMMAR, 15), fragment('g2', GRAMMAR, 10), fragment('r1', READING, 8), fragment('w1', WRITING, 8)],
}).valid, true, '31. canonical school profile can justify final exception');

const unprovenFinal = evaluateComposition({
  sessionType: 'mock_final', activeAxes: [GRAMMAR, READING, WRITING], blockingAxes: [], budget: 55,
  profile: { grammarDominant: true },
  fragments: [fragment('g1', GRAMMAR, 15), fragment('g2', GRAMMAR, 10), fragment('r1', READING, 8), fragment('w1', WRITING, 8)],
});
assert.equal(unprovenFinal.valid, false, '32a. unproven final profile exception fails closed');
assert.equal(unprovenFinal.missingProfileProvenance, true, '32b. final reports missing provenance');

const remediationValidator = fs.readFileSync('scripts/validate-recovery-topic-remediation.mjs', 'utf8');
assert.match(remediationValidator, /recoveryRemediationPolicy/, '33. #225 remediation validator remains present');

const readingManifest = JSON.parse(fs.readFileSync('content/recovery/curriculum-v2/fragments/year-1-reading-p0.fragments.json', 'utf8'));
assert.equal(readingManifest.status, 'draft', '34a. #228 source remains draft and cannot activate runtime v2');
assert.ok(readingManifest.fragments.every((item) => item.status === 'draft' && item.primary_axis === 'reading'), '34b. #228 is recognized as reading, never grammar');
assert.ok(readingManifest.fragments.every((item) => item.outcome_ids.length === 1), '35. reading containers retain single primary-outcome scoring granularity');

assert.match(hardeningSql, /candidate\.primary_axis/, '36a. selector is axis-generic');
assert.doesNotMatch(hardeningSql, /primary_axis\s+in\s*\(\s*'grammar_sentence_control'\s*,\s*'reading'/i, '36b. selector does not hard-code grammar plus reading');
assert.equal(fs.existsSync('content/recovery/curriculum-v2/fragments/year-1-lexical-p0.fragments.json'), false, '36c. #227 does not depend on #229 lexical source');

assert.ok(fs.existsSync('content/recovery/curriculum-v2/planning/b1a-grammar-p0-briefs.json'), '37. #226 B1-A grammar contract remains present');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const validator of ['validate:recovery-remediation', 'validate:recovery-v2-year1-reading-p0', 'validate:recovery-v2-b1a-grammar-p0']) {
  assert.ok(packageJson.scripts[validator], `38. package.json retains ${validator}`);
  assert.ok(packageJson.scripts.build.includes(`npm run ${validator}`), `38. build retains ${validator} gate`);
}

const migrationNames = fs.readdirSync('supabase/migrations')
  .filter((name) => /^\d{14}_.+\.sql$/.test(name))
  .sort();
assert.equal(new Set(migrationNames.map((name) => name.slice(0, 14))).size, migrationNames.length, '39a. migration timestamps must remain unique');
assert.ok(migrationNames.indexOf('20260813155200_recovery_curriculum_v2_materializer_hardening.sql')
  > migrationNames.indexOf('20260813154600_recovery_mastery_fresh_verify_gate.sql'), '39b. #227 stays after #225 freshness migrations');
assert.ok(migrationNames.indexOf('20260813155200_recovery_curriculum_v2_materializer_hardening.sql')
  > migrationNames.indexOf('20260813081530_recovery_curriculum_v2_outcome_materializer.sql'), '39c. hardening follows B2b base migration');

console.log('Recovery Curriculum v2 outcome materializer contract validated.');
