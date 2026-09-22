import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient.js';

export default function AdminLearnerContextSubtitle({ learnerId, note, className = '' }) {
  const [resolvedNote, setResolvedNote] = useState(note ?? '');
  const shouldLoad = Boolean(learnerId) && note === undefined;

  useEffect(() => { setResolvedNote(note ?? ''); }, [note]);

  useEffect(() => {
    if (!shouldLoad) return undefined;
    let active = true;
    supabase.rpc('admin_get_learner_context_note', { target_learner_id: learnerId })
      .then(({ data, error }) => {
        if (active && !error) setResolvedNote(data || '');
      });
    return () => { active = false; };
  }, [learnerId, shouldLoad]);

  if (!resolvedNote) return null;
  return <p className={`mt-1 line-clamp-2 text-xs font-semibold leading-5 text-ink/50 dark:text-white/50 ${className}`}>{resolvedNote}</p>;
}
