import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import AdminPageHeader from '../components/admin/AdminPageHeader.jsx';
import AssignmentCollectionPicker from '../components/admin/AssignmentCollectionPicker.jsx';
import AssignmentExercisePicker from '../components/admin/AssignmentExercisePicker.jsx';
import { supabase } from '../lib/supabaseClient.js';

function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export default function AdminAssignmentContent() {
  const { learnerId, assignmentId } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [selectedExerciseResources, setSelectedExerciseResources] = useState([]);
  const [selectedCollectionResources, setSelectedCollectionResources] = useState([]);
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

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');

      const [
        { data: assignmentData, error: assignmentError },
        { data: resourceData, error: resourceError },
      ] = await Promise.all([
        supabase
          .from('assignments')
          .select('id, learner_id, title, learner_note, reason, status, required, deadline_at, estimated_minutes, published_at, created_at, group_batch_id')
          .eq('id', assignmentId)
          .eq('learner_id', learnerId)
          .maybeSingle(),
        supabase
          .from('assignment_resources')
          .select('id, resource_key, resource_type, title, description, route, sequence_index, exercise_config, collection_config, collection_snapshot, collection_parent_resource_id')
          .eq('assignment_id', assignmentId)
          .order('sequence_index', { ascending: true }),
      ]);

      if (!active) return;

      if (assignmentError || resourceError) {
        const loadError = assignmentError || resourceError;
        setError(`Non è stato possibile caricare l’assegnazione${loadError?.message ? `: ${loadError.message}` : '.'}`);
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

        setSelectedExerciseResources((resourceData ?? [])
          .filter((item) => item.resource_type === 'custom_exercise' && !item.collection_parent_resource_id)
          .map((item) => ({
            key: item.resource_key,
            type: item.resource_type,
            title: item.title,
            description: item.description,
            route: item.route,
            exercise_config: item.exercise_config,
          })));

        setSelectedCollectionResources((resourceData ?? [])
          .filter((item) => item.resource_type === 'exercise_collection')
          .map((item) => ({
            collectionId: item.collection_config?.collection_id,
            collectionVersionId: item.collection_config?.collection_version_id,
            publicId: item.collection_snapshot?.public_id || 'Collection',
            title: item.title,
            description: item.description,
            versionNumber: item.collection_config?.version_number,
            completionRule: item.collection_config?.completion_rule || 'all_items',
            requiredPercent: Number(item.collection_config?.required_percent || 100),
            requiredScore: Number(item.collection_config?.required_score || 70),
            itemCount: item.collection_snapshot?.items?.length || 0,
          })));
      }

      setLoading(false);
    }

    load();
    return () => { active = false; };
  }, [assignmentId, learnerId]);

  const selectedStructureCount = selectedExerciseResources.length + selectedCollectionResources.length;
  const isOverdue = Boolean(
    assignment?.deadline_at
      && new Date(assignment.deadline_at) < new Date()
      && assignment.status !== 'completed',
  );

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
      setError(`Non è stato possibile aggiornare l’assegnazione${updateError.message ? `: ${updateError.message}` : '.'}`);
      return;
    }

    const resources = selectedExerciseResources.map((resource, index) => ({
      ...resource,
      sequence_index: index + 1,
    }));

    const { error: resourcesError } = await supabase.rpc('admin_replace_assignment_resources', {
      target_assignment_id: assignmentId,
      resources,
    });

    if (resourcesError) {
      setSaving(false);
      setError(`I dati principali sono stati salvati, ma non è stato possibile salvare le attività: ${resourcesError.message}`);
      return;
    }

    const { error: collectionsError } = await supabase.rpc('admin_replace_assignment_collections', {
      target_assignment_id: assignmentId,
      p_collections: selectedCollectionResources.map((item) => ({
        collection_id: item.collectionId,
        collection_version_id: item.collectionVersionId,
        required_score: item.requiredScore || 70,
      })),
    });

    if (collectionsError) {
      setSaving(false);
      setError(`I dati principali sono stati salvati, ma non è stato possibile salvare le raccolte: ${collectionsError.message}`);
      return;
    }

    if (assignment?.group_batch_id) {
      const { error: syncError } = await supabase.rpc('admin_sync_group_assignment_batch_from_assignment', {
        p_source_assignment_id: assignmentId,
      });

      if (syncError) {
        setSaving(false);
        setError(`Questa assegnazione è stata salvata, ma la sincronizzazione del gruppo non è riuscita: ${syncError.message}`);
        return;
      }
    }

    setSaving(false);
    setAssignment((current) => ({
      ...current,
      status: nextStatus || current.status,
      title: title.trim(),
      deadline_at: deadline ? new Date(deadline).toISOString() : null,
    }));

    const groupSuffix = assignment?.group_batch_id
      ? ' Modifiche sincronizzate con tutto il gruppo.'
      : '';

    setSuccess(
      (nextStatus === 'published'
        ? 'Assegnazione pubblicata.'
        : nextStatus === 'archived'
          ? 'Assegnazione archiviata.'
          : nextStatus === 'draft'
            ? 'Assegnazione riportata in bozza.'
            : 'Modifiche salvate.')
      + groupSuffix,
    );
  }

  const fieldClass = 'mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-clay focus:ring-4 focus:ring-clay/10 dark:border-white/20 dark:bg-surface-800 dark:text-white dark:focus:border-coral dark:focus:ring-coral/10';

  return (
    <>
      <SEO title="Gestisci assegnazione | Sblocco Inglese" description="Modifica e pubblica un’assegnazione Learning Studio." />
      <section className="section-shell py-8 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <AdminPageHeader
            eyebrow="Assegnazioni"
            title="Gestisci assegnazione"
            description={assignment ? `Stato: ${assignment.status}${isOverdue ? ' · scaduta' : ''}` : 'Caricamento assegnazione...'}
            actions={(
              <Link
                to={`/admin/learners/${learnerId}`}
                className="focus-ring inline-flex min-h-10 items-center justify-center rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-black text-ink transition hover:border-clay/35 hover:text-clay dark:border-white/15 dark:bg-white/[0.06] dark:text-white"
              >
                Profilo studente
              </Link>
            )}
          />

          {loading ? (
            <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-6 text-sm font-bold text-ink/65 dark:border-white/10 dark:bg-surface-900 dark:text-white/60">
              Caricamento...
            </div>
          ) : null}

          {error ? <div className="mt-6 border-l-4 border-red-400 bg-red-50 p-5 text-sm font-bold text-red-900">{error}</div> : null}
          {success ? <div className="mt-6 border-l-4 border-clay bg-clay/[0.08] p-5 text-sm font-bold text-ink dark:bg-coral/10 dark:text-white">{success}</div> : null}

          {!loading && assignment ? (
            <div className="mt-6 grid gap-6">
              <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-surface-900 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-wide text-clay">Dati e messaggi</p>
                <div className="mt-5 grid gap-5">
                  <label>
                    <span className="text-sm font-black">Titolo</span>
                    <input value={title} onChange={(event) => setTitle(event.target.value)} className={fieldClass} />
                  </label>

                  <label>
                    <span className="text-sm font-black">Messaggio visibile allo studente</span>
                    <textarea rows={5} value={learnerMessage} onChange={(event) => setLearnerMessage(event.target.value)} className={fieldClass} />
                  </label>

                  <label className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-300/30 dark:bg-amber-300/10">
                    <span className="text-sm font-black text-amber-950 dark:text-amber-100">Nota privata admin</span>
                    <textarea rows={4} value={privateNote} onChange={(event) => setPrivateNote(event.target.value)} className={fieldClass} />
                  </label>

                  <label className="flex items-start gap-3 rounded-xl border border-ink/10 bg-linen p-4 text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white">
                    <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} className="mt-1" />
                    <span className="text-sm font-black">Attività obbligatoria</span>
                  </label>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <label>
                      <span className="text-sm font-black">Scadenza</span>
                      <input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} className={fieldClass} />
                      <span className="mt-2 block text-xs font-semibold text-ink/65 dark:text-white/65">Dopo la scadenza l’attività resta accessibile, ma viene segnalata come scaduta.</span>
                    </label>
                    <label>
                      <span className="text-sm font-black">Tempo stimato, minuti</span>
                      <input type="number" min="1" value={estimatedMinutes} onChange={(event) => setEstimatedMinutes(event.target.value)} className={fieldClass} />
                    </label>
                  </div>
                </div>
              </section>

              <section className="grid gap-5 rounded-3xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-white/[0.035] sm:p-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-clay dark:text-coral">Learning Studio</p>
                  <h2 className="mt-2 text-2xl font-black text-ink dark:text-white">Attività da assegnare</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/65">
                    Collega attività già pubblicate. Il contenuto tecnico resta gestito dallo Studio.
                  </p>
                </div>
                <AssignmentExercisePicker value={selectedExerciseResources} onChange={setSelectedExerciseResources} />
                <AssignmentCollectionPicker value={selectedCollectionResources} onChange={setSelectedCollectionResources} />
              </section>

              <aside className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-900">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-clay dark:text-coral">Riepilogo</p>
                    <h2 className="mt-1 text-lg font-black text-ink dark:text-white">Contenuti selezionati</h2>
                  </div>
                  <span className="rounded-full bg-linen px-2.5 py-1 text-xs font-black text-ink/65 dark:bg-white/10 dark:text-white/65">
                    {selectedStructureCount}
                  </span>
                </div>

                {selectedStructureCount === 0 ? (
                  <p className="mt-4 text-sm leading-6 text-ink/60 dark:text-white/60">Nessuna attività selezionata.</p>
                ) : (
                  <div className="mt-3 divide-y divide-ink/10 border-y border-ink/10 dark:divide-white/10 dark:border-white/10">
                    {selectedExerciseResources.map((resource) => (
                      <div key={resource.key} className="flex gap-3 py-3">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-clay/[0.08] text-[0.65rem] font-black text-clay dark:bg-coral/10 dark:text-coral">LS</span>
                        <div>
                          <p className="text-sm font-black text-ink dark:text-white">{resource.title}</p>
                          <p className="mt-1 text-xs font-semibold text-ink/65 dark:text-white/65">Attività Learning Studio</p>
                        </div>
                      </div>
                    ))}

                    {selectedCollectionResources.map((resource) => (
                      <div key={resource.collectionVersionId} className="flex gap-3 py-3">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-clay/[0.08] text-[0.65rem] font-black text-clay dark:bg-coral/10 dark:text-coral">COL</span>
                        <div>
                          <p className="text-sm font-black text-ink dark:text-white">{resource.title}</p>
                          <p className="mt-1 text-xs font-semibold text-ink/65 dark:text-white/65">
                            {resource.itemCount} tappe · versione {resource.versionNumber}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </aside>

              <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-surface-900">
                <p className="text-xs font-bold uppercase tracking-wide text-clay">Azioni</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" disabled={saving} onClick={() => save(null)} className="rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black dark:border-white/20 dark:bg-white/10 dark:text-white">
                    {saving ? 'Salvataggio...' : 'Salva modifiche'}
                  </button>
                  {assignment.status !== 'published' ? (
                    <button type="button" disabled={saving} onClick={() => save('published')} className="rounded-full bg-ink px-5 py-3 text-sm font-black text-white transition hover:bg-clay dark:bg-clay dark:hover:bg-coral">
                      Pubblica
                    </button>
                  ) : (
                    <button type="button" disabled={saving} onClick={() => save('draft')} className="rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black dark:border-white/20 dark:bg-white/10 dark:text-white">
                      Riporta in bozza
                    </button>
                  )}
                  {assignment.status !== 'archived' ? (
                    <button type="button" disabled={saving} onClick={() => save('archived')} className="rounded-full bg-red-700 px-5 py-3 text-sm font-black text-white">
                      Archivia
                    </button>
                  ) : null}
                </div>
                <p className="mt-4 text-xs font-semibold leading-5 text-ink/65 dark:text-white/65">
                  Pubblicata: visibile allo studente. Bozza o archiviata: non visibile. La scadenza non blocca l’accesso automaticamente.
                </p>
              </section>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
