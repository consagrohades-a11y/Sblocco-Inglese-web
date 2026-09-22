import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';

const AdminLearnerContext = createContext(null);

export function AdminLearnerContextProvider({ children }) {
  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_list_learners');
    if (error) {
      setLoading(false);
      return;
    }
    setLearners(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const byId = useMemo(() => Object.fromEntries(learners.map((learner) => [learner.id, learner])), [learners]);

  const saveContextNote = useCallback(async (learnerId, note) => {
    const normalized = String(note || '').trim();
    if (normalized.length > 280) throw new Error('Il promemoria non può superare 280 caratteri.');
    const { data, error } = await supabase.rpc('admin_set_learner_context_note', {
      target_learner_id: learnerId,
      context_note: normalized || null,
    });
    if (error) throw error;
    setLearners((current) => current.map((learner) => (
      learner.id === learnerId ? { ...learner, admin_context_note: data || null } : learner
    )));
    return data || null;
  }, []);

  const value = useMemo(() => ({
    learners,
    byId,
    loading,
    refresh,
    saveContextNote,
    getLearner: (learnerId) => byId[learnerId] || null,
    getNote: (learnerId) => byId[learnerId]?.admin_context_note || '',
  }), [byId, learners, loading, refresh, saveContextNote]);

  return <AdminLearnerContext.Provider value={value}>{children}</AdminLearnerContext.Provider>;
}

export function useAdminLearnerContext() {
  const value = useContext(AdminLearnerContext);
  if (!value) throw new Error('useAdminLearnerContext must be used inside AdminLearnerContextProvider.');
  return value;
}
