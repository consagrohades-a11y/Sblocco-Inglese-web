import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileJson2, Upload, X } from 'lucide-react';
import { updateSpeakingActivity } from '../../lib/adminSpeakingActivitiesApi.js';
import { analyseSpeakingItemSet, duplicateReasonLabel } from '../../lib/speakingItemQuality.js';
import {
  SPEAKING_ROUND_FORMATS,
  normalizeSpeakingRoundBlock,
  validateSpeakingRoundBlock,
} from '../../lib/speakingRoundContract.js';

const LEVELS = ['A0','A1','A1+','A2','B1','B1+','B2','C1','C2','Mixed'];
const STRUCTURED_FORMATS = new Set(SPEAKING_ROUND_FORMATS.map((item) => item.id));

function asArray(value) { return Array.isArray(value) ? value : []; }
function uniqueStrings(value) {
  return Array.from(new Set(asArray(value).map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)));
}
function normaliseItem(item, activity) {
  const source = typeof item === 'string' ? { text: item } : (item || {});
  const requestedLevels = asArray(source.levels).map((level) => String(level || '').trim()).filter(Boolean);
  const validLevels = LEVELS.filter((level) => requestedLevels.some((requested) => requested.toLowerCase() === level.toLowerCase()));
  const fallbackLevels = LEVELS.filter((level) => asArray(activity.levels).includes(level));
  const base = {
    ...source,
    levels: requestedLevels.length ? validLevels : fallbackLevels,
    context_tags: uniqueStrings(source.context_tags),
    language_targets: uniqueStrings(source.language_targets),
    difficulty: Math.min(5, Math.max(1, Number(source.difficulty || 2))),
    _invalidLevels: requestedLevels.filter((requested) => !LEVELS.some((level) => level.toLowerCase() === requested.toLowerCase())),
  };

  if (STRUCTURED_FORMATS.has(source.format)) {
    const round = normalizeSpeakingRoundBlock(source);
    return {
      ...base,
      ...round,
      text: String(source.text || round.title || round.instructions || '').trim(),
      levels: base.levels,
      context_tags: base.context_tags,
      language_targets: base.language_targets,
      difficulty: base.difficulty,
      _invalidLevels: base._invalidLevels,
    };
  }

  return {
    ...base,
    text: String(source.text || '').trim(),
    student_support: String(source.student_support || source.support || '').trim(),
    challenge: typeof source.challenge === 'string' ? source.challenge.trim() : '',
    teacher_note: String(source.teacher_note || '').trim(),
  };
}
function extractGroups(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') throw new Error('Il file deve contenere JSON valido.');
  if (Array.isArray(payload.activities)) return payload.activities;
  if (payload.activity || payload.activity_title || payload.activity_id || payload.title) return [payload];
  throw new Error('Formato non riconosciuto. Usa activities[] come indicato nel file authoring.');
}
function groupItems(group) { return Array.isArray(group?.items) ? group.items : Array.isArray(group?.prompts) ? group.prompts : []; }
function activityLabel(group) { return String(group?.activity || group?.activity_title || group?.title || '').trim(); }
function findActivity(group, activities) {
  if (group?.activity_id) {
    const byId = activities.find((activity) => activity.id === group.activity_id);
    if (byId) return byId;
  }
  const label = activityLabel(group).toLowerCase();
  return label ? activities.find((activity) => String(activity.title || '').trim().toLowerCase() === label) || null : null;
}
function buildPlans(payload, activities) {
  const groups = extractGroups(payload);
  const workingCatalog = activities.map((activity) => ({ ...activity, prompts: [...asArray(activity.prompts)] }));
  return groups.map((group, groupIndex) => {
    const activity = findActivity(group, workingCatalog);
    const errors = [];
    if (!activity) {
      errors.push(`Attività non trovata: ${activityLabel(group) || group.activity_id || `gruppo ${groupIndex + 1}`}.`);
      return { groupIndex, activity: null, items: [], errors, blocking: [], warnings: [] };
    }
    const rawItems = groupItems(group);
    if (!rawItems.length) {
      errors.push('Nessun item nel gruppo.');
      return { groupIndex, activity, items: [], errors, blocking: [], warnings: [] };
    }
    const normalised = rawItems.map((item) => normaliseItem(item, activity));
    normalised.forEach((item, itemIndex) => {
      if (!item.text) errors.push(`Item ${itemIndex + 1}: manca un prompt o un titolo utilizzabile.`);
      if (!item.levels.length) errors.push(`Item ${itemIndex + 1}: manca almeno un livello CEFR valido.`);
      if (item._invalidLevels.length) errors.push(`Item ${itemIndex + 1}: livelli non validi: ${item._invalidLevels.join(', ')}.`);
      if (STRUCTURED_FORMATS.has(item.format)) {
        validateSpeakingRoundBlock(item).forEach((issue) => errors.push(`Item ${itemIndex + 1}: ${issue.message}`));
      }
    });
    const items = normalised.map(({ _invalidLevels, ...item }) => item);
    const quality = errors.length ? { blocking: [], warnings: [] } : analyseSpeakingItemSet(items, workingCatalog);
    if (!errors.length) {
      const target = workingCatalog.find((candidate) => candidate.id === activity.id);
      target.prompts = [...asArray(target.prompts), ...items];
    }
    return { groupIndex, activity, items, errors, blocking: quality.blocking, warnings: quality.warnings };
  });
}

