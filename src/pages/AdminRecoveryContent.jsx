import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import { RECOVERY_TOPICS, recoveryTopicLabel } from '../config/recovery.js';
import { supabase } from '../lib/supabaseClient.js';
import { adminButton, adminSurface } from '../styles/adminUi.js';

const phases = [
  ['recover', 'Recupera'],
  ['practice', 'Allenati'],
  ['school', 'Modalità scuola'],
  ['verify', 'Mini-verifica'],
  ['error_review', 'Ripassa errori'],
  ['checkpoint', 'Checkpoint'],
  ['mock_intermediate', 'Simulazione intermedia'],
  ['mock_final', 'Simulazione finale'],
];

const topicRequiredPhases = new Set(['recover', 'practice', 'school', 'verify']);

function phaseLabel(phase) {
  return phases.find(([key]) => key === phase)?.[1] || phase;
}

export default function AdminRecoveryContent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [exercises, setExercises] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [phase, setPhase] = useState('recover');
  const [topicKey, setTopicKey] = useState('present-simple');
  const [versionId, setVersionId] = useState('');
  const [schoolTestType, setSchoolTestType] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [exerciseResponse, mappingResponse] = await Promise.all([
        supabase
          .from('exercise_builder_exercises')
          .select('id, public_id, current_version_id, status')
          .eq('status', 'published')
          .not('current_version_id', 'is', null)
          .order('public_number', { ascending: true }),
        supabase
          .from('recovery_exercise_map')
          .select('id, topic_key, phase, exercise_id, exercise_version_id, school_test_type, estimated_minutes, active, sort_order, created_at')
          .order('phase', { ascending: true })
          .order('sort_order', { ascending: true }),
      ]);
      if (exerciseResponse.error) throw exerciseResponse.error;
      if (mappingResponse.error) throw mappingResponse.error;

      const identities = exerciseResponse.data || [];
      const versionIds = identities.map((item) => item.current_version_id).filter(Boolean);
      let versions = [];
      if (versionIds.length) {
        const versionResponse = await supabase
          .from('exercise_builder_exercise_versions')
          .select('id, exercise_id, version_number, title, description, level, topic, estimated_minutes, review_status, settings')
          .in('id', versionIds)
          .eq('review_status', 'approved');
        if (versionResponse.error) throw versionResponse.error;
        versions = versionResponse.data || [];
      }

      const identityById = new Map(identities.map((item) => [item.id, item]));
      const catalog = versions.map((version) => ({
        ...version,
        public_id: identityById.get(version.exercise_id)?.public_id || version.exercise_id,
      })).sort((a, b) => a.title.localeCompare(b.title, 'it'));

      setExercises(catalog);
      setMappings(mappingResponse.data || []);
      setVersionId((current) => current || catalog[0]?.id || '');
    } catch (loadError) {
      setError(loadError.message || 'Non è stato possibile caricare le mappature Recupero Debito.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const selectedExercise = useMemo(() => exercises.find((item) => item.id === versionId) || null, [exercises, versionId]);
  const needsTopic = topicRequiredPhases.has(phase);

  async function addMapping(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    if (!selectedExercise) {
      setError('Seleziona un esercizio pubblicato e approvato.');
      return;
    }
    if (needsTopic && !topicKey) {
      setError('Questa fase richiede un argomento.');
      return;
    }

    setSaving(true);
    try {
      const { error: insertError } = await supabase.from('recovery_exercise_map').insert({
        topic_key: needsTopic ? topicKey : null,
        phase,
        exercise_id: selectedExercise.exercise_id,
        exercise_version_id: selectedExercise.id,
        school_test_type: schoolTestType.trim() || null,
        estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : selectedExercise.estimated_minutes || null,
        active: true,
        sort_order: 100,
      });
      if (insertError) throw insertError;
      setMessage('Mappatura aggiunta. Il contenuto originale resta nell’Exercise Builder; Recupero Debito conserva solo il collegamento.');
      setSchoolTestType('');
      setEstimatedMinutes('');
      await load();
    } catch (saveError) {
      setError(saveError.message || 'Non è stato possibile aggiungere la mappatura.');
    } finally {
      setSaving(false);
    }
  }

  async function removeMapping(mappingId) {
    setMessage('');
    setError('');
    const { error: deleteError } = await supabase.from('recovery_exercise_map').delete().eq('id', mappingId);
    if (deleteError) {
      setError(deleteError.message || 'Non è stato possibile rimuovere la mappatura.');
      return;
    }
    setMappings((current) => current.filter((item) => item.id !== mappingId));
  }

  function exerciseLabel(mapping) {
    const exercise = exercises.find((item) => item.id === mapping.exercise_version_id);
    return exercise ? `${exercise.public_id} · ${exercise.title}` : mapping.exercise_version_id;
  }

  return (
    <>
      <SEO title="Recupero Debito | Admin | Sblocco Inglese" description="Collega gli esercizi esistenti alle fasi del percorso Recupero Debito Inglese." />
      <section className="section-shell py-10 lg:py-14">
        <div className="mx-auto max-w-6xl">
          <header className={`${adminSurface.panel} p-6 sm:p-8`}>
            <span className="eyebrow">Recupero Debito</span>
            <h1 className="mt-4 text-3xl font-black text-ink dark:text-white sm:text-4xl">Mappa contenuti esistenti</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-ink/70 dark:text-white/65">
              Questa pagina non crea una seconda libreria di esercizi. Collega versioni già pubblicate e approvate dell’Exercise Builder alle fasi Recupera, Allenati, Modalità scuola, verifiche e simulazioni.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/admin/content/exercises" className={adminButton.secondary}>Apri Exercise Builder</Link>
              <Link to="/admin/content/exercises/diagnostics" className={adminButton.secondary}>Diagnostica errori</Link>
            </div>
          </header>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <form onSubmit={addMapping} className={`${adminSurface.panel} p-6`}>
              <h2 className="text-xl font-black text-ink dark:text-white">Nuova mappatura</h2>
              <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/60">Per le simulazioni il database accetta soltanto exercise version con feedback di sezione nascosto.</p>

              <label className="mt-5 grid gap-2 text-sm font-bold text-ink dark:text-white">
                Fase
                <select value={phase} onChange={(event) => setPhase(event.target.value)} className="rounded-xl border border-ink/15 bg-white px-3 py-3 text-sm dark:border-white/15 dark:bg-surface-900">
                  {phases.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </label>

              {needsTopic ? (
                <label className="mt-4 grid gap-2 text-sm font-bold text-ink dark:text-white">
                  Argomento
                  <select value={topicKey} onChange={(event) => setTopicKey(event.target.value)} className="rounded-xl border border-ink/15 bg-white px-3 py-3 text-sm dark:border-white/15 dark:bg-surface-900">
                    {RECOVERY_TOPICS.map((topic) => <option key={topic.key} value={topic.key}>{topic.label}</option>)}
                  </select>
                </label>
              ) : null}

              <label className="mt-4 grid gap-2 text-sm font-bold text-ink dark:text-white">
                Exercise version pubblicata
                <select value={versionId} onChange={(event) => setVersionId(event.target.value)} className="rounded-xl border border-ink/15 bg-white px-3 py-3 text-sm dark:border-white/15 dark:bg-surface-900">
                  {exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.public_id} · {exercise.title} · {exercise.level} · {exercise.topic}</option>)}
                </select>
              </label>

              <label className="mt-4 grid gap-2 text-sm font-bold text-ink dark:text-white">
                Formato verifica scolastica (opzionale)
                <input value={schoolTestType} onChange={(event) => setSchoolTestType(event.target.value)} placeholder="es. mixed tenses, translation, error correction" className="rounded-xl border border-ink/15 bg-white px-3 py-3 text-sm dark:border-white/15 dark:bg-surface-900" />
              </label>

              <label className="mt-4 grid gap-2 text-sm font-bold text-ink dark:text-white">
                Minuti stimati (opzionale)
                <input type="number" min="5" max="120" value={estimatedMinutes} onChange={(event) => setEstimatedMinutes(event.target.value)} className="rounded-xl border border-ink/15 bg-white px-3 py-3 text-sm dark:border-white/15 dark:bg-surface-900" />
              </label>

              {error ? <p className="mt-4 text-sm font-bold text-red-700 dark:text-red-200" role="alert">{error}</p> : null}
              {message ? <p className="mt-4 text-sm font-bold text-emerald-800 dark:text-emerald-200">{message}</p> : null}
              <button type="submit" disabled={saving || loading || !exercises.length} className={`${adminButton.primary} mt-5`}>{saving ? 'Salvataggio...' : 'Aggiungi mappatura'}</button>
              {!loading && !exercises.length ? <p className="mt-4 text-sm text-ink/65 dark:text-white/60">Non risultano exercise version correnti pubblicate e approvate da collegare.</p> : null}
            </form>

            <section className={`${adminSurface.panel} p-6`}>
              <div className="flex items-end justify-between gap-4">
                <div><p className="text-xs font-bold uppercase tracking-wide text-moss dark:text-emerald-300">Configurazione attuale</p><h2 className="mt-2 text-xl font-black text-ink dark:text-white">{mappings.length} mappature</h2></div>
                <button type="button" onClick={load} className={adminButton.secondary}>Aggiorna</button>
              </div>

              {loading ? <p className="mt-5 text-sm text-ink/60 dark:text-white/60">Caricamento...</p> : null}
              {!loading && mappings.length ? (
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead><tr className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink/55 dark:border-white/10 dark:text-white/50"><th className="px-2 py-3">Fase</th><th className="px-2 py-3">Argomento</th><th className="px-2 py-3">Esercizio</th><th className="px-2 py-3">Azione</th></tr></thead>
                    <tbody>
                      {mappings.map((mapping) => (
                        <tr key={mapping.id} className="border-b border-ink/8 align-top dark:border-white/8">
                          <td className="px-2 py-4 font-bold text-ink dark:text-white">{phaseLabel(mapping.phase)}</td>
                          <td className="px-2 py-4 text-ink/70 dark:text-white/65">{mapping.topic_key ? recoveryTopicLabel(mapping.topic_key) : 'Misto'}</td>
                          <td className="px-2 py-4 text-ink/70 dark:text-white/65"><strong className="text-ink dark:text-white">{exerciseLabel(mapping)}</strong>{mapping.school_test_type ? <span className="mt-1 block text-xs">{mapping.school_test_type}</span> : null}</td>
                          <td className="px-2 py-4"><button type="button" onClick={() => removeMapping(mapping.id)} className={adminButton.secondary}>Rimuovi</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {!loading && !mappings.length ? <p className="mt-5 text-sm leading-6 text-ink/65 dark:text-white/60">Nessuna mappatura ancora configurata. Le sessioni possono essere pianificate ma non partono finché almeno il contenuto necessario non viene collegato qui.</p> : null}
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
