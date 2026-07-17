import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, Clock3, Headphones, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
import ExerciseQuestionRenderer from '../components/exercises/ExerciseQuestionRenderer.jsx';
import {
  loadExerciseAttemptDetail,
  loadExerciseAttemptResults,
  saveExerciseAttemptReview,
} from '../lib/exerciseResultsApi.js';

const resultLabels = {
  pending_review: 'Da valutare',
  correct: 'Corretta',
  nearly_correct: 'Quasi corretta',
  incorrect: 'Da rivedere',
  unanswered: 'Non risposta',
};
const reviewLabels = {
  unreviewed: 'Da revisionare',
  reviewed: 'Revisionato',
  approved: 'Valutazione pubblicata',
};
const fieldClass = 'w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:border-moss focus:ring-4 focus:ring-mint/30 dark:border-white/20 dark:bg-[#101a17] dark:text-white dark:focus:border-emerald-300 dark:focus:ring-emerald-400/15';

function formatDate(value) {
  if (!value) return 'Non disponibile';
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

function manualType(type) {
  return ['written_response', 'dialogue_roleplay', 'audio_response'].includes(type);
}

function buildReviewState(detail) {
  const result = {};
  (detail?.sections || []).forEach((section) => {
    (section.questions || []).forEach((question) => {
      const effective = question.result || {};
      const pending = effective.status === 'pending_review';
      result[question.id] = {
        attemptQuestionId: question.id,
        status: pending ? '' : effective.status || 'unanswered',
        earnedPoints: pending ? '' : Number(effective.earned_points || 0),
        comment: question.teacher_comment || '',
        turnReviews: question.teacher_turn_reviews || {},
        clearOverride: false,
        dirty: false,
      };
    });
  });
  return result;
}

function TurnReviewsEditor({ item, review, onChange }) {
  const roleKey = item.answer?.role_key;
  const turns = (item.question?.content?.turns || []).filter((turn) => turn.speaker === roleKey && turn.learner_response !== false);
  if (!turns.length) return null;
  function update(turnKey, patch) {
    onChange({
      turnReviews: {
        ...(review.turnReviews || {}),
        [turnKey]: { ...(review.turnReviews?.[turnKey] || {}), ...patch },
      },
      dirty: true,
    });
  }
  return <div className="mt-5 grid gap-3 rounded-xl border border-cyan-200 bg-cyan-50/45 p-4 dark:border-cyan-300/20 dark:bg-cyan-400/[0.05]">
    <p className="text-xs font-black uppercase tracking-wide text-cyan-800 dark:text-cyan-200">Feedback per singolo turno</p>
    {turns.map((turn, index) => {
      const value = review.turnReviews?.[turn.key] || {};
      return <div key={turn.key} className="grid gap-3 rounded-lg border border-cyan-200 bg-white/80 p-3 dark:border-cyan-300/15 dark:bg-white/[0.04] lg:grid-cols-[9rem_7rem_7rem_minmax(0,1fr)]">
        <label className="text-xs font-black">Turno {index + 1}<select value={value.status || ''} onChange={(event) => update(turn.key, { status: event.target.value })} className={`${fieldClass} mt-2`}><option value="">Non classificato</option><option value="correct">Efficace</option><option value="nearly_correct">Quasi efficace</option><option value="incorrect">Da rivedere</option></select></label>
        <label className="text-xs font-black">Punti<input type="number" min="0" step="0.1" value={value.score ?? ''} onChange={(event) => update(turn.key, { score: event.target.value === '' ? null : Number(event.target.value) })} className={`${fieldClass} mt-2`} /></label>
        <label className="text-xs font-black">Massimo<input type="number" min="0" step="0.1" value={value.max_score ?? ''} onChange={(event) => update(turn.key, { max_score: event.target.value === '' ? null : Number(event.target.value) })} className={`${fieldClass} mt-2`} /></label>
        <label className="text-xs font-black">Commento<textarea rows={2} value={value.comment || ''} onChange={(event) => update(turn.key, { comment: event.target.value })} className={`${fieldClass} mt-2`} /></label>
      </div>;
    })}
  </div>;
}

function ReviewCard({ item, review, onChange }) {
  const automatic = item.automatic_result || item.result || {};
  const maximum = Number(automatic.max_points ?? item.result?.max_points ?? 0);
  const pending = automatic.status === 'pending_review';
  const type = item.question?.type;
  const rubric = item.question?.content?.rubric || [];

  function setStatus(status) {
    const points = status === 'correct' ? maximum : status === 'nearly_correct' ? maximum * 0.5 : 0;
    onChange({ status, earnedPoints: Number(points.toFixed(2)), clearOverride: false, dirty: true });
  }

  return (
    <article className={`rounded-2xl border p-5 shadow-sm dark:bg-[#16211e] sm:p-6 ${pending ? 'border-violet-300 bg-violet-50/40 dark:border-violet-300/25' : 'border-ink/10 bg-white dark:border-white/10'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Domanda {item.sequence_index + 1}</p>
          <p className="mt-1 text-xs font-semibold text-ink/60 dark:text-white/60">{type} · massimo {maximum} punti</p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${pending ? 'bg-violet-100 text-violet-800 dark:bg-violet-300/10 dark:text-violet-200' : 'bg-linen text-ink/60 dark:bg-white/10 dark:text-white/60'}`}>
          {pending ? type === 'audio_response' ? <Headphones className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {resultLabels[automatic.status] || automatic.status}
        </span>
      </div>

      <div className="mt-5">
        <ExerciseQuestionRenderer
          item={{ ...item, result: null }}
          answer={item.answer}
          onChange={() => {}}
          disabled
          attemptId={item.attempt_id}
        />
      </div>

      {type === 'dialogue_roleplay' && item.question?.content?.response_mode === 'audio_per_turn' ? <TurnReviewsEditor item={item} review={review} onChange={onChange} /> : null}

      {manualType(type) && rubric.length ? (
        <div className="mt-5 rounded-xl border border-violet-200 bg-violet-50/55 p-4 dark:border-violet-300/20 dark:bg-violet-400/[0.06]">
          <p className="text-xs font-black uppercase tracking-wide text-violet-800 dark:text-violet-200">Criteri suggeriti</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {rubric.map((criterion) => (
              <div key={criterion.key} className="rounded-lg bg-white/75 p-3 dark:bg-white/[0.05]">
                <div className="flex justify-between gap-3"><p className="text-sm font-black text-ink dark:text-white">{criterion.label}</p><span className="text-xs font-black text-violet-700 dark:text-violet-200">{criterion.max_points} pt</span></div>
                {criterion.description ? <p className="mt-1 text-xs font-semibold leading-5 text-ink/65 dark:text-white/65">{criterion.description}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 rounded-xl border border-ink/10 bg-linen/30 p-4 dark:border-white/10 dark:bg-white/[0.035] lg:grid-cols-[13rem_10rem_minmax(0,1fr)]">
        <label className="text-xs font-black text-ink/60 dark:text-white/60">Esito docente
          <select value={review.status} onChange={(event) => setStatus(event.target.value)} className={`${fieldClass} mt-2`}>
            <option value="">Scegli la valutazione</option>
            <option value="correct">Corretta / pienamente riuscita</option>
            <option value="nearly_correct">Parzialmente riuscita</option>
            <option value="incorrect">Da rivedere</option>
            <option value="unanswered">Non valutabile</option>
          </select>
        </label>
        <label className="text-xs font-black text-ink/60 dark:text-white/60">Punti, max {maximum}
          <input type="number" min="0" max={maximum} step="0.1" value={review.earnedPoints} onChange={(event) => onChange({ earnedPoints: event.target.value === '' ? '' : Number(event.target.value), dirty: true })} className={`${fieldClass} mt-2`} />
        </label>
        <label className="text-xs font-black text-ink/60 dark:text-white/60">Commento visibile allo studente
          <textarea rows={3} value={review.comment} onChange={(event) => onChange({ comment: event.target.value, dirty: true })} className={`${fieldClass} mt-2`} placeholder="Spiega cosa funziona e cosa migliorare." />
        </label>
      </div>

      {!pending ? (
        <label className="mt-3 flex items-center gap-2 text-xs font-black text-ink/65 dark:text-white/65">
          <input type="checkbox" checked={review.clearOverride} onChange={(event) => onChange({ clearOverride: event.target.checked, dirty: true })} />
          Ripristina la correzione automatica
        </label>
      ) : null}
    </article>
  );
}

export default function AdminExerciseResultsV2() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [attempts, setAttempts] = useState([]);
  const [detail, setDetail] = useState(null);
  const [reviews, setReviews] = useState({});
  const [teacherNote, setTeacherNote] = useState('');
  const [reviewStatus, setReviewStatus] = useState('reviewed');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('unreviewed');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadList() {
    setLoading(true); setError('');
    try { const data = await loadExerciseAttemptResults(); setAttempts(data); return data; }
    catch (loadError) { setError(loadError.message || 'Non è stato possibile caricare i risultati.'); return []; }
    finally { setLoading(false); }
  }

  async function openAttempt(attemptId) {
    setLoading(true); setError(''); setSuccess('');
    try {
      const data = await loadExerciseAttemptDetail(attemptId);
      if (!data) throw new Error('Tentativo non trovato.');
      const withAttemptIds = {
        ...data,
        sections: (data.sections || []).map((section) => ({
          ...section,
          questions: (section.questions || []).map((question) => ({ ...question, attempt_id: data.attempt?.id })),
        })),
      };
      setDetail(withAttemptIds);
      setReviews(buildReviewState(withAttemptIds));
      setTeacherNote(data.attempt?.teacher_note || '');
      setReviewStatus(data.attempt?.review_status === 'approved' ? 'approved' : 'reviewed');
      setSearchParams({ attemptId });
    } catch (loadError) { setError(loadError.message || 'Non è stato possibile aprire il tentativo.'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const list = await loadList();
      if (!active) return;
      const requested = searchParams.get('attemptId');
      const target = requested || list.find((item) => item.review_status === 'unreviewed')?.id || list[0]?.id;
      if (target) await openAttempt(target);
    })();
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return attempts.filter((attempt) => {
      if (statusFilter !== 'all' && attempt.review_status !== statusFilter) return false;
      return !term || [attempt.learner_name, attempt.exercise_title, attempt.exercise_public_id, attempt.assignment_title].filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
    });
  }, [attempts, search, statusFilter]);

  const pendingQuestionIds = useMemo(() => (detail?.sections || []).flatMap((section) => section.questions || []).filter((item) => item.result?.status === 'pending_review').map((item) => item.id), [detail]);
  const unresolvedPending = pendingQuestionIds.filter((id) => !reviews[id]?.dirty && reviews[id]?.status === '').length;

  function updateReview(id, patch) {
    setReviews((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  async function saveReview() {
    if (!detail?.attempt?.id) return;
    if (reviewStatus === 'approved' && unresolvedPending > 0) {
      setError(`Valuta prima tutte le produzioni manuali. Ne mancano ${unresolvedPending}.`);
      return;
    }
    const invalid = Object.values(reviews).find((review) => review.dirty && !review.clearOverride && (!review.status || review.earnedPoints === ''));
    if (invalid) { setError('Ogni risposta modificata richiede esito e punti.'); return; }

    setSaving(true); setError(''); setSuccess('');
    try {
      const updated = await saveExerciseAttemptReview({
        attemptId: detail.attempt.id,
        reviews: Object.values(reviews).filter((review) => review.dirty),
        teacherNote,
        reviewStatus,
      });
      const withAttemptIds = {
        ...updated,
        sections: (updated.sections || []).map((section) => ({ ...section, questions: (section.questions || []).map((question) => ({ ...question, attempt_id: updated.attempt?.id })) })),
      };
      setDetail(withAttemptIds);
      setReviews(buildReviewState(withAttemptIds));
      setTeacherNote(updated.attempt?.teacher_note || '');
      setSuccess(reviewStatus === 'approved' ? 'Valutazione pubblicata allo studente.' : 'Revisione salvata. Puoi completarla più tardi.');
      await loadList();
    } catch (saveError) { setError(saveError.message || 'Non è stato possibile salvare la revisione.'); }
    finally { setSaving(false); }
  }

  return (
    <>
      <SEO title="Valutazioni esercizi | Admin" description="Ascolta, leggi e valuta le produzioni degli studenti." />
      <section className="section-shell py-8 lg:py-10">
        <div className="mx-auto max-w-[1650px]">
          <header className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-[#16211e] sm:p-8">
            <span className="eyebrow">Valutazione docente</span>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div><h1 className="text-3xl font-black text-ink dark:text-white sm:text-4xl">Esercizi consegnati</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/65">Correggi risposte automatiche, produzioni scritte, dialoghi e registrazioni dalla stessa area.</p></div>
              <div className="flex gap-2"><Link to="/admin/assignments" className="rounded-full border border-ink/15 px-4 py-2.5 text-sm font-black">Assegnazioni</Link><Link to="/admin/content/exercises/composer" className="rounded-full border border-ink/15 px-4 py-2.5 text-sm font-black">Componi esercizi</Link></div>
            </div>
          </header>

          {error ? <div className="mt-5 flex items-start gap-2 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-950 dark:bg-red-400/10 dark:text-red-100"><CircleAlert className="mt-0.5 h-4 w-4" />{error}</div> : null}
          {success ? <div className="mt-5 border-l-4 border-moss bg-mint/30 p-4 text-sm font-bold text-ink dark:bg-emerald-400/10 dark:text-emerald-100">{success}</div> : null}

          <div className="mt-6 grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#16211e] xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
              <p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Consegne</p>
              <label className="relative mt-3 block"><Search className="absolute left-3 top-3 h-4 w-4 text-ink/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Studente o esercizio" className={`${fieldClass} pl-9`} /></label>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={`${fieldClass} mt-2`}><option value="all">Tutte</option>{Object.entries(reviewLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              <div className="mt-4 grid gap-2">{filtered.map((attempt) => <button key={attempt.id} type="button" onClick={() => openAttempt(attempt.id)} className={`rounded-xl border p-3 text-left transition ${detail?.attempt?.id === attempt.id ? 'border-moss bg-mint/25' : 'border-ink/10 hover:bg-linen/40 dark:border-white/10 dark:hover:bg-white/[0.05]'}`}><div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-moss">{attempt.exercise_public_id}</span><span className="rounded-full bg-linen px-2 py-1 text-[0.62rem] font-black dark:bg-white/10">{reviewLabels[attempt.review_status]}</span></div><p className="mt-2 line-clamp-2 text-sm font-black text-ink dark:text-white">{attempt.exercise_title}</p><p className="mt-1 text-xs font-semibold text-ink/60 dark:text-white/60">{attempt.learner_name} · {formatDate(attempt.submitted_at)}</p></button>)}</div>
            </aside>

            <main className="min-w-0">
              {loading && !detail ? <div className="rounded-2xl border border-ink/10 bg-white p-6 text-sm font-bold dark:border-white/10 dark:bg-[#16211e]">Caricamento...</div> : null}
              {detail ? <div className="grid gap-6"><section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wide text-moss">{detail.exercise?.public_id}</p><h2 className="mt-2 text-2xl font-black text-ink dark:text-white">{detail.exercise?.title}</h2><p className="mt-2 text-sm font-semibold text-ink/65 dark:text-white/65">{detail.attempt?.learner_name} · consegnato {formatDate(detail.attempt?.submitted_at)}</p></div>{pendingQuestionIds.length ? <span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-black text-violet-800 dark:bg-violet-300/10 dark:text-violet-200">{pendingQuestionIds.length} produzioni manuali</span> : null}</div></section>{detail.sections.map((section) => <section key={section.id}><h3 className="mb-3 text-lg font-black text-ink dark:text-white">{section.title}</h3><div className="grid gap-5">{section.questions.map((item) => <ReviewCard key={item.id} item={item} review={reviews[item.id]} onChange={(patch) => updateReview(item.id, patch)} />)}</div></section>)}<section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-300/20 dark:bg-emerald-400/[0.06] sm:p-7"><label className="text-xs font-black uppercase tracking-wide text-emerald-800 dark:text-emerald-200">Considerazioni generali per lo studente<textarea rows={5} value={teacherNote} onChange={(event) => setTeacherNote(event.target.value)} className={`${fieldClass} mt-3`} placeholder="Riassumi punti di forza, priorità e prossimi passi." /></label><div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><label className="text-xs font-black text-emerald-800 dark:text-emerald-200">Stato della revisione<select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value)} className={`${fieldClass} mt-2 min-w-64`}><option value="reviewed">Salva come revisione interna</option><option value="approved">Pubblica la valutazione allo studente</option></select></label><button type="button" disabled={saving} onClick={saveReview} className="rounded-full bg-emerald-700 px-6 py-3 text-sm font-black text-white disabled:opacity-40">{saving ? 'Salvataggio...' : reviewStatus === 'approved' ? 'Pubblica valutazione' : 'Salva revisione'}</button></div>{reviewStatus === 'approved' && unresolvedPending > 0 ? <p className="mt-3 text-xs font-bold text-amber-800 dark:text-amber-200">Mancano ancora {unresolvedPending} valutazioni manuali.</p> : null}</section></div> : <div className="rounded-2xl border border-dashed border-ink/15 bg-white p-8 text-center text-sm font-bold text-ink/65 dark:border-white/15 dark:bg-[#16211e] dark:text-white/65">Nessuna consegna disponibile.</div>}
            </main>
          </div>
        </div>
      </section>
    </>
  );
}
