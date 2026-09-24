import { supabase } from './supabaseClient.js';

function humanizeTopic(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'General';
  if (!raw.includes('_') && !raw.includes('-')) return raw;
  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function loadLearnerLearningSignals(learnerId, days = 90) {
  const { data, error } = await supabase.rpc('admin_get_learner_learning_signals', {
    p_learner_id: learnerId,
    p_days: days,
  });
  if (error) throw error;

  const payload = data || {
    period_days: days,
    evidence: { scored_questions: 0, attempt_count: 0, topic_skill_pairs: 0 },
    signals: [],
  };

  return {
    ...payload,
    signals: (payload.signals || []).map((signal) => {
      const topicLabel = humanizeTopic(signal.topic);
      return {
        ...signal,
        topic_label: topicLabel,
        title: signal.topic && signal.title
          ? String(signal.title).replace(String(signal.topic), topicLabel)
          : signal.title,
      };
    }),
  };
}
