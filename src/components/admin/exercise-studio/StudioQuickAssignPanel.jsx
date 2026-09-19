import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Search, X } from 'lucide-react';
import {
  listQuickAssignLearners,
  quickAssignStudioExercise,
} from '../../../lib/exerciseStudioAssignmentApi.js';

function toIso(localValue) {
  if (!localValue) return null;
  const date = new Date(localValue);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function StudioQuickAssignPanel({
  exerciseId,
  activityTitle,
  onClose,
  onAssigned,
}) {
  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLearnerId, setSelectedLearnerId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [required, setRequired] = useState(true);
  const [completionRule, setCompletionRule] = useState('passed');
  const [requiredScore, setRequiredScore] = useState(70);
  const [requiredAttempts, setRequiredAttempts] = useState(1);
  const [allowRetry, setAllowRetry] = useState(true);
  const [showScore, setShowScore] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [showExplanations, setShowExplanations] = useState(true);
  const [showDiagnosticSummary, setShowDiagnosticSummary] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    let active = true;
    listQuickAssignLearners()
      .then((items) => {
        if (!active) return;
        setLearners(items);
      })
      .catch((nextError) => {
        if (!active) return;
        setError(nextError.message || 'Could not load learners.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    if (!needle) return learners;
    return learners.filter((learner) => {
      const haystack = [
        learner.display_name,
        learner.email,
      ].filter(Boolean).join(' ').toLocaleLowerCase();
      return haystack.includes(needle);
    });
  }, [learners, search]);

  const selectedLearner = learners.find((learner) => learner.id === selectedLearnerId) || null;

  async function assign() {
    if (!selectedLearnerId || submitting) return;
    setSubmitting(true);
    setError('');
    setSuccess(null);

    try {
      const result = await quickAssignStudioExercise({
        learnerId: selectedLearnerId,
        exerciseId,
        assignmentTitle: activityTitle,
        deadlineAt: toIso(deadline),
        required,
        completionRule,
        requiredScore,
        requiredAttempts,
        allowRetry,
        showScore,
        showCorrectAnswers,
        showExplanations,
        showDiagnosticSummary,
      });

      const payload = { result, learner: selectedLearner };
      setSuccess(payload);
      onAssigned?.(payload);
    } catch (nextError) {
      setError(nextError.message || 'Could not assign this activity.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'focus-ring w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-semibold text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-ink/35 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Assign activity">
      <div className="flex h-full w-full max-w-xl flex-col border-l border-ink/10 bg-[#fbf8f1] shadow-2xl dark:border-white/10 dark:bg-surface-950">
        <header className="flex items-start justify-between gap-4 border-b border-ink/10 px-5 py-5 dark:border-white/10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">Quick assign</p>
            <h2 className="mt-1 text-2xl font-black text-ink dark:text-white">Assign published activity</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-ink/60 dark:text-white/60">{activityTitle}</p>
          </div>
          <button type="button" onClick={onClose} className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/10 bg-white text-ink/60 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/60" aria-label="Close assignment">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {success ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-300/20 dark:bg-emerald-300/10">
              <CheckCircle2 className="h-7 w-7 text-emerald-700 dark:text-emerald-300" />
              <h3 className="mt-3 text-lg font-black text-emerald-950 dark:text-emerald-100">Assigned</h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-emerald-900/75 dark:text-emerald-100/70">
                {activityTitle} is now published in {success.learner?.display_name || success.learner?.email || 'the learner'}'s assignments.
              </p>
              <a
                href={`/admin/learners/${success.learner?.id}/assignments/${success.result?.assignment_id}`}
                className="focus-ring mt-4 inline-flex rounded-full bg-emerald-700 px-4 py-2.5 text-xs font-black text-white dark:bg-emerald-300 dark:text-surface-950"
              >
                Open assignment
              </a>
            </div>
          ) : (
            <>
              <section>
                <label className="text-xs font-black uppercase tracking-[0.1em] text-ink/55 dark:text-white/55">Learner</label>
                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35 dark:text-white/35" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name or email"
                    className={`${inputClass} pl-9`}
                  />
                </div>

                <div className="mt-3 max-h-72 overflow-y-auto rounded-2xl border border-ink/10 bg-white dark:border-white/10 dark:bg-white/[0.03]">
                  {loading ? (
                    <div className="flex items-center gap-2 p-4 text-sm font-bold text-ink/55 dark:text-white/55"><Loader2 className="h-4 w-4 animate-spin" /> Loading learners</div>
                  ) : null}

                  {!loading && filtered.length === 0 ? (
                    <p className="p-4 text-sm font-semibold text-ink/55 dark:text-white/55">No matching learners.</p>
                  ) : null}

                  {!loading ? filtered.map((learner) => {
                    const active = learner.id === selectedLearnerId;
                    return (
                      <button
                        key={learner.id}
                        type="button"
                        onClick={() => setSelectedLearnerId(learner.id)}
                        className={`focus-ring flex w-full items-center justify-between gap-3 border-b border-ink/5 px-4 py-3 text-left last:border-b-0 dark:border-white/5 ${active ? 'bg-orange-50 dark:bg-orange-300/[0.07]' : 'hover:bg-linen/50 dark:hover:bg-white/[0.04]'}`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black text-ink dark:text-white">{learner.display_name || learner.email || 'Learner'}</span>
                          {learner.email && learner.display_name ? <span className="mt-0.5 block truncate text-xs font-semibold text-ink/45 dark:text-white/45">{learner.email}</span> : null}
                        </span>
                        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${active ? 'border-orange-500 bg-orange-500 text-white' : 'border-ink/15 dark:border-white/15'}`}>
                          {active ? '✓' : ''}
                        </span>
                      </button>
                    );
                  }) : null}
                </div>
              </section>

              <section className="mt-5 grid gap-4 rounded-2xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.08em] text-ink/55 dark:text-white/55">
                  Deadline
                  <input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} className={inputClass} />
                  <span className="normal-case tracking-normal font-semibold text-ink/40 dark:text-white/40">Optional.</span>
                </label>

                <label className="flex items-center gap-3 text-sm font-black text-ink dark:text-white">
                  <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />
                  Required activity
                </label>
              </section>

              <details className="mt-5 rounded-2xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.1em] text-ink/55 dark:text-white/55">Advanced assignment settings</summary>
                <div className="mt-4 grid gap-4">
                  <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.08em] text-ink/55 dark:text-white/55">
                    Completion
                    <select value={completionRule} onChange={(event) => setCompletionRule(event.target.value)} className={inputClass}>
                      <option value="passed">Minimum score</option>
                      <option value="submitted">First submission</option>
                      <option value="attempts">Number of attempts</option>
                    </select>
                  </label>

                  {completionRule === 'attempts' ? (
                    <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.08em] text-ink/55 dark:text-white/55">
                      Required attempts
                      <input type="number" min="1" value={requiredAttempts} onChange={(event) => setRequiredAttempts(Math.max(1, Number(event.target.value) || 1))} className={inputClass} />
                    </label>
                  ) : (
                    <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.08em] text-ink/55 dark:text-white/55">
                      Minimum score
                      <input type="number" min="0" max="100" value={requiredScore} onChange={(event) => setRequiredScore(Math.max(0, Math.min(100, Number(event.target.value) || 0)))} className={inputClass} />
                    </label>
                  )}

                  <label className="flex items-center gap-3 text-sm font-black text-ink dark:text-white">
                    <input type="checkbox" checked={allowRetry} onChange={(event) => setAllowRetry(event.target.checked)} />
                    Allow retry
                  </label>

                  <div className="grid gap-2 text-sm font-bold text-ink/65 dark:text-white/65">
                    <label className="flex items-center gap-3"><input type="checkbox" checked={showScore} onChange={(event) => setShowScore(event.target.checked)} /> Show score</label>
                    <label className="flex items-center gap-3"><input type="checkbox" checked={showCorrectAnswers} onChange={(event) => setShowCorrectAnswers(event.target.checked)} /> Show correct answers</label>
                    <label className="flex items-center gap-3"><input type="checkbox" checked={showExplanations} onChange={(event) => setShowExplanations(event.target.checked)} /> Show explanations</label>
                    <label className="flex items-center gap-3"><input type="checkbox" checked={showDiagnosticSummary} onChange={(event) => setShowDiagnosticSummary(event.target.checked)} /> Show diagnostic summary</label>
                  </div>
                </div>
              </details>

              {error ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-900 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100">{error}</div>
              ) : null}
            </>
          )}
        </div>

        <footer className="border-t border-ink/10 bg-white px-5 py-4 dark:border-white/10 dark:bg-surface-900">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-ink/45 dark:text-white/45">
              The currently published immutable version is pinned automatically.
            </p>
            {!success ? (
              <button
                type="button"
                onClick={assign}
                disabled={!selectedLearnerId || submitting}
                className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-black text-white disabled:opacity-30 dark:bg-orange-400 dark:text-surface-950"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {submitting ? 'Assigning' : 'Assign'}
              </button>
            ) : (
              <button type="button" onClick={onClose} className="focus-ring rounded-full border border-ink/10 px-4 py-2.5 text-xs font-black text-ink dark:border-white/10 dark:text-white">Done</button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
