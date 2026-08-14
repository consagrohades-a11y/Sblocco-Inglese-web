import { supabase } from './supabaseClient.js';
import {
  RECOVERY_DIAGNOSTIC_STORAGE_KEY,
  RECOVERY_OFFER_ID,
} from '../config/recovery.js';
import {
  buildRecoveryPlan,
  RECOVERY_PLAN_RUNTIME_PROFILE,
} from './recoveryPlanEngine.js';

function rpcError(response, fallback) {
  if (response?.error) {
    const error = new Error(response.error.message || fallback);
    error.code = response.error.code;
    throw error;
  }
  return response?.data;
}

function isMissingDailyPlanCapability(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return ['42P01', '42703', '42883', 'PGRST202', 'PGRST205'].includes(code)
    || message.includes('recovery_plan_days')
    || message.includes('plan_day_id')
    || message.includes('scheduled_for')
    || message.includes('daily_order')
    || message.includes('replace_recovery_plan_v2')
    || message.includes('activate_due_recovery_plan')
    || message.includes('get_today_recovery_plan');
}

function isMissingMasteryCapability(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return ['42P01', '42703', 'PGRST205'].includes(code)
    || message.includes('recovery_mastery_evidence')
    || message.includes('mastery_state')
    || message.includes('mastery_confidence')
    || message.includes('mastery_reason');
}

function isMissingReadinessCapability(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return ['42P01', '42703', '42883', 'PGRST202', 'PGRST205'].includes(code)
    || message.includes('get_recovery_readiness')
    || message.includes('recovery_readiness_snapshots');
}

