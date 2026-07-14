import { supabase } from './supabaseClient.js';

function throwIfError(error) {
  if (error) throw error;
}

export async function loadDiagnosticRegistry() {
  const [codesResult, messagesResult, rulesResult] = await Promise.all([
    supabase.from('exercise_builder_diagnostic_codes').select('*').order('topic').order('code'),
    supabase.from('exercise_builder_diagnostic_messages').select('*').order('diagnostic_code').order('language').order('message_level'),
    supabase.from('exercise_builder_diagnostic_rules').select('*').order('priority', { ascending: false }).order('rule_key'),
  ]);
  throwIfError(codesResult.error || messagesResult.error || rulesResult.error);

  const messagesByCode = new Map();
  (messagesResult.data || []).forEach((message) => {
    const current = messagesByCode.get(message.diagnostic_code) || {};
    current[`${message.language}:${message.message_level}`] = message.message_text;
    messagesByCode.set(message.diagnostic_code, current);
  });

  return {
    codes: (codesResult.data || []).map((code) => ({ ...code, messages: messagesByCode.get(code.code) || {} })),
    rules: rulesResult.data || [],
  };
}

export async function saveDiagnosticCode({ code, messages = {}, ...fields }) {
  const normalizedCode = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_');
  if (!normalizedCode) throw new Error('Inserisci un codice diagnostico.');

  const { data, error } = await supabase.rpc('admin_save_exercise_builder_diagnostic_code', {
    p_payload: {
      code: normalizedCode,
      label: fields.label?.trim(),
      primary_skill: fields.primary_skill?.trim(),
      topic: fields.topic?.trim(),
      subtopic: fields.subtopic?.trim() || null,
      group_key: fields.group_key?.trim() || null,
      severity: fields.severity || 'minor',
      category: fields.category || 'learning',
      recommended_resources: Array.isArray(fields.recommended_resources) ? fields.recommended_resources : [],
      status: fields.status || 'active',
      messages,
    },
  });
  throwIfError(error);
  return data || normalizedCode;
}

export async function saveDiagnosticRule(rule) {
  const payload = {
    rule_key: String(rule.rule_key || '').trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_'),
    topic: String(rule.topic || '').trim(),
    priority: Number(rule.priority) || 0,
    trigger_config: rule.trigger_config || {},
    output_config: rule.output_config || {},
    suppress_specific_messages: rule.suppress_specific_messages !== false,
    status: rule.status || 'active',
  };
  if (!payload.rule_key || !payload.topic) throw new Error('Regola e topic sono obbligatori.');
  const { data, error } = await supabase.rpc('admin_save_exercise_builder_diagnostic_rule', {
    p_payload: payload,
  });
  throwIfError(error);
  return data || payload.rule_key;
}

export async function archiveDiagnosticCode(code, archived = true) {
  const { error } = await supabase
    .from('exercise_builder_diagnostic_codes')
    .update({ status: archived ? 'archived' : 'active' })
    .eq('code', code);
  throwIfError(error);
}

export async function archiveDiagnosticRule(ruleKey, archived = true) {
  const { error } = await supabase
    .from('exercise_builder_diagnostic_rules')
    .update({ status: archived ? 'archived' : 'active' })
    .eq('rule_key', ruleKey);
  throwIfError(error);
}

export async function loadLearnerDiagnostics(learnerId) {
  const { data, error } = await supabase.rpc('get_exercise_builder_learner_diagnostics', {
    p_learner_id: learnerId,
  });
  throwIfError(error);
  return Array.isArray(data) ? data : [];
}

export async function rebuildExerciseDiagnostics(attemptId = null) {
  const { data, error } = await supabase.rpc('admin_rebuild_exercise_builder_diagnostics', {
    p_attempt_id: attemptId,
  });
  throwIfError(error);
  return data || 0;
}
