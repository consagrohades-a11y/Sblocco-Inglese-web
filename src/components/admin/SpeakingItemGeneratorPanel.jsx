import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, RefreshCw, Sparkles, X } from 'lucide-react';
import { generateSpeakingItems } from '../../lib/adminSpeakingActivitiesApi.js';
import { analyseSpeakingItemSet, duplicateReasonLabel } from '../../lib/speakingItemQuality.js';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildCatalogueDigest(activities) {
  return asArray(activities).flatMap((activity) =>
    asArray(activity.prompts).map((item) => ({
      activity: activity.title,
      text: typeof item === 'string' ? item : item?.text || '',
      context_tags: typeof item === 'string' ? [] : asArray(item?.context_tags),
      language_targets: typeof item === 'string' ? [] : asArray(item?.language_targets),
    })),
  ).filter((item) => item.text);
}

function LevelPicker({ value, onChange }) {
  const selected = asArray(value);
  return (
    <div className="flex flex-wrap gap-2">
      {LEVELS.map((level) => {
        const active = selected.includes(level);
        return (
          <button
            key={level}
            type="button"
            onClick={() => onChange(active ? selected.filter((item) => item !== level) : [...selected, level])}
            className={`focus-ring min-h-9 rounded-full border px-3 text-xs font-black transition ${
              active
                ? 'border-clay bg-blush text-clay dark:border-coral/40 dark:bg-coral/10 dark:text-coral'
                : 'border-ink/15 bg-white text-ink/55 dark:border-white/15 dark:bg-white/[0.04] dark:text-white/55'
            }`}
            aria-pressed={active}
          >
            {level}
          </button>
        );
      })}
    </div>
  );
}

