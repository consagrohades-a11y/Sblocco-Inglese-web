import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleAlert } from 'lucide-react';
import { loadLearnerLearningSignals } from '../../lib/learnerLearningSignalsApi.js';

function percent(value) {
  if (value === null || value === undefined) return null;
  return Math.round(Number(value));
}

function EvidenceLine({ signal }) {
  const pieces = [];
  if (signal.recognition_percent !== null && signal.recognition_percent !== undefined) {
    pieces.push(`riconoscimento ${percent(signal.recognition_percent)}%`);
  }
  if (signal.guided_percent !== null && signal.guided_percent !== undefined) {
    pieces.push(`pratica guidata ${percent(signal.guided_percent)}%`);
  }
  if (signal.active_percent !== null && signal.active_percent !== undefined) {
    pieces.push(`uso attivo ${percent(signal.active_percent)}%`);
  }
  return pieces.join(' · ');
}

export default function LearnerLearningSignalsPanel({ learnerId, days = 90, compact = false }) {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    loadLearnerLearningSignals(learnerId, days)
      .then((data) => { if (active) setPayload(data); })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Non è stato possibile costruire i learning signals.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [learnerId, days]);

  const signals = Array.isArray(payload?.signals) ? payload.signals : [];
  const evidence = payload?.evidence || {};

  return (
    <section className="overflow-hidden rounded-[2rem] border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-surface-900">
      <div className={compact ? 'p-5 sm:p-6' : 'p-6 sm:p-8'}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">Learning Signals</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.02em] text-ink dark:text-white">
              Evidenza prima, etichette dopo.
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-ink/55 dark:text-white/55">
              Sblocco confronta solo attività realmente valutate. Un singolo errore non diventa automaticamente un pattern e i blocchi di teoria non contano come evidenza.
            </p>
          </div>
          {!loading && !error ? (
            <p className="shrink-0 text-xs font-bold text-ink/40 dark:text-white/40">
              {Number(evidence.scored_questions || 0)} attività valutate · {Number(evidence.attempt_count || 0)} tentativi
            </p>
          ) : null}
        </div>

        {loading ? (
          <p className="mt-5 text-sm font-bold text-ink/55 dark:text-white/55">Sto confrontando le evidenze utili…</p>
        ) : null}

        {error ? (
          <p className="mt-5 text-sm font-bold text-red-700 dark:text-red-300">{error}</p>
        ) : null}

        {!loading && !error && signals.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-ink/15 bg-linen/30 p-5 dark:border-white/15 dark:bg-white/[0.025]">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ink/40 dark:text-white/40" />
              <div>
                <p className="font-black text-ink dark:text-white">Nessun pattern abbastanza solido da mostrare.</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-ink/55 dark:text-white/55">
                  Non invento una diagnosi da pochi errori. Quando ci saranno prove comparabili, qui comparirà cosa succede, l’evidenza che lo supporta e la prossima mossa didattica.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {!loading && !error && signals.length ? (
          <div className="mt-5 grid gap-4">
            {signals.map((signal) => {
              const confirmed = signal.confidence === 'confirmed';
              const stageEvidence = EvidenceLine({ signal });
              return (
                <article key={`${signal.topic}-${signal.primary_skill}-${signal.signal_type}`} className="rounded-2xl border border-ink/10 bg-[#fffdf9] p-5 dark:border-white/10 dark:bg-white/[0.025] sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[0.66rem] font-black uppercase tracking-[0.08em] ${confirmed ? 'bg-ink text-white dark:bg-white dark:text-surface-950' : 'border border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-300/20 dark:bg-orange-300/[0.06] dark:text-orange-200'}`}>
                          {signal.confidence_label}
                        </span>
                        <span className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-ink/40 dark:text-white/40">{signal.skill_label}</span>
                      </div>
                      <h3 className="mt-3 text-xl font-black text-ink dark:text-white">{signal.title}</h3>
                      <p className="mt-2 text-sm font-semibold leading-6 text-ink/65 dark:text-white/65">{signal.what_is_happening}</p>
                    </div>
                    <CircleAlert className="h-5 w-5 shrink-0 text-orange-600 dark:text-orange-300" />
                  </div>

                  {stageEvidence ? (
                    <p className="mt-4 rounded-xl bg-linen/50 px-3 py-2 text-xs font-black text-ink/60 dark:bg-white/[0.045] dark:text-white/60">
                      {stageEvidence}
                    </p>
                  ) : null}

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div>
                      <p className="text-[0.66rem] font-black uppercase tracking-[0.1em] text-ink/40 dark:text-white/40">Perché conta</p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-ink/65 dark:text-white/65">{signal.why_it_matters}</p>
                    </div>
                    <div>
                      <p className="text-[0.66rem] font-black uppercase tracking-[0.1em] text-orange-700 dark:text-orange-300">Prossima mossa</p>
                      <p className="mt-1 text-sm font-bold leading-6 text-ink dark:text-white">{signal.next_action}</p>
                    </div>
                  </div>

                  {Array.isArray(signal.evidence) && signal.evidence.length ? (
                    <div className="mt-4 border-t border-ink/10 pt-4 dark:border-white/10">
                      <p className="text-[0.66rem] font-black uppercase tracking-[0.1em] text-ink/40 dark:text-white/40">Evidenza concreta</p>
                      <div className="mt-2 grid gap-2">
                        {signal.evidence.map((item) => (
                          <div key={item.learning_objective} className="flex items-start gap-2 text-xs font-semibold leading-5 text-ink/60 dark:text-white/60">
                            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-600 dark:text-orange-300" />
                            <span>{item.learning_objective}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
