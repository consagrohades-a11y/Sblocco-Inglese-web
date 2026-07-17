import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../SEO';
import { supabase } from '../../lib/supabaseClient.js';
import {
  extractImportedCards,
  findDuplicatePublicIds,
  parseCsv,
  prepareImportCards,
} from '../../lib/cardImport.js';
import { adminButton, adminSurface } from '../../styles/adminUi.js';
import ContentAreaNav from './ContentAreaNav';

const EMPTY_PREFLIGHT = {
  issues: [],
  notes: [],
  duplicates: [],
  summary: {
    generatedIds: 0,
    idConflicts: 0,
    existingDuplicates: 0,
    contentDuplicates: 0,
    batchDuplicates: 0,
  },
};

function downloadJsonTemplate(fileName, template) {
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function duplicateReason(duplicate) {
  if (!duplicate) return '';
  if (duplicate.kind === 'same_id_same_content') return 'Stesso ID e stessi contenuti';
  if (duplicate.kind === 'public_id_conflict') return 'Stesso ID con contenuti diversi';
  return 'Contenuti già presenti con un altro ID';
}

export default function CardImportWorkspace({
  type,
  title,
  description,
  itemLabel,
  itemPlural,
  editorPath,
  archivePath,
  rpcName,
  normalizeCard,
  validateCard,
  columns,
  template,
  templateFileName,
  existingRpcName,
  existingFilter = (card) => card,
  idPrefix,
  duplicateFields = [],
  bulkCategoryField = 'topic',
}) {
  const [cards, setCards] = useState([]);
  const [fileName, setFileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [duplicateActions, setDuplicateActions] = useState({});
  const [bulkCategory, setBulkCategory] = useState('');
  const [preflight, setPreflight] = useState(EMPTY_PREFLIGHT);

  const validation = useMemo(() => cards.map((card, index) => {
    const base = validateCard(card, index);
    return {
      ...base,
      issues: [...base.issues, ...(preflight.issues[index] || [])],
      notes: preflight.notes[index] || [],
    };
  }), [cards, preflight, validateCard]);

  const selectedIndexes = useMemo(
    () => cards.map((_, index) => index).filter((index) => selectedRows.has(index)),
    [cards, selectedRows],
  );
  const invalidRows = useMemo(() => validation.filter((item) => item.issues.length > 0), [validation]);
  const selectedValidation = useMemo(() => validation.filter((_, index) => selectedRows.has(index)), [validation, selectedRows]);
  const selectedInvalid = useMemo(() => selectedValidation.filter((item) => item.issues.length > 0), [selectedValidation]);
  const duplicateIds = useMemo(() => findDuplicatePublicIds(cards), [cards]);
  const duplicateCount = useMemo(() => preflight.duplicates.filter(Boolean).length, [preflight.duplicates]);
  const unresolvedDuplicates = useMemo(() => selectedIndexes.filter((index) => (
    preflight.duplicates[index] && !duplicateActions[index]
  )), [selectedIndexes, preflight.duplicates, duplicateActions]);
  const selectedSkipped = useMemo(() => selectedIndexes.filter((index) => duplicateActions[index] === 'skip'), [selectedIndexes, duplicateActions]);
  const selectedReplacements = useMemo(() => selectedIndexes.filter((index) => duplicateActions[index] === 'replace'), [selectedIndexes, duplicateActions]);

  const importPayload = useMemo(() => selectedIndexes
    .filter((index) => duplicateActions[index] !== 'skip')
    .map((index) => {
      const duplicate = preflight.duplicates[index];
      if (!duplicate) return { ...cards[index], _duplicate_action: 'create' };
      return {
        ...cards[index],
        public_id: duplicate.existingPublicId,
        _duplicate_action: 'replace',
        _replace_existing_id: duplicate.existingId,
      };
    }), [cards, selectedIndexes, duplicateActions, preflight.duplicates]);

  const selectedDuplicateIds = useMemo(() => findDuplicatePublicIds(importPayload), [importPayload]);
  const duplicateReplacementTargets = useMemo(() => {
    const seen = new Set();
    const duplicates = new Set();
    importPayload.forEach((card) => {
      const target = card._replace_existing_id;
      if (!target) return;
      if (seen.has(target)) duplicates.add(card.public_id || target);
      seen.add(target);
    });
    return Array.from(duplicates);
  }, [importPayload]);

  const canImport = selectedRows.size > 0
    && selectedInvalid.length === 0
    && unresolvedDuplicates.length === 0
    && selectedDuplicateIds.length === 0
    && duplicateReplacementTargets.length === 0
    && !saving;

  function resetWorkspace() {
    setCards([]);
    setSelectedRows(new Set());
    setDuplicateActions({});
    setFileName('');
    setBulkCategory('');
    setPreflight(EMPTY_PREFLIGHT);
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setFileName(file.name);
    setCards([]);
    setSelectedRows(new Set());
    setDuplicateActions({});
    setBulkCategory('');
    setError('');
    setMessage('');
    setPreflight(EMPTY_PREFLIGHT);

    if (file.size > 5 * 1024 * 1024) {
      setError('Il file supera il limite di 5 MB.');
      return;
    }

    try {
      const text = await file.text();
      const lowerName = file.name.toLowerCase();
      const rawCards = lowerName.endsWith('.csv')
        ? parseCsv(text)
        : lowerName.endsWith('.json')
          ? extractImportedCards(JSON.parse(text))
          : null;

      if (!rawCards) throw new Error('Seleziona un file CSV o JSON.');

      const normalized = rawCards.map(normalizeCard);
      let prepared = {
        cards: normalized,
        issues: normalized.map(() => []),
        notes: normalized.map(() => []),
        duplicates: normalized.map(() => null),
        summary: { ...EMPTY_PREFLIGHT.summary },
      };

      if (existingRpcName && idPrefix) {
        const { data: existingData, error: existingError } = await supabase.rpc(existingRpcName);
        if (existingError) throw new Error(existingError.message || 'Impossibile controllare le card già presenti.');
        prepared = prepareImportCards(
          normalized,
          (existingData || []).filter(existingFilter),
          { idPrefix, duplicateFields },
        );
      }

      setCards(prepared.cards);
      setSelectedRows(new Set(prepared.cards.map((_, index) => index)));
      setDuplicateActions({});
      setPreflight({
        issues: prepared.issues,
        notes: prepared.notes,
        duplicates: prepared.duplicates,
        summary: prepared.summary,
      });
      setMessage(`${prepared.cards.length} ${prepared.cards.length === 1 ? itemLabel : itemPlural} analizzate. Risolvi gli eventuali duplicati prima di confermare.`);
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'File non valido.');
    }
  }

  async function importCards() {
    if (!canImport) return;
    setSaving(true);
    setError('');
    setMessage('');

    if (importPayload.length === 0) {
      const skipped = selectedSkipped.length;
      resetWorkspace();
      setMessage(`${skipped} ${skipped === 1 ? itemLabel : itemPlural} saltate. Nessuna card è stata modificata.`);
      setSaving(false);
      return;
    }

    const { data, error: rpcError } = await supabase.rpc(rpcName, { p_cards: importPayload });

    if (rpcError) {
      setError(rpcError.message || 'Importazione non riuscita. Nessuna card è stata modificata.');
    } else {
      const imported = Number(data?.imported ?? data ?? importPayload.length);
      const created = Number(data?.created ?? Math.max(0, imported - selectedReplacements.length));
      const replaced = Number(data?.replaced ?? selectedReplacements.length);
      const skipped = selectedSkipped.length + Number(data?.skipped ?? 0);
      resetWorkspace();
      setMessage(`${imported} ${imported === 1 ? itemLabel : itemPlural} salvate: ${created} nuove, ${replaced} sostituite, ${skipped} saltate. Le card salvate sono in bozza e da revisionare.`);
    }
    setSaving(false);
  }

  function toggleRow(index) {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }

  function selectImportable() {
    setSelectedRows(new Set(validation.map((result, index) => result.issues.length === 0 ? index : null).filter((index) => index !== null)));
  }

  function toggleAll() {
    setSelectedRows(selectedRows.size === cards.length ? new Set() : new Set(cards.map((_, index) => index)));
  }

  function applyBulkCategory() {
    const value = bulkCategory.trim();
    if (!value || !selectedRows.size) return;
    setCards((current) => current.map((card, index) => selectedRows.has(index) ? { ...card, [bulkCategoryField]: value } : card));
    setMessage(`Categoria “${value}” applicata a ${selectedRows.size} ${selectedRows.size === 1 ? itemLabel : itemPlural}.`);
  }

  function setDuplicateAction(index, action) {
    setDuplicateActions((current) => ({ ...current, [index]: action }));
  }

  function applyDuplicateActionToAll(action) {
    const next = { ...duplicateActions };
    preflight.duplicates.forEach((duplicate, index) => {
      if (duplicate) next[index] = action;
    });
    setDuplicateActions(next);
  }

  return (
    <>
      <SEO title={`${title} | Admin | Sblocco Inglese`} description={description} />
      <section className="section-shell py-10 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <ContentAreaNav type={type} />
          <header className={`${adminSurface.panel} p-6 sm:p-8`}>
            <span className="eyebrow">Importazione contenuti</span>
            <h1 className="mt-4 text-3xl font-black text-ink dark:text-white sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-ink/70 dark:text-white/65">{description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <label className={`${adminButton.primary} cursor-pointer`}>Scegli CSV o JSON<input type="file" accept=".csv,.json,text/csv,application/json" onChange={handleFile} className="sr-only" /></label>
              <button type="button" onClick={() => downloadJsonTemplate(templateFileName, template)} className={adminButton.secondary}>Scarica modello JSON</button>
              <Link to={editorPath} className={adminButton.secondary}>Editor e revisione</Link>
              {archivePath ? <Link to={archivePath} className={adminButton.secondary}>Archivio</Link> : null}
            </div>
            {fileName ? <p className="mt-3 text-sm font-bold text-ink/60 dark:text-white/65">File selezionato: {fileName}</p> : null}
            {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-100">{error}</div> : null}
            {message ? <div className="mt-5 rounded-xl border border-moss/20 bg-mint/30 p-4 text-sm font-bold text-ink dark:border-emerald-300/25 dark:bg-emerald-400/10 dark:text-emerald-100">{message}</div> : null}
          </header>

          {cards.length > 0 ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <section className={`${adminSurface.panel} overflow-hidden`}>
                <div className="border-b border-ink/10 p-5 dark:border-white/10">
                  <p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Anteprima importazione</p>
                  <h2 className="mt-2 text-2xl font-black text-ink dark:text-white">{cards.length} {cards.length === 1 ? itemLabel : itemPlural}</h2>
                  <div className="mt-4 flex flex-wrap items-end gap-3">
                    <label className="min-w-[15rem] flex-1"><span className="text-xs font-black uppercase text-ink/65 dark:text-white/65">Categoria per le selezionate</span><input value={bulkCategory} onChange={(event) => setBulkCategory(event.target.value)} placeholder="Es. People & identity" className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-moss dark:border-white/20 dark:bg-[#101a17] dark:text-white" /></label>
                    <button type="button" onClick={applyBulkCategory} disabled={!bulkCategory.trim() || !selectedRows.size} className={adminButton.secondary}>Applica categoria</button>
                    <button type="button" onClick={selectImportable} className={adminButton.secondary}>Seleziona importabili</button>
                  </div>

                  {duplicateCount ? (
                    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-300/20 dark:bg-violet-300/[0.07] sm:flex-row sm:items-center sm:justify-between">
                      <div><p className="text-sm font-black text-violet-900 dark:text-violet-100">{duplicateCount} duplicati già presenti</p><p className="mt-1 text-xs font-semibold text-violet-800/70 dark:text-violet-100/65">Scegli per ogni riga oppure applica la stessa decisione a tutti.</p></div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => applyDuplicateActionToAll('replace')} className="rounded-full bg-violet-700 px-4 py-2 text-xs font-black text-white hover:bg-violet-800 dark:bg-violet-300 dark:text-violet-950">Sostituisci tutti</button>
                        <button type="button" onClick={() => applyDuplicateActionToAll('skip')} className="rounded-full border border-violet-300 bg-white px-4 py-2 text-xs font-black text-violet-800 dark:border-violet-300/30 dark:bg-white/10 dark:text-violet-100">Salta tutti</button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="max-h-[42rem] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-ink text-white dark:bg-[#07120f]">
                      <tr>
                        <th className="w-12 px-4 py-3"><input type="checkbox" checked={cards.length > 0 && selectedRows.size === cards.length} onChange={toggleAll} aria-label="Seleziona tutte le righe" className="h-4 w-4 accent-moss" /></th>
                        {columns.map((column) => <th key={column.key} className="px-4 py-3">{column.label}</th>)}
                        <th className="min-w-[17rem] px-4 py-3">Esito e decisione</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/10 dark:divide-white/10">
                      {cards.map((card, index) => {
                        const result = validation[index];
                        const duplicate = preflight.duplicates[index];
                        const decision = duplicateActions[index];
                        const rowClass = result.issues.length
                          ? 'bg-red-50 dark:bg-red-400/10'
                          : decision === 'replace'
                            ? 'bg-violet-50 dark:bg-violet-400/[0.08]'
                            : decision === 'skip'
                              ? 'bg-slate-50 opacity-70 dark:bg-white/[0.04]'
                              : selectedRows.has(index)
                                ? 'bg-mint/20 dark:bg-emerald-400/[0.06]'
                                : '';
                        return (
                          <tr key={`${card.public_id || 'card'}-${index}`} className={rowClass}>
                            <td className="px-4 py-3"><input type="checkbox" checked={selectedRows.has(index)} onChange={() => toggleRow(index)} aria-label={`Seleziona riga ${index + 1}`} className="h-4 w-4 accent-moss" /></td>
                            {columns.map((column) => <td key={column.key} className="px-4 py-3 text-ink dark:text-white/80">{column.render ? column.render(card) : String(card[column.key] || '-')}</td>)}
                            <td className="px-4 py-3 text-xs font-bold text-ink dark:text-white/75">
                              {result.issues.length ? <p className="text-red-700 dark:text-red-200">{result.issues.join('; ')}</p> : duplicate ? (
                                <div>
                                  <p className="font-black text-violet-900 dark:text-violet-100">Duplicato di {duplicate.existingPublicId}</p>
                                  <p className="mt-1 text-violet-800/70 dark:text-violet-100/65">{duplicate.existingLabel} · {duplicateReason(duplicate)}</p>
                                  <div className="mt-3 flex gap-2">
                                    <button type="button" onClick={() => setDuplicateAction(index, 'replace')} className={`rounded-full px-3 py-1.5 text-[0.68rem] font-black ${decision === 'replace' ? 'bg-violet-700 text-white dark:bg-violet-300 dark:text-violet-950' : 'border border-violet-300 bg-white text-violet-800 dark:border-violet-300/30 dark:bg-white/10 dark:text-violet-100'}`}>Sostituisci</button>
                                    <button type="button" onClick={() => setDuplicateAction(index, 'skip')} className={`rounded-full px-3 py-1.5 text-[0.68rem] font-black ${decision === 'skip' ? 'bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-950' : 'border border-slate-300 bg-white text-slate-700 dark:border-white/20 dark:bg-white/10 dark:text-white/70'}`}>Salta</button>
                                  </div>
                                </div>
                              ) : result.notes.length ? result.notes.join('; ') : 'Pronta'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <aside className={`${adminSurface.panel} p-6 lg:sticky lg:top-24 lg:self-start`}>
                <p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Controllo importazione</p>
                <dl className="mt-5 grid gap-4 text-sm">
                  <div><dt className="font-black text-ink/60 dark:text-white/60">Card</dt><dd className="mt-1 text-2xl font-black text-ink dark:text-white">{cards.length}</dd></div>
                  <div><dt className="font-black text-ink/60 dark:text-white/60">Selezionate</dt><dd className="mt-1 text-2xl font-black text-ink dark:text-white">{selectedRows.size}</dd></div>
                  <div><dt className="font-black text-ink/60 dark:text-white/60">Nuove o da salvare</dt><dd className="mt-1 text-2xl font-black text-ink dark:text-white">{importPayload.length}</dd></div>
                  <div><dt className="font-black text-ink/60 dark:text-white/60">Da sostituire</dt><dd className="mt-1 text-2xl font-black text-violet-700 dark:text-violet-200">{selectedReplacements.length}</dd></div>
                  <div><dt className="font-black text-ink/60 dark:text-white/60">Da saltare</dt><dd className="mt-1 text-2xl font-black text-slate-600 dark:text-white/60">{selectedSkipped.length}</dd></div>
                  <div><dt className="font-black text-ink/60 dark:text-white/60">Decisioni mancanti</dt><dd className="mt-1 text-2xl font-black text-amber-700 dark:text-amber-200">{unresolvedDuplicates.length}</dd></div>
                  <div><dt className="font-black text-ink/60 dark:text-white/60">Non valide</dt><dd className="mt-1 text-2xl font-black text-ink dark:text-white">{invalidRows.length}</dd></div>
                  <div><dt className="font-black text-ink/60 dark:text-white/60">ID generati</dt><dd className="mt-1 text-2xl font-black text-ink dark:text-white">{preflight.summary.generatedIds}</dd></div>
                  <div><dt className="font-black text-ink/60 dark:text-white/60">Duplicati nel file</dt><dd className="mt-1 text-2xl font-black text-ink dark:text-white">{preflight.summary.batchDuplicates || 0}</dd></div>
                </dl>
                {duplicateIds.length ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-100">ID ripetuti nel file: {duplicateIds.join(', ')}</div> : null}
                {duplicateReplacementTargets.length ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-100">Più righe tentano di sostituire la stessa card: {duplicateReplacementTargets.join(', ')}</div> : null}
                <button type="button" disabled={!canImport} onClick={importCards} className={`${adminButton.primary} mt-6 w-full`}>{saving ? 'Salvataggio...' : `Conferma: ${importPayload.length} salva, ${selectedSkipped.length} salta`}</button>
                {selectedInvalid.length ? <p className="mt-3 text-xs font-bold text-red-700 dark:text-red-300">{selectedInvalid.length} righe selezionate hanno errori reali. Correggile o deselezionale.</p> : null}
                {unresolvedDuplicates.length ? <p className="mt-3 text-xs font-bold text-amber-700 dark:text-amber-200">Scegli Sostituisci o Salta per {unresolvedDuplicates.length} duplicati selezionati.</p> : null}
                {selectedDuplicateIds.length ? <p className="mt-3 text-xs font-bold text-red-700 dark:text-red-300">Le righe da salvare contengono ancora ID ripetuti.</p> : null}
                <p className="mt-3 text-xs font-semibold leading-5 text-ink/65 dark:text-white/60">L’operazione è transazionale. Le card nuove o sostituite vengono impostate come bozze da revisionare. Le card saltate non vengono modificate.</p>
              </aside>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