function isMissingCheckpointCapability(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return ['42883', 'PGRST202'].includes(code)
    || message.includes('get_recovery_checkpoint_capability');
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

async function loadRecoveryTopics(enrollmentId) {
  const masteryResponse = await supabase
    .from('recovery_student_topics')
    .select('topic_key, required, diagnostic_score, checkpoint_score, mock_score, mastery_score, mastery_state, mastery_confidence, mastery_reason, repeated_errors, priority_score, priority_band, verification_only, last_evidence_at')
    .eq('enrollment_id', enrollmentId)
    .eq('required', true)
    .order('priority_score', { ascending: false });

  if (!masteryResponse.error) return masteryResponse;
  if (!isMissingMasteryCapability(masteryResponse.error)) return masteryResponse;

  return supabase
    .from('recovery_student_topics')
    .select('topic_key, required, diagnostic_score, checkpoint_score, mock_score, mastery_score, repeated_errors, priority_score, priority_band, verification_only, last_evidence_at')
    .eq('enrollment_id', enrollmentId)
    .eq('required', true)
    .order('priority_score', { ascending: false });
}

async function loadRecoveryMasteryEvidence(enrollmentId) {
  const response = await supabase
    .from('recovery_mastery_evidence')
    .select('id, topic_key, session_id, exercise_attempt_id, evidence_type, score, evidence_weight, evidence_key, metadata, observed_at, created_at')
    .eq('enrollment_id', enrollmentId)
    .order('observed_at', { ascending: false });
  if (!response.error) return response;
  if (isMissingMasteryCapability(response.error)) return { data: [], error: null };
  return response;
}

async function loadRecoverySessions(enrollmentId) {
  const dailyResponse = await supabase
    .from('recovery_plan_sessions')
    .select('id, sequence_index, session_type, topic_key, title, rationale, estimated_minutes, priority_score, stages, metadata, status, assignment_id, assignment_resource_id, score, completed_at, plan_day_id, scheduled_for, daily_order, created_at, updated_at')
    .eq('enrollment_id', enrollmentId)
    .order('sequence_index', { ascending: true });

  if (!dailyResponse.error) return dailyResponse;
  if (!isMissingDailyPlanCapability(dailyResponse.error)) return dailyResponse;

  return supabase
    .from('recovery_plan_sessions')
    .select('id, sequence_index, session_type, topic_key, title, rationale, estimated_minutes, priority_score, stages, metadata, status, assignment_id, assignment_resource_id, score, completed_at, created_at, updated_at')
    .eq('enrollment_id', enrollmentId)
    .order('sequence_index', { ascending: true });
}

export async function loadRecoveryState(enrollmentId) {
  if (!enrollmentId) return { topics: [], masteryEvidence: [], days: [], sessions: [], assessments: [], errorEvidence: [] };
  const [topicResponse, masteryEvidenceResponse, dayResponse, sessionResponse, assessmentResponse, errorResponse] = await Promise.all([
    loadRecoveryTopics(enrollmentId),
    loadRecoveryMasteryEvidence(enrollmentId),
    supabase
      .from('recovery_plan_days')
      .select('id, plan_version, day_index, scheduled_for, target_minutes, status, created_at, updated_at')
      .eq('enrollment_id', enrollmentId)
      .order('scheduled_for', { ascending: true })
      .order('day_index', { ascending: true }),
    loadRecoverySessions(enrollmentId),
    supabase
      .from('recovery_assessment_attempts')
      .select('id, session_id, assessment_type, exercise_attempt_id, score, topic_scores, submitted_at, feedback_released')
      .eq('enrollment_id', enrollmentId)
      .order('created_at', { ascending: false }),
    supabase.rpc('get_recovery_error_evidence', { p_enrollment_id: enrollmentId }),
  ]);

  const dayError = dayResponse.error && !isMissingDailyPlanCapability(dayResponse.error)
    ? dayResponse.error
    : null;
  const firstError = topicResponse.error || masteryEvidenceResponse.error || dayError || sessionResponse.error || assessmentResponse.error || errorResponse.error;
  if (firstError) throw firstError;
  return {
    topics: topicResponse.data || [],
    masteryEvidence: masteryEvidenceResponse.data || [],
    days: dayResponse.error ? [] : (dayResponse.data || []),
    sessions: sessionResponse.data || [],
    assessments: assessmentResponse.data || [],
    errorEvidence: errorResponse.data || [],
  };
}

export async function loadRecoveryReadiness(enrollmentId) {
  if (!enrollmentId) return null;
  const response = await supabase.rpc('get_recovery_readiness', { p_enrollment_id: enrollmentId });
  if (response.error) {
    if (isMissingReadinessCapability(response.error)) return null;
    return rpcError(response, 'Non è stato possibile calcolare la preparazione attuale.');
  }
  return response.data || null;
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
  const v2Response = await supabase.rpc('replace_recovery_plan_v2', {
    p_enrollment_id: enrollmentId,
    p_mode: plan.mode,
    p_topic_states: plan.topics,
    p_days: plan.days || [],
    p_sessions: plan.sessions,
  });
  if (!v2Response.error) return v2Response.data;
  if (!isMissingDailyPlanCapability(v2Response.error)) {
    return rpcError(v2Response, 'Non è stato possibile aggiornare il piano.');
  }

  return rpcError(await supabase.rpc('replace_recovery_plan', {
    p_enrollment_id: enrollmentId,
    p_mode: plan.mode,
    p_topic_states: plan.topics,
    p_sessions: plan.sessions,
  }), 'Non è stato possibile aggiornare il piano.');
}

export async function activateRecoveryPlan(enrollmentId) {
  if (!enrollmentId) return null;
  const response = await supabase.rpc('activate_due_recovery_plan', { p_enrollment_id: enrollmentId });
  if (response.error) {
    if (isMissingDailyPlanCapability(response.error)) return null;
    return rpcError(response, 'Non è stato possibile attivare il piano di oggi.');
  }
  return response.data;
}

export async function loadTodayRecoveryPlan(enrollmentId) {
  if (!enrollmentId) return null;
  const response = await supabase.rpc('get_today_recovery_plan', { p_enrollment_id: enrollmentId });
  if (response.error) {
    if (isMissingDailyPlanCapability(response.error)) return null;
    return rpcError(response, 'Non è stato possibile caricare la missione di oggi.');
  }
  return response.data;
}

function objectFromRows(rows, key, value) {
  return Object.fromEntries((rows || []).map((row) => [row[key], row[value]]));
}

export async function recalculateRecoveryPlan({ enrollment, state, now = new Date() }) {
  if (!enrollment?.id || !enrollment.exam_date) return null;
  const checkpointResponse = await supabase.rpc('get_recovery_checkpoint_capability', {
    p_enrollment_id: enrollment.id,
    p_budget_minutes: 24,
  });
  if (checkpointResponse.error && !isMissingCheckpointCapability(checkpointResponse.error)) {
    throw checkpointResponse.error;
  }
  const checkpointCapability = checkpointResponse.error ? null : checkpointResponse.data;
  const checkpointCompleted = state.sessions.some(
    (session) => session.session_type === 'checkpoint' && session.status === 'completed',
  );
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
    runtimeProfile: checkpointCapability?.ready
      ? RECOVERY_PLAN_RUNTIME_PROFILE.H30_CHECKPOINT_V1
      : RECOVERY_PLAN_RUNTIME_PROFILE.H30_LAUNCH,
    checkpointCompleted,
  });
  plan.checkpointCapability = checkpointCapability || {
    ready: false,
    status: 'INSUFFICIENT',
    reason: checkpointResponse.error ? 'checkpoint_migration_not_available' : 'pool_not_ready',
  };
  await replaceRecoveryPlan({ enrollmentId: enrollment.id, plan });
  return plan;
}