function itemKey(groupIndex, itemIndex) {
  return `${groupIndex}:${itemIndex}`;
}

function matchIsActive(match, plan, skippedItems) {
  if (skippedItems.has(itemKey(plan.groupIndex, match.candidate.candidateIndex))) return false;
  if (
    match.existing.activityTitle === 'Questa attività'
    && Number.isInteger(match.existing.itemIndex)
    && skippedItems.has(itemKey(plan.groupIndex, match.existing.itemIndex))
  ) return false;
  return true;
}

function activePlanErrors(plan, skippedItems) {
  return plan.errors.filter((message) => {
    const itemMatch = String(message).match(/^Item (\d+):/);
    if (!itemMatch) return true;
    return !skippedItems.has(itemKey(plan.groupIndex, Number(itemMatch[1]) - 1));
  });
}

function itemDiagnostic(plan, itemIndex, skippedItems) {
  const key = itemKey(plan.groupIndex, itemIndex);
  if (skippedItems.has(key)) return { severity: 'skip', label: 'Saltato' };

  const blocking = plan.blocking.filter(
    (match) => match.candidate.candidateIndex === itemIndex && matchIsActive(match, plan, skippedItems),
  );
  if (blocking.length) {
    return {
      severity: 'block',
      label: duplicateReasonLabel(blocking[0].reason),
      count: blocking.length,
      matches: blocking,
    };
  }

  const warnings = plan.warnings.filter(
    (match) => match.candidate.candidateIndex === itemIndex && matchIsActive(match, plan, skippedItems),
  );
  if (warnings.length) {
    return {
      severity: 'warn',
      label: duplicateReasonLabel(warnings[0].reason),
      count: warnings.length,
      matches: warnings,
    };
  }

  return { severity: 'ready', label: 'Pronto' };
}

