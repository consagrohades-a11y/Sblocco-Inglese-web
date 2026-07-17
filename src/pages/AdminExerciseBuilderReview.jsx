import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  FileCheck2,
  Layers3,
  Loader2,
  PackageCheck,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import {
  loadExerciseBuilderReviewQueue,
  promoteExerciseBuilderImportItems,
  updateExerciseBuilderImportItemSelection,
} from '../lib/exerciseBuilderApi.js';

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function entityLabel(type) {
  if (type === 'question') return 'Domanda';
  if (type === 'question_pool') return 'Pool';
  if (type === 'exercise') return 'Esercizio';
  return type;
}

function itemTitle(item) {
  if (item.entity_type === 'question') return item.payload?.title || item.payload?.prompt || 'Domanda senza titolo';
  if (item.entity_type === 'question_pool') return item.payload?.name || 'Pool senza nome';
  return item.payload?.title || 'Esercizio senza titolo';
}

function batchPendingCount(batch) {
  return batch.items.filter((item) => (
    item.selected
    && !item.promoted_entity_id
    && item.validation_status !== 'invalid'
  )).length;
}

function ValidationBadge({ status }) {
  if (status === 'valid') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[0.68rem] font-black text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200">
        <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
        Valido
      </span>
    );
  }
  if (status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[0.68rem] font-black text-amber-900 dark:bg-amber-300/10 dark:text-amber-100">
        <AlertTriangle aria-hidden="true" className="h-3 w-3" />
        Avvisi
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-[0.68rem] font-black text-red-900 dark:bg-red-300/10 dark:text-red-100">
      <XCircle aria-hidden="true" className="h-3 w-3" />
      Non valido
    </span>
  );
}

