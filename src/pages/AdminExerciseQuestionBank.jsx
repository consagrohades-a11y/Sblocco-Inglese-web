import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { loadExerciseQuestionBank, setExerciseBankEntityStatus } from '../lib/exerciseBankApi.js';

const statusLabels = { draft: 'Bozza', in_review: 'Da revisionare', approved: 'Approvata', published: 'Pubblicata', archived: 'Archiviata' };
const fieldClass = 'rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm font-bold text-ink outline-none focus:border-moss dark:border-white/20 dark:bg-[#101a17] dark:text-white';

function statusClass(status) {
  if (status === 'published') return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200';
  if (status === 'approved') return 'bg-cyan-100 text-cyan-900 dark:bg-cyan-400/15 dark:text-cyan-200';
  if (status === 'archived') return 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/60';
  if (status === 'in_review') return 'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200';
  return 'bg-violet-100 text-violet-900 dark:bg-violet-400/15 dark:text-violet-200';
}

function canApprove(question) {
  return question && !['approved', 'published', 'archived'].includes(question.status);
}

function nextReviewableId(list, currentId, excludedIds = []) {
  if (!list.length) return '';
  const excluded = new Set(excludedIds);
  const start = Math.max(0, list.findIndex((item) => item.id === currentId));

  for (let offset = 1; offset <= list.length; offset += 1) {
    const candidate = list[(start + offset) % list.length];
    if (candidate && canApprove(candidate) && !excluded.has(candidate.id)) return candidate.id;
  }

  return '';
}

