import React from 'react';
import { Link } from 'react-router-dom';
import { buildRecommendations } from '../../engines/recommendationEngine';
import { getTagInfo } from '../../content/registries/tagRegistry';

export default function DiagnosticResult({ result }) {
  if (!result) {
    return (
      <div className="rounded-2xl border border-ink/10 bg-white p-5 text-sm font-semibold text-ink/65">
        Complete an exercise section to start building your diagnostic profile.
      </div>
    );
  }

  const evidence = result.evidence || [];
  const blockers = result.blockers?.length ? result.blockers : evidence;
  const recommendations = result.recommendations || buildRecommendations(result);

  return (
    <section className="rounded-[2rem] bg-ink p-6 text-white">
      <p className="text-xs font-black uppercase tracking-wider text-white/60">Current diagnostic signal</p>
      <h2 className="mt-2 text-2xl font-black">{result.estimatedLevel || 'More evidence needed'}</h2>
      <p className="mt-2 text-sm leading-6 text-white/70">
        Based on {result.attemptCount || 0} completed exercise section{result.attemptCount === 1 ? '' : 's'}. A single mistake is evidence, not a final diagnosis.
      </p>

      <div className="mt-5 grid gap-3">
        <h3 className="font-black">Blockers and evidence</h3>
        {blockers.length ? blockers.map((entry) => {
          const info = getTagInfo({ dimension: entry.dimension, tag: entry.tag, level: 'a1', track: 'hospitality' });
          return (
            <article key={`${entry.dimension}-${entry.tag}`} className="rounded-xl bg-white/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-black">{info.label}</p>
                <span className="rounded-full bg-white/10 px-2 py-1 text-xs font-black">
                  {entry.severity} · {entry.evidenceCount} evidence
                </span>
              </div>
              <p className="mt-1 text-sm text-white/70">{info.description}</p>
              {entry.contexts?.length ? <p className="mt-2 text-xs text-white/55">Contexts: {entry.contexts.join(', ')}</p> : null}
            </article>
          );
        }) : (
          <p className="rounded-xl bg-white/10 p-4 text-sm text-white/70">No blocker evidence has appeared in the completed sections.</p>
        )}
      </div>

      {recommendations.length ? (
        <div className="mt-5 grid gap-3">
          <h3 className="font-black">Recommended next steps</h3>
          {recommendations.slice(0, 5).map((recommendation) => (
            <article key={`${recommendation.dimension}-${recommendation.tag}`} className="rounded-xl bg-white p-4 text-ink">
              <p className="font-black">{recommendation.title}</p>
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
      ) : null}
    </section>
  );
}

