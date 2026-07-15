import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { loadExercisePools, loadExerciseQuestionBank } from '../lib/exerciseBankApi.js';
import { loadExerciseComposerCatalog } from '../lib/exerciseComposerApi.js';
import {
  loadExerciseCollectionDetail,
  loadExerciseCollections,
  saveExerciseCollection,
  setExerciseCollectionStatus,
} from '../lib/exerciseCollectionsApi.js';

const EMPTY_COLLECTION = {
  id: null,
  publicId: '',
  title: '',
  description: '',
  status: 'draft',
  colorKey: 'emerald',
  completionRule: 'all_items',
  requiredPercent: 100,
  versionNumber: null,
};

const fieldClass = 'mt-2 w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:border-moss focus:ring-4 focus:ring-mint/30 dark:border-white/20 dark:bg-[#101a17] dark:text-white dark:focus:border-emerald-300 dark:focus:ring-emerald-400/15';
const typeLabels = { question: 'Domande', question_pool: 'Pool', exercise: 'Esercizi' };

const colorClasses = {
  emerald: 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-300/30 dark:bg-emerald-400/10 dark:text-emerald-100',
  violet: 'border-violet-300 bg-violet-50 text-violet-950 dark:border-violet-300/30 dark:bg-violet-400/10 dark:text-violet-100',
  cyan: 'border-cyan-300 bg-cyan-50 text-cyan-950 dark:border-cyan-300/30 dark:bg-cyan-400/10 dark:text-cyan-100',
  amber: 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-amber-100',
  rose: 'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-300/30 dark:bg-rose-400/10 dark:text-rose-100',
  slate: 'border-slate-300 bg-slate-50 text-slate-950 dark:border-slate-300/30 dark:bg-slate-400/10 dark:text-slate-100',
};

function normalizeCatalog(questions, pools, exercises) {
  return [
    ...questions.map((item) => ({
      entityType: 'question', entityId: item.id, publicId: item.publicId,
      title: item.title || item.prompt, status: item.status,
      subtitle: `${item.level} · ${item.question_type} · ${item.topic}`,
    })),
    ...pools.map((item) => ({
      entityType: 'question_pool', entityId: item.id, publicId: item.publicId,
      title: item.title, status: item.status,
      subtitle: `${item.level} · ${item.questionCount} domande · ${item.topic}`,
    })),
    ...exercises.map((item) => ({
      entityType: 'exercise', entityId: item.id, publicId: item.publicId,
      title: item.title, status: item.status,
      subtitle: `${item.level} · ${item.topic}${item.estimated_minutes ? ` · ${item.estimated_minutes} min` : ''}`,
    })),
  ];
}

function detailToCollection(detail) {
  return {
    id: detail.id,
    publicId: detail.public_id,
    title: detail.title || '',
    description: detail.description || '',
    status: detail.catalog_status || 'draft',
    colorKey: detail.color_key || 'emerald',
    completionRule: detail.completion_rule || 'all_items',
    requiredPercent: Number(detail.required_percent || 100),
    versionNumber: detail.version_number,
  };
}

