import React from 'react';
import { Link } from 'react-router-dom';
import { buildDiagnosticProfile } from '../../engines/diagnosticEngine';
import { buildRecommendations } from '../../engines/recommendationEngine';
import { getTagInfo } from '../../content/registries/tagRegistry';

const dimensionLabels = {
  skills: 'Skill',
  grammar: 'Grammar',
  errorPatterns: 'Error pattern',
  contexts: 'Context',
  production: 'Production mode',
};

const severityWeight = { low: 1, medium: 2, high: 3 };
const severityLabels = {
  low: 'Leggero',
  medium: 'Da controllare',
  high: 'Prioritario',
};

const signalPriority = {
  errorPatterns: 1,
  grammar: 2,
  skills: 3,
  production: 4,
  contexts: 5,
};

function sortSignals(a, b) {
  return (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0)
    || (signalPriority[a.dimension] || 9) - (signalPriority[b.dimension] || 9)
    || (b.evidenceCount || 0) - (a.evidenceCount || 0);
}

function getResultMessage(percent) {
  if (percent >= 90) return 'Ottimo lavoro. Puoi continuare con il prossimo esercizio.';
  if (percent >= 70) return 'Buon lavoro. Hai qualche errore da rivedere, ma puoi continuare.';
  if (percent >= 50) return 'Meglio riprovare prima di continuare. Guarda il feedback sotto le domande e correggi gli errori principali.';
  return 'Ti conviene rivedere la spiegazione e riprovare. Il punto non è andare avanti velocemente, ma rendere automatiche le strutture base.';
}

function EvidenceSummary({ profile, exercise, attempt }) {
  const wrongCount = Math.max((attempt?.total || 0) - (attempt?.correct || 0), 0);
  const dimensions = Object.entries(profile.dimensions || {})
    .filter(([, entries]) => entries.length)
    .map(([dimension]) => dimension);
  const topSignals = [...(profile.evidence || [])]
    .sort(sortSignals)
    .slice(0, 3);

  if (!profile.evidence.length) {
    return (
      <div className="rounded-xl border border-ink/10 bg-linen/70 p-4">
        <h4 className="text-base font-black text-ink">Punto da rivedere</h4>
        <p className="mt-2 text-sm font-semibold text-ink/65">Non è emerso nessun errore ricorrente in questo tentativo.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ink/10 bg-linen/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-ink/50">Errori ricorrenti</p>
          <h4 className="mt-1 text-lg font-black text-ink">Cosa controllare nel prossimo tentativo</h4>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-ink/65 shadow-sm">
          {wrongCount} rispost{wrongCount === 1 ? 'a' : 'e'} da correggere
        </span>
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
        I segnali qui sotto non sono errori extra: sono etichette diagnostiche usate per capire cosa ripassare.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {dimensions.map((dimension) => (
          <span key={dimension} className="rounded-full bg-white px-3 py-1 text-xs font-black text-moss shadow-sm">
            {dimensionLabels[dimension] || dimension}
          </span>
        ))}
      </div>

      <div className="mt-4 grid gap-2">
        {topSignals.map((entry) => {
          const info = getTagInfo({
            dimension: entry.dimension,
            tag: entry.tag,
            level: exercise?.level,
            track: exercise?.track,
          });

          return (
            <article key={`${entry.dimension}-${entry.tag}`} className="grid gap-2 rounded-lg bg-white p-3 shadow-sm md:grid-cols-[0.8fr_1fr_2fr] md:items-start">
              <div>
                <p className="text-[0.68rem] font-black uppercase tracking-wide text-ink/45">Area</p>
                <p className="mt-1 text-xs font-black uppercase tracking-wide text-moss">{dimensionLabels[entry.dimension] || entry.dimension}</p>
              </div>
              <div>
                <p className="text-[0.68rem] font-black uppercase tracking-wide text-ink/45">Controlla</p>
                <p className="mt-1 text-sm font-black text-ink">{info.label}</p>
                <p className="mt-1 text-[0.68rem] font-black uppercase tracking-wide text-coral">{severityLabels[entry.severity] || entry.severity}</p>
              </div>
              <div>
                <p className="text-[0.68rem] font-black uppercase tracking-wide text-ink/45">Significato</p>
                <p className="mt-1 text-xs leading-5 text-ink/65">{info.description}</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function ExerciseResult({ attempt, exercise, isFinal = false }) {
  const profile = buildDiagnosticProfile([attempt]);
  const recommendations = buildRecommendations(profile);

  return (
    <div className="grid gap-4">
      <div className="rounded-xl bg-ink p-4 text-white">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-white/60">{isFinal ? "Resoconto finale, vediamo se c'è qualcosa da rivedere:" : 'Risultato dell’esercizio'}</p>
            <p className="mt-1 text-3xl font-black">{attempt.correct}/{attempt.total} · {attempt.percent}%</p>
          </div>
          <p className="max-w-xl text-xs leading-5 text-white/65">Gli errori indicano quali strutture rendere più automatiche.</p>
        </div>
      </div>

      <p className="rounded-xl border border-ink/10 bg-white p-4 text-sm font-semibold leading-6 text-ink/70 shadow-sm">{getResultMessage(attempt.percent)}</p>

      <EvidenceSummary profile={profile} exercise={exercise} attempt={attempt} />

      {recommendations.length ? (
        <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
          <h4 className="text-base font-black text-ink">Cosa fare adesso</h4>
          <div className="mt-3 grid gap-2">
            {recommendations.slice(0, 3).map((recommendation) => (
              <article key={`${recommendation.dimension}-${recommendation.tag}`} className="rounded-lg bg-mint/35 p-3">
                <p className="text-sm font-black text-ink">{recommendation.title}</p>
                <p className="mt-1 text-xs leading-5 text-ink/70">{recommendation.reason}</p>
                {recommendation.actions?.some((action) => action.path) ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {recommendation.actions.filter((action) => action.path).map((action) => (
                      <Link key={`${recommendation.tag}-${action.label}`} to={action.path} className="focus-ring rounded-full bg-moss px-3 py-2 text-xs font-black text-white">
                        {action.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