export default function SpeakingItemImportModal({ activities = [], onClose, onImported }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [plans, setPlans] = useState([]);
  const [parseError, setParseError] = useState('');
  const [acceptedItems, setAcceptedItems] = useState(() => new Set());
  const [skippedItems, setSkippedItems] = useState(() => new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const totals = useMemo(() => {
    const summary = {
      originalItems: 0,
      items: 0,
      skipped: 0,
      flagged: 0,
      unresolved: 0,
      errors: 0,
    };

    plans.forEach((plan) => {
      summary.originalItems += plan.items.length;
      summary.errors += activePlanErrors(plan, skippedItems).length;

      plan.items.forEach((_, itemIndex) => {
        const diagnostic = itemDiagnostic(plan, itemIndex, skippedItems);
        if (diagnostic.severity === 'skip') {
          summary.skipped += 1;
          return;
        }
        summary.items += 1;
        if (diagnostic.severity === 'block' || diagnostic.severity === 'warn') {
          summary.flagged += 1;
          if (!acceptedItems.has(itemKey(plan.groupIndex, itemIndex))) summary.unresolved += 1;
        }
      });
    });

    return summary;
  }, [acceptedItems, plans, skippedItems]);

  const canImport = plans.length > 0
    && totals.items > 0
    && totals.errors === 0
    && totals.unresolved === 0
    && !saving;

  async function readFile(file) {
    if (!file) return;
    setFileName(file.name);
    setParseError('');
    setSaveError('');
    setPlans([]);
    setAcceptedItems(new Set());
    setSkippedItems(new Set());
    try {
      const payload = JSON.parse(await file.text());
      setPlans(buildPlans(payload, activities));
    } catch (error) {
      setParseError(error.message || 'File JSON non valido.');
    }
  }

  function toggleSkipped(groupIndex, itemIndex) {
    const key = itemKey(groupIndex, itemIndex);
    setSkippedItems((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setAcceptedItems((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  }

  function acceptFlaggedItem(groupIndex, itemIndex) {
    const key = itemKey(groupIndex, itemIndex);
    setSkippedItems((current) => {
      if (!current.has(key)) return current;
      const next = new Set(current);
      next.delete(key);
      return next;
    });
    setAcceptedItems((current) => new Set(current).add(key));
  }

  async function importItems() {
    if (!canImport) return;
    setSaving(true);
    setSaveError('');
    const updated = new Map();
    try {
      for (const plan of plans) {
        if (!plan.activity || !plan.items.length) continue;
        const selectedItems = plan.items.filter((_, itemIndex) => !skippedItems.has(itemKey(plan.groupIndex, itemIndex)));
        if (!selectedItems.length) continue;

        const current = updated.get(plan.activity.id) || plan.activity;
        const prompts = [...asArray(current.prompts), ...selectedItems];
        const levels = LEVELS.filter((level) => prompts.some((item) => (
          typeof item === 'string'
            ? asArray(current.levels).includes(level)
            : asArray(item?.levels).includes(level)
        )));
        const saved = await updateSpeakingActivity(plan.activity.id, { prompts, levels });
        updated.set(saved.id, saved);
      }
      onImported?.(Array.from(updated.values()));
      onClose?.();
    } catch (error) {
      setSaveError(error.message || 'Import interrotto. Controlla la libreria prima di riprovare.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[135] overflow-y-auto bg-ink/60 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto my-6 max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-paper shadow-2xl dark:bg-surface-950">
        <header className="flex items-start justify-between gap-4 border-b border-ink/10 px-5 py-5 dark:border-white/10 sm:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-clay dark:text-coral">Speaking library</p>
            <h2 className="mt-1 text-2xl font-black">Importa nuovi item</h2>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-ink/65 dark:text-white/65">
              Solo file .json. Le somiglianze sono segnalazioni, non decisioni automatiche: per ogni item puoi importare comunque oppure saltarlo. Nulla viene sovrascritto o cancellato.
            </p>
          </div>
          <button type="button" onClick={onClose} className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-ink/10 bg-white dark:border-white/10 dark:bg-white/10" aria-label="Chiudi"><X className="h-4 w-4" /></button>
        </header>

        <div className="p-5 sm:p-7">
          <input ref={inputRef} type="file" accept=".json,application/json,text/json" className="hidden" onChange={(event) => readFile(event.target.files?.[0])} />
          <button type="button" onClick={() => inputRef.current?.click()} className="focus-ring inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white dark:bg-clay">
            <Upload className="h-4 w-4" /> Scegli file JSON
          </button>
          {fileName ? <span className="ml-3 text-xs font-bold text-ink/55 dark:text-white/55">{fileName}</span> : null}

          {parseError ? <div className="mt-4 border-l-4 border-red-500 bg-red-50 p-4 text-sm font-bold text-red-950 dark:bg-red-400/10 dark:text-red-100">{parseError}</div> : null}
          {saveError ? <div className="mt-4 border-l-4 border-red-500 bg-red-50 p-4 text-sm font-bold text-red-950 dark:bg-red-400/10 dark:text-red-100">{saveError}</div> : null}

          {plans.length ? (
            <div className="mt-5 grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-linen px-3 py-1.5 text-xs font-black dark:bg-white/10">{totals.originalItems} nel file</span>
                <span className="rounded-full bg-linen px-3 py-1.5 text-xs font-black dark:bg-white/10">{totals.items} da importare</span>
                {totals.skipped ? <span className="rounded-full bg-ink/10 px-3 py-1.5 text-xs font-black text-ink/65 dark:bg-white/10 dark:text-white/70">{totals.skipped} saltati</span> : null}
                {totals.flagged ? <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-900 dark:bg-amber-300/10 dark:text-amber-100">{totals.flagged} segnalati</span> : null}
                {totals.unresolved ? <span className="rounded-full bg-clay/10 px-3 py-1.5 text-xs font-black text-clay dark:bg-coral/10 dark:text-coral">{totals.unresolved} da decidere</span> : null}
                {!totals.errors && !totals.unresolved ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-100"><CheckCircle2 className="h-3.5 w-3.5" /> Pronto per l'import</span> : null}
              </div>

              {plans.map((plan) => {
                const activeErrors = activePlanErrors(plan, skippedItems);
                const activeCount = plan.items.filter((_, itemIndex) => !skippedItems.has(itemKey(plan.groupIndex, itemIndex))).length;

                return (
                  <section key={plan.groupIndex} className="rounded-2xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-surface-900">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black">{plan.activity?.title || `Gruppo ${plan.groupIndex + 1}`}</p>
                      <span className="text-xs font-black text-ink/45 dark:text-white/45">{activeCount}/{plan.items.length} da importare</span>
                    </div>

                    {activeErrors.map((message) => <p key={message} className="mt-2 text-xs font-bold text-red-700 dark:text-red-200">• {message}</p>)}

                    {plan.items.length ? (
                      <div className="mt-4 max-h-[30rem] overflow-y-auto rounded-xl border border-ink/10 dark:border-white/10">
                        {plan.items.map((item, itemIndex) => {
                          const diagnostic = itemDiagnostic(plan, itemIndex, skippedItems);
                          const key = itemKey(plan.groupIndex, itemIndex);
                          const skipped = diagnostic.severity === 'skip';
                          const flagged = diagnostic.severity === 'block' || diagnostic.severity === 'warn';
                          const accepted = flagged && acceptedItems.has(key);
                          const statusClass = accepted
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-100'
                            : diagnostic.severity === 'block'
                            ? 'bg-red-100 text-red-800 dark:bg-red-400/10 dark:text-red-100'
                            : diagnostic.severity === 'warn'
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-300/10 dark:text-amber-100'
                              : diagnostic.severity === 'skip'
                                ? 'bg-ink/10 text-ink/55 dark:bg-white/10 dark:text-white/55'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-100';

                          return (
                            <div key={itemIndex} className={`flex gap-3 border-b border-ink/10 p-3 last:border-b-0 dark:border-white/10 ${skipped ? 'opacity-60' : ''}`}>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-black text-ink/45 dark:text-white/45">Item {itemIndex + 1}</span>
                                  <span className={`rounded-full px-2 py-0.5 text-[0.68rem] font-black ${statusClass}`}>{accepted ? 'Scelto: importa' : diagnostic.label}</span>
                                  {diagnostic.count > 1 ? <span className="text-[0.68rem] font-bold text-ink/40 dark:text-white/40">+{diagnostic.count - 1} match</span> : null}
                                </div>
                                <p className={`mt-1.5 text-sm font-bold leading-5 ${skipped ? 'line-through' : ''}`}>{item.text || 'Item senza testo'}</p>

                                {!skipped && asArray(diagnostic.matches).length ? (
                                  <div className="mt-3 grid gap-2">
                                    <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-ink/45 dark:text-white/45">
                                      Somiglia a
                                    </p>
                                    {diagnostic.matches.slice(0, 4).map((match, matchIndex) => {
                                      const sameImport = match.existing.activityTitle === 'Questa attività';
                                      const sourceLabel = sameImport
                                        ? `Questo file · item ${Number(match.existing.itemIndex) + 1}`
                                        : `${match.existing.activityTitle || 'Libreria esistente'}${Number.isInteger(match.existing.itemIndex) ? ` · item ${match.existing.itemIndex + 1}` : ''}`;

                                      return (
                                        <div key={matchIndex} className="rounded-xl border border-ink/10 bg-paper/70 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[0.68rem] font-black text-clay dark:text-coral">{sourceLabel}</span>
                                            <span className="text-[0.65rem] font-bold text-ink/40 dark:text-white/40">{duplicateReasonLabel(match.reason)}</span>
                                          </div>
                                          <p className="mt-1 text-xs font-semibold leading-5 text-ink/70 dark:text-white/70">
                                            {match.existing.text || 'Testo non disponibile'}
                                          </p>
                                        </div>
                                      );
                                    })}
                                    {diagnostic.matches.length > 4 ? (
                                      <p className="text-[0.68rem] font-bold text-ink/45 dark:text-white/45">
                                        +{diagnostic.matches.length - 4} altre segnalazioni da controllare
                                      </p>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 flex-col gap-2">
                                {flagged && !skipped ? (
                                  <button
                                    type="button"
                                    onClick={() => acceptFlaggedItem(plan.groupIndex, itemIndex)}
                                    className={`focus-ring h-9 rounded-full px-3 text-xs font-black ${accepted ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-100' : 'bg-ink text-white dark:bg-clay'}`}
                                  >
                                    {accepted ? 'Importa ✓' : 'Importa comunque'}
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => toggleSkipped(plan.groupIndex, itemIndex)}
                                  className="focus-ring h-9 rounded-full border border-ink/15 px-3 text-xs font-black dark:border-white/15"
                                >
                                  {skipped ? 'Ripristina' : 'Salta'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </section>
                );
              })}

            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-ink/10 bg-white px-5 py-4 dark:border-white/10 dark:bg-surface-900">
          <p className="text-xs font-semibold text-ink/50 dark:text-white/50">
            <FileJson2 className="mr-1 inline h-3.5 w-3.5" /> Append-only · ogni segnalazione resta una scelta pedagogica tua.
          </p>
          <button type="button" disabled={!canImport} onClick={importItems} className="focus-ring min-h-11 rounded-full bg-ink px-5 text-xs font-black text-white disabled:opacity-35 dark:bg-clay">
            {saving ? 'Importazione…' : `Importa ${totals.items || ''} item`}
          </button>
        </footer>
      </div>
    </div>
  );
}
