import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Search, X } from 'lucide-react';
import {
  listQuickAssignGroups,
  listQuickAssignLearners,
  quickAssignStudioExercise,
  quickAssignStudioExerciseGroup,
} from '../../../lib/exerciseStudioAssignmentApi.js';
import StudioSelect from './StudioSelect.jsx';
import LearnerQuickFacts from '../LearnerQuickFacts.jsx';

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
  const [mode, setMode] = useState('learner');
  const [learners, setLearners] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLearnerId, setSelectedLearnerId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
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
    Promise.all([listQuickAssignLearners(), listQuickAssignGroups()])
      .then(([learnerItems, groupItems]) => {
        if (!active) return;
        setLearners(learnerItems);
        setGroups(groupItems);
      })
      .catch((nextError) => {
        if (!active) return;
        setError(nextError.message || 'Could not load assignment targets.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredLearners = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    if (!needle) return learners;
    return learners.filter((learner) => [learner.display_name, learner.email, learner.profession, learner.age, learner.admin_context_note]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase()
      .includes(needle));
  }, [learners, search]);

  const filteredGroups = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    if (!needle) return groups;
    return groups.filter((group) => [group.name, group.description]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase()
      .includes(needle));
  }, [groups, search]);

  const selectedLearner = learners.find((learner) => learner.id === selectedLearnerId) || null;
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) || null;
  const hasTarget = mode === 'group' ? Boolean(selectedGroupId) : Boolean(selectedLearnerId);

  function commonPayload() {
    return {
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
    };
  }

  async function assign() {
    if (!hasTarget || submitting) return;
    setSubmitting(true);
    setError('');
    setSuccess(null);

    try {
      if (mode === 'group') {
        const result = await quickAssignStudioExerciseGroup({
          ...commonPayload(),
          groupId: selectedGroupId,
        });
        const payload = { result, group: selectedGroup, mode: 'group' };
        setSuccess(payload);
        onAssigned?.(payload);
      } else {
        const result = await quickAssignStudioExercise({
          ...commonPayload(),
          learnerId: selectedLearnerId,
        });
        const payload = { result, learner: selectedLearner, mode: 'learner' };
        setSuccess(payload);
        onAssigned?.(payload);
      }
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
                {success.mode === 'group'
                  ? `${activityTitle} was assigned to ${success.result?.assignment_count || 0} learners in ${success.group?.name || 'the group'}.`
                  : `${activityTitle} is now in ${success.learner?.display_name || success.learner?.email || 'the learner'}'s assignments.`}
              </p>
              {success.mode === 'learner' ? (
                <a
                  href={`/admin/learners/${success.learner?.id}/assignments/${success.result?.assignment_id}`}
                  className="focus-ring mt-4 inline-flex rounded-full bg-emerald-700 px-4 py-2.5 text-xs font-black text-white dark:bg-emerald-300 dark:text-surface-950"
                >
                  Open assignment
                </a>
              ) : null}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1 rounded-full bg-linen p-1 dark:bg-white/[0.05]">
                {[
                  ['learner', 'Learner'],
                  ['group', 'Group'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setMode(value);
                      setSearch('');
                      setError('');
                    }}
                    className={`focus-ring rounded-full px-4 py-2 text-xs font-black transition ${
                      mode === value
                        ? 'bg-white text-ink shadow-sm dark:bg-orange-400 dark:text-surface-950'
                        : 'text-ink/50 dark:text-white/50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <section className="mt-5">
                <label className="text-xs font-black uppercase tracking-[0.1em] text-ink/55 dark:text-white/55">
                  {mode === 'group' ? 'Group' : 'Learner'}
                </label>
                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35 dark:text-white/35" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={mode === 'group' ? 'Search group' : 'Search name or email'}
                    className={`${inputClass} pl-9`}
                  />
                </div>

                <div className="mt-3 max-h-72 overflow-y-auto rounded-2xl border border-ink/10 bg-white dark:border-white/10 dark:bg-white/[0.03]">
                  {loading ? (
                    <div className="flex items-center gap-2 p-4 text-sm font-bold text-ink/55 dark:text-white/55"><Loader2 className="h-4 w-4 animate-spin" /> Loading</div>
                  ) : null}

                  {!loading && mode === 'learner' && filteredLearners.length === 0 ? (
                    <p className="p-4 text-sm font-semibold text-ink/55 dark:text-white/55">No matching learners.</p>
                  ) : null}

                  {!loading && mode === 'group' && filteredGroups.length === 0 ? (
                    <p className="p-4 text-sm font-semibold text-ink/55 dark:text-white/55">No active groups with learners.</p>
                  ) : null}

                  {!loading && mode === 'learner' ? filteredLearners.map((learner) => {
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
                          <span className="mt-0.5 block line-clamp-2 text-xs font-bold leading-5 text-ink/55 dark:text-white/55"><LearnerQuickFacts learner={learner} /></span>
                          {learner.email && learner.display_name ? <span className="mt-0.5 block truncate text-xs font-semibold text-ink/45 dark:text-white/45">{learner.email}</span> : null}
                        </span>
                        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${active ? 'border-orange-500 bg-orange-500 text-white' : 'border-ink/15 dark:border-white/15'}`}>{active ? '✓' : ''}</span>
                      </button>
                    );
                  }) : null}

                  {!loading && mode === 'group' ? filteredGroups.map((group) => {
                    const active = group.id === selectedGroupId;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setSelectedGroupId(group.id)}
                        className={`focus-ring flex w-full items-center justify-between gap-3 border-b border-ink/5 px-4 py-3 text-left last:border-b-0 dark:border-white/5 ${active ? 'bg-orange-50 dark:bg-orange-300/[0.07]' : 'hover:bg-linen/50 dark:hover:bg-white/[0.04]'}`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black text-ink dark:text-white">{group.name}</span>
                          <span className="mt-0.5 block text-xs font-semibold text-ink/45 dark:text-white/45">{group.active_member_count} active learner{Number(group.active_member_count) === 1 ? '' : 's'}</span>
                        </span>
                        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${active ? 'border-orange-500 bg-orange-500 text-white' : 'border-ink/15 dark:border-white/15'}`}>{active ? '✓' : ''}</span>
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
                  <div className="grid min-w-0 gap-1.5 text-xs font-black uppercase tracking-[0.08em] text-ink/55 dark:text-white/55">
                    <span>Completion</span>
                    <StudioSelect
                      value={completionRule}
                      onChange={setCompletionRule}
                      options={[
                        ['passed', 'Minimum score'],
                        ['submitted', 'First submission'],
                        ['attempts', 'Number of attempts'],
                      ]}
                      ariaLabel="Assignment completion rule"
                    />
                  </div>

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

              {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-900 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100">{error}</div> : null}
            </>
          )}
        </div>

        <footer className="border-t border-ink/10 bg-white px-5 py-4 dark:border-white/10 dark:bg-surface-900">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-ink/45 dark:text-white/45">The currently published immutable version is pinned automatically.</p>
            {!success ? (
              <button
                type="button"
                onClick={assign}
                disabled={!hasTarget || submitting}
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
