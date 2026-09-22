import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileJson2, Upload, X } from 'lucide-react';
import { updateSpeakingActivity } from '../../lib/adminSpeakingActivitiesApi.js';
import { analyseSpeakingItemSet, duplicateReasonLabel } from '../../lib/speakingItemQuality.js';

const LEVELS = ['A1','A2','B1','B2','C1','C2'];

function asArray(value) { return Array.isArray(value) ? value : []; }
function uniqueStrings(value) {
  return Array.from(new Set(asArray(value).map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)));
}
function normaliseItem(item, activity) {
  const source = typeof item === 'string' ? { text: item } : (item || {});
  const requestedLevels = asArray(source.levels).map((level) => String(level || '').trim().toUpperCase()).filter(Boolean);
  const validLevels = LEVELS.filter((level) => requestedLevels.includes(level));
  const fallbackLevels = LEVELS.filter((level) => asArray(activity.levels).includes(level));
  return {
    text: String(source.text || '').trim(),
    levels: requestedLevels.length ? validLevels : fallbackLevels,
    student_support: String(source.student_support || source.support || '').trim(),
    challenge: String(source.challenge || '').trim(),
    teacher_note: String(source.teacher_note || '').trim(),
    context_tags: uniqueStrings(source.context_tags),
    language_targets: uniqueStrings(source.language_targets),
    difficulty: Math.min(5, Math.max(1, Number(source.difficulty || 2))),
    _invalidLevels: requestedLevels.filter((level) => !LEVELS.includes(level)),
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
      if (!item.text) errors.push(`Item ${itemIndex + 1}: manca text.`);
      if (!item.levels.length) errors.push(`Item ${itemIndex + 1}: manca almeno un livello CEFR valido.`);
      if (item._invalidLevels.length) errors.push(`Item ${itemIndex + 1}: livelli non validi: ${item._invalidLevels.join(', ')}.`);
    });
    const items = normalised.map(({ _invalidLevels, ...item }) => item);
    const quality = errors.length ? { blocking: [], warnings: [] } : analyseSpeakingItemSet(items, workingCatalog);
    if (!errors.length && !quality.blocking.length) {
      const target = workingCatalog.find((candidate) => candidate.id === activity.id);
      target.prompts = [...asArray(target.prompts), ...items];
    }
    return { groupIndex, activity, items, errors, blocking: quality.blocking, warnings: quality.warnings };
  });
}

export default function SpeakingItemImportModal({ activities = [], onClose, onImported }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [plans, setPlans] = useState([]);
  const [parseError, setParseError] = useState('');
  const [allowWarnings, setAllowWarnings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const totals = useMemo(() => plans.reduce((acc, plan) => {
    acc.items += plan.items.length;
    acc.blocking += plan.blocking.length;
    acc.warnings += plan.warnings.length;
    acc.errors += plan.errors.length;
    return acc;
  }, { items: 0, blocking: 0, warnings: 0, errors: 0 }), [plans]);

  const canImport = plans.length > 0 && totals.items > 0 && totals.errors === 0 && totals.blocking === 0 && (totals.warnings === 0 || allowWarnings) && !saving;

  async function readFile(file) {
    if (!file) return;
    setFileName(file.name);
    setParseError('');
    setSaveError('');
    setPlans([]);
    setAllowWarnings(false);
    try {
      const payload = JSON.parse(await file.text());
      setPlans(buildPlans(payload, activities));
    } catch (error) {
      setParseError(error.message || 'File JSON non valido.');
    }
  }

  async function importItems() {
    if (!canImport) return;
    setSaving(true);
    setSaveError('');
    const updated = new Map();
    try {
      for (const plan of plans) {
        if (!plan.activity || !plan.items.length) continue;
        const current = updated.get(plan.activity.id) || plan.activity;
        const prompts = [...asArray(current.prompts), ...plan.items];
        const levels = LEVELS.filter((level) => prompts.some((item) => typeof item === 'string' ? asArray(current.levels).includes(level) : asArray(item?.levels).includes(level)));
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
      <div className="mx-auto my-6 max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-paper shadow-2xl dark:bg-surface-950">
        <header className="flex items-start justify-between gap-4 border-b border-ink/10 px-5 py-5 dark:border-white/10 sm:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-clay dark:text-coral">Speaking library</p>
            <h2 className="mt-1 text-2xl font-black">Importa nuovi item</h2>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-ink/65 dark:text-white/65">Solo file .json. Gli item vengono aggiunti alle attività esistenti: nulla viene sovrascritto o cancellato.</p>
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
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-linen px-3 py-1.5 text-xs font-black dark:bg-white/10">{totals.items} item</span>
                {totals.blocking ? <span className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-black text-red-800 dark:bg-red-400/10 dark:text-red-100">{totals.blocking} duplicati bloccanti</span> : null}
                {totals.warnings ? <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-900 dark:bg-amber-300/10 dark:text-amber-100">{totals.warnings} somiglianze</span> : null}
                {!totals.errors && !totals.blocking ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-100"><CheckCircle2 className="h-3.5 w-3.5" /> Struttura valida</span> : null}
              </div>

              {plans.map((plan) => (
                <section key={plan.groupIndex} className="rounded-2xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-surface-900">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black">{plan.activity?.title || `Gruppo ${plan.groupIndex + 1}`}</p>
                    <span className="text-xs font-black text-ink/45 dark:text-white/45">{plan.items.length} item</span>
                  </div>
                  {plan.errors.map((message) => <p key={message} className="mt-2 text-xs font-bold text-red-700 dark:text-red-200">• {message}</p>)}
                  {plan.blocking.slice(0, 4).map((match, index) => <p key={index} className="mt-2 text-xs font-bold text-red-700 dark:text-red-200">• Item {match.candidate.candidateIndex + 1}: {duplicateReasonLabel(match.reason)} con <strong>{match.existing.activityTitle || 'libreria esistente'}</strong>.</p>)}
                  {plan.warnings.slice(0, 4).map((match, index) => <p key={index} className="mt-2 flex gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-200"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Item {match.candidate.candidateIndex + 1}: {duplicateReasonLabel(match.reason)}.</p>)}
                </section>
              ))}

              {totals.warnings > 0 && totals.blocking === 0 && totals.errors === 0 ? (
                <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-950 dark:border-amber-300/20 dark:bg-amber-300/[0.07] dark:text-amber-100">
                  <input type="checkbox" checked={allowWarnings} onChange={(event) => setAllowWarnings(event.target.checked)} className="mt-1" />
                  Ho controllato le somiglianze contestuali e voglio importarle comunque.
                </label>
              ) : null}
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-ink/10 bg-white px-5 py-4 dark:border-white/10 dark:bg-surface-900">
          <p className="text-xs font-semibold text-ink/50 dark:text-white/50"><FileJson2 className="mr-1 inline h-3.5 w-3.5" /> Append-only + controllo duplicati.</p>
          <button type="button" disabled={!canImport} onClick={importItems} className="focus-ring min-h-11 rounded-full bg-ink px-5 text-xs font-black text-white disabled:opacity-35 dark:bg-clay">{saving ? 'Importazione…' : `Importa ${totals.items || ''} item`}</button>
        </footer>
      </div>
    </div>
  );
}