function QuestionPreview({ question, busy, onApprove }) {
  if (!question) return <div className="rounded-2xl border border-dashed border-ink/15 bg-white p-7 text-sm text-ink/65 dark:border-white/15 dark:bg-[#16211e] dark:text-white/65">Seleziona una domanda per vedere contenuto, correzione e diagnostica.</div>;
  const options = question.content?.options || [];
  const blanks = question.content?.blanks || [];
  const testedCodes = question.diagnostics?.tested_codes || [];

  return (
    <aside className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#16211e] lg:sticky lg:top-24 lg:self-start">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-black text-moss dark:text-emerald-300">{question.publicId}</span>
        <span className={`rounded-full px-3 py-1.5 text-xs font-black ${statusClass(question.status)}`}>{statusLabels[question.status] || question.status}</span>
      </div>
      <h2 className="mt-4 text-xl font-black leading-7 text-ink dark:text-white">{question.title || question.prompt}</h2>
      {question.title ? <p className="mt-3 text-base font-semibold leading-7 text-ink/75 dark:text-white/75">{question.prompt}</p> : null}
      <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">
        <span className="rounded-full bg-linen px-3 py-1.5 text-ink/60 dark:bg-white/10 dark:text-white/60">{question.question_type}</span>
        <span className="rounded-full bg-linen px-3 py-1.5 text-ink/60 dark:bg-white/10 dark:text-white/60">{question.level}</span>
        <span className="rounded-full bg-linen px-3 py-1.5 text-ink/60 dark:bg-white/10 dark:text-white/60">{question.difficulty}</span>
      </div>
      {options.length ? <div className="mt-6 grid gap-2">{options.map((option) => <div key={option.key} className={`rounded-xl border px-4 py-3 text-sm font-bold ${option.is_correct ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-300/30 dark:bg-emerald-400/10 dark:text-emerald-100' : 'border-ink/10 text-ink dark:border-white/10 dark:text-white'}`}>{option.text}{option.error_code ? <span className="ml-2 text-xs opacity-55">{option.error_code}</span> : null}</div>)}</div> : null}
      {blanks.length ? <div className="mt-6 grid gap-3">{blanks.map((blank, index) => <div key={blank.key} className="rounded-xl border border-ink/10 p-4 dark:border-white/10"><p className="text-xs font-black text-ink/60 dark:text-white/60">Spazio {index + 1} · {blank.key}</p><p className="mt-2 text-sm font-bold text-ink dark:text-white">{(blank.accepted_answers || []).join(' / ')}</p></div>)}</div> : null}
      {question.content?.accepted_answers?.length ? <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-300/25 dark:bg-emerald-400/10"><p className="text-xs font-black uppercase tracking-wide text-emerald-800 dark:text-emerald-200">Risposte accettate</p><p className="mt-2 text-sm font-bold text-emerald-950 dark:text-emerald-100">{question.content.accepted_answers.join(' / ')}</p></div> : null}
      <div className="mt-6 border-t border-ink/10 pt-5 dark:border-white/10"><p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">Diagnostica</p><p className="mt-2 text-sm font-semibold leading-6 text-ink/65 dark:text-white/65">{testedCodes.length ? testedCodes.join(', ') : 'Nessun codice diagnostico'}</p></div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-xs font-bold text-ink/65 dark:text-white/65"><span>Versione {question.version_number}</span><span>{question.poolCount} pool</span></div>
      {canApprove(question) ? <button type="button" disabled={busy} onClick={onApprove} className="mt-6 w-full rounded-full bg-moss px-5 py-3 text-sm font-black text-white transition hover:brightness-110 disabled:opacity-40 dark:bg-emerald-300 dark:text-[#102019]">{busy ? 'Approvazione...' : 'Approva e prossima'}</button> : null}
    </aside>
  );
}

export default function AdminExerciseQuestionBank() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [previewId, setPreviewId] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [level, setLevel] = useState('all');
  const [type, setType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load(preferredPreviewId = null) {
    setLoading(true);
    setError('');
    try {
      const data = await loadExerciseQuestionBank();
      setItems(data);
      setPreviewId((current) => {
        const requested = preferredPreviewId || current;
        if (requested && data.some((item) => item.id === requested)) return requested;
        return data[0]?.id || '';
      });
      return data;
    } catch (loadError) {
      setError(loadError.message || 'Non è stato possibile caricare la Question Bank.');
      return [];
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const levels = useMemo(() => [...new Set(items.map((item) => item.level).filter(Boolean))].sort(), [items]);
  const types = useMemo(() => [...new Set(items.map((item) => item.question_type).filter(Boolean))].sort(), [items]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (status !== 'all' && item.status !== status) return false;
      if (level !== 'all' && item.level !== level) return false;
      if (type !== 'all' && item.question_type !== type) return false;
      if (!term) return true;
      return [item.publicId, item.title, item.prompt, item.topic, item.subtopic, item.learning_objective, ...(item.tags || [])].filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
    });
  }, [items, search, status, level, type]);

  const preview = items.find((item) => item.id === previewId) || null;
  const selectedSet = new Set(selectedIds);
  const approvableSelected = filtered.filter((item) => selectedSet.has(item.id) && canApprove(item));

  function toggle(id) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function selectVisible() {
    setSelectedIds(filtered.filter((item) => item.status !== 'archived').map((item) => item.id));
  }

  function createPool() {
    if (!selectedIds.length) return;
    navigate(`/admin/content/exercises/pools?new=1&questionIds=${encodeURIComponent(selectedIds.join(','))}`);
  }

  async function changeStatus(item, nextStatus, advance = false) {
    const nextId = advance ? nextReviewableId(filtered, item.id, [item.id]) : null;
    setBusyId(item.id);
    setError('');
    setSuccess('');
    try {
      await setExerciseBankEntityStatus('question', item.id, nextStatus);
      setSelectedIds((current) => current.filter((id) => id !== item.id));
      await load(nextId);
      setSuccess(nextId && advance
        ? `${item.publicId}: ${statusLabels[nextStatus]}. Aperta la prossima domanda da revisionare.`
        : `${item.publicId}: ${statusLabels[nextStatus]}.`);
    } catch (statusError) {
      setError(statusError.message || 'Non è stato possibile aggiornare la domanda.');
    } finally {
      setBusyId('');
    }
  }

  async function approveSelected() {
    if (!approvableSelected.length || bulkBusy) return;
    setBulkBusy(true);
    setBulkProgress(`0 / ${approvableSelected.length}`);
    setError('');
    setSuccess('');

    const approvedIds = [];
    const failed = [];

    for (let index = 0; index < approvableSelected.length; index += 1) {
      const item = approvableSelected[index];
      try {
        await setExerciseBankEntityStatus('question', item.id, 'approved');
        approvedIds.push(item.id);
      } catch (approvalError) {
        failed.push({ item, message: approvalError.message || 'Errore sconosciuto' });
      }
      setBulkProgress(`${index + 1} / ${approvableSelected.length}`);
    }

    const nextId = nextReviewableId(filtered, previewId, approvedIds);
    await load(nextId);
    setSelectedIds(failed.map(({ item }) => item.id));

    if (approvedIds.length) {
      setSuccess(`${approvedIds.length} ${approvedIds.length === 1 ? 'domanda approvata' : 'domande approvate'}.${nextId ? ' Aperta la prossima domanda da revisionare.' : ''}`);
    }
    if (failed.length) {
      setError(`${failed.length} ${failed.length === 1 ? 'domanda non è stata approvata' : 'domande non sono state approvate'}: ${failed.map(({ item, message }) => `${item.publicId} (${message})`).join(' · ')}`);
    }

    setBulkBusy(false);
    setBulkProgress('');
  }

  return (
    <>
      <SEO title="Question Bank | Exercise Builder" description="Cataloga e riutilizza le domande degli esercizi." />
      <section className="section-shell py-8 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <header className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-[#16211e] sm:p-8">
            <span className="eyebrow">Exercise Builder</span>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div><h1 className="text-3xl font-black text-ink dark:text-white sm:text-4xl">Question Bank</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/65">Seleziona le domande da approvare insieme, oppure usa “Approva e prossima” per revisionarle una alla volta senza tornare ogni volta alla lista.</p></div>
              <div className="flex flex-wrap gap-2"><Link to="/admin/content/exercises" className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-black text-ink dark:border-white/20 dark:bg-white/10 dark:text-white">Importa JSON</Link><Link to="/admin/content/exercises/pools" className="rounded-full bg-ink px-4 py-2.5 text-sm font-black text-white dark:bg-emerald-300 dark:text-[#102019]">Gestisci pool</Link></div>
            </div>
          </header>

          {error ? <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-950 dark:bg-red-400/10 dark:text-red-100">{error}</div> : null}
          {success ? <div className="mt-5 border-l-4 border-moss bg-mint/30 p-4 text-sm font-bold text-ink dark:bg-emerald-400/10 dark:text-emerald-100">{success}</div> : null}

          <section className="mt-6 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e]">
            <div className="grid gap-3 md:grid-cols-[minmax(12rem,1fr)_10rem_8rem_12rem_auto]">
              <input value={search} onChange={(event) => setSearch(event.target.value)} className={fieldClass} placeholder="Cerca prompt, topic, tag o ID" />
              <select value={status} onChange={(event) => setStatus(event.target.value)} className={fieldClass}><option value="all">Tutti gli stati</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
              <select value={level} onChange={(event) => setLevel(event.target.value)} className={fieldClass}><option value="all">Tutti i livelli</option>{levels.map((item) => <option key={item}>{item}</option>)}</select>
              <select value={type} onChange={(event) => setType(event.target.value)} className={fieldClass}><option value="all">Tutti i tipi</option>{types.map((item) => <option key={item}>{item}</option>)}</select>
              <button type="button" onClick={selectVisible} className="rounded-xl border border-ink/15 px-4 py-2.5 text-sm font-black text-ink dark:border-white/20 dark:text-white">Seleziona visibili</button>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="font-bold text-ink/65 dark:text-white/65">{filtered.length} risultati · {selectedIds.length} selezionate · {approvableSelected.length} approvabili</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setSelectedIds([])} disabled={!selectedIds.length || bulkBusy} className="text-xs font-black text-ink/65 underline disabled:opacity-30 dark:text-white/65">Azzera</button>
                <button type="button" onClick={approveSelected} disabled={!approvableSelected.length || bulkBusy} className="rounded-full bg-moss px-4 py-2 text-xs font-black text-white disabled:opacity-35 dark:bg-emerald-300 dark:text-[#102019]">{bulkBusy ? `Approvazione ${bulkProgress}` : `Approva selezionate (${approvableSelected.length})`}</button>
                <button type="button" onClick={createPool} disabled={!selectedIds.length || bulkBusy} className="rounded-full bg-violet-700 px-4 py-2 text-xs font-black text-white disabled:opacity-35">Crea pool con selezionate</button>
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.75fr)]">
            <section className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#16211e]">
              {loading ? <p className="p-6 text-sm font-bold text-ink/65 dark:text-white/65">Caricamento...</p> : (
                <div className="divide-y divide-ink/10 dark:divide-white/10">
                  {filtered.map((item) => (
                    <article key={item.id} className={`grid gap-3 px-5 py-4 transition sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center ${previewId === item.id ? 'bg-mint/20 dark:bg-emerald-400/[0.06]' : ''}`}>
                      <input type="checkbox" checked={selectedSet.has(item.id)} onChange={() => toggle(item.id)} className="h-4 w-4" />
                      <button type="button" onClick={() => setPreviewId(item.id)} className="min-w-0 text-left">
                        <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black text-moss dark:text-emerald-300">{item.publicId}</span><span className={`rounded-full px-2 py-1 text-[0.65rem] font-black ${statusClass(item.status)}`}>{statusLabels[item.status]}</span><span className="rounded-full bg-linen px-2 py-1 text-[0.65rem] font-black text-ink/65 dark:bg-white/10 dark:text-white/65">{item.level}</span></div>
                        <p className="mt-2 line-clamp-2 text-sm font-black leading-6 text-ink dark:text-white">{item.title || item.prompt}</p>
                        <p className="mt-1 text-xs font-semibold text-ink/60 dark:text-white/60">{item.question_type} · {item.topic} · {item.poolCount} pool</p>
                      </button>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        {canApprove(item) ? <button type="button" disabled={busyId === item.id || bulkBusy} onClick={() => changeStatus(item, 'approved', true)} className="rounded-full border border-moss/30 bg-mint/20 px-3 py-1.5 text-xs font-black text-moss disabled:opacity-40 dark:border-emerald-300/25 dark:bg-emerald-400/10 dark:text-emerald-200">Approva e prossima</button> : null}
                        {item.status !== 'archived' ? <button type="button" disabled={busyId === item.id || bulkBusy} onClick={() => changeStatus(item, 'archived')} className="text-xs font-black text-red-700 underline dark:text-red-300">Archivia</button> : <button type="button" disabled={busyId === item.id || bulkBusy} onClick={() => changeStatus(item, 'draft')} className="text-xs font-black text-moss underline dark:text-emerald-300">Ripristina</button>}
                      </div>
                    </article>
                  ))}
                  {filtered.length === 0 ? <p className="p-7 text-sm text-ink/65 dark:text-white/65">Nessuna domanda corrisponde ai filtri.</p> : null}
                </div>
              )}
            </section>
            <QuestionPreview question={preview} busy={busyId === preview?.id || bulkBusy} onApprove={() => preview && changeStatus(preview, 'approved', true)} />
          </div>
        </div>
      </section>
    </>
  );
}
