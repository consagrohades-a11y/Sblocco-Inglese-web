import React, { useEffect, useMemo, useState } from 'react';
import { loadPublishedExerciseCatalog } from '../../lib/exercisePlayerApi.js';

const selectClass = 'rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-moss dark:border-white/20 dark:bg-surface-800 dark:text-white';

function buildResource(exercise) {
  return {
    key: `custom-exercise:${exercise.id}`,
    type: 'custom_exercise',
    title: exercise.title,
    description: exercise.description || `${exercise.level} · ${exercise.topic}`,
    route: '/exercises',
    exercise_config: {
      exercise_id: exercise.id,
      exercise_version_id: exercise.versionId,
      completion_rule: 'passed',
      required_score: 70,
      required_attempts: 1,
      allow_retry: true,
      show_score: true,
      show_correct_answers: true,
      show_explanations: true,
      show_diagnostic_summary: true,
    },
  };
}

export default function AssignmentExercisePicker({ value = [], onChange }) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    loadPublishedExerciseCatalog()
      .then((items) => { if (active) setCatalog(items); })
      .catch(() => { if (active) setError('Non è stato possibile caricare gli esercizi pubblicati.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const selectedIds = useMemo(() => new Set(value.map((resource) => resource.exercise_config?.exercise_id)), [value]);

  function add(exercise) {
    if (selectedIds.has(exercise.id)) return;
    onChange([...value, buildResource(exercise)]);
  }

  function remove(index) {
    onChange(value.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateConfig(index, patch) {
    onChange(value.map((resource, itemIndex) => itemIndex !== index ? resource : {
      ...resource,
      exercise_config: { ...resource.exercise_config, ...patch },
    }));
  }

  function move(index, direction) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= value.length) return;
    const next = [...value];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  }

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-surface-900 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-wide text-moss dark:text-emerald-300">Exercise Builder</p><h2 className="mt-2 text-2xl font-black text-ink dark:text-white">Esercizi personalizzati</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60 dark:text-white/60">Aggiungi esercizi approvati e pubblicati. La versione viene bloccata nell’assegnazione, quindi modifiche future non cambieranno il compito già dato.</p></div>
        <span className="rounded-full bg-linen px-3 py-1.5 text-xs font-black text-ink/60 dark:bg-white/10 dark:text-white/60">{value.length} selezionati</span>
      </div>

      {error ? <div className="mt-4 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-900">{error}</div> : null}
      {loading ? <p className="mt-5 text-sm font-bold text-ink/65 dark:text-white/65">Caricamento libreria...</p> : null}

      {!loading ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {catalog.map((exercise) => {
            const selected = selectedIds.has(exercise.id);
            return (
              <button key={exercise.id} type="button" disabled={selected} onClick={() => add(exercise)} className={`rounded-xl border p-4 text-left transition ${selected ? 'border-moss bg-mint/25 opacity-70 dark:border-emerald-300/35 dark:bg-emerald-400/10' : 'border-ink/10 bg-white hover:border-moss hover:bg-linen/40 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-emerald-300/35 dark:hover:bg-white/[0.08]'}`}>
                <div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-moss dark:text-emerald-300">{exercise.publicId}</span><span className="rounded-full bg-linen px-2 py-1 text-[0.65rem] font-black text-ink/65 dark:bg-white/10 dark:text-white/65">{exercise.level}</span></div>
                <h3 className="mt-3 text-base font-black text-ink dark:text-white">{exercise.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/60 dark:text-white/60">{exercise.description || exercise.topic}</p>
                <span className="mt-4 inline-flex text-xs font-black text-moss dark:text-emerald-300">{selected ? 'Già aggiunto' : 'Aggiungi'}</span>
              </button>
            );
          })}
          {catalog.length === 0 ? <p className="sm:col-span-2 xl:col-span-3 text-sm leading-6 text-ink/65 dark:text-white/65">Non ci sono ancora esercizi pubblicati. Pubblicali dalla Libreria Exercise Builder.</p> : null}
        </div>
      ) : null}

      {value.length ? (
        <div className="mt-7 grid gap-4">
          <p className="text-xs font-bold uppercase tracking-wide text-moss dark:text-emerald-300">Configurazione assegnata</p>
          {value.map((resource, index) => {
            const config = resource.exercise_config || {};
            return (
              <article key={`${resource.key}-${index}`} className="rounded-xl border border-ink/10 bg-linen/30 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div><p className="text-sm font-black text-ink dark:text-white">{resource.title}</p><p className="mt-1 text-xs font-semibold text-ink/65 dark:text-white/65">Versione {String(config.exercise_version_id || '').slice(0, 8)} · posizione {index + 1}</p></div>
                  <div className="flex flex-wrap gap-2"><button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="rounded-md border border-ink/15 bg-white px-3 py-1.5 text-xs font-black disabled:opacity-30 dark:border-white/15 dark:bg-white/10 dark:text-white">Su</button><button type="button" disabled={index === value.length - 1} onClick={() => move(index, 1)} className="rounded-md border border-ink/15 bg-white px-3 py-1.5 text-xs font-black disabled:opacity-30 dark:border-white/15 dark:bg-white/10 dark:text-white">Giù</button><button type="button" onClick={() => remove(index)} className="rounded-md px-3 py-1.5 text-xs font-black text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-300/10">Rimuovi</button></div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <label className="text-xs font-black text-ink/60 dark:text-white/60">Completamento<select value={config.completion_rule || 'passed'} onChange={(event) => updateConfig(index, { completion_rule: event.target.value })} className={`mt-2 w-full ${selectClass}`}><option value="passed">Punteggio minimo</option><option value="submitted">Prima consegna</option><option value="attempts">Numero tentativi</option></select></label>
                  {config.completion_rule === 'attempts' ? <label className="text-xs font-black text-ink/60 dark:text-white/60">Tentativi richiesti<input type="number" min="1" value={config.required_attempts || 1} onChange={(event) => updateConfig(index, { required_attempts: Math.max(1, Number(event.target.value) || 1) })} className={`mt-2 w-full ${selectClass}`} /></label> : <label className="text-xs font-black text-ink/60 dark:text-white/60">Punteggio minimo<input type="number" min="0" max="100" value={config.required_score ?? 70} onChange={(event) => updateConfig(index, { required_score: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} className={`mt-2 w-full ${selectClass}`} /></label>}
                  <label className="flex items-center gap-2 self-end rounded-lg border border-ink/10 bg-white px-3 py-2.5 text-xs font-black text-ink dark:border-white/10 dark:bg-white/[0.06] dark:text-white"><input type="checkbox" checked={config.allow_retry !== false} onChange={(event) => updateConfig(index, { allow_retry: event.target.checked })} />Permetti nuovi tentativi</label>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-ink/65 dark:text-white/65">
                  {[['show_score', 'Mostra punteggio'], ['show_correct_answers', 'Mostra soluzioni'], ['show_explanations', 'Mostra spiegazioni'], ['show_diagnostic_summary', 'Mostra diagnosi']].map(([key, label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={config[key] !== false} onChange={(event) => updateConfig(index, { [key]: event.target.checked })} />{label}</label>)}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
