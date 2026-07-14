import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Download,
  FileJson,
  FolderKanban,
  Layers3,
  LibraryBig,
  Loader2,
  Upload,
  XCircle,
} from 'lucide-react';
import SEO from '../components/SEO';
import { useAuth } from '../auth/AuthContext.jsx';
import {
  exerciseBuilderTemplates,
  stringifyExerciseBuilderTemplate,
  validateExerciseBuilderJson,
} from '../lib/exerciseBuilderSchema.js';
import {
  createExerciseBuilderImportBatch,
  loadExerciseBuilderOverview,
} from '../lib/exerciseBuilderApi.js';

const TEMPLATE_OPTIONS = [
  { key: 'question', label: 'Domanda' },
  { key: 'question_pool', label: 'Pool' },
  { key: 'exercise', label: 'Esercizio' },
  { key: 'bundle', label: 'Bundle completo' },
];

const EMPTY_OVERVIEW = {
  questionCount: 0,
  poolCount: 0,
  exerciseCount: 0,
  reviewCount: 0,
  recentBatches: [],
};

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function downloadJson(type) {
  const content = stringifyExerciseBuilderTemplate(type);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `exercise-builder-${type}-template.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function itemTitle(item) {
  if (item.entityType === 'question') return item.payload?.title || item.payload?.prompt || 'Domanda senza titolo';
  if (item.entityType === 'question_pool') return item.payload?.name || 'Pool senza nome';
  return item.payload?.title || 'Esercizio senza titolo';
}

function entityLabel(type) {
  if (type === 'question') return 'Domanda';
  if (type === 'question_pool') return 'Pool';
  if (type === 'exercise') return 'Esercizio';
  return type;
}

function statusMeta(status) {
  if (status === 'valid') {
    return {
      label: 'Valido',
      Icon: CheckCircle2,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-300/25 dark:bg-emerald-300/10 dark:text-emerald-200',
    };
  }
  if (status === 'warning') {
    return {
      label: 'Con avvisi',
      Icon: AlertTriangle,
      className: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100',
    };
  }
  return {
    label: 'Non valido',
    Icon: XCircle,
    className: 'border-red-200 bg-red-50 text-red-900 dark:border-red-300/25 dark:bg-red-300/10 dark:text-red-100',
  };
}

function SummaryCard({ icon: Icon, label, value, note }) {
  return (
    <article className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-ink/45 dark:text-white/45">{label}</p>
          <p className="mt-2 text-3xl font-black text-ink dark:text-white">{value}</p>
          <p className="mt-1 text-xs font-semibold text-ink/50 dark:text-white/50">{note}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-moss dark:bg-emerald-300/10 dark:text-emerald-200">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}

export default function AdminExerciseBuilder() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [overviewError, setOverviewError] = useState('');
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [jsonText, setJsonText] = useState(() => stringifyExerciseBuilderTemplate('bundle'));
  const [sourceName, setSourceName] = useState('Pasted JSON');
  const [validation, setValidation] = useState(null);
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedBatch, setSavedBatch] = useState(null);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);

  async function refreshOverview() {
    setLoadingOverview(true);
    setOverviewError('');
    try {
      const nextOverview = await loadExerciseBuilderOverview();
      setOverview(nextOverview);
    } catch (error) {
      setOverview(EMPTY_OVERVIEW);
      setOverviewError(error.message || 'Applica prima la migrazione Exercise Builder in Supabase.');
    } finally {
      setLoadingOverview(false);
    }
  }

  useEffect(() => {
    refreshOverview();
  }, []);

  const counts = useMemo(() => {
    const result = { valid: 0, warning: 0, invalid: 0 };
    (validation?.items || []).forEach((item) => {
      result[item.status] += 1;
    });
    return result;
  }, [validation]);

  const selectedCount = selectedIndexes.length;

  function replaceJson(nextText, nextSourceName = 'Pasted JSON') {
    setJsonText(nextText);
    setSourceName(nextSourceName);
    setValidation(null);
    setSelectedIndexes([]);
    setSaveError('');
    setSavedBatch(null);
  }

  function validateCurrentJson() {
    const result = validateExerciseBuilderJson(jsonText);
    setValidation(result);
    setSelectedIndexes(
      result.items
        .filter((item) => item.status !== 'invalid')
        .map((item) => item.index),
    );
    setSaveError('');
    setSavedBatch(null);
  }

  function toggleItem(item) {
    if (item.status === 'invalid') return;
    setSelectedIndexes((current) => (
      current.includes(item.index)
        ? current.filter((index) => index !== item.index)
        : [...current, item.index]
    ));
  }

  function selectAllImportable() {
    setSelectedIndexes(
      (validation?.items || [])
        .filter((item) => item.status !== 'invalid')
        .map((item) => item.index),
    );
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    replaceJson(content, file.name);
    event.target.value = '';
  }

  async function saveImportBatch() {
    if (!validation || validation.errors.length > 0 || selectedCount === 0) return;
    setSaving(true);
    setSaveError('');
    setSavedBatch(null);
    try {
      const batch = await createExerciseBuilderImportBatch({
        validation,
        rawPayload: jsonText,
        sourceName,
        selectedIndexes,
        createdBy: user?.id || null,
      });
      setSavedBatch(batch);
      await refreshOverview();
    } catch (error) {
      setSaveError(error.message || 'Non è stato possibile salvare il batch.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SEO title="Exercise Builder | Admin Sblocco Inglese" description="Importa, valida e revisiona domande, pool ed esercizi." />
      <div className="min-h-screen bg-paper px-4 py-7 dark:bg-[#0f1715] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1500px]">
          <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-moss dark:text-mint">Contenuti</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-ink dark:text-white sm:text-4xl">Exercise Builder</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/65">
                Importa JSON generati esternamente, valida ogni elemento e salva soltanto le bozze che vuoi revisionare. Questo spazio resta separato da English Foundations e dai Trainer.
              </p>
            </div>
            <div className="relative flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm font-black text-ink shadow-sm transition hover:border-moss dark:border-white/15 dark:bg-white/[0.07] dark:text-white"
              >
                <Upload aria-hidden="true" className="h-4 w-4" />
                Carica JSON
              </button>
              <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFile} />
              <button
                type="button"
                onClick={() => setTemplateMenuOpen((open) => !open)}
                className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-black text-white transition hover:bg-moss"
                aria-expanded={templateMenuOpen}
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                Template JSON
                <ChevronDown aria-hidden="true" className="h-4 w-4" />
              </button>
              {templateMenuOpen ? (
                <div className="absolute right-0 top-12 z-20 min-w-56 rounded-xl border border-ink/10 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#18231f]">
                  {TEMPLATE_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        downloadJson(option.key);
                        setTemplateMenuOpen(false);
                      }}
                      className="focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-ink transition hover:bg-linen dark:text-white dark:hover:bg-white/10"
                    >
                      <FileJson aria-hidden="true" className="h-4 w-4 text-moss dark:text-mint" />
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </header>

          <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={LibraryBig} label="Domande" value={loadingOverview ? '…' : overview.questionCount} note="Nella Question Bank" />
            <SummaryCard icon={Layers3} label="Pool" value={loadingOverview ? '…' : overview.poolCount} note="Raccolte riutilizzabili" />
            <SummaryCard icon={FolderKanban} label="Esercizi" value={loadingOverview ? '…' : overview.exerciseCount} note="Strutture versionate" />
            <SummaryCard icon={ClipboardCheck} label="Da revisionare" value={loadingOverview ? '…' : overview.reviewCount} note="Elementi selezionati nei batch" />
          </section>

          {overviewError ? (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-black">Database Exercise Builder non ancora disponibile</p>
                <p className="mt-1 font-semibold opacity-80">{overviewError}</p>
              </div>
            </div>
          ) : null}

          <section className="mt-7 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
            <article className="min-w-0 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-moss dark:text-mint">1. Sorgente</p>
                  <h2 className="mt-1 text-xl font-black text-ink dark:text-white">Incolla o modifica il JSON</h2>
                  <p className="mt-1 text-xs font-semibold text-ink/50 dark:text-white/50">{sourceName}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATE_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => replaceJson(JSON.stringify(exerciseBuilderTemplates[option.key], null, 2), `${option.label} template`)}
                      className="focus-ring rounded-lg border border-ink/10 bg-linen/60 px-3 py-2 text-xs font-black text-ink transition hover:border-moss dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                    >
                      Usa {option.label.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={jsonText}
                onChange={(event) => replaceJson(event.target.value, sourceName)}
                spellCheck="false"
                className="mt-4 min-h-[34rem] w-full resize-y rounded-xl border border-ink/15 bg-[#101915] p-4 font-mono text-xs leading-6 text-emerald-50 outline-none transition focus:border-emerald-400 sm:text-sm"
                aria-label="JSON Exercise Builder"
              />

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-xs font-semibold text-ink/55 dark:text-white/55">
                  <CircleHelp aria-hidden="true" className="h-4 w-4" />
                  Gli ID tecnici presenti nel JSON vengono ignorati.
                </p>
                <button
                  type="button"
                  onClick={validateCurrentJson}
                  className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-moss px-5 py-2.5 text-sm font-black text-white transition hover:bg-ink"
                >
                  <ClipboardCheck aria-hidden="true" className="h-4 w-4" />
                  Valida JSON
                </button>
              </div>
            </article>

            <div className="min-w-0 space-y-5">
              <article className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-moss dark:text-mint">2. Validazione</p>
                    <h2 className="mt-1 text-xl font-black text-ink dark:text-white">Elementi trovati</h2>
                  </div>
                  {validation ? (
                    <div className="flex gap-2 text-xs font-black">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200">{counts.valid} validi</span>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900 dark:bg-amber-300/10 dark:text-amber-100">{counts.warning} avvisi</span>
                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-900 dark:bg-red-300/10 dark:text-red-100">{counts.invalid} errori</span>
                    </div>
                  ) : null}
                </div>

                {!validation ? (
                  <div className="mt-4 rounded-xl border border-dashed border-ink/15 bg-linen/35 p-5 text-sm leading-6 text-ink/60 dark:border-white/15 dark:bg-white/[0.04] dark:text-white/60">
                    Valida il JSON per vedere domande, pool ed esercizi separatamente.
                  </div>
                ) : null}

                {validation?.errors.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-950 dark:border-red-300/25 dark:bg-red-300/10 dark:text-red-100">
                    <p className="font-black">Il file non può essere importato</p>
                    <ul className="mt-2 space-y-1 font-semibold">
                      {validation.errors.map((error) => <li key={error}>• {error}</li>)}
                    </ul>
                  </div>
                ) : null}

                {validation?.items.length > 0 ? (
                  <>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-black text-ink dark:text-white">{selectedCount} selezionati</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={selectAllImportable} className="focus-ring rounded-lg border border-ink/10 px-3 py-2 text-xs font-black text-ink dark:border-white/15 dark:text-white">Seleziona validi</button>
                        <button type="button" onClick={() => setSelectedIndexes([])} className="focus-ring rounded-lg border border-ink/10 px-3 py-2 text-xs font-black text-ink dark:border-white/15 dark:text-white">Deseleziona</button>
                      </div>
                    </div>
                    <div className="mt-3 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
                      {validation.items.map((item) => {
                        const meta = statusMeta(item.status);
                        const selected = selectedIndexes.includes(item.index);
                        return (
                          <article key={`${item.entityType}-${item.index}`} className={`rounded-xl border p-3 transition ${selected ? 'border-moss bg-mint/20 dark:border-emerald-300/35 dark:bg-emerald-300/[0.08]' : 'border-ink/10 bg-white dark:border-white/10 dark:bg-white/[0.03]'}`}>
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={selected}
                                disabled={item.status === 'invalid'}
                                onChange={() => toggleItem(item)}
                                className="mt-1 h-4 w-4 accent-emerald-700"
                                aria-label={`Seleziona ${itemTitle(item)}`}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[0.68rem] font-black uppercase tracking-[0.1em] text-moss dark:text-mint">{entityLabel(item.entityType)}</span>
                                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.68rem] font-black ${meta.className}`}>
                                    <meta.Icon aria-hidden="true" className="h-3 w-3" />
                                    {meta.label}
                                  </span>
                                </div>
                                <h3 className="mt-1 line-clamp-2 text-sm font-black text-ink dark:text-white">{itemTitle(item)}</h3>
                                {item.errors.length > 0 ? (
                                  <ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-red-800 dark:text-red-200">
                                    {item.errors.map((error) => <li key={error}>• {error}</li>)}
                                  </ul>
                                ) : null}
                                {item.warnings.length > 0 ? (
                                  <ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-amber-800 dark:text-amber-100">
                                    {item.warnings.map((warning) => <li key={warning}>• {warning}</li>)}
                                  </ul>
                                ) : null}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </>
                ) : null}
              </article>

              <article className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-moss dark:text-mint">3. Salvataggio</p>
                <h2 className="mt-1 text-xl font-black text-ink dark:text-white">Crea batch di revisione</h2>
                <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-white/60">
                  Il batch conserva il JSON originale e gli elementi normalizzati. Nessun ID pubblico viene ancora assegnato.
                </p>

                {savedBatch ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-300/25 dark:bg-emerald-300/10 dark:text-emerald-100">
                    <p className="font-black">Batch salvato</p>
                    <p className="mt-1 font-semibold opacity-80">{savedBatch.source_name} è pronto per la revisione.</p>
                  </div>
                ) : null}
                {saveError ? (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-950 dark:border-red-300/25 dark:bg-red-300/10 dark:text-red-100">{saveError}</div>
                ) : null}

                <button
                  type="button"
                  onClick={saveImportBatch}
                  disabled={saving || !validation || validation.errors.length > 0 || selectedCount === 0 || Boolean(overviewError)}
                  className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-sm font-black text-white transition hover:bg-moss disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ClipboardCheck aria-hidden="true" className="h-4 w-4" />}
                  Salva {selectedCount || 0} elementi da revisionare
                </button>
              </article>

              <article className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-moss dark:text-mint">Importazioni recenti</p>
                <div className="mt-3 space-y-2">
                  {overview.recentBatches.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-ink/15 p-4 text-sm font-semibold text-ink/50 dark:border-white/15 dark:text-white/50">Nessun batch salvato.</p>
                  ) : overview.recentBatches.map((batch) => (
                    <div key={batch.id} className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 px-3 py-3 dark:border-white/10">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-ink dark:text-white">{batch.source_name}</p>
                        <p className="mt-0.5 text-xs font-semibold text-ink/45 dark:text-white/45">{entityLabel(batch.entity_type)} · {formatDate(batch.created_at)}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-linen px-2.5 py-1 text-xs font-black text-ink dark:bg-white/10 dark:text-white">{batch.valid_count + batch.warning_count}</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
