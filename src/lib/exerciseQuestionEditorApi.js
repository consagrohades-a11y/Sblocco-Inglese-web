import { supabase } from './supabaseClient.js';

function throwIfError(error) {
  if (error) throw error;
}

export async function loadExerciseQuestionEditorDetail(questionReference) {
  const { data, error } = await supabase.rpc('admin_get_exercise_builder_question_detail_by_reference', {
    p_reference: String(questionReference || ''),
  });
  throwIfError(error);
  return data || null;
}

export async function saveExerciseQuestionVersion({ questionId = null, question }) {
  const { data, error } = await supabase.rpc('admin_save_exercise_builder_question_version', {
    p_question_id: questionId,
    p_payload: {
      schema_version: 2,
      question_type: question.questionType,
      title: question.title || null,
      prompt: question.prompt,
      instructions: question.instructions || null,
      instruction_language: question.instructionLanguage || 'it',
      level: question.level,
      topic: question.topic,
      subtopic: question.subtopic || null,
      primary_skill: question.primarySkill,
      learning_objective: question.learningObjective || null,
      difficulty: question.difficulty || 'standard',
      content: question.content || {},
      grading: question.grading || {},
      feedback: question.feedback || {},
      diagnostics: question.diagnostics || {},
      tags: question.tags || [],
      media: question.media || [],
    },
  });
  throwIfError(error);
  return data;
}

export async function loadActiveDiagnosticCodes() {
  const { data, error } = await supabase
    .from('exercise_builder_diagnostic_codes')
    .select('code, label, primary_skill, topic, subtopic, group_key, severity, category')
    .eq('status', 'active')
    .order('category')
    .order('topic')
    .order('code');
  throwIfError(error);
  return data || [];
}

export async function setExerciseQuestionStatus(questionId, status) {
  const { error } = await supabase.rpc('admin_set_exercise_builder_status', {
    p_entity_type: 'question',
    p_entity_id: questionId,
    p_next_status: status,
  });
  throwIfError(error);
}
