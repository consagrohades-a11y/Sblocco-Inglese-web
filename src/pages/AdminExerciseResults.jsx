import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
import ExerciseDiagnosticSummary from '../components/exercises/ExerciseDiagnosticSummary.jsx';
import ExerciseQuestionRenderer from '../components/exercises/ExerciseQuestionRenderer.jsx';
import {
  loadExerciseAttemptDetail,
  loadExerciseAttemptResults,
  saveExerciseAttemptReview,
} from '../lib/exerciseResultsApi.js';

const statusLabels = {
  unreviewed: 'Da revisionare',
  reviewed: 'Revisionato',
  approved: 'Approvato',
};
const resultLabels = {
  correct: 'Corretta',
  nearly_correct: 'Quasi corretta',
  incorrect: 'Sbagliata',
  unanswered: 'Non risposta',
};
const fieldClass = 'rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:border-moss focus:ring-4 focus:ring-mint/30 dark:border-white/20 dark:bg-[#101a17] dark:text-white dark:focus:border-emerald-300 dark:focus:ring-emerald-400/15';

function formatDate(value) {
  if (!value) return 'Non disponibile';
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

function scoreClass(score) {
  const value = Number(score || 0);
  if (value >= 80) return 'text-emerald-700 dark:text-emerald-300';
  if (value >= 60) return 'text-amber-700 dark:text-amber-300';
  return 'text-red-700 dark:text-red-300';
}

function reviewBadge(status) {
  if (status === 'approved') return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200';
  if (status === 'reviewed') return 'bg-cyan-100 text-cyan-900 dark:bg-cyan-400/15 dark:text-cyan-200';
  return 'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200';
}

function buildReviewState(detail) {
  const result = {};
  (detail?.sections || []).forEach((section) => {
    (section.questions || []).forEach((question) => {
      const effective = question.result || {};
      result[question.id] = {
        attemptQuestionId: question.id,
        status: effective.status || 'unanswered',
        earnedPoints: Number(effective.earned_points || 0),
        comment: question.teacher_comment || '',
        clearOverride: false,
        dirty: false,
      };
    });
  });
  return result;
}

function QuestionReviewCard({ item, review, onChange }) {
  const automatic = item.automatic_result || item.result || {};
  const effective = item.result || {};
  const maximum = Number(effective.max_points ?? automatic.max_points ?? 0);
  const overridden = item.teacher_status_override !== null || item.teacher_points_override !== null;

  return (
    <article className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Domanda {item.sequence_index + 1}</p>
          <p className="mt-1 text-xs font-semibold text-ink/60 dark:text-white/60">Versione {String(item.question_version_id).slice(0, 8)}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full bg-linen px-3 py-1.5 text-ink/60 dark:bg-white/10 dark:text-white/60">Automatico: {resultLabels[automatic.status] || automatic.status}</span>
          {overridden ? <span className="rounded-full bg-violet-100 px-3 py-1.5 text-violet-800 dark:bg-violet-400/15 dark:text-violet-200">Override docente</span> : null}
        </div>
      </div>

      <div className="mt-5">
        <ExerciseQuestionRenderer
          item={{ ...item, result: effective }}
          answer={item.answer}
          onChange={() => {}}
          disabled
          showScore
          showCorrectAnswers
          showExplanations
        />
      </div>

      <div className="mt-5 grid gap-4 rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-300/20 dark:bg-violet-400/[0.06] sm:grid-cols-[12rem_9rem_minmax(0,1fr)]">
        <label className="text-xs font-black text-ink/60 dark:text-white/60">Esito docente
          <select
            value={review.clearOverride ? automatic.status || 'unanswered' : review.status}
            disabled={review.clearOverride}
            onChange={(event) => onChange({ status: event.target.value, clearOverride: false, dirty: true })}
            className={`${fieldClass} mt-2 w-full`}
          >
            {Object.entries(resultLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-xs font-black text-ink/60 dark:text-white/60">Punti, max {maximum}
          <input
            type="number"
            min="0"
            max={maximum}
            step="0.1"
            value={review.clearOverride ? Number(automatic.earned_points || 0) : review.earnedPoints}
            disabled={review.clearOverride}
            onChange={(event) => onChange({ earnedPoints: Number(event.target.value), clearOverride: false, dirty: true })}
            className={`${fieldClass} mt-2 w-full`}
          />
        </label>
        <label className="text-xs font-black text-ink/60 dark:text-white/60">Commento allo studente
          <textarea
            rows={2}
            value={review.clearOverride ? '' : review.comment}
            disabled={review.clearOverride}
            onChange={(event) => onChange({ comment: event.target.value, clearOverride: false, dirty: true })}
            className={`${fieldClass} mt-2 w-full`}
          />
        </label>
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs font-black text-ink/60 dark:text-white/60">
        <input
          type="checkbox"
          checked={review.clearOverride}
          onChange={(event) => onChange({ clearOverride: event.target.checked, dirty: true })}
        />
        Ripristina la correzione automatica
      </label>
    </article>
  );
}

export default function AdminExerciseResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [attempts, setAttempts] = useState([]);
  const [detail, setDetail] = useState(null);
  const [reviews, setReviews] = useState({});
  const [teacherNote, setTeacherNote] = useState('');
  const [reviewStatus, setReviewStatus] = useState('reviewed');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadList() {
    setLoading(true); setError('');
    try {
      const data = await loadExerciseAttemptResults();
      setAttempts(data);
      return data;
    } catch (loadError) {
      setError(loadError.message || 'Non è stato possibile caricare i risultati.');
      return [];
    } finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    async function initialise() {
      const list = await loadList();
      if (!active) return;
      const requestedId = searchParams.get('attemptId');
      const target = requestedId || list[0]?.id;
      if (target) await openAttempt(target);
    }
    initialise();
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openAttempt(attemptId) {
    setLoading(true); setError(''); setSuccess('');
    try {
      const data = await loadExerciseAttemptDetail(attemptId);
      if (!data) throw new Error('Tentativo non trovato.');
      setDetail(data);
      setReviews(buildReviewState(data));
      setTeacherNote(data.attempt?.teacher_note || '');
      setReviewStatus(data.attempt?.review_status === 'unreviewed' ? 'reviewed' : data.attempt?.review_status || 'reviewed');
      setSearchParams({ attemptId });
    } catch (loadError) { setError(loadError.message || 'Non è stato possibile aprire il tentativo.'); }
    finally { setLoading(false); }
  }

  const filteredAttempts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return attempts.filter((attempt) => {
      if (statusFilter !== 'all' && attempt.review_status !== statusFilter) return false;
      const score = Number(attempt.score || 0);
      if (scoreFilter === 'low' && score >= 60) return false;
      if (scoreFilter === 'medium' && (score < 60 || score >= 80)) return false;
      if (scoreFilter === 'high' && score < 80) return false;
      if (!term) return true;
      return [attempt.learner_name, attempt.exercise_title, attempt.exercise_public_id, attempt.assignment_title]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [attempts, search, statusFilter, scoreFilter]);

  function updateReview(questionId, patch) {
    setReviews((current) => ({ ...current, [questionId]: { ...current[questionId], ...patch } }));
  }

  async function saveReview() {
    if (!detail?.attempt?.id) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const dirtyReviews = Object.values(reviews).filter((review) => review.dirty);
      const updated = await saveExerciseAttemptReview({
        attemptId: detail.attempt.id,
        reviews: dirtyReviews,
        teacherNote,
        reviewStatus,
      });
      setDetail(updated);
      setReviews(buildReviewState(updated));
      setTeacherNote(updated.attempt?.teacher_note || '');
      setSuccess(`Revisione salvata. Nuovo punteggio: ${Math.round(Number(updated.attempt?.score || 0))}%.`);
      await loadList();
    } catch (saveError) { setError(saveError.message || 'Non è stato possibile salvare la revisione.'); }
    finally { setSaving(false); }
  }

  return (
    <><SEO title="Risultati esercizi | Exercise Builder" description="Revisiona tentativi, risposte e diagnostica Exercise Builder." /><section className="section-shell py-8 lg:py-10"><div className="mx-auto max-w-[1600px]">
      <header className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-[#16211e] sm:p-8"><span className="eyebrow">Exercise Builder</span><div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-black text-ink dark:text-white sm:text-4xl">Risultati esercizi</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/65">Confronta correzione automatica e revisione docente. Gli override aggiornano punteggio e diagnostica senza cancellare il risultato originale.</p></div><div className="flex flex-wrap gap-2"><Link to="/admin/content/exercises/composer" className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-black text-ink dark:border-white/20 dark:bg-white/10 dark:text-white">Exercise Composer</Link><Link to="/admin/learners" className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-black text-ink dark:border-white/20 dark:bg-white/10 dark:text-white">Studenti</Link></div></div></header>
      {error ? <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-950">{error}</div> : null}{success ? <div className="mt-5 border-l-4 border-moss bg-mint/30 p-4 text-sm font-bold text-ink dark:bg-emerald-400/10 dark:text-emerald-100">{success}</div> : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#16211e] xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto"><p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Tentativi</p><div className="mt-3 grid gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} className={fieldClass} placeholder="Studente, esercizio o attività" /><div className="grid grid-cols-2 gap-2"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={fieldClass}><option value="all">Tutte</option>{Object.entries(statusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><select value={scoreFilter} onChange={(event) => setScoreFilter(event.target.value)} className={fieldClass}><option value="all">Tutti i punteggi</option><option value="low">Sotto 60%</option><option value="medium">60–79%</option><option value="high">80%+</option></select></div></div><div className="mt-4 grid gap-2">{filteredAttempts.map((attempt) => <button key={attempt.id} type="button" onClick={() => openAttempt(attempt.id)} className={`rounded-xl border p-3 text-left transition ${detail?.attempt?.id === attempt.id ? 'border-moss bg-mint/25 dark:border-emerald-300/35 dark:bg-emerald-400/10' : 'border-ink/10 hover:bg-linen/40 dark:border-white/10 dark:hover:bg-white/[0.05]'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-ink dark:text-white">{attempt.learner_name}</p><p className="mt-1 line-clamp-2 text-xs font-bold text-ink/65 dark:text-white/65">{attempt.exercise_public_id} · {attempt.exercise_title}</p></div><p className={`text-lg font-black ${scoreClass(attempt.score)}`}>{Math.round(Number(attempt.score || 0))}%</p></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-black ${reviewBadge(attempt.review_status)}`}>{statusLabels[attempt.review_status]}</span><span className="text-[0.65rem] font-bold text-ink/60 dark:text-white/60">{formatDate(attempt.submitted_at || attempt.started_at)}</span></div>{Number(attempt.overridden_question_count || 0) > 0 ? <p className="mt-2 text-[0.65rem] font-black text-violet-700 dark:text-violet-300">{attempt.overridden_question_count} override docente</p> : null}</button>)}{!loading && !filteredAttempts.length ? <p className="py-6 text-sm text-ink/65 dark:text-white/65">Nessun tentativo corrispondente.</p> : null}</div></aside>

        <main className="min-w-0">
          {!detail ? <div className="rounded-2xl border border-dashed border-ink/15 bg-white p-8 text-sm text-ink/65 dark:border-white/15 dark:bg-[#16211e] dark:text-white/65">Seleziona un tentativo.</div> : <div className="grid gap-6">
            <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">{detail.exercise?.public_id} · tentativo {detail.attempt.attempt_number}</p><h2 className="mt-2 text-3xl font-black text-ink dark:text-white">{detail.exercise?.title}</h2><p className="mt-2 text-sm font-bold text-ink/65 dark:text-white/65">{detail.attempt.learner_name} · {detail.attempt.assignment_title || 'Nessuna attività collegata'} · {formatDate(detail.attempt.submitted_at)}</p></div><div className="text-right"><p className={`text-5xl font-black ${scoreClass(detail.attempt.score)}`}>{Math.round(Number(detail.attempt.score || 0))}%</p><p className="mt-1 text-xs font-bold text-ink/60 dark:text-white/60">{Number(detail.attempt.earned_points || 0).toFixed(1)} / {Number(detail.attempt.max_points || 0).toFixed(1)} punti</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs font-black text-ink/60 dark:text-white/60">Stato revisione<select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value)} className={`${fieldClass} mt-2 w-full`}>{Object.entries(statusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-black text-ink/60 dark:text-white/60 sm:col-span-2">Nota generale dell’insegnante<textarea rows={3} value={teacherNote} onChange={(event) => setTeacherNote(event.target.value)} className={`${fieldClass} mt-2 w-full`} /></label></div></section>

            <ExerciseDiagnosticSummary summary={detail.attempt.result_summary?.diagnostic_summary} admin />

            {(detail.sections || []).map((section) => <section key={section.id} className="grid gap-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">Sezione {section.sequence_index + 1}</p><h2 className="mt-1 text-2xl font-black text-ink dark:text-white">{section.title}</h2></div><p className="text-sm font-black text-ink/65 dark:text-white/65">{Number(section.earned_points || 0).toFixed(1)} / {Number(section.max_points || 0).toFixed(1)}</p></div>{(section.questions || []).map((item) => <QuestionReviewCard key={item.id} item={item} review={reviews[item.id]} onChange={(patch) => updateReview(item.id, patch)} />)}</section>)}

            <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-white/10 dark:bg-[#16211e]/95"><p className="text-xs font-bold text-ink/65 dark:text-white/65">{Object.values(reviews).filter((review) => review.dirty).length} domande modificate</p><button type="button" disabled={saving} onClick={saveReview} className="rounded-full bg-ink px-6 py-3 text-sm font-black text-white disabled:opacity-40 dark:bg-emerald-300 dark:text-[#102019]">{saving ? 'Salvataggio...' : 'Salva revisione e ricalcola'}</button></div>
          </div>}
        </main>
      </div>
    </div></section></>
  );
}
