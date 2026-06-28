import React from 'react';
import { Link } from 'react-router-dom';
import { buildDiagnosticProfile } from '../../engines/diagnosticEngine';
import { buildRecommendations } from '../../engines/recommendationEngine';
import { getTagInfo } from '../../content/registries/tagRegistry';
import ExerciseFeedback from './ExerciseFeedback';

const dimensionLabels = {
  skills: 'Skills',
  grammar: 'Grammar',
  errorPatterns: 'Error patterns',
  contexts: 'Contexts',
  production: 'Production',
};

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

      <div className="rounded-2xl border border-ink/10 bg-linen/70 p-5">
        <h4 className="text-lg font-black text-ink">Diagnostic evidence</h4>
        {profile.evidence.length ? (
          <div className="mt-4 grid gap-5">
            {Object.entries(profile.dimensions).map(([dimension, entries]) => entries.length ? (
              <section key={dimension}>
                <p className="text-xs font-black uppercase tracking-wide text-ink/60">
                  {dimensionLabels[dimension] || dimension}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {entries.map((entry) => {
                    const info = getTagInfo({
                      dimension,
                      tag: entry.tag,
                      level: exercise?.level,
                      track: exercise?.track,
                    });
                    return (
                      <article key={`${dimension}-${entry.tag}`} className="rounded-xl bg-white p-3 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-black text-ink">{info.label}</p>
                          <span className="rounded-full bg-coral/10 px-2 py-1 text-xs font-black text-coral">
                            {entry.severity} · {entry.evidenceCount}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-ink/65">{info.description}</p>
                        {!info.known ? <p className="mt-2 text-xs font-black text-ink/50">Raw tag: {entry.tag}</p> : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null)}
          </div>
        ) : (
          <p className="mt-3 text-sm font-semibold text-ink/65">No blocker evidence was recorded in this attempt.</p>
        )}
      </div>

      {recommendations.length ? (
        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <h4 className="text-lg font-black text-ink">What to do next</h4>
          <div className="mt-3 grid gap-3">
            {recommendations.map((recommendation) => (
              <article key={`${recommendation.dimension}-${recommendation.tag}`} className="rounded-xl bg-mint/35 p-4">
                <p className="font-black text-ink">{recommendation.title}</p>
                <p className="mt-1 text-sm text-ink/70">{recommendation.reason}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recommendation.actions.map((action) => action.path ? (
                    <Link key={`${recommendation.tag}-${action.label}`} to={action.path} className="focus-ring rounded-full bg-moss px-3 py-2 text-xs font-black text-white">
                      {action.label}
                    </Link>
                  ) : (
                    <span key={`${recommendation.tag}-${action.label}`} className="rounded-full bg-butter px-3 py-2 text-xs font-black text-ink">
                      {action.label}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

