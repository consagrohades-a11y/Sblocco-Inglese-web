import React from 'react';
import { Link } from 'react-router-dom';
import { buildRecommendations } from '../../engines/recommendationEngine';
import { getTagInfo } from '../../content/registries/tagRegistry';

export default function DiagnosticResult({ result, level = 'a1', track = 'core' }) {
  if (!result) {
    return (
      <div className="rounded-2xl border border-ink/10 bg-white p-4 text-sm font-semibold text-ink/65">
        Complete an exercise section to start building your diagnostic profile.
      </div>
    );
  }

  const evidence = result.evidence || [];
  const blockers = result.blockers?.length ? result.blockers : evidence;
  const recommendations = result.recommendations || buildRecommendations(result);

  return (
    <section className="rounded-[1.5rem] bg-ink p-4 text-white sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-bold uppercase tracking-wider text-white/65">Diagnostic signal</p>
          <h2 className="mt-1 text-xl font-black sm:text-2xl">{result.estimatedLevel || 'More evidence needed'}</h2>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/70">
          {result.attemptCount || 0} section{result.attemptCount === 1 ? '' : 's'}
        </span>
      </div>
      <p className="mt-2 max-w-3xl text-xs leading-5 text-white/60 sm:text-sm">
        These signals help you decide what to check before the next attempt.
      </p>

      <div className="mt-4 grid gap-2">
        <h3 className="text-sm font-black">Blockers and evidence</h3>
        {blockers.length ? blockers.slice(0, 5).map((entry) => {
          const info = getTagInfo({ dimension: entry.dimension, tag: entry.tag, level, track });
          return (
            <article key={`${entry.dimension}-${entry.tag}`} className="rounded-xl bg-white/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black">{info.label}</p>
                <span className="rounded-full bg-white/10 px-2 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-white/65">
                  {entry.severity} · {entry.evidenceCount}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-white/65">{info.description}</p>
              {entry.contexts?.length ? <p className="mt-1 text-[0.68rem] text-white/60">Contexts: {entry.contexts.join(', ')}</p> : null}
            </article>
          );
        }) : (
          <p className="rounded-xl bg-white/10 p-3 text-xs text-white/65">No recurring evidence has appeared in the completed sections.</p>
        )}
      </div>

      {recommendations.length ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-sm font-black">Recommended next steps</h3>
          {recommendations.slice(0, 4).map((recommendation) => (
            <article key={`${recommendation.dimension}-${recommendation.tag}`} className="rounded-xl bg-white p-3 text-ink">
              <p className="text-sm font-black">{recommendation.title}</p>
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
      ) : null}
    </section>
  );
}