export async function materializeRecoverySession(sessionId) {
  return rpcError(await supabase.rpc('materialize_recovery_session', { p_session_id: sessionId }), 'Non è stato possibile preparare la sessione.');
}

export async function syncRecoverySession(sessionId) {
  return rpcError(await supabase.rpc('sync_recovery_session', { p_session_id: sessionId }), 'Non è stato possibile aggiornare la sessione.');
}

export async function markRecoveryCheckpointPlanUpdate(sessionId, summary) {
  return rpcError(await supabase.rpc('mark_recovery_checkpoint_plan_update', {
    p_session_id: sessionId,
    p_summary: summary,
  }), 'Non è stato possibile registrare l’aggiornamento del piano.');
}

export async function startRecoveryTopicCycleSession(sessionId) {
  return rpcError(await supabase.rpc('start_recovery_topic_cycle_session', { p_session_id: sessionId }), 'Non è stato possibile avviare il nuovo ciclo di recupero.');
}

export async function startRecoveryTopicRedo(enrollmentId, topicKey) {
  return rpcError(await supabase.rpc('start_recovery_topic_redo', {
    p_enrollment_id: enrollmentId,
    p_topic_key: topicKey,
  }), 'Non è stato possibile preparare il nuovo ciclo completo.');
}

export async function loadRecoveryTopicFollowup(sessionId) {
  return rpcError(await supabase.rpc('get_recovery_topic_followup', { p_session_id: sessionId }), 'Non è stato possibile caricare il passo successivo.');
}

export async function syncMaterializedRecoverySessions(sessions = []) {
  const active = sessions.filter((session) => session.assignment_id && !['completed', 'skipped'].includes(session.status));
  if (!active.length) return [];
  return Promise.all(active.map((session) => syncRecoverySession(session.id).catch(() => null)));
}

export async function loadRecoveryAccessState() {
  const entitled = await hasRecoveryEntitlement();
  if (!entitled) return { entitled: false, enrollment: null, state: null, readiness: null };
  const enrollment = await loadRecoveryEnrollment();
  if (enrollment?.id && enrollment.status === 'active') {
    await activateRecoveryPlan(enrollment.id);
  }
  const [state, readiness] = enrollment
    ? await Promise.all([
      loadRecoveryState(enrollment.id),
      loadRecoveryReadiness(enrollment.id),
    ])
    : [null, null];
  return { entitled: true, enrollment, state, readiness };
}

export function recoveryOfferId() {
  return RECOVERY_OFFER_ID;
}
