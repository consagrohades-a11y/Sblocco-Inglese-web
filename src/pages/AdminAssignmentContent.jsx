import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import AssignmentExercisePicker from '../components/admin/AssignmentExercisePicker.jsx';
import AssignmentPracticeEditor, { DEFAULT_ASSIGNMENT_PRACTICE } from '../components/admin/AssignmentPracticeEditor.jsx';
import AssignmentStudyScopeEditor from '../components/admin/AssignmentStudyScopeEditor.jsx';
import { assignmentActivityCatalog } from '../data/assignmentActivityCatalog.js';
import { supabase } from '../lib/supabaseClient.js';

function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export default function AdminAssignmentContent() {
  const { learnerId, assignmentId } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [selectedExerciseResources, setSelectedExerciseResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [title, setTitle] = useState('');
  const [learnerMessage, setLearnerMessage] = useState('');
  const [privateNote, setPrivateNote] = useState('');
  const [required, setRequired] = useState(true);
  const [deadline, setDeadline] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [practiceEnabled, setPracticeEnabled] = useState(false);
  const [practiceConfig, setPracticeConfig] = useState(DEFAULT_ASSIGNMENT_PRACTICE);
  const [practiceAvailability, setPracticeAvailability] = useState({ cards: 0, questions: 0 });
  const [studyEnabled, setStudyEnabled] = useState(false);
  const [selectedDeckIds, setSelectedDeckIds] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [resolvedItemIds, setResolvedItemIds] = useState([]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      const [
        { data: assignmentData, error: assignmentError },
        { data: resourceData, error: resourceError },
        { data: studyData, error: studyError },
      ] = await Promise.all([
        supabase.from('assignments')
          .select('id, learner_id, title, learner_note, reason, status, required, deadline_at, estimated_minutes, published_at, created_at')
          .eq('id', assignmentId).eq('learner_id', learnerId).maybeSingle(),
        supabase.from('assignment_resources')
          .select('id, resource_key, resource_type, title, description, route, sequence_index, practice_config, exercise_config').eq('assignment_id', assignmentId)
          .order('sequence_index', { ascending: true }),
        supabase.from('assignment_study_settings')
          .select('include_in_srs, exercise_modes, selected_deck_ids, selected_item_ids, snapshot_item_count')
          .eq('assignment_id', assignmentId).maybeSingle(),
      ]);
      if (!active) return;
      if (assignmentError || resourceError || studyError) {
        setError('Non è stato possibile caricare l’assegnazione. Verifica che le migrazioni siano state applicate in Supabase.');
      } else if (!assignmentData) {
        setError('Assegnazione non trovata.');
      } else {
        setAssignment(assignmentData);
        setTitle(assignmentData.title || '');
        setLearnerMessage(assignmentData.learner_note || '');
        setPrivateNote(assignmentData.reason || '');
        setRequired(Boolean(assignmentData.required));
        setDeadline(toLocalInput(assignmentData.deadline_at));
        setEstimatedMinutes(assignmentData.estimated_minutes ? String(assignmentData.estimated_minutes) : '');
        setSelectedKeys((resourceData ?? []).filter((item) => assignmentActivityCatalog.some((activity) => activity.key === item.resource_key)).map((item) => item.resource_key));
        setSelectedExerciseResources((resourceData ?? []).filter((item) => item.resource_type === 'custom_exercise').map((item) => ({
          key: item.resource_key,
          type: item.resource_type,
          title: item.title,
          description: item.description,
          route: item.route,
          exercise_config: item.exercise_config,
        })));
        const practiceResource = (resourceData ?? []).find((item) => item.resource_type === 'practice_session');
        setPracticeEnabled(Boolean(practiceResource));
        setPracticeConfig({ ...DEFAULT_ASSIGNMENT_PRACTICE, ...(practiceResource?.practice_config || {}) });
        setStudyEnabled(Boolean(studyData?.include_in_srs));
        setSelectedDeckIds(studyData?.selected_deck_ids || []);
        setSelectedItemIds(studyData?.selected_item_ids || []);
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [assignmentId, learnerId]);

  const selectedActivities = useMemo(() => selectedKeys
    .map((key) => assignmentActivityCatalog.find((activity) => activity.key === key))
    .filter(Boolean), [selectedKeys]);
  const selectedStructureCount = selectedActivities.length + selectedExerciseResources.length + (studyEnabled ? 1 : 0) + (practiceEnabled ? 1 : 0);

  const isOverdue = Boolean(assignment?.deadline_at && new Date(assignment.deadline_at) < new Date() && assignment.status !== 'completed');

  function toggleActivity(key) {
    setSelectedKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  function moveActivity(index, direction) {
    setSelectedKeys((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  async function save(nextStatus = null) {
    setError('');
    setSuccess('');
    if (!title.trim()) {
      setError('Inserisci un titolo per l’assegnazione.');
      return;
    }
    const parsedMinutes = estimatedMinutes ? Number.parseInt(estimatedMinutes, 10) : null;
    if (parsedMinutes !== null && (!Number.isInteger(parsedMinutes) || parsedMinutes <= 0)) {
      setError('Il tempo stimato deve essere maggiore di zero.');
      return;
    }
    if (practiceEnabled && !practiceConfig.modes.length) {
      setError('Seleziona almeno un tipo di esercizio per la pratica mirata.');
      return;
    }
    if (practiceEnabled && practiceAvailability.questions < 1) {
      setError('Con questi filtri e tipi di esercizio non esistono domande utilizzabili. Modifica la selezione prima di pubblicare.');
      return;
    }
    if (practiceEnabled && practiceConfig.question_count > practiceAvailability.questions) {
      setError(`Puoi assegnare al massimo ${practiceAvailability.questions} domande con questa selezione.`);
      return;
    }
    if (studyEnabled && !resolvedItemIds.length) {
      setError('Seleziona almeno un deck, una parola o un’espressione per il percorso guidato.');
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase.rpc('admin_update_assignment', {
      target_assignment_id: assignmentId,
      assignment_title: title.trim(),
      learner_message: learnerMessage.trim() || null,
      private_admin_note: privateNote.trim() || null,
      is_required: required,
      deadline_at_value: deadline ? new Date(deadline).toISOString() : null,
      estimated_minutes_value: parsedMinutes,
      next_status: nextStatus,
    });
    if (updateError) {
      setSaving(false);
      setError('Non è stato possibile aggiornare l’assegnazione. Applica la migrazione admin_update_assignment in Supabase.');
      return;
    }

    const resources = [];
    if (practiceEnabled) {
      const trainer = practiceConfig.trainer_id;
      resources.push({
        key: 'targeted-practice',
        type: 'practice_session',
        title: 'Pratica mirata',
        description: `${practiceConfig.question_count} domande dal ${trainer === 'word' ? 'Word Trainer' : trainer === 'mixed' ? 'deck misto' : `${trainer} Expression Trainer`}`,
        route: '/practice',
        practice_config: { ...practiceConfig, item_ids: [] },
      });
    }
    selectedActivities.forEach((activity) => resources.push({
      key: activity.key,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      route: activity.route,
    }));
    selectedExerciseResources.forEach((resource) => resources.push(resource));
    resources.forEach((resource, index) => { resource.sequence_index = index + 1; });

    const { error: resourcesError } = await supabase.rpc('admin_replace_assignment_resources', {
      target_assignment_id: assignmentId,
      resources,
    });
    if (resourcesError) {
      setSaving(false);
      setError(`I dati principali sono stati salvati, ma non è stato possibile salvare i contenuti: ${resourcesError.message}`);
      return;
    }

    const { error: studyError } = await supabase.rpc('admin_replace_assignment_study_scope', {
      target_assignment_id: assignmentId,
      p_item_ids: studyEnabled ? resolvedItemIds : [],
      p_deck_ids: studyEnabled ? selectedDeckIds : [],
      p_exercise_modes: practiceConfig.modes?.length ? practiceConfig.modes : DEFAULT_ASSIGNMENT_PRACTICE.modes,
      p_include_in_srs: studyEnabled,
    });
    if (studyError) {
      setSaving(false);
      setError('I dati principali sono stati salvati, ma non è stato possibile aggiornare le card del percorso guidato.');
      return;
    }

    setSaving(false);
    setAssignment((current) => ({ ...current, status: nextStatus || current.status, title: title.trim(), deadline_at: deadline ? new Date(deadline).toISOString() : null }));
    setSuccess(nextStatus === 'published' ? 'Assegnazione pubblicata.' : nextStatus === 'archived' ? 'Assegnazione archiviata.' : nextStatus === 'draft' ? 'Assegnazione riportata in bozza.' : 'Modifiche salvate.');
  }

  const fieldClass = 'mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-moss focus:ring-4 focus:ring-mint/40 dark:border-white/20 dark:bg-[#101a17] dark:text-white dark:focus:border-emerald-300 dark:focus:ring-emerald-400/15';

  return (
    <>
      <SEO title="Gestisci assegnazione | Sblocco Inglese" description="Modifica, completa e pubblica un’assegnazione." />
      <section className="section-shell py-8 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-ink/10 bg-white dark:border-white/10 dark:bg-[#16211e] p-6 shadow-soft sm:p-8">
            <span className="eyebrow">Assegnazione</span>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-black text-ink dark:text-white sm:text-4xl">Gestisci assegnazione</h1>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                  {assignment ? <span className="rounded-full bg-linen px-3 py-1.5 text-ink dark:bg-white/10 dark:text-white">Stato: {assignment.status}</span> : null}
                  {isOverdue ? <span className="rounded-full bg-red-100 px-3 py-1.5 text-red-800">Scaduta</span> : null}
                </div>
              </div>
              <Link to={`/admin/learners/${learnerId}`} className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-ink/15 bg-white dark:border-white/20 dark:bg-white/10 dark:text-white px-5 py-2.5 text-sm font-black text-ink hover:bg-linen dark:hover:bg-white/15">Torna allo studente</Link>
            </div>
          </div>

          {loading ? <div className="mt-6 rounded-2xl border border-ink/10 bg-white dark:border-white/10 dark:bg-[#16211e] p-6 text-sm font-bold text-ink/65 dark:text-white/60">Caricamento...</div> : null}
          {error ? <div className="mt-6 border-l-4 border-red-400 bg-red-50 p-5 text-sm font-bold text-red-900">{error}</div> : null}
          {success ? <div className="mt-6 border-l-4 border-moss bg-mint/30 p-5 text-sm font-bold text-ink dark:bg-emerald-400/10 dark:text-emerald-100">{success}</div> : null}

          {!loading && assignment ? (
            <div className="mt-6 grid gap-6">
              <section className="rounded-2xl border border-ink/10 bg-white dark:border-white/10 dark:bg-[#16211e] p-6 shadow-sm sm:p-8">
                <p className="text-xs font-black uppercase tracking-wide text-moss">Dati e messaggi</p>
                <div className="mt-5 grid gap-5">
                  <label><span className="text-sm font-black">Titolo</span><input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} /></label>
                  <label><span className="text-sm font-black">Messaggio visibile allo studente</span><textarea rows={5} value={learnerMessage} onChange={(e) => setLearnerMessage(e.target.value)} className={fieldClass} /></label>
                  <label className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-300/30 dark:bg-amber-300/10"><span className="text-sm font-black text-amber-950 dark:text-amber-100">Nota privata admin</span><textarea rows={4} value={privateNote} onChange={(e) => setPrivateNote(e.target.value)} className={fieldClass} /></label>
                  <label className="flex items-start gap-3 rounded-xl border border-ink/10 bg-linen p-4 text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white"><input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="mt-1" /><span className="text-sm font-black">Attività obbligatoria</span></label>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label><span className="text-sm font-black">Scadenza</span><input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={fieldClass} /><span className="mt-2 block text-xs font-semibold text-ink/50 dark:text-white/50">Dopo la scadenza l’attività resta accessibile, ma viene segnalata come scaduta.</span></label>
                    <label><span className="text-sm font-black">Tempo stimato, minuti</span><input type="number" min="1" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} className={fieldClass} /></label>
                  </div>
                </div>
              </section>

              <AssignmentStudyScopeEditor
                enabled={studyEnabled}
                onEnabledChange={setStudyEnabled}
                selectedDeckIds={selectedDeckIds}
                onDeckIdsChange={setSelectedDeckIds}
                selectedItemIds={selectedItemIds}
                onItemIdsChange={setSelectedItemIds}
                onResolvedItemIdsChange={setResolvedItemIds}
              />

              <AssignmentPracticeEditor
                enabled={practiceEnabled}
                onEnabledChange={setPracticeEnabled}
                config={practiceConfig}
                onChange={setPracticeConfig}
                onAvailabilityChange={setPracticeAvailability}
              />

              <AssignmentExercisePicker value={selectedExerciseResources} onChange={setSelectedExerciseResources} />

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.65fr)]">
                <section className="rounded-2xl border border-ink/10 bg-white dark:border-white/10 dark:bg-[#16211e] p-6 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-wide text-moss">Contenuti</p>
                  <h2 className="mt-2 text-2xl font-black text-ink dark:text-white">Attività disponibili</h2>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {assignmentActivityCatalog.map((activity) => {
                      const selected = selectedKeys.includes(activity.key);
                      return <button key={activity.key} type="button" onClick={() => toggleActivity(activity.key)} className={`focus-ring rounded-xl border p-4 text-left transition ${selected ? 'border-moss bg-mint/30 dark:border-emerald-300/40 dark:bg-emerald-400/15' : 'border-ink/10 bg-white hover:bg-linen/45 dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/10'}`}><span className="text-xs font-black uppercase tracking-wide text-moss">{activity.type === 'trainer' ? 'Trainer' : 'Unità grammaticale'}</span><h3 className="mt-2 text-base font-black text-ink dark:text-white">{activity.title}</h3><p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/60">{activity.description}</p><span className="mt-4 inline-flex text-sm font-black text-moss">{selected ? 'Selezionata' : 'Aggiungi'}</span></button>;
                    })}
                  </div>
                </section>

                <aside className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] lg:sticky lg:top-24 lg:self-start">
                  <div className="flex items-end justify-between gap-3">
                    <div><p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Anteprima struttura</p><h2 className="mt-1 text-lg font-black text-ink dark:text-white">Contenuti selezionati</h2></div>
                    <span className="rounded-full bg-linen px-2.5 py-1 text-xs font-black text-ink/65 dark:bg-white/10 dark:text-white/65">{selectedStructureCount}</span>
                  </div>
                  {selectedStructureCount === 0 ? <p className="mt-4 text-sm leading-6 text-ink/60 dark:text-white/60">Nessun contenuto selezionato.</p> : (
                    <div className="mt-3 divide-y divide-ink/10 border-y border-ink/10 dark:divide-white/10 dark:border-white/10">
                      {studyEnabled ? <div className="flex gap-3 py-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sea/15 text-xs font-black text-sea">SRS</span><div><p className="text-sm font-black text-ink dark:text-white">Percorso guidato</p><p className="mt-1 text-xs font-semibold text-ink/55 dark:text-white/55">{resolvedItemIds.length} card selezionate</p></div></div> : null}
                      {practiceEnabled ? <div className="flex gap-3 py-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mint text-xs font-black text-moss">P</span><div><p className="text-sm font-black text-ink dark:text-white">Pratica mirata</p><p className="mt-1 text-xs font-semibold text-ink/55 dark:text-white/55">{practiceConfig.question_count} domande, {practiceConfig.modes.length} tipi di esercizio</p></div></div> : null}
                      {selectedExerciseResources.map((resource) => <div key={resource.key} className="flex gap-3 py-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-black text-violet-800 dark:bg-violet-300/15 dark:text-violet-200">EX</span><div><p className="text-sm font-black text-ink dark:text-white">{resource.title}</p><p className="mt-1 text-xs font-semibold text-ink/55 dark:text-white/55">Exercise Builder · punteggio minimo {resource.exercise_config?.required_score ?? 70}%</p></div></div>)}
                      {selectedActivities.map((activity, index) => (
                        <div key={activity.key} className="flex gap-3 py-3">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mint text-xs font-black text-ink dark:bg-emerald-400/15 dark:text-emerald-200">{index + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black leading-5 text-ink dark:text-white">{activity.title}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <button type="button" disabled={index === 0} onClick={() => moveActivity(index, -1)} className="rounded-md border border-ink/15 bg-white px-2.5 py-1 text-xs font-black text-ink transition hover:bg-linen disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">Su</button>
                              <button type="button" disabled={index === selectedActivities.length - 1} onClick={() => moveActivity(index, 1)} className="rounded-md border border-ink/15 bg-white px-2.5 py-1 text-xs font-black text-ink transition hover:bg-linen disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">Giù</button>
                              <button type="button" onClick={() => toggleActivity(activity.key)} className="ml-auto rounded-md px-2 py-1 text-xs font-black text-red-700 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-300/10">Rimuovi</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </aside>
              </div>

              <section className="rounded-2xl border border-ink/10 bg-white dark:border-white/10 dark:bg-[#16211e] p-6 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-moss">Azioni</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" disabled={saving} onClick={() => save(null)} className="rounded-full border border-ink/15 bg-white dark:border-white/20 dark:bg-white/10 dark:text-white px-5 py-3 text-sm font-black">{saving ? 'Salvataggio...' : 'Salva modifiche'}</button>
                  {assignment.status !== 'published' ? <button type="button" disabled={saving} onClick={() => save('published')} className="rounded-full bg-ink px-5 py-3 text-sm font-black text-white">Pubblica</button> : <button type="button" disabled={saving} onClick={() => save('draft')} className="rounded-full border border-ink/15 bg-white dark:border-white/20 dark:bg-white/10 dark:text-white px-5 py-3 text-sm font-black">Riporta in bozza</button>}
                  {assignment.status !== 'archived' ? <button type="button" disabled={saving} onClick={() => save('archived')} className="rounded-full bg-red-700 px-5 py-3 text-sm font-black text-white">Archivia</button> : null}
                </div>
                <p className="mt-4 text-xs font-semibold leading-5 text-ink/50 dark:text-white/50">Pubblicata: visibile allo studente. Bozza o archiviata: non visibile. La scadenza non blocca l’accesso automaticamente.</p>
              </section>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
