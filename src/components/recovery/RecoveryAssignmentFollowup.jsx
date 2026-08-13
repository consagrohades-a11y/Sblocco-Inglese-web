import React, { useEffect, useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  loadRecoveryTopicFollowup,
  startRecoveryTopicRedo,
  syncRecoverySession,
} from '../../lib/recoveryApi.js';
import { recoveryFollowupCopy } from '../../lib/recoveryRemediationPolicy.js';
import { supabase } from '../../lib/supabaseClient.js';

function followupActionLabel(followup, copy) {
  if (copy.primaryAction) return copy.primaryAction;
  if (followup?.band === 'strong') return 'Torna agli argomenti';
  return 'Continua il percorso';
}

export default function RecoveryAssignmentFollowup({ assignmentId, remainingActivities }) {
  const [session, setSession] = useState(null);
  const [followup, setFollowup] = useState(null);
  const [redoing, setRedoing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      if (!assignmentId) return;
      setError('');

      const { data, error: sessionError } = await supabase
        .from('recovery_plan_sessions')
        .select('id, enrollment_id, topic_key, session_type, status, assignment_id, metadata')
        .eq('assignment_id', assignmentId)
        .maybeSingle();

      if (!active || sessionError || !data?.topic_key) return;
      let resolved = data;

      if (Number(remainingActivities) === 0 && !['completed', 'skipped'].includes(resolved.status)) {
        try {
          const syncResult = await syncRecoverySession(resolved.id);
          if (syncResult?.completed || syncResult?.already_completed) {
            const { data: refreshed } = await supabase
              .from('recovery_plan_sessions')
              .select('id, enrollment_id, topic_key, session_type, status, assignment_id, metadata')
              .eq('id', resolved.id)
              .maybeSingle();
            if (refreshed) resolved = refreshed;
          }
        } catch (syncError) {
          if (active) setError(syncError.message || 'Non è stato possibile aggiornare il risultato Recovery.');
        }
      }

      if (!active) return;
      setSession(resolved);

      if (resolved.status === 'completed') {
        try {
          const next = await loadRecoveryTopicFollowup(resolved.id);
          if (active && next?.ready) setFollowup(next);
        } catch (followupError) {
          if (active) setError(followupError.message || 'Il risultato è salvato, ma il passo successivo non è ancora disponibile.');
        }
      }
    }

    load();
    return () => { active = false; };
  }, [assignmentId, remainingActivities]);

  async function redoFullPath() {
    if (!session?.enrollment_id || !session?.topic_key || redoing) return;
    setRedoing(true);
    setError('');
    try {
      const result = await startRecoveryTopicRedo(session.enrollment_id, session.topic_key);
      if (!result?.session_id) throw new Error('Il nuovo ciclo non è ancora disponibile.');
      window.location.assign(`/recupero-debito/sessione/${result.session_id}`);
    } catch (redoError) {
      setError(redoError.message || 'Non è stato possibile preparare il nuovo ciclo.');
      setRedoing(false);
    }
  }

  if (!session || !followup) return error ? <p className="mt-4 text-sm font-bold text-red-700 dark:text-red-200">{error}</p> : null;

  const score = Math.round(Number(followup.verify_score || 0));
  const copy = recoveryFollowupCopy(score, followup.mastery_state);
  const primaryRoute = followup.remediation_required && followup.next_session_id
    ? `/recupero-debito/sessione/${followup.next_session_id}`
    : '/recupero-debito/argomenti';
  const canOfferFullRedo = followup.remediation_required && score >= 60 && score < 80;

  return (
    <section className="mt-6 rounded-3xl border border-coral/25 bg-[#fff4ed] p-5 shadow-sm dark:border-coral/20 dark:bg-coral/[0.07] sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-coral dark:text-[#ff9678]">Verifica argomento · {score}%</p>
      <h2 className="mt-2 font-editorial text-3xl text-ink dark:text-white">{copy.title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-ink/70 dark:text-white/70">{copy.body}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link to={primaryRoute} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-coral px-5 py-2.5 text-sm font-black text-white dark:bg-[#ff8b6c] dark:text-surface-950">
          {followupActionLabel(followup, copy)} <ArrowRight className="h-4 w-4" />
        </Link>
        {canOfferFullRedo ? (
          <button type="button" onClick={redoFullPath} disabled={redoing} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-clay/20 bg-white px-5 py-2.5 text-sm font-black text-ink dark:border-white/20 dark:bg-white/10 dark:text-white">
            <RotateCcw className="h-4 w-4" /> {redoing ? 'Preparazione...' : 'Rifai tutto il percorso'}
          </button>
        ) : null}
        <Link to={`/recupero-debito/sessione/${session.id}`} className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-clay/15 px-5 py-2.5 text-sm font-black text-ink/70 dark:border-white/15 dark:text-white/70">Vedi dettaglio Recovery</Link>
      </div>
      {error ? <p className="mt-4 text-sm font-bold text-red-700 dark:text-red-200">{error}</p> : null}
    </section>
  );
}
