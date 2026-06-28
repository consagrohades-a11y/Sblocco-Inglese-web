import React from 'react';
import { Link } from 'react-router-dom';
import { buildDiagnosticProfile } from '../../engines/diagnosticEngine';
import { buildRecommendations } from '../../engines/recommendationEngine';
import { getTagInfo } from '../../content/registries/tagRegistry';
import ExerciseFeedback from './ExerciseFeedback';

const dimensionLabels = {
  skills: 'Skill',
  grammar: 'Grammar',
  errorPatterns: 'Error pattern',
  contexts: 'Context',
  production: 'Production mode',
};

const dimensionDescriptions = {
  skills: 'Cosa devi riuscire a fare meglio.',
  grammar: 'Quale struttura grammaticale è coinvolta.',
  errorPatterns: 'Il tipo di errore che si ripete.',
  contexts: 'Dove questo errore può pesare davvero.',
  production: 'Quanto sei vicino all’uso attivo della lingua.',
};

const severityWeight = { low: 1, medium: 2, high: 3 };
const severityLabels = {
  low: 'Leggero',
  medium: 'Da controllare',
  high: 'Prioritario',
};

function getDimensionSummary(entries = []) {
  const evidenceTotal = entries.reduce((total, entry) => total + (entry.evidenceCount || 0), 0);
  const strongestSeverity = entries.reduce((current, entry) => (
    (severityWeight[entry.severity] || 0) > (severityWeight[current] || 0) ? entry.severity : current
  ), 'low');

  return {
    evidenceTotal,
    strongestSeverity,
  };
}

function EvidenceMap({ profile, exercise }) {
  const dimensions = Object.entries(profile.dimensions || {})
    .map(([dimension, entries]) => ({
      dimension,
      entries,
      ...getDimensionSummary(entries),
    }))
    .filter((item) => item.entries.length);

  const maxEvidence = Math.max(...dimensions.map((item) => item.evidenceTotal), 1);
  const topSignals = profile.evidence.slice(0, 5);

  if (!profile.evidence.length) {
    return (
      <div className="rounded-2xl border border-ink/10 bg-linen/70 p-5">
        <h4 className="text-lg font-black text-ink">Diagnostic evidence</h4>
        <p className="mt-3 text-sm font-semibold text-ink/65">No blocker evidence was recorded in this attempt.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-linen/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-ink/50">Diagnostic evidence</p>
          <h4 className="mt-1 text-lg font-black text-ink">Mappa dei segnali</h4>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-ink/65 shadow-sm">
          {profile.evidence.length} segnali
        </span>
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
        Questa non è una lista di colpe: è una mappa rapida di cosa controllare quando riprovi l’esercizio.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        {dimensions.map(({ dimension, evidenceTotal, strongestSeverity }) => {
          const width = `${Math.max(18, Math.round((evidenceTotal / maxEvidence) * 100))}%`;
          return (
            <article key={dimension} className="rounded-xl bg-white p-3 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-ink/45">{dimensionLabels[dimension] || dimension}</p>
              <p className="mt-2 text-2xl font-black text-ink">{evidenceTotal}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-ink/60">{dimensionDescriptions[dimension] || 'Segnale diagnostico.'}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-linen">
                <div className="h-full rounded-full bg-moss" style={{ width }} />
              </div>
              <p className="mt-2 text-[0.68rem] font-black uppercase tracking-wide text-coral">
                {severityLabels[strongestSeverity] || strongestSeverity}
              </p>
            </article>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl bg-white p-3 shadow-sm">
        <div className="grid gap-2 border-b border-ink/10 pb-2 text-xs font-black uppercase tracking-wide text-ink/45 sm:grid-cols-[0.75fr_1fr_0.65fr_1.7fr]">
          <span>Area</span>
          <span>Segnale</span>
          <span>Forza</span>
          <span>Cosa significa</span>
        </div>
        <div className="grid gap-2 pt-2">
          {topSignals.map((entry) => {
            const info = getTagInfo({
              dimension: entry.dimension,
              tag: entry.tag,
              level: exercise?.level,
              track: exercise?.track,
            });

            return (
              <article key={`${entry.dimension}-${entry.tag}`} className="grid gap-1 rounded-lg bg-paper p-3 text-sm sm:grid-cols-[0.75fr_1fr_0.65fr_1.7fr] sm:items-start">
                <p className="text-xs font-black uppercase tracking-wide text-moss">{dimensionLabels[entry.dimension] || entry.dimension}</p>
                <p className="font-black text-ink">{info.label}</p>
                <p className="text-xs font-black uppercase tracking-wide text-coral">
                  {severityLabels[entry.severity] || entry.severity} · {entry.evidenceCount}
                </p>
                <p className="text-xs leading-5 text-ink/65">{info.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ExerciseResult({ attempt, exercise }) {
  const profile = buildDiagnosticProfile([attempt]);
  const recommendations = buildRecommendations(profile);

  return (
    <div className="grid gap-5">
      <div className="rounded-2xl bg-ink p-5 text-white">
        <p className="text-sm font-black uppercase tracking-wide text-white/65">Exercise result</p>
        <p className="mt-2 text-3xl font-black">{attempt.correct}/{attempt.total} · {attempt.percent}%</p>
        <p className="mt-2 text-sm text-white/75">A wrong answer is evidence, not a final diagnosis.</p>
      </div>

      <div className="grid gap-3">
        <h4 className="text-lg font-black text-ink">Item feedback</h4>
        {attempt.items.map((item) => <ExerciseFeedback key={item.itemId} item={item} />)}
      </div>

      <EvidenceMap profile={profile} exercise={exercise} />

      {recommendations.length ? (
        <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
          <h4 className="text-lg font-black text-ink">What to do next</h4>
          <div className="mt-3 grid gap-3">
            {recommendations.slice(0, 4).map((recommendation) => (
              <article key={`${recommendation.dimension}-${recommendation.tag}`} className="rounded-xl bg-mint/35 p-4">
                <p className="font-black text-ink">{recommendation.title}</p>
                <p className="mt-1 text-sm text-ink/70">{recommendation.reason}</p>
                {recommendation.actions?.some((action) => action.path) ? (
                  <div className="mt-3 flex flex-wrap gap-2">
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