export default function AdminExerciseBuilderReview() {
  const [batches, setBatches] = useState([]);
  const [activeBatchId, setActiveBatchId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [expandedItemId, setExpandedItemId] = useState(null);

  async function refresh(preferredBatchId = activeBatchId) {
    setLoading(true);
    setError('');
    try {
      const queue = await loadExerciseBuilderReviewQueue();
      setBatches(queue);
      const nextBatch = queue.find((batch) => batch.id === preferredBatchId)
        || queue.find((batch) => batchPendingCount(batch) > 0)
        || queue[0]
        || null;
      setActiveBatchId(nextBatch?.id || null);
      setSelectedIds(
        (nextBatch?.items || [])
          .filter((item) => item.selected && !item.promoted_entity_id && item.validation_status !== 'invalid')
          .map((item) => item.id),
      );
    } catch (loadError) {
      setError(loadError.message || 'Non è stato possibile caricare la coda di revisione.');
      setBatches([]);
      setActiveBatchId(null);
      setSelectedIds([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh(null);
  }, []);

  const activeBatch = useMemo(
    () => batches.find((batch) => batch.id === activeBatchId) || null,
    [batches, activeBatchId],
  );

  const promotableItems = useMemo(
    () => (activeBatch?.items || []).filter((item) => !item.promoted_entity_id && item.validation_status !== 'invalid'),
    [activeBatch],
  );

  function chooseBatch(batch) {
    setActiveBatchId(batch.id);
    setSelectedIds(
      batch.items
        .filter((item) => item.selected && !item.promoted_entity_id && item.validation_status !== 'invalid')
        .map((item) => item.id),
    );
    setResult(null);
    setError('');
    setExpandedItemId(null);
  }

  async function toggleItem(item) {
    if (item.promoted_entity_id || item.validation_status === 'invalid') return;
    const nextSelected = !selectedIds.includes(item.id);
    setSelectedIds((current) => (
      nextSelected ? [...current, item.id] : current.filter((id) => id !== item.id)
    ));
    try {
      await updateExerciseBuilderImportItemSelection(item.id, nextSelected);
    } catch (selectionError) {
      setSelectedIds((current) => (
        nextSelected ? current.filter((id) => id !== item.id) : [...current, item.id]
      ));
      setError(selectionError.message || 'Non è stato possibile aggiornare la selezione.');
    }
  }

  async function promoteSelected() {
    if (!activeBatch || selectedIds.length === 0) return;
    setPromoting(true);
    setError('');
    setResult(null);
    try {
      const promotionResult = await promoteExerciseBuilderImportItems(activeBatch.id, selectedIds);
      setResult(promotionResult);
      await refresh(activeBatch.id);
    } catch (promotionError) {
      setError(promotionError.message || 'La promozione non è riuscita. Nessun elemento è stato creato.');
    } finally {
      setPromoting(false);
    }
  }

  return (
    <>
      <SEO title="Revisione Exercise Builder | Admin Sblocco Inglese" description="Revisiona e promuovi domande, pool ed esercizi importati." />
      <div className="min-h-screen bg-paper px-4 py-7 dark:bg-[#0f1715] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1500px]">
          <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link to="/admin/content/exercises" className="focus-ring inline-flex items-center gap-2 rounded-lg text-sm font-black text-moss underline dark:text-mint">
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Torna all’importazione
              </Link>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-moss dark:text-mint">Exercise Builder</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-ink dark:text-white sm:text-4xl">Coda di revisione</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/65">
                Seleziona le bozze corrette e promuovile nella Question Bank, nelle Pool e negli Esercizi. Gli ID pubblici vengono creati soltanto in questo passaggio.
              </p>
            </div>
            <button
              type="button"
              onClick={() => refresh(activeBatchId)}
              disabled={loading || promoting}
              className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm font-black text-ink shadow-sm transition hover:border-moss disabled:opacity-50 dark:border-white/15 dark:bg-white/[0.07] dark:text-white"
            >
              <RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Aggiorna
            </button>
          </header>

          {error ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-950 dark:border-red-300/25 dark:bg-red-300/10 dark:text-red-100">{error}</div>
          ) : null}

          {result ? (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-300/25 dark:bg-emerald-300/10 dark:text-emerald-100">
              <p className="font-black">{result.promoted_count} elementi promossi</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(result.items || []).map((item) => (
                  item.entity_type === 'exercise' ? (
                    <Link
                      key={item.item_id}
                      to={`/admin/content/exercises/composer?exerciseId=${item.entity_id}`}
                      className="focus-ring rounded-full bg-white px-3 py-1 text-xs font-black underline shadow-sm dark:bg-white/10"
                    >
                      {item.public_id} · apri nel Composer
                    </Link>
                  ) : (
                    <span key={item.item_id} className="rounded-full bg-white px-3 py-1 text-xs font-black shadow-sm dark:bg-white/10">{item.public_id}</span>
                  )
                ))}
              </div>
              <p className="mt-3 text-xs font-semibold opacity-80">
                Gli elementi promossi partono in stato Bozza: per approvarli o pubblicarli usa la{' '}
                <Link to="/admin/content/exercises/library" className="font-black underline">Libreria esercizi</Link>.
              </p>
            </div>
          ) : null}

          <section className="mt-7 grid min-w-0 gap-5 xl:grid-cols-[21rem_minmax(0,1fr)]">
            <aside className="min-w-0 rounded-2xl border border-ink/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
              <div className="flex items-center justify-between gap-3 px-2 py-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-moss dark:text-mint">Batch</p>
                  <p className="mt-1 text-sm font-semibold text-ink/65 dark:text-white/65">{batches.length} importazioni recenti</p>
                </div>
                <Layers3 aria-hidden="true" className="h-5 w-5 text-moss dark:text-mint" />
              </div>

              <div className="mt-2 max-h-[70vh] space-y-2 overflow-y-auto pr-1">
                {loading ? (
                  <div className="flex min-h-32 items-center justify-center"><Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-moss" /></div>
                ) : batches.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-ink/15 p-4 text-sm font-semibold text-ink/65 dark:border-white/15 dark:text-white/65">Nessun batch da revisionare.</div>
                ) : batches.map((batch) => {
                  const pending = batchPendingCount(batch);
                  const active = batch.id === activeBatchId;
                  return (
                    <button
                      key={batch.id}
                      type="button"
                      onClick={() => chooseBatch(batch)}
                      className={`focus-ring flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${active ? 'border-moss bg-mint/25 dark:border-emerald-300/35 dark:bg-emerald-300/[0.08]' : 'border-ink/10 hover:border-moss/40 dark:border-white/10 dark:hover:border-white/20'}`}
                    >
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${pending ? 'bg-amber-100 text-amber-900 dark:bg-amber-300/10 dark:text-amber-100' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200'}`}>
                        {pending ? <CircleDot aria-hidden="true" className="h-4 w-4" /> : <PackageCheck aria-hidden="true" className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-ink dark:text-white">{batch.source_name}</span>
                        <span className="mt-0.5 block text-xs font-semibold text-ink/60 dark:text-white/60">{formatDate(batch.created_at)}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-ink px-2 py-1 text-xs font-black text-white">{pending}</span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <article className="min-w-0 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:p-5">
              {!activeBatch ? (
                <div className="grid min-h-[30rem] place-items-center text-center">
                  <div>
                    <FileCheck2 aria-hidden="true" className="mx-auto h-10 w-10 text-ink/25 dark:text-white/25" />
                    <p className="mt-3 text-lg font-black text-ink dark:text-white">Seleziona un batch</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-4 border-b border-ink/10 pb-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-moss dark:text-mint">{entityLabel(activeBatch.entity_type)}</p>
                      <h2 className="mt-1 text-2xl font-black text-ink dark:text-white">{activeBatch.source_name}</h2>
                      <p className="mt-1 text-sm font-semibold text-ink/65 dark:text-white/65">{activeBatch.items.length} elementi totali</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedIds(promotableItems.map((item) => item.id))}
                        className="focus-ring rounded-lg border border-ink/10 px-3 py-2 text-xs font-black text-ink dark:border-white/15 dark:text-white"
                      >
                        Seleziona disponibili
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedIds([])}
                        className="focus-ring rounded-lg border border-ink/10 px-3 py-2 text-xs font-black text-ink dark:border-white/15 dark:text-white"
                      >
                        Deseleziona
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {activeBatch.items.map((item) => {
                      const promoted = Boolean(item.promoted_entity_id);
                      const selected = selectedIds.includes(item.id);
                      const expanded = expandedItemId === item.id;
                      return (
                        <article key={item.id} className={`rounded-xl border transition ${promoted ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-300/20 dark:bg-emerald-300/[0.05]' : selected ? 'border-moss bg-mint/15 dark:border-emerald-300/35 dark:bg-emerald-300/[0.07]' : 'border-ink/10 dark:border-white/10'}`}>
                          <div className="flex items-start gap-3 p-4">
                            <input
                              type="checkbox"
                              checked={selected || promoted}
                              disabled={promoted || item.validation_status === 'invalid'}
                              onChange={() => toggleItem(item)}
                              className="mt-1 h-4 w-4 accent-emerald-700"
                              aria-label={`Seleziona ${itemTitle(item)}`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[0.68rem] font-black uppercase tracking-[0.1em] text-moss dark:text-mint">{entityLabel(item.entity_type)}</span>
                                <ValidationBadge status={item.validation_status} />
                                {promoted ? <span className="rounded-full bg-emerald-700 px-2 py-1 text-[0.68rem] font-black text-white">Promosso</span> : null}
                              </div>
                              <h3 className="mt-2 text-base font-black text-ink dark:text-white">{itemTitle(item)}</h3>
                              {item.warnings?.length ? (
                                <ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-amber-800 dark:text-amber-100">
                                  {item.warnings.map((warning) => <li key={warning}>• {warning}</li>)}
                                </ul>
                              ) : null}
                              {item.errors?.length ? (
                                <ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-red-800 dark:text-red-200">
                                  {item.errors.map((itemError) => <li key={itemError}>• {itemError}</li>)}
                                </ul>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpandedItemId(expanded ? null : item.id)}
                              className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ink/10 text-ink dark:border-white/15 dark:text-white"
                              aria-label="Mostra payload"
                            >
                              <ChevronRight aria-hidden="true" className={`h-4 w-4 transition ${expanded ? 'rotate-90' : ''}`} />
                            </button>
                          </div>
                          {expanded ? (
                            <pre className="max-h-80 overflow-auto border-t border-ink/10 bg-[#101915] p-4 text-xs leading-5 text-emerald-50 dark:border-white/10">{JSON.stringify(item.payload, null, 2)}</pre>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>

                  <div className="sticky bottom-3 mt-5 flex flex-col gap-3 rounded-xl border border-ink/10 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-white/10 dark:bg-[#17211e]/95 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-black text-ink dark:text-white">{selectedIds.length} elementi pronti</p>
                    <button
                      type="button"
                      onClick={promoteSelected}
                      disabled={promoting || selectedIds.length === 0}
                      className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-sm font-black text-white transition hover:bg-moss disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {promoting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <PackageCheck aria-hidden="true" className="h-4 w-4" />}
                      Promuovi e genera ID
                    </button>
                  </div>
                </>
              )}
            </article>
          </section>
        </div>
      </div>
    </>
  );
}
