import React, { useState } from 'react';
import { ArrowRight, BarChart3, CheckCircle2, MailCheck, Sparkles, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

const toneByKey = {
  foundations: 'from-coral/80 to-butter',
  listening: 'from-cyan-400 to-mint',
  response: 'from-violet-400 to-coral',
  retrieval: 'from-butter to-mint',
};

function DimensionCard({ dimension }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-white">{dimension.label}</p>
          <p className="mt-1 text-xs font-bold text-white/48">{dimension.level}</p>
        </div>
        <span className="text-xl font-black text-mint">{dimension.score}</span>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${toneByKey[dimension.key] || 'from-mint to-butter'}`}
          style={{ width: `${dimension.score}%` }}
        />
      </div>
    </article>
  );
}

export default function AssessmentProfileResult({
  result,
  name = '',
  token = '',
  emailStatus = '',
  onRequestFollowup,
  followupRequested = false,
}) {
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState('');

  if (!result) return null;

  async function handleFollowup() {
    if (!onRequestFollowup || followupRequested) return;
    setRequesting(true);
    setRequestError('');
    try {
      await onRequestFollowup(result.betaEligible ? 'beta_cohort' : result.recommendation.key);
    } catch (error) {
      setRequestError(error.message || 'Non è stato possibile registrare la richiesta.');
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-ink p-6 text-white shadow-2xl sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-butter/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-mint/12 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-mint">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              Il tuo profilo Sblocco
            </span>
            <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl">
              {name ? `${name}, ` : ''}{result.primaryTitle}
            </h1>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-white/72 sm:text-lg">
              {result.primarySummary}
            </p>
            {result.selectedSituations?.length ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {result.selectedSituations.map((item) => (
                  <span key={item} className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-black text-white/70">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {result.dimensions.map((dimension) => <DimensionCard key={dimension.key} dimension={dimension} />)}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-[1.75rem] border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-white/[0.05] sm:p-7">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint text-moss dark:bg-mint/15 dark:text-mint">
            <Target aria-hidden="true" className="h-6 w-6" />
          </span>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.12em] text-coral">La priorità</p>
          <h2 className="mt-3 text-2xl font-black leading-tight text-ink dark:text-white">Non allenare tutto insieme.</h2>
          <p className="mt-4 text-sm font-semibold leading-7 text-ink/65 dark:text-white/65">
            Il risultato più rapido arriva quando il percorso parte dal punto che assorbe più energia. Le altre aree restano presenti, ma non competono tutte per la stessa attenzione.
          </p>
          <div className="mt-5 rounded-2xl bg-linen/70 p-4 dark:bg-white/[0.05]">
            <BarChart3 aria-hidden="true" className="h-5 w-5 text-moss dark:text-mint" />
            <p className="mt-3 text-sm font-black text-ink dark:text-white">Il punteggio non è un voto.</p>
            <p className="mt-1 text-xs font-semibold leading-6 text-ink/58 dark:text-white/58">
              Mostra quanto una competenza appare disponibile nelle situazioni descritte. Non è una certificazione linguistica ufficiale.
            </p>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-[1.75rem] border border-moss/25 bg-mint/35 p-6 shadow-soft dark:border-mint/20 dark:bg-mint/[0.08] sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-butter/25 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-moss dark:text-mint">Percorso consigliato</p>
                <h2 className="mt-3 text-3xl font-black text-ink dark:text-white">{result.recommendation.name}</h2>
              </div>
              {result.betaEligible ? (
                <span className="rounded-full bg-coral px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] text-white">
                  Profilo adatto alla beta
                </span>
              ) : null}
            </div>
            <p className="mt-5 text-base font-semibold leading-8 text-ink/70 dark:text-white/70">{result.recommendation.reason}</p>
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-ink/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.05]">
              <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-moss dark:text-mint" />
              <p className="text-sm font-black text-ink dark:text-white">{result.recommendation.price}</p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={requesting || followupRequested || !onRequestFollowup}
                onClick={handleFollowup}
                className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-moss px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#096d58] disabled:cursor-default disabled:opacity-65"
              >
                {followupRequested ? 'Richiesta registrata' : requesting ? 'Registrazione...' : result.betaEligible ? 'Voglio essere ricontattato/a per la beta' : 'Voglio essere ricontattato/a'}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
              <Link
                to={result.recommendation.route}
                className="focus-ring inline-flex min-h-12 items-center justify-center rounded-full border border-ink/15 bg-white/75 px-6 py-3 text-sm font-black text-ink transition hover:bg-white dark:border-white/15 dark:bg-white/[0.06] dark:text-white"
              >
                {result.recommendation.cta}
              </Link>
            </div>
            {requestError ? <p className="mt-3 text-sm font-bold text-red-700 dark:text-red-300">{requestError}</p> : null}
          </div>
        </article>
      </section>

      {emailStatus ? (
        <section className={`flex items-start gap-3 rounded-2xl border p-4 ${emailStatus === 'sent' ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-300/20 dark:bg-emerald-400/[0.08] dark:text-emerald-100' : 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-300/20 dark:bg-amber-400/[0.08] dark:text-amber-100'}`}>
          <MailCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-black">{emailStatus === 'sent' ? 'Il profilo è stato inviato via email.' : 'Il profilo è salvo, ma l’email non è partita.'}</p>
            <p className="mt-1 text-xs font-semibold leading-5 opacity-75">
              {emailStatus === 'sent' ? 'Puoi riaprire il risultato dal link contenuto nel messaggio.' : token ? 'Puoi conservare questa pagina e riprovare l’invio più tardi.' : 'Il risultato resta comunque visibile qui.'}
            </p>
          </div>
        </section>
      ) : null}

      <p className="text-center text-xs font-semibold leading-5 text-ink/45 dark:text-white/45">{result.disclaimer}</p>
    </div>
  );
}
