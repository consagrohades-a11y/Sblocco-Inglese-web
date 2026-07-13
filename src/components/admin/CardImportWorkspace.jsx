import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../SEO';
import { supabase } from '../../lib/supabaseClient.js';
import { extractImportedCards, findDuplicatePublicIds, parseCsv } from '../../lib/cardImport.js';
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
}) {
  const [cards, setCards] = useState([]);
  const [fileName, setFileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const validation = useMemo(() => cards.map(validateCard), [cards, validateCard]);
  const invalidRows = useMemo(() => validation.filter((item) => item.issues.length > 0), [validation]);
  const duplicateIds = useMemo(() => findDuplicatePublicIds(cards), [cards]);
  const canImport = cards.length > 0 && invalidRows.length === 0 && duplicateIds.length === 0 && !saving;

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setFileName(file.name);
    setCards([]);
    setError('');
    setMessage('');

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
      setCards(normalized);
      setMessage(`${normalized.length} ${normalized.length === 1 ? itemLabel : itemPlural} caricate nel controllo preliminare. Non sono ancora in Supabase.`);
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'File non valido.');
    }
  }

  async function importCards() {
    if (!canImport) return;
    setSaving(true);
    setError('');
    setMessage('');

    const { data, error: rpcError } = await supabase.rpc(rpcName, { p_cards: cards });

    if (rpcError) {
      setError(rpcError.message || 'Importazione non riuscita. Nessuna card è stata importata.');
    } else {
      setMessage(`${data} ${data === 1 ? itemLabel : itemPlural} importate come bozze da revisionare.`);
      setCards([]);
      setFileName('');
    }
    setSaving(false);
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
                </div>
                <div className="max-h-[42rem] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-ink text-white dark:bg-[#07120f]">
                      <tr>
                        {columns.map((column) => <th key={column.key} className="px-4 py-3">{column.label}</th>)}
                        <th className="px-4 py-3">Esito</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/10 dark:divide-white/10">
                      {cards.map((card, index) => {
                        const result = validation[index];
                        return (
                          <tr key={`${card.public_id || 'card'}-${index}`} className={result.issues.length ? 'bg-red-50 dark:bg-red-400/10' : ''}>
                            {columns.map((column) => (
                              <td key={column.key} className="px-4 py-3 text-ink dark:text-white/80">
                                {column.render ? column.render(card) : String(card[column.key] || '-')}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-xs font-bold text-ink dark:text-white/75">
                              {result.issues.length ? result.issues.join('; ') : 'Valida'}
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
                  <div><dt className="font-black text-ink/45 dark:text-white/45">Non valide</dt><dd className="mt-1 text-2xl font-black text-ink dark:text-white">{invalidRows.length}</dd></div>
                  <div><dt className="font-black text-ink/45 dark:text-white/45">ID duplicati</dt><dd className="mt-1 text-2xl font-black text-ink dark:text-white">{duplicateIds.length}</dd></div>
                </dl>
                {duplicateIds.length ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-100">ID duplicati: {duplicateIds.join(', ')}</div> : null}
                <button type="button" disabled={!canImport} onClick={importCards} className={`${adminButton.primary} mt-6 w-full`}>
                  {saving ? 'Importazione...' : 'Importa tutte come bozze'}
                </button>
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
