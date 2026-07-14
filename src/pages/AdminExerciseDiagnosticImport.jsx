import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, FileJson2, Loader2, Upload, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { importDiagnosticTaxonomy, loadDiagnosticRegistry } from '../lib/exerciseDiagnosticsApi.js';
import {
  buildDiagnosticTaxonomyExport,
  DIAGNOSTIC_TAXONOMY_TEMPLATE,
  downloadDiagnosticTaxonomy,
  validateDiagnosticTaxonomy,
} from '../lib/exerciseDiagnosticTaxonomy.js';

const fieldClass = 'w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:border-moss focus:ring-4 focus:ring-mint/30 dark:border-white/20 dark:bg-[#101a17] dark:text-white dark:focus:border-emerald-300 dark:focus:ring-emerald-400/15';

function itemLabel(item) {
  return item.kind === 'code' ? 'Codice diagnostico' : 'Regola di aggregazione';
}

export default function AdminExerciseDiagnosticImport() {
  const fileInputRef = useRef(null);
  const [registry, setRegistry] = useState({ codes: [], rules: [] });
  const [sourceName, setSourceName] = useState('Tassonomia incollata');
  const [jsonText, setJsonText] = useState(JSON.stringify(DIAGNOSTIC_TAXONOMY_TEMPLATE, null, 2));
  const [validation, setValidation] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [conflictMode, setConflictMode] = useState('update');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadRegistry() {
    setLoading(true);
    try {
      setRegistry(await loadDiagnosticRegistry());
    } catch (loadError) {
      setError(loadError.message || 'Non è stato possibile caricare la tassonomia corrente.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRegistry(); }, []);

  const importableItems = useMemo(
    () => (validation?.items || []).filter((item) => item.errors.length === 0),
    [validation],
  );

  function validateText(nextText = jsonText) {
    setError('');
    setSuccess('');
    try {
      const parsed = JSON.parse(nextText);
      const result = validateDiagnosticTaxonomy(parsed, {
        existingCodes: registry.codes.map((item) => item.code),
        existingRules: registry.rules.map((item) => item.rule_key),
      });
      setValidation(result);
      setSelectedIds(result.items.filter((item) => item.errors.length === 0).map((item) => item.id));
      if (result.errors.length) setError(result.errors.join(' '));
      return result;
    } catch (parseError) {
      setValidation(null);
      setSelectedIds([]);
      setError(`JSON non valido: ${parseError.message}`);
      return null;
    }
  }

  async function readFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('Carica un file .json.');
      return;
    }
    try {
      const text = await file.text();
      setSourceName(file.name);
      setJsonText(text);
      validateText(text);
    } catch (fileError) {
      setError(fileError.message || 'Non è stato possibile leggere il file.');
    }
  }

  function toggleItem(itemId) {
    setSelectedIds((current) => (
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]
    ));
  }

  async function importSelected() {
    if (!validation) return;
    const chosen = validation.items.filter((item) => selectedIds.includes(item.id) && item.errors.length === 0);
    if (!chosen.length) {
      setError('Seleziona almeno un codice o una regola valida.');
      return;
    }

    const payload = {
      schema_version: 1,
      entity_type: 'diagnostic_taxonomy',
      metadata: { ...(validation.payload?.metadata || {}), source_name: sourceName },
      codes: chosen.filter((item) => item.kind === 'code').map((item) => item.payload),
      rules: chosen.filter((item) => item.kind === 'rule').map((item) => item.payload),
    };
    const selectedValidation = validateDiagnosticTaxonomy(payload, {
      existingCodes: registry.codes.map((item) => item.code),
      existingRules: registry.rules.map((item) => item.rule_key),
    });
    if (!selectedValidation.valid) {
      const messages = [
        ...selectedValidation.errors,
        ...selectedValidation.items.flatMap((item) => item.errors.map((message) => `${item.key}: ${message}`)),
      ];
      setError(messages.join(' '));
      return;
    }

    setImporting(true);
    setError('');
    setSuccess('');
    try {
      const result = await importDiagnosticTaxonomy(selectedValidation.payload, conflictMode);
      setSuccess(`Importazione completata. Codici creati: ${result.created_codes || 0}, aggiornati: ${result.updated_codes || 0}, saltati: ${result.skipped_codes || 0}. Regole create: ${result.created_rules || 0}, aggiornate: ${result.updated_rules || 0}, saltate: ${result.skipped_rules || 0}.`);
      await loadRegistry();
      setValidation(null);
      setSelectedIds([]);
    } catch (importError) {
      setError(importError.message || 'Importazione non riuscita. Nessuna modifica è stata salvata.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <SEO title="Importa tassonomia diagnostica | Sblocco Inglese" description="Importa ed esporta codici, messaggi e regole diagnostiche." />
      <section className="section-shell py-8 lg:py-10">
        <div className="mx-auto max-w-[1500px]">
          <header className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-[#16211e] sm:p-8">
            <Link to="/admin/content/exercises/diagnostics" className="inline-flex items-center gap-2 text-sm font-black text-moss underline dark:text-emerald-300"><ArrowLeft className="h-4 w-4" />Torna alla diagnostica</Link>
            <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="eyebrow">Exercise Builder</span>
                <h1 className="mt-3 text-3xl font-black text-ink dark:text-white sm:text-4xl">Importa tassonomia diagnostica</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/65">Un solo JSON può contenere codici, messaggi bilingui, risorse consigliate e regole di aggregazione. L’importazione selezionata viene salvata in una sola transazione.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => downloadDiagnosticTaxonomy(DIAGNOSTIC_TAXONOMY_TEMPLATE, 'diagnostic-taxonomy-template.json')} className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-black text-ink dark:border-white/20 dark:bg-white/10 dark:text-white"><Download className="h-4 w-4" />Scarica template</button>
                <button type="button" disabled={loading} onClick={() => downloadDiagnosticTaxonomy(buildDiagnosticTaxonomyExport(registry), 'diagnostic-taxonomy-current.json')} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-black text-white disabled:opacity-50 dark:bg-emerald-300 dark:text-[#102019]"><Download className="h-4 w-4" />Esporta tassonomia corrente</button>
              </div>
            </div>
          </header>

          {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-950 dark:border-red-300/25 dark:bg-red-300/10 dark:text-red-100">{error}</div> : null}
          {success ? <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-950 dark:border-emerald-300/25 dark:bg-emerald-300/10 dark:text-emerald-100">{success}</div> : null}

          <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <section className="min-w-0 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Sorgente JSON</p><h2 className="mt-1 text-2xl font-black text-ink dark:text-white">Incolla o carica il file</h2></div>
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => readFile(event.target.files?.[0])} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-sm font-black text-ink dark:border-white/20 dark:text-white"><Upload className="h-4 w-4" />Carica JSON</button>
                  <button type="button" onClick={() => validateText()} className="inline-flex items-center gap-2 rounded-full bg-violet-700 px-4 py-2 text-sm font-black text-white"><FileJson2 className="h-4 w-4" />Valida</button>
                </div>
              </div>
              <label className="mt-5 block text-xs font-black text-ink/60 dark:text-white/60">Nome sorgente<input value={sourceName} onChange={(event) => setSourceName(event.target.value)} className={`${fieldClass} mt-2`} /></label>
              <textarea value={jsonText} onChange={(event) => { setJsonText(event.target.value); setValidation(null); }} spellCheck={false} className="mt-4 min-h-[38rem] w-full rounded-xl border border-ink/15 bg-[#101915] p-4 font-mono text-xs leading-6 text-emerald-50 outline-none focus:border-emerald-400" />
            </section>

            <aside className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] xl:sticky xl:top-24">
              <p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">Importazione</p>
              <h2 className="mt-1 text-xl font-black text-ink dark:text-white">Elementi selezionati</h2>
              <label className="mt-5 block text-xs font-black text-ink/60 dark:text-white/60">Conflitti<select value={conflictMode} onChange={(event) => setConflictMode(event.target.value)} className={`${fieldClass} mt-2`}><option value="update">Aggiorna quelli esistenti</option><option value="skip">Salta quelli esistenti</option></select></label>
              {validation ? (
                <>
                  <div className="mt-5 flex items-center justify-between gap-3"><span className="text-sm font-black text-ink dark:text-white">{selectedIds.length} selezionati</span><div className="flex gap-2"><button type="button" onClick={() => setSelectedIds(importableItems.map((item) => item.id))} className="text-xs font-black text-moss underline dark:text-emerald-300">Tutti validi</button><button type="button" onClick={() => setSelectedIds([])} className="text-xs font-black text-ink/55 underline dark:text-white/55">Nessuno</button></div></div>
                  <div className="mt-4 max-h-[33rem] space-y-2 overflow-y-auto pr-1">
                    {validation.items.map((item) => {
                      const valid = item.errors.length === 0;
                      return <label key={item.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${valid ? 'border-ink/10 dark:border-white/10' : 'border-red-200 bg-red-50/60 dark:border-red-300/20 dark:bg-red-300/[0.05]'}`}><input type="checkbox" checked={selectedIds.includes(item.id)} disabled={!valid} onChange={() => toggleItem(item.id)} className="mt-1" /><div className="min-w-0 flex-1"><div className="flex items-center gap-2">{valid ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-600" />}<span className="text-[0.68rem] font-black uppercase tracking-wide text-ink/45 dark:text-white/45">{itemLabel(item)}</span></div><p className="mt-1 break-all text-sm font-black text-ink dark:text-white">{item.key || 'Senza chiave'}</p>{item.existing ? <p className="mt-1 text-xs font-bold text-amber-700 dark:text-amber-200">Esiste già</p> : null}{item.errors.map((message) => <p key={message} className="mt-1 text-xs font-semibold text-red-700 dark:text-red-200">{message}</p>)}{item.warnings.map((message) => <p key={message} className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-200">{message}</p>)}</div></label>;
                    })}
                  </div>
                </>
              ) : <p className="mt-5 text-sm leading-6 text-ink/55 dark:text-white/55">Valida il JSON per vedere codici e regole importabili.</p>}
              <button type="button" disabled={importing || !validation || selectedIds.length === 0} onClick={importSelected} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-black text-white disabled:opacity-40 dark:bg-emerald-300 dark:text-[#102019]">{importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Importa selezionati</button>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