export default function AdminExerciseCollections() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [collections, setCollections] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [collection, setCollection] = useState({ ...EMPTY_COLLECTION });
  const [items, setItems] = useState([]);
  const [activeType, setActiveType] = useState('question');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadBase() {
    setLoading(true); setError('');
    try {
      const [collectionData, questions, pools, exercises] = await Promise.all([
        loadExerciseCollections(),
        loadExerciseQuestionBank(),
        loadExercisePools(),
        loadExerciseComposerCatalog(),
      ]);
      setCollections(collectionData);
      const normalized = normalizeCatalog(
        questions.filter((item) => item.status !== 'archived'),
        pools.filter((item) => item.status !== 'archived'),
        exercises.filter((item) => item.status !== 'archived'),
      );
      setCatalog(normalized);
      return { collectionData, normalized };
    } catch (loadError) {
      setError(loadError.message || 'Non è stato possibile caricare le Collections.');
      return { collectionData: [], normalized: [] };
    } finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    async function initialise() {
      const { collectionData } = await loadBase();
      if (!active) return;
      const requestedId = searchParams.get('collectionId');
      if (searchParams.get('new') === '1' || (!requestedId && !collectionData.length)) createNew();
      else if (requestedId || collectionData[0]?.id) await openCollection(requestedId || collectionData[0].id);
    }
    initialise();
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openCollection(collectionId) {
    setLoading(true); setError(''); setSuccess('');
    try {
      const detail = await loadExerciseCollectionDetail(collectionId);
      if (!detail) throw new Error('Collection non trovata.');
      setCollection(detailToCollection(detail));
      setItems((detail.items || []).map((item) => ({ entityType: item.entity_type, entityId: item.entity_id })));
      setSearchParams({ collectionId });
    } catch (loadError) { setError(loadError.message || 'Non è stato possibile aprire la Collection.'); }
    finally { setLoading(false); }
  }

  function createNew() {
    setCollection({ ...EMPTY_COLLECTION });
    setItems([]);
    setSearchParams({ new: '1' });
    setSuccess('Nuova Collection pronta.');
    setError('');
  }

  const catalogMap = useMemo(() => new Map(catalog.map((item) => [`${item.entityType}:${item.entityId}`, item])), [catalog]);
  const selectedSet = useMemo(() => new Set(items.map((item) => `${item.entityType}:${item.entityId}`)), [items]);
  const filteredCatalog = useMemo(() => {
    const term = search.trim().toLowerCase();
    return catalog.filter((item) => {
      if (item.entityType !== activeType) return false;
      if (!term) return true;
      return [item.publicId, item.title, item.subtitle].filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
    });
  }, [catalog, activeType, search]);
  const visibleCollections = collections.filter((item) => showArchived || item.status !== 'archived');
  const selectedItems = items.map((item) => ({ ...item, catalogItem: catalogMap.get(`${item.entityType}:${item.entityId}`) })).filter((item) => item.catalogItem);
  const counts = selectedItems.reduce((current, item) => ({ ...current, [item.entityType]: (current[item.entityType] || 0) + 1 }), { question: 0, question_pool: 0, exercise: 0 });

  function toggleItem(catalogItem) {
    const key = `${catalogItem.entityType}:${catalogItem.entityId}`;
    if (selectedSet.has(key)) setItems((current) => current.filter((item) => `${item.entityType}:${item.entityId}` !== key));
    else setItems((current) => [...current, { entityType: catalogItem.entityType, entityId: catalogItem.entityId }]);
  }
  function moveItem(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  }

  async function save() {
    setSaving(true); setError(''); setSuccess('');
    try {
      const result = await saveExerciseCollection({ collectionId: collection.id, collection, items });
      setSuccess(`${result.public_id} salvata con ${result.item_count} elementi.`);
      await loadBase();
      await openCollection(result.id);
    } catch (saveError) { setError(saveError.message || 'Non è stato possibile salvare la Collection.'); }
    finally { setSaving(false); }
  }
  async function changeStatus(status) {
    if (!collection.id) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await setExerciseCollectionStatus(collection.id, status);
      setSuccess(status === 'published' ? 'Collection pubblicata con una nuova versione immutabile.' : status === 'in_review' ? 'Collection inviata in revisione.' : status === 'archived' ? 'Collection archiviata.' : 'Collection riportata in bozza.');
      await loadBase();
      await openCollection(collection.id);
    } catch (statusError) { setError(statusError.message || 'Non è stato possibile aggiornare la Collection.'); }
    finally { setSaving(false); }
  }

  return <><SEO title="Collections | Exercise Builder" description="Crea e pubblica percorsi versionati di domande, pool ed esercizi." /><section className="section-shell py-8 lg:py-10"><div className="mx-auto max-w-[1500px]">
    <header className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-[#16211e] sm:p-8"><span className="eyebrow">Exercise Builder</span><div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-black text-ink dark:text-white sm:text-4xl">Collections</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/65">Componi percorsi ordinati e pubblicali come versioni immutabili. Le assegnazioni salvano uno snapshot stabile della versione selezionata.</p></div><div className="flex flex-wrap gap-2"><Link to="/admin/content/exercises/questions" className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-black text-ink dark:border-white/20 dark:bg-white/10 dark:text-white">Question Bank</Link><Link to="/admin/content/exercises/pools" className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-black text-ink dark:border-white/20 dark:bg-white/10 dark:text-white">Pool Builder</Link><button type="button" onClick={createNew} className="rounded-full bg-ink px-4 py-2.5 text-sm font-black text-white dark:bg-emerald-300 dark:text-[#102019]">Nuova Collection</button></div></div></header>
    {error ? <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-950">{error}</div> : null}{success ? <div className="mt-5 border-l-4 border-moss bg-mint/30 p-4 text-sm font-bold text-ink dark:bg-emerald-400/10 dark:text-emerald-100">{success}</div> : null}

    <div className="mt-6 grid items-start gap-6 xl:grid-cols-[18rem_minmax(0,1fr)] 2xl:grid-cols-[18rem_minmax(0,1fr)_24rem]">
      <aside className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#16211e] xl:sticky xl:top-24 xl:row-span-2 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto"><div className="flex items-center justify-between gap-2"><p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Collections</p><label className="flex items-center gap-1.5 text-[0.65rem] font-black text-ink/45 dark:text-white/45"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />Archiviate</label></div><div className="mt-3 grid gap-2">{visibleCollections.map((item) => <button key={item.id} type="button" onClick={() => openCollection(item.id)} className={`rounded-xl border p-3 text-left transition ${collection.id === item.id ? colorClasses[item.colorKey] || colorClasses.emerald : 'border-ink/10 hover:bg-linen/40 dark:border-white/10 dark:hover:bg-white/[0.06]'}`}><div className="flex items-center justify-between gap-2"><span className="text-xs font-black">{item.publicId}</span>{item.status === 'archived' ? <span className="rounded-full bg-slate-200 px-2 py-1 text-[0.6rem] font-black text-slate-700 dark:bg-white/10 dark:text-white/55">archiviata</span> : null}</div><p className="mt-2 line-clamp-2 text-sm font-black">{item.title}</p><p className="mt-1 text-xs font-bold opacity-55">{item.itemCount} elementi · {item.questions} Q · {item.pools} pool · {item.exercises} EX</p></button>)}{!visibleCollections.length && !loading ? <p className="py-4 text-sm text-ink/55 dark:text-white/55">Nessuna Collection.</p> : null}</div></aside>

      <main className="grid min-w-0 gap-6 xl:col-start-2 xl:row-start-1 2xl:col-start-2">
        <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">{collection.publicId || 'Nuova Collection'}</p><h2 className="mt-1 text-2xl font-black text-ink dark:text-white">Identità e completamento</h2></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 dark:bg-white/10 dark:text-white/55">{collection.status}{collection.versionNumber ? ` · v${collection.versionNumber}` : ''}</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-black text-ink/60 dark:text-white/60 sm:col-span-2">Titolo<input value={collection.title} onChange={(event) => setCollection({ ...collection, title: event.target.value })} className={fieldClass} placeholder="A1 Quantifiers" /></label><label className="text-xs font-black text-ink/60 dark:text-white/60 sm:col-span-2">Descrizione<textarea rows={3} value={collection.description} onChange={(event) => setCollection({ ...collection, description: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black text-ink/60 dark:text-white/60">Colore<select value={collection.colorKey} onChange={(event) => setCollection({ ...collection, colorKey: event.target.value })} className={fieldClass}>{['emerald','violet','cyan','amber','rose','slate'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs font-black text-ink/60 dark:text-white/60">Regola di completamento<select value={collection.completionRule} onChange={(event) => setCollection({ ...collection, completionRule: event.target.value })} className={fieldClass}><option value="all_items">Tutte le tappe</option><option value="percentage">Percentuale minima</option></select></label>{collection.completionRule === 'percentage' ? <label className="text-xs font-black text-ink/60 dark:text-white/60 sm:col-start-2">Percentuale richiesta<input type="number" min="1" max="100" value={collection.requiredPercent} onChange={(event) => setCollection({ ...collection, requiredPercent: Number(event.target.value) })} className={fieldClass} /></label> : null}</div></section>

        <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7"><div className="flex flex-col gap-4"><div><p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">Catalogo</p><h2 className="mt-1 text-xl font-black text-ink dark:text-white">Aggiungi contenuti</h2></div><div className="flex flex-wrap gap-2">{Object.entries(typeLabels).map(([key,label]) => <button key={key} type="button" onClick={() => setActiveType(key)} className={`rounded-full px-4 py-2 text-xs font-black ${activeType === key ? 'bg-violet-700 text-white' : 'border border-ink/15 text-ink dark:border-white/20 dark:text-white'}`}>{label}</button>)}</div><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${fieldClass} mt-0`} placeholder="Cerca ID, titolo o metadati" /></div><div className="mt-5 max-h-[38rem] divide-y divide-ink/10 overflow-y-auto border-y border-ink/10 dark:divide-white/10 dark:border-white/10">{filteredCatalog.map((item) => { const key=`${item.entityType}:${item.entityId}`; const selected=selectedSet.has(key); return <label key={key} className={`flex cursor-pointer items-start gap-3 py-4 ${selected ? 'bg-mint/20 dark:bg-emerald-400/[0.06]' : ''}`}><input type="checkbox" checked={selected} onChange={() => toggleItem(item)} className="mt-1" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black text-moss dark:text-emerald-300">{item.publicId}</span><span className="rounded-full bg-linen px-2 py-1 text-[0.65rem] font-black text-ink/50 dark:bg-white/10 dark:text-white/50">{typeLabels[item.entityType]}</span></div><p className="mt-2 line-clamp-2 text-sm font-black leading-6 text-ink dark:text-white">{item.title}</p><p className="mt-1 text-xs font-semibold text-ink/45 dark:text-white/45">{item.subtitle}</p></div></label>; })}{!filteredCatalog.length ? <p className="py-6 text-sm text-ink/55 dark:text-white/55">Nessun contenuto corrispondente.</p> : null}</div></section>
      </main>

      <aside className={`min-w-0 rounded-2xl border p-5 shadow-sm xl:col-start-2 xl:row-start-2 2xl:sticky 2xl:top-24 2xl:col-start-3 2xl:row-start-1 2xl:max-h-[calc(100vh-7rem)] 2xl:overflow-y-auto ${colorClasses[collection.colorKey] || colorClasses.emerald}`}><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide opacity-65">Contenuti raccolti</p><h2 className="mt-1 text-xl font-black">{items.length} elementi</h2></div><div className="text-right text-xs font-black opacity-65"><p>{counts.question} domande</p><p>{counts.question_pool} pool · {counts.exercise} esercizi</p></div></div><div className="mt-5 divide-y divide-current/10 border-y border-current/10">{selectedItems.map((item,index) => <article key={`${item.entityType}:${item.entityId}`} className="py-3"><div className="flex items-start gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/70 text-[0.65rem] font-black text-ink dark:bg-black/15 dark:text-white">{index+1}</span><div className="min-w-0 flex-1"><p className="text-[0.65rem] font-black uppercase opacity-55">{typeLabels[item.entityType]} · {item.catalogItem.publicId}</p><p className="mt-1 line-clamp-2 text-xs font-black leading-5">{item.catalogItem.title}</p><div className="mt-2 flex gap-2"><button type="button" disabled={index===0} onClick={() => moveItem(index,-1)} className="text-[0.65rem] font-black underline disabled:opacity-25">Su</button><button type="button" disabled={index===items.length-1} onClick={() => moveItem(index,1)} className="text-[0.65rem] font-black underline disabled:opacity-25">Giù</button><button type="button" onClick={() => toggleItem(item.catalogItem)} className="ml-auto text-[0.65rem] font-black text-red-700 underline dark:text-red-200">Rimuovi</button></div></div></div></article>)}{!selectedItems.length ? <p className="py-5 text-sm opacity-60">Seleziona contenuti dal catalogo.</p> : null}</div><div className="mt-5 grid gap-2"><button type="button" disabled={saving} onClick={save} className="rounded-full bg-ink px-5 py-3 text-sm font-black text-white disabled:opacity-40 dark:bg-white dark:text-ink">{saving ? 'Salvataggio...' : collection.id ? 'Salva nuova bozza' : 'Crea Collection'}</button>{collection.id && collection.status === 'draft' ? <button type="button" disabled={saving || !items.length} onClick={() => changeStatus('in_review')} className="rounded-full border border-current/25 px-5 py-2.5 text-sm font-black disabled:opacity-35">Invia in revisione</button> : null}{collection.id && ['draft','in_review'].includes(collection.status) ? <button type="button" disabled={saving || !items.length} onClick={() => changeStatus('published')} className="rounded-full bg-violet-700 px-5 py-2.5 text-sm font-black text-white disabled:opacity-35">Pubblica versione</button> : null}{collection.id ? <Link to={`/admin/content/exercises/pools?new=1&collectionId=${collection.id}`} className="text-center text-xs font-black underline">Aggiungi le domande a una pool</Link> : null}{collection.id && collection.status !== 'archived' ? <button type="button" disabled={saving} onClick={() => changeStatus('archived')} className="text-xs font-black text-red-700 underline dark:text-red-200">Archivia</button> : null}{collection.id && collection.status === 'archived' ? <button type="button" disabled={saving} onClick={() => changeStatus('draft')} className="text-xs font-black underline">Riporta in bozza</button> : null}</div></aside>
    </div>
  </div></section></>;
}
