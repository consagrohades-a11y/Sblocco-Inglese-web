import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { loadCollectionQuestionCandidates } from '../lib/exerciseCollectionsApi.js';
import {
  loadExercisePoolDetail,
  loadExercisePools,
  loadExerciseQuestionBank,
  saveExercisePoolVersion,
  setExerciseBankEntityStatus,
} from '../lib/exerciseBankApi.js';

const EMPTY_POOL = {
  id: null,
  publicId: '',
  title: '',
  description: '',
  level: 'A1',
  topic: '',
  subtopic: '',
  primarySkill: 'grammar',
  tagsText: '',
  selectionDefaults: { selection_strategy: 'balanced' },
  status: 'draft',
  versionNumber: null,
};

const statusLabels = { draft: 'Bozza', in_review: 'Da revisionare', approved: 'Approvata', published: 'Pubblicata', archived: 'Archiviata' };
const fieldClass = 'mt-2 w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:border-moss focus:ring-4 focus:ring-mint/30 dark:border-white/20 dark:bg-surface-800 dark:text-white dark:focus:border-emerald-300 dark:focus:ring-emerald-400/15';

function fromDetail(detail) {
  if (!detail) return { ...EMPTY_POOL };
  return {
    id: detail.id,
    publicId: detail.public_id,
    title: detail.title || '',
    description: detail.description || '',
    level: detail.level || 'A1',
    topic: detail.topic || '',
    subtopic: detail.subtopic || '',
    primarySkill: detail.primary_skill || 'grammar',
    tagsText: (detail.tags || []).join(', '),
    selectionDefaults: detail.selection_defaults || { selection_strategy: 'balanced' },
    status: detail.status || 'draft',
    versionNumber: detail.version_number,
  };
}

function membershipFromQuestion(question, pinned = false) {
  return { questionId: question.id, questionVersionId: question.versionId, pinned };
}

function statusClass(status) {
  if (status === 'published') return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200';
  if (status === 'approved') return 'bg-cyan-100 text-cyan-900 dark:bg-cyan-400/15 dark:text-cyan-200';
  if (status === 'archived') return 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/60';
  if (status === 'in_review') return 'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200';
  return 'bg-violet-100 text-violet-900 dark:bg-violet-400/15 dark:text-violet-200';
}

