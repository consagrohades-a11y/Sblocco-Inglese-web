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

function downloadJsonTemplate(fileName, template) {
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
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
  const [bulkCategory, setBulkCategory] = useState('');
  const [preflight, setPreflight] = useState({
    issues: [],
    notes: [],
    summary: { generatedIds: 0, idConflicts: 0, existingDuplicates: 0, contentDuplicates: 0 },
  });

  const validation = useMemo(() => cards.map((card, index) => {
    const base = validateCard(card, index);
    return {
      ...base,
      issues: [...base.issues, ...(preflight.issues[index] || [])],
      notes: preflight.notes[index] || [],
    };
  }), [cards, preflight, validateCard]);
  const invalidRows = useMemo(() => validation.filter((item) => item.issues.length > 0), [validation]);
  const duplicateIds = useMemo(() => findDuplicatePublicIds(cards), [cards]);
  const selectedCards = useMemo(() => cards.filter((_, index) => selectedRows.has(index)), [cards, selectedRows]);
  const selectedValidation = useMemo(() => validation.filter((_, index) => selectedRows.has(index)), [validation, selectedRows]);
  const selectedInvalid = useMemo(() => selectedValidation.filter((item) => item.issues.length > 0), [selectedValidation]);
  const selectedDuplicateIds = useMemo(() => findDuplicatePublicIds(selectedCards), [selectedCards]);
  const canImport = selectedCards.length > 0 && selectedInvalid.length === 0 && selectedDuplicateIds.length === 0 && !saving;

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setFileName(file.name);
    setCards([]);
    setSelectedRows(new Set());
    setBulkCategory('');
    setError('');
    setMessage('');
    setPreflight({
      issues: [],
      notes: [],
      summary: { generatedIds: 0, idConflicts: 0, existingDuplicates: 0, contentDuplicates: 0 },
    });

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
        summary: { generatedIds: 0, idConflicts: 0, existingDuplicates: 0, contentDuplicates: 0 },
      };

      if (existingRpcName && idPrefix) {
        const { data: existingData, error: existingError } = await supabase.rpc(existingRpcName);
        if (existingError) throw new Error(existingError.message || 'Impossibile controllare gli ID già presenti.');
        prepared = prepareImportCards(
          normalized,
          (existingData || []).filter(existingFilter),
          { idPrefix, duplicateFields },
        );
      }

      setCards(prepared.cards);
      setSelectedRows(new Set(prepared.cards.map((_, index) => index)));
      setPreflight({ issues: prepared.issues, notes: prepared.notes, summary: prepared.summary });
      setMessage(`${prepared.cards.length} ${prepared.cards.length === 1 ? itemLabel : itemPlural} analizzate. Non sono ancora in Supabase.`);
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'File non valido.');
    }
  }

  async function importCards() {
    if (!canImport) return;
    setSaving(true);
    setError('');
    setMessage('');

    const { data, error: rpcError } = await supabase.rpc(rpcName, { p_cards: selectedCards });

    if (rpcError) {
      setError(rpcError.message || 'Importazione non riuscita. Nessuna card è stata importata.');
    } else {
      setMessage(`${data} ${data === 1 ? itemLabel : itemPlural} importate come bozze da revisionare.`);
      setCards([]);
      setSelectedRows(new Set());
      setFileName('');
      setPreflight({
        issues: [],
        notes: [],
        summary: { generatedIds: 0, idConflicts: 0, existingDuplicates: 0, contentDuplicates: 0 },
      });
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
              <label className={`${adminButton.primary} cursor-pointer`}>
                Scegli CSV o JSON
                <input type="file" accept=".csv,.json,text/csv,application/json" onChange={handleFile} className="sr-only" />
              </label>
              <button type="button" onClick={() => downloadJsonTemplate(templateFileName, template)} className={adminButton.secondary}>
                Scarica modello JSON
              </button>
              <Link to={editorPath} className={adminButton.secondary}>Editor e revisione</Link>
              {archivePath ? <Link to={archivePath} className={adminButton.secondary}>Archivio</Link> : null}
            </div>
            {fileName ? <p className="mt-3 text-sm font-bold text-ink/60 dark:text-white/55">File selezionato: {fileName}</p> : null}
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
                    <label className="min-w-[15rem] flex-1"><span className="text-xs font-black uppercase text-ink/55 dark:text-white/55">Categoria per le selezionate</span><input value={bulkCategory} onChange={(event) => setBulkCategory(event.target.value)} placeholder="Es. People & identity" className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-moss dark:border-white/20 dark:bg-[#101a17] dark:text-white" /></label>
                    <button type="button" onClick={applyBulkCategory} disabled={!bulkCategory.trim() || !selectedRows.size} className={adminButton.secondary}>Applica categoria</button>
                    <button type="button" onClick={selectImportable} className={adminButton.secondary}>Seleziona importabili</button>
                  </div>
                </div>
                <div className="max-h-[42rem] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-ink text-white dark:bg-[#07120f]">
                      <tr>
                        <th className="w-12 px-4 py-3"><input type="checkbox" checked={cards.length > 0 && selectedRows.size === cards.length} onChange={toggleAll} aria-label="Seleziona tutte le righe" className="h-4 w-4 accent-moss" /></th>
                        {columns.map((column) => <th key={column.key} className="px-4 py-3">{column.label}</th>)}
                        <th className="px-4 py-3">Esito</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/10 dark:divide-white/10">
                      {cards.map((card, index) => {
                        const result = validation[index];
                        return (
                          <tr key={`${card.public_id || 'card'}-${index}`} className={result.issues.length ? 'bg-red-50 dark:bg-red-400/10' : selectedRows.has(index) ? 'bg-mint/20 dark:bg-emerald-400/[0.06]' : ''}>
                            <td className="px-4 py-3"><input type="checkbox" checked={selectedRows.has(index)} onChange={() => toggleRow(index)} aria-label={`Seleziona riga ${index + 1}`} className="h-4 w-4 accent-moss" /></td>
                            {columns.map((column) => (
                              <td key={column.key} className="px-4 py-3 text-ink dark:text-white/80">
                                {column.render ? column.render(card) : String(card[column.key] || '-')}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-xs font-bold text-ink dark:text-white/75">
                              {result.issues.length ? result.issues.join('; ') : result.notes.length ? result.notes.join('; ') : 'Pronta'}
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
                  <div><dt className="font-black text-ink/45 dark:text-white/45">Card</dt><dd className="mt-1 text-2xl font-black text-ink dark:text-white">{cards.length}</dd></div>
                  <div><dt className="font-black text-ink/45 dark:text-white/45">Selezionate</dt><dd className="mt-1 text-2xl font-black text-ink dark:text-white">{selectedCards.length}</dd></div>
                  <div><dt className="font-black text-ink/45 dark:text-white/45">Non valide</dt><dd className="mt-1 text-2xl font-black text-ink dark:text-white">{invalidRows.length}</dd></div>
                  <div><dt className="font-black text-ink/45 dark:text-white/45">ID duplicati</dt><dd className="mt-1 text-2xl font-black text-ink dark:text-white">{duplicateIds.length}</dd></div>
                  <div><dt className="font-black text-ink/45 dark:text-white/45">ID generati</dt><dd className="mt-1 text-2xl font-black text-ink dark:text-white">{preflight.summary.generatedIds}</dd></div>
                  <div><dt className="font-black text-ink/45 dark:text-white/45">Conflitti con Supabase</dt><dd className="mt-1 text-2xl font-black text-ink dark:text-white">{preflight.summary.idConflicts}</dd></div>
                  <div><dt className="font-black text-ink/45 dark:text-white/45">Duplicati già presenti</dt><dd className="mt-1 text-2xl font-black text-ink dark:text-white">{preflight.summary.existingDuplicates + preflight.summary.contentDuplicates}</dd></div>
                </dl>
                {duplicateIds.length ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-100">ID duplicati: {duplicateIds.join(', ')}</div> : null}
                <button type="button" disabled={!canImport} onClick={importCards} className={`${adminButton.primary} mt-6 w-full`}>
                  {saving ? 'Importazione...' : `Importa selezionate (${selectedCards.length})`}
                </button>
                {selectedInvalid.length ? <p className="mt-3 text-xs font-bold text-red-700 dark:text-red-300">{selectedInvalid.length} righe selezionate hanno ancora errori. Correggi la categoria o deselezionale.</p> : null}
                <p className="mt-3 text-xs font-semibold leading-5 text-ink/50 dark:text-white/45">
                  L’operazione è transazionale. Tutte le card vengono forzate a bozza e da revisionare.
                </p>
              </aside>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
