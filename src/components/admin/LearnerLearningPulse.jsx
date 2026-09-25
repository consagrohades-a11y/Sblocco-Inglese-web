import React, { useEffect, useMemo, useState } from 'react';
import { Brain, CircleAlert, Clock3 } from 'lucide-react';
import { loadAdminLearnerAnalytics } from '../../lib/adminAnalyticsApi.js';
import { loadLearnerLearningSignals } from '../../lib/learnerLearningSignalsApi.js';
import { loadLearnerVocabularyBank } from '../../lib/learnerVocabularyBankApi.js';

export default function LearnerLearningPulse({ learnerId, learnerName }) {
  const [analytics, setAnalytics] = useState(null);
  const [signalsPayload, setSignalsPayload] = useState(null);
  const [vocabulary, setVocabulary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [partial, setPartial] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setPartial(false);
    Promise.allSettled([
      loadAdminLearnerAnalytics(learnerId, 30),
      loadLearnerLearningSignals(learnerId, 90),
      loadLearnerVocabularyBank(learnerId),
    ]).then(([analyticsResult, signalsResult, vocabularyResult]) => {
      if (!active) return;

      const successCount = [analyticsResult, signalsResult, vocabularyResult]
        .filter((result) => result.status === 'fulfilled').length;

      setAnalytics(analyticsResult.status === 'fulfilled' ? analyticsResult.value : null);
      setSignalsPayload(signalsResult.status === 'fulfilled' ? signalsResult.value : null);
      setVocabulary(vocabularyResult.status === 'fulfilled' ? vocabularyResult.value : []);
      setPartial(successCount > 0 && successCount < 3);
      setError(successCount === 0 ? 'Non è stato possibile costruire il Learning Pulse.' : '');
      setLoading(false);
    });
    return () => { active = false; };
  }, [learnerId]);

  const pulse = useMemo(() => {
    const now = Date.now();
    const due = vocabulary.filter((item) => !item.next_review_at || new Date(item.next_review_at).getTime() <= now);
    const fragile = [...vocabulary]
      .filter((item) => Number(item.forgotten_count || 0) > 0 || item.last_recall_rating === 'again')
      .sort((a, b) => Number(b.forgotten_count || 0) - Number(a.forgotten_count || 0)
        || Number(a.recall_strength || 0) - Number(b.recall_strength || 0))[0] || null;
    const signal = signalsPayload?.signals?.[0] || null;
    const exercise = analytics?.exercises?.[0] || null;
    return { due, fragile, signal, exercise };
  }, [analytics, signalsPayload, vocabulary]);

  return (
    <section className="overflow-hidden rounded-[2rem] border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-surface-900">
      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,2fr)] sm:p-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.15em] text-orange-700 dark:text-orange-300">Learning Pulse</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.03em] text-ink dark:text-white">Cosa guarderei adesso.</h2>
          <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-ink/55 dark:text-white/55">
            Una sintesi automatica dei dati già presenti per {learnerName || 'questo studente'}. Mostra solo segnali con evidenza utile, non una lista di errori ribattezzata “diagnosi”.
          </p>
        </div>

        {loading ? <p className="text-sm font-bold text-ink/55 dark:text-white/55">Sto leggendo gli ultimi segnali…</p> : null}
        {error ? <p className="text-sm font-bold text-red-700 dark:text-red-300">{error}</p> : null}
        {partial && !loading ? <p className="text-xs font-bold text-amber-800 dark:text-amber-200">Dati parziali: mostro i segnali disponibili senza bloccare il resto del profilo.</p> : null}

        {!loading && !error ? (
          <div className="grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4 dark:border-orange-300/15 dark:bg-orange-300/[0.05]">
              <Brain className="h-5 w-5 text-orange-700 dark:text-orange-300" />
              <p className="mt-3 text-[0.66rem] font-black uppercase tracking-[0.1em] text-orange-800/65 dark:text-orange-200/65">Memoria</p>
              <p className="mt-1 text-2xl font-black text-ink dark:text-white">{pulse.due.length} da riattivare</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-ink/55 dark:text-white/55">
                {pulse.fragile ? `Più fragile: “${pulse.fragile.display_text}” · dimenticato ${pulse.fragile.forgotten_count} volte.` : vocabulary.length ? 'Nessun elemento continua a ricadere, per ora.' : 'Il vocab bank è ancora vuoto.'}
              </p>
            </article>

            <article className="rounded-2xl border border-ink/10 bg-linen/35 p-4 dark:border-white/10 dark:bg-white/[0.035]">
              <CircleAlert className="h-5 w-5 text-ink/55 dark:text-white/55" />
              <p className="mt-3 text-[0.66rem] font-black uppercase tracking-[0.1em] text-ink/45 dark:text-white/45">Segnale didattico</p>
              <p className="mt-1 text-lg font-black text-ink dark:text-white">{pulse.signal?.title || 'Niente da forzare'}</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-ink/55 dark:text-white/55">
                {pulse.signal ? pulse.signal.next_action : 'Non c’è ancora evidenza sufficiente per trasformare gli errori in un pattern. Meglio nessuna diagnosi che una diagnosi vuota.'}
              </p>
            </article>

            <article className="rounded-2xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.025]">
              <Clock3 className="h-5 w-5 text-ink/55 dark:text-white/55" />
              <p className="mt-3 text-[0.66rem] font-black uppercase tracking-[0.1em] text-ink/45 dark:text-white/45">Esercizi</p>
              <p className="mt-1 text-lg font-black text-ink dark:text-white">{pulse.exercise?.exercise_title || 'Nessun invio recente'}</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-ink/55 dark:text-white/55">
                {pulse.exercise
                  ? `Media ${pulse.exercise.average_score == null ? '—' : Math.round(Number(pulse.exercise.average_score)) + '%'} · ${Number(analytics?.overview?.pending_reviews || 0)} review in attesa.`
                  : 'Quando arrivano nuovi tentativi, qui vedrai subito il segnale utile.'}
              </p>
            </article>
          </div>
        ) : null}
      </div>
    </section>
  );
}
