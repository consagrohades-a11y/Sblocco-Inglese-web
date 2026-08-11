import { supabase } from './supabaseClient.js';
import {
  RECOVERY_DIAGNOSTIC_STORAGE_KEY,
  RECOVERY_OFFER_ID,
} from '../config/recovery.js';
import { buildRecoveryPlan } from './recoveryPlanEngine.js';

function rpcError(response, fallback) {
  if (response?.error) {
    const error = new Error(response.error.message || fallback);
    error.code = response.error.code;
    throw error;
  }
  return response?.data;
}

export async function submitRecoveryDiagnostic(answers) {
  const data = rpcError(await supabase.rpc('submit_public_recovery_diagnostic', {
    p_answers: answers,
    p_source: 'test-recupero-inglese',
  }), 'Non è stato possibile salvare il test.');
  const result = Array.isArray(data) ? data[0] : data;
  if (result?.result_token && typeof window !== 'undefined') {
    window.localStorage.setItem(RECOVERY_DIAGNOSTIC_STORAGE_KEY, result.result_token);
  }
  return result;
}

export async function loadRecoveryDiagnosticResult(token) {
  if (!token) return null;
  const data = rpcError(await supabase.rpc('get_public_recovery_diagnostic', { p_token: token }), 'Risultato non disponibile.');
  return Array.isArray(data) ? data[0] || null : data;
}

export function storedRecoveryDiagnosticToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(RECOVERY_DIAGNOSTIC_STORAGE_KEY);
}

export async function claimRecoveryDiagnostic(token = storedRecoveryDiagnosticToken()) {
  if (!token) return null;
  const data = rpcError(await supabase.rpc('claim_recovery_diagnostic', { p_token: token }), 'Non è stato possibile collegare il test al tuo account.');
  return data;
}

export async function hasRecoveryEntitlement() {
  const data = rpcError(await supabase.rpc('has_active_recovery_entitlement'), 'Non è stato possibile verificare l’accesso.');
  return Boolean(data);
}

export async function loadRecoveryEnrollment() {
  const { data, error } = await supabase
    .from('recovery_enrollments')
    .select('id, user_id, offer_id, diagnostic_attempt_id, class_year, exam_date, mode, status, plan_version, last_planned_at, completed_at, created_at, updated_at')
    .in('status', ['onboarding', 'active', 'completed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function loadRecoveryState(enrollmentId) {
  if (!enrollmentId) return { topics: [], sessions: [], assessments: [], errorEvidence: [] };
  const [topicResponse, sessionResponse, assessmentResponse, errorResponse] = await Promise.all([
    supabase
      .from('recovery_student_topics')
      .select('topic_key, required, diagnostic_score, checkpoint_score, mock_score, mastery_score, repeated_errors, priority_score, priority_band, verification_only, last_evidence_at')
      .eq('enrollment_id', enrollmentId)
      .eq('required', true)
      .order('priority_score', { ascending: false }),
    supabase
      .from('recovery_plan_sessions')
      .select('id, sequence_index, session_type, topic_key, title, rationale, estimated_minutes, priority_score, stages, metadata, status, assignment_id, assignment_resource_id, score, completed_at, created_at, updated_at')
      .eq('enrollment_id', enrollmentId)
      .order('sequence_index', { ascending: true }),
    supabase
      .from('recovery_assessment_attempts')
      .select('id, session_id, assessment_type, exercise_attempt_id, score, topic_scores, submitted_at, feedback_released')
      .eq('enrollment_id', enrollmentId)
      .order('created_at', { ascending: false }),
    supabase.rpc('get_recovery_error_evidence', { p_enrollment_id: enrollmentId }),
  ]);
  const firstError = topicResponse.error || sessionResponse.error || assessmentResponse.error || errorResponse.error;
  if (firstError) throw firstError;
  return {
    topics: topicResponse.data || [],
    sessions: sessionResponse.data || [],
    assessments: assessmentResponse.data || [],
    errorEvidence: errorResponse.data || [],
  };
}

export async function configureRecoveryEnrollment({ classYear, examDate, topicKeys, mode, diagnosticToken }) {
  const data = rpcError(await supabase.rpc('configure_recovery_enrollment', {
    p_class_year: Number(classYear),
    p_exam_date: examDate,
    p_topic_keys: topicKeys,
    p_mode: mode,
    p_diagnostic_token: diagnosticToken || null,
  }), 'Non è stato possibile salvare il programma di recupero.');
  return data;
}

export async function replaceRecoveryPlan({ enrollmentId, plan }) {
  return rpcError(await supabase.rpc('replace_recovery_plan', {
    p_enrollment_id: enrollmentId,
    p_mode: plan.mode,
    p_topic_states: plan.topics,
    p_sessions: plan.sessions,
  }), 'Non è stato possibile aggiornare il piano.');
}

function objectFromRows(rows, key, value) {
  return Object.fromEntries((rows || []).map((row) => [row[key], row[value]]));
}

export async function recalculateRecoveryPlan({ enrollment, state, now = new Date() }) {
  if (!enrollment?.id || !enrollment.exam_date) return null;
  const repeatedErrors = objectFromRows(state.errorEvidence, 'topic_key', 'repeated_errors');
  const preservedSequenceIndexes = state.sessions
    .filter((session) => !['planned', 'available'].includes(session.status))
    .map((session) => Number(session.sequence_index) || 0);
  const plan = buildRecoveryPlan({
    requiredTopicKeys: state.topics.map((topic) => topic.topic_key),
    examDate: enrollment.exam_date,
    now,
    diagnosticScores: Object.fromEntries(state.topics.flatMap((topic) => topic.diagnostic_score == null ? [] : [[topic.topic_key, topic.diagnostic_score]])),
    checkpointScores: objectFromRows(state.topics, 'topic_key', 'checkpoint_score'),
    mockScores: objectFromRows(state.topics, 'topic_key', 'mock_score'),
    masteryScores: objectFromRows(state.topics, 'topic_key', 'mastery_score'),
    repeatedErrors,
    startSequence: Math.max(0, ...preservedSequenceIndexes) + 1,
  });
  await replaceRecoveryPlan({ enrollmentId: enrollment.id, plan });
  return plan;
}

export async function materializeRecoverySession(sessionId) {
  return rpcError(await supabase.rpc('materialize_recovery_session', { p_session_id: sessionId }), 'Non è stato possibile preparare la sessione.');
}

export async function syncRecoverySession(sessionId) {
  return rpcError(await supabase.rpc('sync_recovery_session', { p_session_id: sessionId }), 'Non è stato possibile aggiornare la sessione.');
}

export async function syncMaterializedRecoverySessions(sessions = []) {
  const active = sessions.filter((session) => session.assignment_id && !['completed', 'skipped'].includes(session.status));
  if (!active.length) return [];
  return Promise.all(active.map((session) => syncRecoverySession(session.id).catch(() => null)));
}

export async function loadRecoveryAccessState() {
  const entitled = await hasRecoveryEntitlement();
  if (!entitled) return { entitled: false, enrollment: null, state: null };
  const enrollment = await loadRecoveryEnrollment();
  const state = enrollment ? await loadRecoveryState(enrollment.id) : null;
  return { entitled: true, enrollment, state };
}

export function recoveryOfferId() {
  return RECOVERY_OFFER_ID;
}
