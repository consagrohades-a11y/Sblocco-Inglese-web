import React, { useEffect, useState } from 'react';
import { CalendarDays, GraduationCap, Loader2, ShieldCheck, ShieldX } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient.js';

const enrollmentLabels = {
  onboarding: 'Onboarding da completare',
  active: 'Percorso attivo',
  completed: 'Percorso completato',
  archived: 'Percorso archiviato',
};

const modeLabels = {
  complete: 'Completo',
  intensive: 'Intensivo',
  sos: 'SOS',
};

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

function Metric({ label, value }) {
  return (
    <div className="border-t border-ink/10 pt-3 dark:border-white/10">
      <p className="text-[0.68rem] font-bold uppercase tracking-wide text-ink/55 dark:text-white/55">{label}</p>
      <p className="mt-1 text-sm font-black text-ink dark:text-white">{value || '-'}</p>
    </div>
  );
}

export default function LearnerRecoveryPanel({ learnerId, learnerName, disabled = false }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase.rpc('admin_get_recovery_learner_status', {
      target_learner_id: learnerId,
    });
    if (loadError) {
      setError(loadError.message || 'Non è stato possibile caricare lo stato Recupero Debito.');
      setStatus(null);
    } else {
      setStatus(data || null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learnerId]);

  async function setManualAccess(enabled) {
    if (saving) return;
    if (!enabled) {
      const confirmed = window.confirm(`Revocare l’accesso manuale Recupero Debito a ${learnerName || 'questo studente'}? Un eventuale accesso acquistato con Stripe resterà attivo.`);
      if (!confirmed) return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    const { data, error: saveError } = await supabase.rpc('admin_set_recovery_access', {
      target_learner_id: learnerId,
      enabled,
      p_note: enabled ? 'Accesso attivato dal pannello admin.' : null,
    });

    if (saveError) {
      setError(saveError.message || 'Non è stato possibile aggiornare l’accesso Recupero Debito.');
    } else {
      setStatus(data || null);
      setMessage(enabled
        ? 'Recupero Debito attivato. Lo studente può completare test/onboarding e generare il proprio piano.'
        : data?.has_access
          ? 'Accesso manuale revocato. L’accesso acquistato resta attivo.'
          : 'Accesso manuale Recupero Debito revocato.');
    }
    setSaving(false);
  }

  const enrollment = status?.enrollment || null;
  const totalSessions = Number(enrollment?.total_sessions || 0);
  const completedSessions = Number(enrollment?.completed_sessions || 0);
  const progress = totalSessions ? Math.round((completedSessions / totalSessions) * 100) : 0;

  return (
    <section className="rounded-2xl border border-coral/20 bg-[#fffaf5] p-6 shadow-sm dark:border-coral/20 dark:bg-surface-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-coral">Percorso speciale</p>
          <h2 className="mt-2 flex items-center gap-2 text-2xl font-black text-ink dark:text-white">
            <GraduationCap className="h-5 w-5 text-coral" /> Recupero Debito Inglese
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65 dark:text-white/60">
            Recupero Debito non cambia il ruolo learner: aggiunge un diritto di accesso e un percorso personalizzato sopra l’account esistente.
          </p>
        </div>
        {loading ? <Loader2 className="h-5 w-5 animate-spin text-coral" /> : status?.has_access ? (
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-900 dark:bg-emerald-400/10 dark:text-emerald-200">
            <ShieldCheck className="h-4 w-4" /> Accesso attivo
          </span>
        ) : (
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 dark:bg-white/10 dark:text-white/65">
            <ShieldX className="h-4 w-4" /> Nessun accesso
          </span>
        )}
      </div>

      {error ? <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-900 dark:bg-red-400/10 dark:text-red-100">{error}</div> : null}
      {message ? <div className="mt-5 border-l-4 border-moss bg-mint/30 p-4 text-sm font-bold text-ink dark:bg-emerald-400/10 dark:text-emerald-100">{message}</div> : null}

      {!loading && status ? (
        <>
          <div className="mt-5 flex flex-wrap gap-2">
            {status.paid_access ? <span className="rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs font-black text-ink dark:border-white/10 dark:bg-white/10 dark:text-white">Accesso Stripe</span> : null}
            {status.manual_access ? <span className="rounded-full border border-coral/20 bg-blush px-3 py-1.5 text-xs font-black text-clay dark:bg-coral/10 dark:text-[#f7a98d]">Accesso manuale admin</span> : null}
            {enrollment?.status ? <span className="rounded-full border border-ink/10 bg-linen px-3 py-1.5 text-xs font-black text-ink dark:border-white/10 dark:bg-white/10 dark:text-white">{enrollmentLabels[enrollment.status] || enrollment.status}</span> : null}
          </div>

          {enrollment ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Classe" value={enrollment.class_year ? `${enrollment.class_year}ª superiore` : 'Da impostare'} />
              <Metric label="Esame" value={enrollment.exam_date ? formatDate(enrollment.exam_date) : 'Da impostare'} />
              <Metric label="Modalità" value={modeLabels[enrollment.mode] || (enrollment.mode ? enrollment.mode : 'Da calcolare')} />
              <Metric label="Argomenti programma" value={enrollment.required_topics ? String(enrollment.required_topics) : 'Da selezionare'} />
            </div>
          ) : null}

          {enrollment && totalSessions > 0 ? (
            <div className="mt-5 border-t border-ink/10 pt-5 dark:border-white/10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-ink/55 dark:text-white/55">Percorso generato</p>
                  <p className="mt-1 text-sm font-black text-ink dark:text-white">{completedSessions} di {totalSessions} sessioni completate</p>
                </div>
                <span className="text-sm font-black text-coral">{progress}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10">
                <div className="h-full rounded-full bg-coral" style={{ width: `${progress}%` }} />
              </div>
              {enrollment.next_session?.title ? (
                <p className="mt-3 text-sm font-semibold text-ink/65 dark:text-white/65">Prossimo: <strong className="text-ink dark:text-white">{enrollment.next_session.title}</strong></p>
              ) : null}
            </div>
          ) : null}

          {status.has_access && enrollment?.status === 'onboarding' ? (
            <div className="mt-5 flex items-start gap-3 border-l-4 border-coral bg-blush/55 p-4 text-sm font-semibold leading-6 text-ink dark:bg-coral/[0.07] dark:text-white/75">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
              L’accesso è pronto, ma lo studente deve ancora completare il test diagnostico/onboarding: classe, data dell’esame e argomenti del programma.
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            {!status.manual_access && !status.paid_access ? (
              <button
                type="button"
                disabled={saving || disabled}
                onClick={() => setManualAccess(true)}
                className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-coral px-5 py-2.5 text-sm font-black text-white transition hover:brightness-105 disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Attiva Recupero Debito
              </button>
            ) : null}

            {status.paid_access && !status.manual_access ? (
              <p className="self-center text-xs font-bold text-ink/60 dark:text-white/60">Accesso acquistato: non serve un grant manuale.</p>
            ) : null}

            {status.manual_access ? (
              <button
                type="button"
                disabled={saving || disabled}
                onClick={() => setManualAccess(false)}
                className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-300 px-5 py-2.5 text-sm font-black text-red-800 transition hover:bg-red-50 disabled:opacity-40 dark:border-red-300/30 dark:text-red-200 dark:hover:bg-red-300/10"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}
                Revoca accesso manuale
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