export default function SpeakingItemGeneratorPanel({
  activity,
  catalogActivities = [],
  onAddItems,
  onClose,
}) {
  const [levels, setLevels] = useState(() => {
    const available = asArray(activity?.levels);
    return available.length ? available : ['B1'];
  });
  const [count, setCount] = useState(6);
  const [contexts, setContexts] = useState('');
  const [extraDirection, setExtraDirection] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(new Set());

  const quality = useMemo(() => {
    if (!result?.items?.length) return { blocking: [], warnings: [] };
    return analyseSpeakingItemSet(result.items, catalogActivities);
  }, [catalogActivities, result]);

  const blockedIndexes = useMemo(
    () => new Set(quality.blocking.map((match) => match.candidate.candidateIndex)),
    [quality.blocking],
  );
  const warningIndexes = useMemo(
    () => new Set(quality.warnings.map((match) => match.candidate.candidateIndex)),
    [quality.warnings],
  );

  async function generate() {
    if (!levels.length) {
      setError('Seleziona almeno un livello.');
      return;
    }

    setGenerating(true);
    setError('');
    setResult(null);
    setSelected(new Set());

    try {
      const generated = await generateSpeakingItems({
        activity,
        levels,
        count,
        contexts: contexts.split(',').map((item) => item.trim()).filter(Boolean),
        extraDirection,
        catalogue: buildCatalogueDigest(catalogActivities),
      });

      setResult(generated);

      const provisionalQuality = analyseSpeakingItemSet(generated.items, catalogActivities);
      const blocked = new Set(provisionalQuality.blocking.map((match) => match.candidate.candidateIndex));
      setSelected(new Set(generated.items.map((_, index) => index).filter((index) => !blocked.has(index))));
    } catch (generateError) {
      setError(generateError.message || 'Non è stato possibile generare nuovi item.');
    } finally {
      setGenerating(false);
    }
  }

  function toggle(index) {
    if (blockedIndexes.has(index)) return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function addSelected() {
    if (!result?.items?.length || !selected.size) return;
    const items = result.items.filter((_, index) => selected.has(index) && !blockedIndexes.has(index));
    onAddItems(items);
  }

  return (
    <div className="fixed inset-0 z-[150] overflow-y-auto bg-ink/65 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto my-3 max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-paper shadow-2xl dark:bg-surface-950">
        <header className="flex items-start justify-between gap-4 border-b border-ink/10 px-5 py-5 dark:border-white/10 sm:px-7">
          <div>
            <div className="flex items-center gap-2 text-clay dark:text-coral">
              <Sparkles className="h-4 w-4" />
              <p className="text-xs font-black uppercase tracking-[0.15em]">AI item generator</p>
            </div>
            <h2 className="mt-2 text-2xl font-black">{activity?.title}</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-ink/60 dark:text-white/60">
              Genera una proposta, controlla i duplicati e scegli tu cosa aggiungere. Nulla viene salvato automaticamente.
            </p>
          </div>
          <button type="button" onClick={onClose} className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-ink/10 dark:border-white/10" aria-label="Chiudi">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <aside className="grid content-start gap-5">
            <section className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-surface-900">
              <p className="text-xs font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Livelli</p>
              <div className="mt-3">
                <LevelPicker value={levels} onChange={setLevels} />
              </div>

              <label className="mt-5 block">
                <span className="text-xs font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Quanti item</span>
                <select
                  value={count}
                  onChange={(event) => setCount(Number(event.target.value))}
                  className="focus-ring mt-2 w-full rounded-xl border border-ink/15 bg-paper px-3 py-3 text-sm font-black dark:border-white/15 dark:bg-white/[0.05]"
                >
                  {[4, 6, 8, 10, 12].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>

              <label className="mt-4 block">
                <span className="text-xs font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Contesti preferiti</span>
                <input
                  value={contexts}
                  onChange={(event) => setContexts(event.target.value)}
                  placeholder="work, travel, daily-life"
                  className="focus-ring mt-2 w-full rounded-xl border border-ink/15 bg-paper px-3 py-3 text-sm font-semibold dark:border-white/15 dark:bg-white/[0.05]"
                />
                <span className="mt-1.5 block text-[0.68rem] font-semibold leading-5 text-ink/40 dark:text-white/40">Opzionale · separati da virgola.</span>
              </label>

              <label className="mt-4 block">
                <span className="text-xs font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Direzione extra</span>
                <textarea
                  rows={4}
                  value={extraDirection}
                  onChange={(event) => setExtraDirection(event.target.value)}
                  placeholder="Es. più business, più ironici, evita travel…"
                  className="focus-ring mt-2 w-full rounded-xl border border-ink/15 bg-paper px-3 py-3 text-sm font-semibold dark:border-white/15 dark:bg-white/[0.05]"
                />
              </label>

              <button
                type="button"
                onClick={generate}
                disabled={generating || !levels.length}
                className="focus-ring mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white disabled:opacity-40 dark:bg-clay"
              >
                {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? 'Generating…' : result ? 'Generate again' : 'Generate items'}
              </button>

              <div className="mt-4 rounded-xl bg-linen/65 p-3 text-[0.68rem] font-semibold leading-5 text-ink/55 dark:bg-white/[0.05] dark:text-white/55">
                Nessun nome, nota learner o dato dello studente viene inviato all’AI. Il limite è 12 item per richiesta.
              </div>
            </section>
          </aside>

          <main className="min-w-0">
            {error ? (
              <div className="border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-950 dark:bg-red-400/10 dark:text-red-100">
                {error}
              </div>
            ) : null}

            {!result && !generating ? (
              <div className="grid min-h-72 place-items-center rounded-3xl border border-dashed border-ink/15 bg-white p-8 text-center dark:border-white/15 dark:bg-surface-900">
                <div>
                  <Sparkles className="mx-auto h-7 w-7 text-clay" />
                  <p className="mt-3 text-lg font-black">Generate a fresh batch</p>
                  <p className="mt-1 max-w-md text-sm font-semibold leading-6 text-ink/55 dark:text-white/55">
                    L’AI usa le direttive Sblocco, gli item esistenti e il catalogo per cercare varietà reale.
                  </p>
                </div>
              </div>
            ) : null}

            {generating ? (
              <div className="grid min-h-72 place-items-center rounded-3xl border border-ink/10 bg-white p-8 text-center dark:border-white/10 dark:bg-surface-900">
                <div>
                  <RefreshCw className="mx-auto h-7 w-7 animate-spin text-clay" />
                  <p className="mt-3 text-lg font-black">Creating new items…</p>
                  <p className="mt-1 text-sm font-semibold text-ink/50 dark:text-white/50">Sto controllando anche varietà di contesto e funzione comunicativa.</p>
                </div>
              </div>
            ) : null}

            {result ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-clay dark:text-coral">Preview</p>
                    <h3 className="mt-1 text-xl font-black">{result.items.length} item generati</h3>
                    {result.usage ? (
                      <p className="mt-1 text-xs font-semibold text-ink/45 dark:text-white/45">
                        {result.model} · {result.usage.total_tokens?.toLocaleString('it-IT') || 0} token
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-black">
                    <span className="rounded-full bg-mint/70 px-3 py-1.5 dark:bg-emerald-300/10 dark:text-emerald-100">
                      {selected.size} selezionati
                    </span>
                    {quality.warnings.length ? <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-900 dark:bg-amber-300/10 dark:text-amber-100">{quality.warnings.length} da controllare</span> : null}
                    {quality.blocking.length ? <span className="rounded-full bg-red-100 px-3 py-1.5 text-red-900 dark:bg-red-400/10 dark:text-red-100">{quality.blocking.length} bloccati</span> : null}
                  </div>
                </div>

                <div className="grid gap-3">
                  {result.items.map((item, index) => {
                    const blocked = blockedIndexes.has(index);
                    const warning = warningIndexes.has(index);
                    const checked = selected.has(index);
                    const relevantConflict = [...quality.blocking, ...quality.warnings]
                      .find((match) => match.candidate.candidateIndex === index);

                    return (
                      <button
                        key={`${index}-${item.text}`}
                        type="button"
                        onClick={() => toggle(index)}
                        disabled={blocked}
                        className={`focus-ring w-full rounded-2xl border p-4 text-left transition ${
                          blocked
                            ? 'cursor-not-allowed border-red-200 bg-red-50/70 opacity-70 dark:border-red-400/20 dark:bg-red-400/[0.06]'
                            : checked
                              ? 'border-clay/40 bg-blush/35 dark:border-coral/30 dark:bg-coral/[0.06]'
                              : 'border-ink/10 bg-white hover:border-clay/25 dark:border-white/10 dark:bg-surface-900'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                            blocked
                              ? 'border-red-300 text-red-700'
                              : checked
                                ? 'border-clay bg-clay text-white'
                                : 'border-ink/20 text-transparent dark:border-white/20'
                          }`}>
                            {blocked ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap gap-1.5">
                              {asArray(item.levels).map((level) => <span key={level} className="rounded-full bg-linen px-2 py-1 text-[0.65rem] font-black dark:bg-white/10">{level}</span>)}
                              <span className="rounded-full bg-linen px-2 py-1 text-[0.65rem] font-black dark:bg-white/10">D{item.difficulty}</span>
                              {warning ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[0.65rem] font-black text-amber-900 dark:bg-amber-300/10 dark:text-amber-100"><AlertTriangle className="h-3 w-3" /> simile</span> : null}
                              {blocked ? <span className="rounded-full bg-red-100 px-2 py-1 text-[0.65rem] font-black text-red-900 dark:bg-red-400/10 dark:text-red-100">duplicate</span> : null}
                            </span>
                            <strong className="mt-2 block whitespace-pre-wrap text-sm leading-6">{item.text}</strong>
                            {item.student_support ? <span className="mt-2 block text-xs font-semibold leading-5 text-ink/55 dark:text-white/55"><strong>Support:</strong> {item.student_support}</span> : null}
                            {item.challenge ? <span className="mt-1 block text-xs font-semibold leading-5 text-ink/55 dark:text-white/55"><strong>Challenge:</strong> {item.challenge}</span> : null}
                            <span className="mt-2 flex flex-wrap gap-1.5">
                              {asArray(item.context_tags).map((tag) => <span key={`c-${tag}`} className="text-[0.65rem] font-bold text-ink/45 dark:text-white/45">#{tag}</span>)}
                              {asArray(item.language_targets).map((tag) => <span key={`l-${tag}`} className="text-[0.65rem] font-bold text-clay dark:text-coral">#{tag}</span>)}
                            </span>
                            {relevantConflict ? (
                              <span className={`mt-2 block text-xs font-bold ${blocked ? 'text-red-700 dark:text-red-200' : 'text-amber-800 dark:text-amber-200'}`}>
                                {duplicateReasonLabel(relevantConflict.reason)} · {relevantConflict.existing.activityTitle || 'catalogo'} item {Number(relevantConflict.existing.itemIndex) + 1}
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="sticky bottom-0 mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 bg-paper/95 py-4 backdrop-blur dark:border-white/10 dark:bg-surface-950/95">
                  <p className="text-xs font-semibold text-ink/45 dark:text-white/45">Gli item selezionati entrano nel draft: puoi ancora modificarli prima del salvataggio finale.</p>
                  <button
                    type="button"
                    onClick={addSelected}
                    disabled={!selected.size}
                    className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white disabled:opacity-35 dark:bg-clay"
                  >
                    <Check className="h-4 w-4" />
                    Aggiungi {selected.size || ''} al gioco
                  </button>
                </div>
              </>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