export default function AdminExercisePools() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedReturnTo = searchParams.get('returnTo') || '';
  const returnTo = requestedReturnTo.startsWith('/admin/content/exercises/') ? requestedReturnTo : '';
  const [pools, setPools] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [pool, setPool] = useState({ ...EMPTY_POOL });
  const [memberships, setMemberships] = useState([]);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [onlySelected, setOnlySelected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadBase() {
    setLoading(true); setError('');
    try {
      const [poolData, questionData] = await Promise.all([loadExercisePools(), loadExerciseQuestionBank()]);
      setPools(poolData);
      setQuestions(questionData.filter((item) => item.status !== 'archived'));
      return { poolData, questionData };
    } catch (loadError) {
      setError(loadError.message || 'Non è stato possibile caricare pool e domande.');
      return { poolData: [], questionData: [] };
    } finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    async function initialise() {
      const { poolData, questionData } = await loadBase();
      if (!active) return;
      const requestedIds = (searchParams.get('questionIds') || '').split(',').filter(Boolean);
      const requestedPoolId = searchParams.get('poolId');
      const requestedCollectionId = searchParams.get('collectionId');
      if (searchParams.get('new') === '1' || (!requestedPoolId && !poolData.length)) {
        setPool({ ...EMPTY_POOL });
        let importedMemberships = questionData.filter((item) => requestedIds.includes(item.id)).map((item) => membershipFromQuestion(item));
        if (requestedCollectionId) {
          try {
            const importResult = await loadCollectionQuestionCandidates(requestedCollectionId);
            const candidateMap = new Map((importResult.candidates || []).map((item) => [item.question_id, item.question_version_id]));
            importedMemberships = questionData
              .filter((item) => candidateMap.has(item.id))
              .map((item) => ({ ...membershipFromQuestion(item), questionVersionId: candidateMap.get(item.id) || item.versionId }));
            const notes = [`${importedMemberships.length} domande compatibili importate dalla Collection`];
            if (importResult.incompatible_count) notes.push(`${importResult.incompatible_count} esercizi completi esclusi`);
            setSuccess(`${notes.join(', ')}. I duplicati sono stati rimossi.`);
          } catch (importError) {
            setError(importError.message || 'Non è stato possibile importare la Collection nella pool.');
          }
        }
        setMemberships(importedMemberships);
      } else {
        const targetId = requestedPoolId || poolData[0]?.id;
        if (targetId) await openPool(targetId);
      }
    }
    initialise();
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openPool(poolId) {
    setLoading(true); setError(''); setSuccess('');
    try {
      const detail = await loadExercisePoolDetail(poolId);
      if (!detail) throw new Error('Pool non trovata.');
      setPool(fromDetail(detail));
      setMemberships((detail.memberships || []).map((item) => ({
        questionId: item.question_id,
        questionVersionId: item.question_version_id,
        pinned: Boolean(item.pinned),
      })));
      setSearchParams({ poolId, ...(returnTo ? { returnTo } : {}) });
    } catch (loadError) { setError(loadError.message || 'Non è stato possibile aprire la pool.'); }
    finally { setLoading(false); }
  }

  function newPool() {
    setPool({ ...EMPTY_POOL });
    setMemberships([]);
    setSearchParams({ new: '1', ...(returnTo ? { returnTo } : {}) });
    setSuccess('Nuova pool pronta. Seleziona le domande e salva.');
    setError('');
  }

  const membershipMap = useMemo(() => new Map(memberships.map((item, index) => [item.questionId, { ...item, index }])), [memberships]);
  const levels = useMemo(() => [...new Set(questions.map((item) => item.level).filter(Boolean))].sort(), [questions]);
  const types = useMemo(() => [...new Set(questions.map((item) => item.question_type).filter(Boolean))].sort(), [questions]);
  const filteredQuestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return questions.filter((item) => {
      const selected = membershipMap.has(item.id);
      if (onlySelected && !selected) return false;
      if (levelFilter !== 'all' && item.level !== levelFilter) return false;
      if (typeFilter !== 'all' && item.question_type !== typeFilter) return false;
      if (!term) return true;
      return [item.publicId, item.title, item.prompt, item.topic, item.subtopic, ...(item.tags || [])].filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
    });
  }, [questions, membershipMap, onlySelected, levelFilter, typeFilter, search]);
  const selectedQuestions = memberships.map((membership) => ({ membership, question: questions.find((item) => item.id === membership.questionId) })).filter((item) => item.question);
  const typeStats = useMemo(() => selectedQuestions.reduce((map, item) => {
    const key = item.question.question_type;
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map()), [selectedQuestions]);

  function toggleQuestion(question) {
    const current = membershipMap.get(question.id);
    if (current) setMemberships((items) => items.filter((item) => item.questionId !== question.id));
    else setMemberships((items) => [...items, membershipFromQuestion(question)]);
  }
  function togglePinned(questionId) { setMemberships((items) => items.map((item) => item.questionId === questionId ? { ...item, pinned: !item.pinned } : item)); }
  function move(questionId, direction) {
    setMemberships((items) => {
      const index = items.findIndex((item) => item.questionId === questionId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return items;
      const next = [...items];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  async function save() {
    setSaving(true); setError(''); setSuccess('');
    try {
      const result = await saveExercisePoolVersion({
        poolId: pool.id,
        pool: {
          ...pool,
          tags: pool.tagsText.split(',').map((item) => item.trim()).filter(Boolean),
        },
        memberships,
      });
      setSuccess(`${result.public_id}, versione ${result.version_number}, salvata con ${result.question_count} domande.`);
      await loadBase();
      await openPool(result.id);
    } catch (saveError) { setError(saveError.message || 'Non è stato possibile salvare la pool.'); }
    finally { setSaving(false); }
  }

  async function changeStatus(nextStatus) {
    if (!pool.id) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await setExerciseBankEntityStatus('question_pool', pool.id, nextStatus);
      setSuccess(`${pool.publicId}: ${statusLabels[nextStatus]}.`);
      await loadBase();
      await openPool(pool.id);
    } catch (statusError) { setError(statusError.message || 'Non è stato possibile aggiornare lo stato.'); }
    finally { setSaving(false); }
  }

  return (
    <><SEO title="Pool Builder | Exercise Builder" description="Componi e versiona pool di domande riutilizzabili." /><section className="section-shell py-8 lg:py-10"><div className="mx-auto max-w-[1500px]">
      <header className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-surface-900 sm:p-8"><span className="eyebrow">Exercise Builder</span><div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-black text-ink dark:text-white sm:text-4xl">Pool Builder</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/65">Modificare una pool crea sempre una nuova versione. Gli esercizi già pubblicati continuano a usare la versione precedente.</p></div><div className="flex flex-wrap gap-2">{returnTo ? <Link to={returnTo} className="rounded-full border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-black text-violet-900 dark:border-violet-300/25 dark:bg-violet-300/10 dark:text-violet-100">Torna all’esercizio</Link> : null}<Link to="/admin/content/exercises/questions" className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-black text-ink dark:border-white/20 dark:bg-white/10 dark:text-white">Question Bank</Link><button type="button" onClick={newPool} className="rounded-full bg-ink px-4 py-2.5 text-sm font-black text-white dark:bg-emerald-300 dark:text-surface-950">Nuova pool</button></div></div></header>
      {error ? <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-950">{error}</div> : null}{success ? <div className="mt-5 border-l-4 border-moss bg-mint/30 p-4 text-sm font-bold text-ink dark:bg-emerald-400/10 dark:text-emerald-100">{success}</div> : null}

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[17rem_minmax(0,1fr)] 2xl:grid-cols-[17rem_minmax(0,1fr)_22rem]">
        <aside className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-surface-900 xl:sticky xl:top-24 xl:row-span-2 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto"><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-moss dark:text-emerald-300">Pool</p><span className="text-xs font-black text-ink/60 dark:text-white/60">{pools.length}</span></div><div className="mt-3 grid gap-2">{pools.map((item) => <button key={item.id} type="button" onClick={() => openPool(item.id)} className={`rounded-xl border p-3 text-left transition ${pool.id === item.id ? 'border-moss bg-mint/25 dark:border-emerald-300/35 dark:bg-emerald-400/10' : 'border-ink/10 hover:bg-linen/40 dark:border-white/10 dark:hover:bg-white/[0.06]'}`}><div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-moss dark:text-emerald-300">{item.publicId}</span><span className={`rounded-full px-2 py-1 text-[0.6rem] font-black ${statusClass(item.status)}`}>{statusLabels[item.status]}</span></div><p className="mt-2 line-clamp-2 text-sm font-black text-ink dark:text-white">{item.title}</p><p className="mt-1 text-xs font-bold text-ink/60 dark:text-white/60">v{item.version_number} · {item.questionCount} domande · {item.pinnedCount} fisse</p></button>)}{!pools.length && !loading ? <p className="py-4 text-sm text-ink/65 dark:text-white/65">Nessuna pool.</p> : null}</div></aside>

        <main className="grid min-w-0 gap-6 xl:col-start-2 xl:row-start-1 2xl:col-start-2">
          <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-900 sm:p-7"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-moss dark:text-emerald-300">{pool.publicId || 'Nuova pool'}</p><h2 className="mt-1 text-2xl font-black text-ink dark:text-white">Metadati e selezione</h2></div>{pool.id ? <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-black ${statusClass(pool.status)}`}>{statusLabels[pool.status]} · v{pool.versionNumber}</span> : null}</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-black text-ink/60 dark:text-white/60 sm:col-span-2">Titolo<input value={pool.title} onChange={(event) => setPool({ ...pool, title: event.target.value })} className={fieldClass} placeholder="Present Simple negatives" /></label><label className="text-xs font-black text-ink/60 dark:text-white/60 sm:col-span-2">Descrizione<textarea rows={3} value={pool.description} onChange={(event) => setPool({ ...pool, description: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black text-ink/60 dark:text-white/60">Livello<select value={pool.level} onChange={(event) => setPool({ ...pool, level: event.target.value })} className={fieldClass}>{['A0','A1','A1+','A2','B1','B1+','B2','C1','C2','Mixed'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs font-black text-ink/60 dark:text-white/60">Competenza<select value={pool.primarySkill} onChange={(event) => setPool({ ...pool, primarySkill: event.target.value })} className={fieldClass}>{['grammar','vocabulary','reading','writing','functional_language','spelling','word_order'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs font-black text-ink/60 dark:text-white/60">Topic<input value={pool.topic} onChange={(event) => setPool({ ...pool, topic: event.target.value })} className={fieldClass} placeholder="present_simple" /></label><label className="text-xs font-black text-ink/60 dark:text-white/60">Sottotema<input value={pool.subtopic} onChange={(event) => setPool({ ...pool, subtopic: event.target.value })} className={fieldClass} placeholder="negative" /></label><label className="text-xs font-black text-ink/60 dark:text-white/60 sm:col-span-2">Tag, separati da virgola<input value={pool.tagsText} onChange={(event) => setPool({ ...pool, tagsText: event.target.value })} className={fieldClass} placeholder="do, does, negative, routine" /></label></div></section>

          <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-900 sm:p-7"><div className="flex flex-col gap-4"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">Question Bank</p><h2 className="mt-1 text-xl font-black text-ink dark:text-white">Aggiungi o rimuovi domande</h2></div><label className="flex items-center gap-2 text-xs font-black text-ink/60 dark:text-white/60"><input type="checkbox" checked={onlySelected} onChange={(event) => setOnlySelected(event.target.checked)} />Mostra solo selezionate</label></div><div className="grid gap-3 md:grid-cols-[minmax(12rem,1fr)_8rem_12rem]"><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${fieldClass} mt-0`} placeholder="Cerca domanda" /><select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} className={`${fieldClass} mt-0`}><option value="all">Tutti i livelli</option>{levels.map((item) => <option key={item}>{item}</option>)}</select><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={`${fieldClass} mt-0`}><option value="all">Tutti i tipi</option>{types.map((item) => <option key={item}>{item}</option>)}</select></div></div><div className="mt-5 max-h-[38rem] divide-y divide-ink/10 overflow-y-auto border-y border-ink/10 dark:divide-white/10 dark:border-white/10">{filteredQuestions.map((question) => { const selected = membershipMap.has(question.id); return <label key={question.id} className={`flex cursor-pointer items-start gap-3 px-2 py-4 transition ${selected ? 'bg-mint/20 dark:bg-emerald-400/[0.06]' : 'hover:bg-linen/30 dark:hover:bg-white/[0.03]'}`}><input type="checkbox" checked={selected} onChange={() => toggleQuestion(question)} className="mt-1 h-4 w-4" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black text-moss dark:text-emerald-300">{question.publicId}</span><span className="rounded-full bg-linen px-2 py-1 text-[0.65rem] font-black text-ink/65 dark:bg-white/10 dark:text-white/65">{question.level}</span><span className="rounded-full bg-linen px-2 py-1 text-[0.65rem] font-black text-ink/65 dark:bg-white/10 dark:text-white/65">{question.question_type}</span></div><p className="mt-2 line-clamp-2 text-sm font-black leading-6 text-ink dark:text-white">{question.title || question.prompt}</p><p className="mt-1 text-xs font-semibold text-ink/60 dark:text-white/60">{question.topic}{question.subtopic ? ` · ${question.subtopic}` : ''}</p></div></label>; })}{filteredQuestions.length === 0 ? <p className="py-6 text-sm text-ink/65 dark:text-white/65">Nessuna domanda corrisponde ai filtri.</p> : null}</div></section>
        </main>

        <aside className="min-w-0 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-900 xl:col-start-2 xl:row-start-2 2xl:sticky 2xl:top-24 2xl:col-start-3 2xl:row-start-1 2xl:max-h-[calc(100vh-7rem)] 2xl:overflow-y-auto"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-moss dark:text-emerald-300">Composizione</p><h2 className="mt-1 text-xl font-black text-ink dark:text-white">{memberships.length} domande</h2></div><span className="text-xs font-black text-violet-700 dark:text-violet-300">{memberships.filter((item) => item.pinned).length} fisse</span></div>{typeStats.size ? <div className="mt-4 flex flex-wrap gap-2">{[...typeStats.entries()].map(([key,value]) => <span key={key} className="rounded-full bg-linen px-2.5 py-1 text-[0.65rem] font-black text-ink/65 dark:bg-white/10 dark:text-white/65">{key}: {value}</span>)}</div> : null}<div className="mt-5 divide-y divide-ink/10 border-y border-ink/10 dark:divide-white/10 dark:border-white/10">{selectedQuestions.map(({ membership, question }, index) => <article key={membership.questionId} className="py-3"><div className="flex items-start gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mint text-xs font-black text-moss dark:bg-emerald-300/15 dark:text-emerald-200">{index + 1}</span><div className="min-w-0 flex-1"><p className="line-clamp-2 text-xs font-black leading-5 text-ink dark:text-white">{question.publicId} · {question.title || question.prompt}</p><div className="mt-2 flex flex-wrap gap-1.5"><button type="button" onClick={() => togglePinned(question.id)} className={`rounded-md px-2 py-1 text-[0.65rem] font-black ${membership.pinned ? 'bg-violet-700 text-white' : 'border border-ink/15 text-ink dark:border-white/20 dark:text-white'}`}>{membership.pinned ? 'Sempre presente' : 'Casuale'}</button><button type="button" disabled={index === 0} onClick={() => move(question.id,-1)} className="rounded-md border border-ink/15 px-2 py-1 text-[0.65rem] font-black disabled:opacity-30 dark:border-white/20">Su</button><button type="button" disabled={index === memberships.length - 1} onClick={() => move(question.id,1)} className="rounded-md border border-ink/15 px-2 py-1 text-[0.65rem] font-black disabled:opacity-30 dark:border-white/20">Giù</button><button type="button" onClick={() => toggleQuestion(question)} className="ml-auto text-[0.65rem] font-black text-red-700 underline dark:text-red-300">Rimuovi</button></div></div></div></article>)}{!selectedQuestions.length ? <p className="py-5 text-sm text-ink/65 dark:text-white/65">Seleziona domande dalla Question Bank.</p> : null}</div><div className="mt-5 grid gap-2"><button type="button" disabled={saving} onClick={save} className="rounded-full bg-ink px-5 py-3 text-sm font-black text-white disabled:opacity-40 dark:bg-emerald-300 dark:text-surface-950">{saving ? 'Salvataggio...' : pool.id ? 'Salva nuova versione' : 'Crea pool'}</button>{pool.id && !['approved','published'].includes(pool.status) ? <button type="button" disabled={saving || !memberships.length} onClick={() => changeStatus('approved')} className="rounded-full border border-ink/15 px-5 py-2.5 text-sm font-black text-ink disabled:opacity-35 dark:border-white/20 dark:text-white">Approva</button> : null}{pool.id && pool.status !== 'published' ? <button type="button" disabled={saving || !memberships.length} onClick={() => changeStatus('published')} className="rounded-full bg-violet-700 px-5 py-2.5 text-sm font-black text-white disabled:opacity-35">Pubblica</button> : null}{pool.id && pool.status !== 'archived' ? <button type="button" disabled={saving} onClick={() => changeStatus('archived')} className="mt-1 text-xs font-black text-red-700 underline dark:text-red-300">Archivia pool</button> : null}</div></aside>
      </div>
    </div></section></>
  );
}
