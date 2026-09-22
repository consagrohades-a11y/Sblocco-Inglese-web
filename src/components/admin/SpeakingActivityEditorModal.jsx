import React, { useMemo, useState } from 'react';
import { AlertTriangle, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import SpeakingItemGeneratorPanel from './SpeakingItemGeneratorPanel.jsx';
import { createSpeakingActivity, updateSpeakingActivity } from '../../lib/adminSpeakingActivitiesApi.js';
import { analyseSpeakingItemSet, duplicateReasonLabel } from '../../lib/speakingItemQuality.js';

const LEVELS = ['A1','A2','B1','B2','C1','C2'];

const emptyItem = () => ({
  text: '',
  levels: ['B1'],
  student_support: '',
  challenge: '',
  teacher_note: '',
  context_tags: [],
  language_targets: [],
  difficulty: 2,
});

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanCsv(value) {
  return Array.from(new Set(String(value || '').split(',').map((item) => item.trim()).filter(Boolean)));
}

function normaliseItem(item) {
  if (typeof item === 'string') return { ...emptyItem(), text: item };
  return {
    text: item?.text || '',
    levels: asArray(item?.levels),
    student_support: item?.student_support || item?.support || '',
    challenge: item?.challenge || '',
    teacher_note: item?.teacher_note || '',
    context_tags: asArray(item?.context_tags),
    language_targets: asArray(item?.language_targets),
    difficulty: Math.min(5, Math.max(1, Number(item?.difficulty || 2))),
  };
}

function LevelPicker({ value, onChange, compact = false }) {
  const selected = asArray(value);
  function toggle(level) {
    onChange(selected.includes(level) ? selected.filter((item) => item !== level) : [...selected, level]);
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {LEVELS.map((level) => {
        const active = selected.includes(level);
        return (
          <button
            key={level}
            type="button"
            onClick={() => toggle(level)}
            className={`focus-ring rounded-full border font-black transition ${compact ? 'min-h-8 px-2.5 text-[0.68rem]' : 'min-h-9 px-3 text-xs'} ${active ? 'border-clay bg-blush text-clay dark:border-coral/40 dark:bg-coral/10 dark:text-coral' : 'border-ink/15 bg-white text-ink/55 dark:border-white/15 dark:bg-white/[0.04] dark:text-white/55'}`}
            aria-pressed={active}
          >
            {level}
          </button>
        );
      })}
    </div>
  );
}

function ConflictList({ title, matches, blocking = false }) {
  if (!matches.length) return null;
  return (
    <div className={`mx-5 mb-4 border-l-4 p-4 sm:mx-7 ${blocking ? 'border-red-500 bg-red-50 text-red-950 dark:bg-red-400/10 dark:text-red-100' : 'border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-300/10 dark:text-amber-100'}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-sm font-black">{title}</p>
          <div className="mt-2 grid gap-2 text-xs font-semibold leading-5">
            {matches.slice(0, 5).map((match, index) => (
              <p key={`${match.reason}-${match.candidate.candidateIndex}-${match.existing.itemIndex}-${index}`}>
                Item {match.candidate.candidateIndex + 1}: {duplicateReasonLabel(match.reason)} con
                {' '}<strong>{match.existing.activityTitle || 'un’altra attività'}</strong>
                {Number.isInteger(match.existing.itemIndex) ? ` · item ${match.existing.itemIndex + 1}` : ''}.
              </p>
            ))}
            {matches.length > 5 ? <p>+ {matches.length - 5} altre corrispondenze.</p> : null}
          </div>
        </div>
      </div>

      {showGenerator ? (
        <SpeakingItemGeneratorPanel
          activity={{
            ...activity,
            title: draft.title || activity?.title,
            summary: draft.summary,
            activity_type: draft.activity_type,
            levels: derivedLevels.length ? derivedLevels : asArray(activity?.levels),
            goals: cleanCsv(draft.goalsText),
            tags: cleanCsv(draft.tagsText),
            instructions: draft.instructions,
            prompts: draft.prompts,
            presenter_style: draft.presenter_style,
          }}
          catalogActivities={catalogActivities}
          onAddItems={addGeneratedItems}
          onClose={() => setShowGenerator(false)}
        />
      ) : null}
    </div>
  );
}

export default function SpeakingActivityEditorModal({ activity, catalogActivities = [], openGenerator = false, onClose, onSaved }) {
  const [draft, setDraft] = useState(() => ({
    title: activity?.title || '',
    summary: activity?.summary || '',
    activity_type: activity?.activity_type || 'speaking_game',
    goalsText: asArray(activity?.goals).join(', '),
    tagsText: asArray(activity?.tags).join(', '),
    duration_minutes: activity?.duration_minutes ? String(activity.duration_minutes) : '15',
    group_size: activity?.group_size || '1–2',
    instructions: activity?.instructions || '',
    student_intro: activity?.student_intro || '',
    studentStepsText: asArray(activity?.student_steps).join('\n'),
    usefulLanguageText: asArray(activity?.useful_language).join('\n'),
    variantsText: asArray(activity?.variants).join('\n'),
    teacher_notes: activity?.teacher_notes || '',
    presenter_style: activity?.presenter_style || 'prompt',
    favorite: Boolean(activity?.favorite),
    prompts: asArray(activity?.prompts).length ? asArray(activity.prompts).map(normaliseItem) : [emptyItem()],
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [blockingConflicts, setBlockingConflicts] = useState([]);
  const [contextWarnings, setContextWarnings] = useState([]);
  const [allowContextualSave, setAllowContextualSave] = useState(false);
  const [showGenerator, setShowGenerator] = useState(Boolean(openGenerator && activity?.id));

  const derivedLevels = useMemo(
    () => LEVELS.filter((level) => draft.prompts.some((item) => asArray(item.levels).includes(level))),
    [draft.prompts],
  );

  function resetQualityGate() {
    setBlockingConflicts([]);
    setContextWarnings([]);
    setAllowContextualSave(false);
  }

  function setField(key, value) {
    resetQualityGate();
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateItem(index, patch) {
    resetQualityGate();
    setDraft((current) => ({
      ...current,
      prompts: current.prompts.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  }

  function removeItem(index) {
    resetQualityGate();
    setDraft((current) => ({
      ...current,
      prompts: current.prompts.length === 1 ? current.prompts : current.prompts.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function addGeneratedItems(items) {
    resetQualityGate();
    setDraft((current) => ({
      ...current,
      prompts: [...current.prompts, ...asArray(items).map(normaliseItem)],
    }));
    setShowGenerator(false);
  }

  async function save() {
    setError('');
    setBlockingConflicts([]);
    const title = draft.title.trim();
    if (!title) {
      setError('Inserisci un titolo.');
      return;
    }

    const cleanedItems = draft.prompts
      .map((item) => ({
        text: item.text.trim(),
        levels: LEVELS.filter((level) => asArray(item.levels).includes(level)),
        student_support: item.student_support.trim(),
        challenge: item.challenge.trim(),
        teacher_note: item.teacher_note.trim(),
        context_tags: asArray(item.context_tags).map((value) => String(value).trim().toLowerCase()).filter(Boolean),
        language_targets: asArray(item.language_targets).map((value) => String(value).trim().toLowerCase()).filter(Boolean),
        difficulty: Math.min(5, Math.max(1, Number(item.difficulty || 2))),
      }))
      .filter((item) => item.text);

    if (!cleanedItems.length) {
      setError('Aggiungi almeno un item.');
      return;
    }
    if (cleanedItems.some((item) => !item.levels.length)) {
      setError('Ogni item deve avere almeno un livello. Puoi selezionarne più di uno.');
      return;
    }

    const quality = analyseSpeakingItemSet(cleanedItems, catalogActivities, { excludeActivityId: activity?.id || null });
    if (quality.blocking.length) {
      setBlockingConflicts(quality.blocking);
      setContextWarnings(quality.warnings);
      setAllowContextualSave(false);
      setError('Ci sono item che risultano duplicati o quasi identici. Modificali prima di salvare.');
      return;
    }
    if (quality.warnings.length && !allowContextualSave) {
      setContextWarnings(quality.warnings);
      setAllowContextualSave(true);
      setError('Ho trovato somiglianze contestuali. Non sono necessariamente duplicati: controllale e, se sono intenzionali, premi di nuovo “Salva comunque”.');
      return;
    }

    const payload = {
      title,
      summary: draft.summary.trim(),
      activity_type: draft.activity_type,
      levels: LEVELS.filter((level) => cleanedItems.some((item) => item.levels.includes(level))),
      goals: cleanCsv(draft.goalsText),
      tags: cleanCsv(draft.tagsText),
      duration_minutes: Math.max(1, Number.parseInt(draft.duration_minutes || '15', 10) || 15),
      group_size: draft.group_size.trim() || '1–2',
      instructions: draft.instructions.trim(),
      prompts: cleanedItems,
      variants: draft.variantsText.split('\n').map((item) => item.trim()).filter(Boolean),
      teacher_notes: draft.teacher_notes.trim() || null,
      favorite: draft.favorite,
      status: 'active',
      student_intro: draft.student_intro.trim(),
      student_steps: draft.studentStepsText.split('\n').map((item) => item.trim()).filter(Boolean),
      useful_language: draft.usefulLanguageText.split('\n').map((item) => item.trim()).filter(Boolean),
      presenter_style: draft.presenter_style,
    };

    setSaving(true);
    try {
      const saved = activity?.id
        ? await updateSpeakingActivity(activity.id, payload)
        : await createSpeakingActivity(payload);
      onSaved(saved);
    } catch (saveError) {
      setError(saveError.message || 'Non è stato possibile salvare l’attività.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[130] overflow-y-auto bg-ink/60 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto my-3 max-w-6xl rounded-3xl border border-white/10 bg-paper shadow-2xl dark:bg-surface-950">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-3xl border-b border-ink/10 bg-paper/95 px-5 py-5 backdrop-blur dark:border-white/10 dark:bg-surface-950/95 sm:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-clay dark:text-coral">{activity ? 'Modifica attività' : 'Nuova attività'}</p>
            <h2 className="mt-1 text-2xl font-black">{activity?.title || 'Crea un gioco speaking'}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-ink/50 dark:text-white/50">
              <span>Livelli automatici dagli item:</span>
              {derivedLevels.length ? derivedLevels.map((level) => <span key={level} className="rounded-full bg-linen px-2 py-1 dark:bg-white/10">{level}</span>) : <span>nessuno</span>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-ink/10 bg-white dark:border-white/10 dark:bg-white/10" aria-label="Chiudi"><X className="h-4 w-4" /></button>
        </header>

        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <main className="grid min-w-0 gap-6">
            <section className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-surface-900">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2"><span className="text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">Titolo</span><input value={draft.title} onChange={(e) => setField('title', e.target.value)} className="focus-ring mt-2 w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-sm font-bold dark:border-white/15 dark:bg-white/[0.05]" /></label>
                <label className="sm:col-span-2"><span className="text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">Descrizione docente</span><textarea rows={2} value={draft.summary} onChange={(e) => setField('summary', e.target.value)} className="focus-ring mt-2 w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-sm font-semibold dark:border-white/15 dark:bg-white/[0.05]" /></label>
                <label><span className="text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">Formato</span><select value={draft.activity_type} onChange={(e) => setField('activity_type', e.target.value)} className="focus-ring mt-2 w-full rounded-xl border border-ink/15 bg-paper px-3 py-3 text-sm font-bold dark:border-white/15 dark:bg-white/[0.05]"><option value="speaking_game">Gioco speaking</option><option value="conversation">Conversazione</option><option value="fluency">Fluency</option><option value="vocabulary">Vocabolario</option><option value="storytelling">Storytelling</option><option value="debate">Debate</option><option value="warmup">Warm-up</option></select></label>
                <label><span className="text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">Layout presentazione</span><select value={draft.presenter_style} onChange={(e) => setField('presenter_style', e.target.value)} className="focus-ring mt-2 w-full rounded-xl border border-ink/15 bg-paper px-3 py-3 text-sm font-bold dark:border-white/15 dark:bg-white/[0.05]"><option value="prompt">Prompt</option><option value="choice">Scelta</option><option value="odd_one_out">Odd one out</option><option value="repair">Repair</option><option value="taboo">Taboo</option><option value="story">Story</option><option value="ranking">Ranking</option><option value="roleplay">Roleplay</option></select></label>
                <label><span className="text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">Durata</span><input type="number" min="1" value={draft.duration_minutes} onChange={(e) => setField('duration_minutes', e.target.value)} className="focus-ring mt-2 w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-sm font-bold dark:border-white/15 dark:bg-white/[0.05]" /></label>
                <label><span className="text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">Partecipanti</span><input value={draft.group_size} onChange={(e) => setField('group_size', e.target.value)} className="focus-ring mt-2 w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-sm font-bold dark:border-white/15 dark:bg-white/[0.05]" /></label>
                <label><span className="text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">Obiettivi, separati da virgola</span><input value={draft.goalsText} onChange={(e) => setField('goalsText', e.target.value)} className="focus-ring mt-2 w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-sm font-semibold dark:border-white/15 dark:bg-white/[0.05]" /></label>
                <label><span className="text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">Tag</span><input value={draft.tagsText} onChange={(e) => setField('tagsText', e.target.value)} className="focus-ring mt-2 w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-sm font-semibold dark:border-white/15 dark:bg-white/[0.05]" /></label>
              </div>
            </section>

            <section className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-surface-900">
              <p className="text-xs font-black uppercase tracking-wide text-clay dark:text-coral">Presentazione studente</p>
              <label className="mt-4 block"><span className="text-xs font-black text-ink/55 dark:text-white/55">Introduzione</span><textarea rows={2} value={draft.student_intro} onChange={(e) => setField('student_intro', e.target.value)} className="focus-ring mt-2 w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-sm font-semibold dark:border-white/15 dark:bg-white/[0.05]" /></label>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label><span className="text-xs font-black text-ink/55 dark:text-white/55">Passaggi — uno per riga</span><textarea rows={5} value={draft.studentStepsText} onChange={(e) => setField('studentStepsText', e.target.value)} className="focus-ring mt-2 w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-sm font-semibold dark:border-white/15 dark:bg-white/[0.05]" /></label>
                <label><span className="text-xs font-black text-ink/55 dark:text-white/55">Useful language — uno per riga</span><textarea rows={5} value={draft.usefulLanguageText} onChange={(e) => setField('usefulLanguageText', e.target.value)} className="focus-ring mt-2 w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-sm font-semibold dark:border-white/15 dark:bg-white/[0.05]" /></label>
              </div>
            </section>

            <section className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-surface-900">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-clay dark:text-coral">Item</p>
                  <h3 className="mt-1 text-xl font-black">{draft.prompts.length} item</h3>
                  <p className="mt-1 text-xs font-semibold text-ink/55 dark:text-white/55">Livelli multipli + metadati contestuali: servono al filtro anti-ripetizione, non allo studente.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activity?.id ? (
                    <button type="button" onClick={() => setShowGenerator(true)} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full border border-clay/30 bg-blush/45 px-4 py-2 text-xs font-black text-clay transition hover:bg-blush dark:border-coral/30 dark:bg-coral/[0.08] dark:text-coral">
                      <Sparkles className="h-4 w-4" /> Generate with AI
                    </button>
                  ) : null}
                  <button type="button" onClick={() => setField('prompts', [...draft.prompts, emptyItem()])} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-black text-white dark:bg-clay"><Plus className="h-4 w-4" /> Aggiungi item</button>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                {draft.prompts.map((item, index) => (
                  <article key={index} className="rounded-2xl border border-ink/10 bg-paper p-4 dark:border-white/10 dark:bg-white/[0.035]">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Item {index + 1}</p>
                      <button type="button" onClick={() => removeItem(index)} disabled={draft.prompts.length === 1} className="focus-ring grid h-9 w-9 place-items-center rounded-full border border-ink/10 text-ink/45 disabled:opacity-30 dark:border-white/10 dark:text-white/45" aria-label="Rimuovi item"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <textarea rows={3} value={item.text} onChange={(e) => updateItem(index, { text: e.target.value })} placeholder="Prompt / scenario / set di parole…" className="focus-ring mt-3 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-bold leading-6 dark:border-white/15 dark:bg-surface-900" />

                    <div className="mt-4">
                      <p className="mb-2 text-xs font-black text-ink/55 dark:text-white/55">Livelli — selezione multipla</p>
                      <LevelPicker value={item.levels} onChange={(levels) => updateItem(index, { levels })} compact />
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem]">
                      <label>
                        <span className="text-[0.68rem] font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Contesti</span>
                        <input value={asArray(item.context_tags).join(', ')} onChange={(e) => updateItem(index, { context_tags: cleanCsv(e.target.value) })} placeholder="work, travel, small-talk" className="focus-ring mt-1.5 w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-xs font-semibold dark:border-white/10 dark:bg-surface-900" />
                      </label>
                      <label>
                        <span className="text-[0.68rem] font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Target linguistici</span>
                        <input value={asArray(item.language_targets).join(', ')} onChange={(e) => updateItem(index, { language_targets: cleanCsv(e.target.value) })} placeholder="requests, hedging" className="focus-ring mt-1.5 w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-xs font-semibold dark:border-white/10 dark:bg-surface-900" />
                      </label>
                      <label>
                        <span className="text-[0.68rem] font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Difficoltà 1–5</span>
                        <input type="number" min="1" max="5" value={item.difficulty} onChange={(e) => updateItem(index, { difficulty: Number(e.target.value || 2) })} className="focus-ring mt-1.5 w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-xs font-semibold dark:border-white/10 dark:bg-surface-900" />
                      </label>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
                      <label><span className="text-[0.68rem] font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Supporto studente</span><textarea rows={3} value={item.student_support} onChange={(e) => updateItem(index, { student_support: e.target.value })} className="focus-ring mt-1.5 w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-xs font-semibold dark:border-white/10 dark:bg-surface-900" /></label>
                      <label><span className="text-[0.68rem] font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Challenge studente</span><textarea rows={3} value={item.challenge} onChange={(e) => updateItem(index, { challenge: e.target.value })} className="focus-ring mt-1.5 w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-xs font-semibold dark:border-white/10 dark:bg-surface-900" /></label>
                      <label><span className="text-[0.68rem] font-black uppercase tracking-wide text-clay dark:text-coral">Nota / soluzione docente</span><textarea rows={3} value={item.teacher_note} onChange={(e) => updateItem(index, { teacher_note: e.target.value })} className="focus-ring mt-1.5 w-full rounded-xl border border-clay/20 bg-blush/40 px-3 py-2.5 text-xs font-semibold dark:border-coral/20 dark:bg-coral/[0.06]" /></label>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </main>

          <aside className="grid content-start gap-5">
            <section className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-surface-900">
              <p className="text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">Istruzioni docente</p>
              <textarea rows={6} value={draft.instructions} onChange={(e) => setField('instructions', e.target.value)} className="focus-ring mt-3 w-full rounded-xl border border-ink/10 bg-paper px-3 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.04]" />
            </section>
            <section className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-surface-900">
              <p className="text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">Varianti docente</p>
              <textarea rows={7} value={draft.variantsText} onChange={(e) => setField('variantsText', e.target.value)} placeholder="Una variante per riga" className="focus-ring mt-3 w-full rounded-xl border border-ink/10 bg-paper px-3 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.04]" />
            </section>
            <section className="rounded-2xl border border-dashed border-clay/30 bg-blush/30 p-5 dark:border-coral/20 dark:bg-coral/[0.05]">
              <p className="text-xs font-black uppercase tracking-wide text-clay dark:text-coral">Note private</p>
              <textarea rows={6} value={draft.teacher_notes} onChange={(e) => setField('teacher_notes', e.target.value)} placeholder="Soluzioni, errori da osservare, reminder…" className="focus-ring mt-3 w-full rounded-xl border border-clay/20 bg-white px-3 py-3 text-sm font-semibold dark:border-coral/20 dark:bg-surface-900" />
              <p className="mt-2 text-[0.68rem] font-bold leading-5 text-ink/45 dark:text-white/45">Non vengono mai mostrate nella finestra Presenta.</p>
            </section>
          </aside>
        </div>

        <ConflictList title="Duplicati bloccati" matches={blockingConflicts} blocking />
        <ConflictList title="Somiglianze contestuali da controllare" matches={contextWarnings} />
        {error ? <div className="mx-5 mb-4 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-950 dark:bg-red-400/10 dark:text-red-100 sm:mx-7">{error}</div> : null}

        <footer className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 rounded-b-3xl border-t border-ink/10 bg-paper/95 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-surface-950/95 sm:px-7">
          <button type="button" onClick={onClose} className="focus-ring min-h-11 rounded-full border border-ink/15 bg-white px-5 text-sm font-black dark:border-white/15 dark:bg-white/[0.05]">Annulla</button>
          <button type="button" onClick={save} disabled={saving} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-6 text-sm font-black text-white disabled:opacity-40 dark:bg-clay">
            <Save className="h-4 w-4" /> {saving ? 'Salvataggio…' : allowContextualSave && contextWarnings.length ? 'Salva comunque' : 'Salva attività'}
          </button>
        </footer>
      </div>

      {showGenerator ? (
        <SpeakingItemGeneratorPanel
          activity={{
            ...activity,
            title: draft.title || activity?.title,
            summary: draft.summary,
            activity_type: draft.activity_type,
            levels: derivedLevels.length ? derivedLevels : asArray(activity?.levels),
            goals: cleanCsv(draft.goalsText),
            tags: cleanCsv(draft.tagsText),
            instructions: draft.instructions,
            prompts: draft.prompts,
            presenter_style: draft.presenter_style,
          }}
          catalogActivities={catalogActivities}
          onAddItems={addGeneratedItems}
          onClose={() => setShowGenerator(false)}
        />
      ) : null}
    </div>
  );
}
