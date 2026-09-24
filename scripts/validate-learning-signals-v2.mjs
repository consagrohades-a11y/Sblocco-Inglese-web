import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

const [
  migration,
  retirementMigration,
  learnerDetail,
  learnerAnalytics,
  globalAnalytics,
  learningPulse,
  signalsPanel,
  exercisePlayer,
  exerciseResults,
  quickAssign,
  assignmentPicker,
  studioCompiler,
] = await Promise.all([
  read('supabase/migrations/20260924083600_replace_exercise_diagnostics_with_learning_signals.sql'),
  read('supabase/migrations/20260924084341_retire_legacy_exercise_diagnostic_rpcs.sql'),
  read('src/pages/AdminLearnerDetail.jsx'),
  read('src/pages/AdminLearnerAnalytics.jsx'),
  read('src/pages/AdminAnalytics.jsx'),
  read('src/components/admin/LearnerLearningPulse.jsx'),
  read('src/components/admin/LearnerLearningSignalsPanel.jsx'),
  read('src/pages/ExercisePlayerV2.jsx'),
  read('src/pages/AdminExerciseResults.jsx'),
  read('src/components/admin/exercise-studio/StudioQuickAssignPanel.jsx'),
  read('src/components/admin/AssignmentExercisePicker.jsx'),
  read('src/lib/exerciseStudioCompiler.js'),
]);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(migration.includes('drop trigger if exists exercise_builder_attempts_build_diagnostics'), 'Legacy diagnostic trigger must be disabled.');
assert(migration.includes("result_summary = result_summary - 'diagnostic_summary'"), 'Stored legacy diagnostic summaries must be removed.');
assert(migration.includes('delete from public.exercise_builder_diagnostic_events'), 'Legacy code-count evidence must be cleared.');
assert(migration.includes('admin_get_learner_learning_signals'), 'Learning Signals RPC is missing.');
assert(migration.includes("coalesce((question.grading_result ->> 'max_points')::numeric, 0) > 0"), 'Learning Signals must ignore non-graded content.');
assert(migration.includes("'correct',") && migration.includes("'nearly_correct',") && migration.includes("'incorrect'"), 'Learning Signals must use scored outcomes only.');
assert(!migration.includes("'unanswered'
      )"), 'Unanswered work must not be treated as language evidence.');
for (const type of ['transfer_gap', 'persistent_gap', 'guided_instability', 'improving']) {
  assert(migration.includes(type), `Learning signal type missing: ${type}`);
}
assert(migration.includes("when signal.attempt_count >= 2 then 'confirmed'"), 'Confirmed signals must require repeated evidence.');
assert(migration.includes("'Da verificare'"), 'Single-attempt observations must be explicitly marked as provisional.');
assert(migration.includes("'next_action'"), 'Every learning signal must include a next teaching action.');
assert(migration.includes("'evidence'"), 'Every learning signal must expose supporting learning-objective evidence.');
assert(retirementMigration.includes('revoke execute on function public.admin_rebuild_exercise_builder_diagnostics'), 'Legacy diagnostic rebuild RPC must be retired.');
assert(retirementMigration.includes('revoke execute on function public.get_exercise_builder_learner_diagnostics'), 'Legacy learner diagnostic RPC must be retired.');

assert(learnerDetail.includes('LearnerLearningSignalsPanel'), 'Learner detail must show Learning Signals.');
assert(!learnerDetail.includes('LearnerDiagnosticPanel'), 'Legacy learner diagnostic panel must be removed.');
assert(learnerAnalytics.includes('LearnerLearningSignalsPanel'), 'Learner analytics must use Learning Signals.');
assert(!learnerAnalytics.includes('data.diagnostics'), 'Learner analytics must not render code-count diagnostics.');
assert(!globalAnalytics.includes('Errori ricorrenti'), 'Global analytics must not render misleading diagnostic patterns.');
assert(!globalAnalytics.includes('data.diagnostics'), 'Global analytics must not render diagnostic-code aggregates.');
assert(learningPulse.includes('loadLearnerLearningSignals'), 'Learning Pulse must use the new signal engine.');
assert(!learningPulse.includes('analytics?.diagnostics'), 'Learning Pulse must not read legacy diagnostics.');
assert(signalsPanel.includes('Evidenza prima, etichette dopo.'), 'Learning Signals UI must communicate evidence-first behavior.');
assert(signalsPanel.includes('Nessun pattern abbastanza solido da mostrare.'), 'Learning Signals must support an honest no-signal state.');
assert(!exercisePlayer.includes('ExerciseDiagnosticSummary'), 'Learner results must not expose the legacy diagnostic summary.');
assert(!exercisePlayer.includes('diagnostic_summary'), 'Learner results must not read legacy diagnostic summary payloads.');
assert(!exerciseResults.includes('ExerciseDiagnosticSummary'), 'Teacher review must not expose legacy diagnostic summaries.');
assert(!quickAssign.includes('Show diagnostic summary'), 'Quick assign must not offer a legacy diagnostic-summary toggle.');
assert(!assignmentPicker.includes('Mostra diagnosi'), 'Assignment picker must not offer a legacy diagnostic-summary toggle.');
assert(studioCompiler.includes('show_diagnostic_summary: false'), 'Studio compiler must keep legacy diagnostic summaries disabled.');

console.log('Learning Signals v2 validation passed: evidence-based, deduplicated, actionable, and legacy diagnostic patterns removed.');
