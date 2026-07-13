import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
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
      const [{ data: assignmentData, error: assignmentError }, { data: resourceData, error: resourceError }] = await Promise.all([
        supabase.from('assignments')
          .select('id, learner_id, title, learner_note, reason, status, required, deadline_at, estimated_minutes, published_at, created_at')
          .eq('id', assignmentId).eq('learner_id', learnerId).maybeSingle(),
        supabase.from('assignment_resources')
          .select('resource_key, sequence_index').eq('assignment_id', assignmentId)
          .order('sequence_index', { ascending: true }),
      ]);
      if (!active) return;
      if (assignmentError || resourceError) {
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
        setSelectedKeys((resourceData ?? []).map((item) => item.resource_key));
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [assignmentId, learnerId]);

  const selectedActivities = useMemo(() => selectedKeys
    .map((key) => assignmentActivityCatalog.find((activity) => activity.key === key))
    .filter(Boolean), [selectedKeys]);

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

    const resources = selectedActivities.map((activity, index) => ({
      key: activity.key, type: activity.type, title: activity.title,
      description: activity.description, route: activity.route, sequence_index: index + 1,
    }));
    const { error: resourcesError } = await supabase.rpc('admin_replace_assignment_resources', {
      target_assignment_id: assignmentId,
      resources,
    });
    setSaving(false);
    if (resourcesError) {
      setError('I dati principali sono stati salvati, ma non è stato possibile salvare i contenuti.');
      return;
    }

    setAssignment((current) => ({ ...current, status: nextStatus || current.status, title: title.trim(), deadline_at: deadline ? new Date(deadline).toISOString() : null }));
    setSuccess(nextStatus === 'published' ? 'Assegnazione pubblicata.' : nextStatus === 'archived' ? 'Assegnazione archiviata.' : nextStatus === 'draft' ? 'Assegnazione riportata in bozza.' : 'Modifiche salvate.');
  }

  const fieldClass = 'mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-moss focus:ring-4 focus:ring-mint/40';

  return (
    <>
      <SEO title="Gestisci assegnazione | Sblocco Inglese" description="Modifica, completa e pubblica un’assegnazione." />
      <section className="section-shell py-12 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft sm:p-8">
            <span className="eyebrow">Assegnazione</span>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-black text-ink sm:text-4xl">Gestisci assegnazione</h1>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                  {assignment ? <span className="rounded-full bg-linen px-3 py-1.5">Stato: {assignment.status}</span> : null}
                  {isOverdue ? <span className="rounded-full bg-red-100 px-3 py-1.5 text-red-800">Scaduta</span> : null}
                </div>
              </div>
              <Link to={`/admin/learners/${learnerId}`} className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm font-black text-ink hover:bg-linen">Torna allo studente</Link>
            </div>
          </div>

          {loading ? <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-6 text-sm font-bold text-ink/65">Caricamento...</div> : null}
          {error ? <div className="mt-6 border-l-4 border-red-400 bg-red-50 p-5 text-sm font-bold text-red-900">{error}</div> : null}
          {success ? <div className="mt-6 border-l-4 border-moss bg-mint/30 p-5 text-sm font-bold text-ink">{success}</div> : null}

          {!loading && assignment ? (
            <div className="mt-6 grid gap-6">
              <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8">
                <p className="text-xs font-black uppercase tracking-wide text-moss">Dati e messaggi</p>
                <div className="mt-5 grid gap-5">
                  <label><span className="text-sm font-black">Titolo</span><input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} /></label>
                  <label><span className="text-sm font-black">Messaggio visibile allo studente</span><textarea rows={5} value={learnerMessage} onChange={(e) => setLearnerMessage(e.target.value)} className={fieldClass} /></label>
                  <label className="rounded-xl border border-amber-200 bg-amber-50 p-4"><span className="text-sm font-black text-amber-950">Nota privata admin</span><textarea rows={4} value={privateNote} onChange={(e) => setPrivateNote(e.target.value)} className={fieldClass} /></label>
                  <label className="flex items-start gap-3 rounded-xl border border-ink/10 bg-linen/40 p-4"><input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="mt-1" /><span className="text-sm font-black">Attività obbligatoria</span></label>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label><span className="text-sm font-black">Scadenza</span><input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={fieldClass} /><span className="mt-2 block text-xs font-semibold text-ink/50">Dopo la scadenza l’attività resta accessibile, ma viene segnalata come scaduta.</span></label>
                    <label><span className="text-sm font-black">Tempo stimato, minuti</span><input type="number" min="1" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} className={fieldClass} /></label>
                  </div>
                </div>
              </section>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
                <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-wide text-moss">Contenuti</p>
                  <h2 className="mt-2 text-2xl font-black text-ink">Attività disponibili</h2>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {assignmentActivityCatalog.map((activity) => {
                      const selected = selectedKeys.includes(activity.key);
                      return <button key={activity.key} type="button" onClick={() => toggleActivity(activity.key)} className={`focus-ring rounded-xl border p-5 text-left transition ${selected ? 'border-moss bg-mint/30' : 'border-ink/10 bg-white hover:bg-linen/45'}`}><span className="text-xs font-black uppercase tracking-wide text-moss">{activity.type === 'trainer' ? 'Trainer' : 'Unità grammaticale'}</span><h3 className="mt-2 text-base font-black text-ink">{activity.title}</h3><p className="mt-2 text-sm leading-6 text-ink/65">{activity.description}</p><span className="mt-4 inline-flex text-sm font-black text-moss">{selected ? 'Selezionata' : 'Aggiungi'}</span></button>;
                    })}
                  </div>
                </section>

                <aside className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm lg:sticky lg:top-24 lg:self-start">
                  <p className="text-xs font-black uppercase tracking-wide text-moss">Anteprima struttura</p>
                  <h2 className="mt-2 text-xl font-black text-ink">Contenuti selezionati</h2>
                  {selectedActivities.length === 0 ? <p className="mt-4 text-sm leading-6 text-ink/60">Nessun contenuto selezionato.</p> : <div className="mt-4 grid gap-3">{selectedActivities.map((activity, index) => <div key={activity.key} className="rounded-xl border border-ink/10 bg-linen/35 p-4"><p className="text-sm font-black">{index + 1}. {activity.title}</p><div className="mt-3 flex gap-2"><button type="button" disabled={index === 0} onClick={() => moveActivity(index, -1)} className="rounded-full border bg-white px-3 py-1.5 text-xs font-black disabled:opacity-35">Su</button><button type="button" disabled={index === selectedActivities.length - 1} onClick={() => moveActivity(index, 1)} className="rounded-full border bg-white px-3 py-1.5 text-xs font-black disabled:opacity-35">Giù</button><button type="button" onClick={() => toggleActivity(activity.key)} className="ml-auto text-xs font-black text-red-700 underline">Rimuovi</button></div></div>)}</div>}
                </aside>
              </div>

              <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-moss">Azioni</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" disabled={saving} onClick={() => save(null)} className="rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black">{saving ? 'Salvataggio...' : 'Salva modifiche'}</button>
                  {assignment.status !== 'published' ? <button type="button" disabled={saving} onClick={() => save('published')} className="rounded-full bg-ink px-5 py-3 text-sm font-black text-white">Pubblica</button> : <button type="button" disabled={saving} onClick={() => save('draft')} className="rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black">Riporta in bozza</button>}
                  {assignment.status !== 'archived' ? <button type="button" disabled={saving} onClick={() => save('archived')} className="rounded-full bg-red-700 px-5 py-3 text-sm font-black text-white">Archivia</button> : null}
                </div>
                <p className="mt-4 text-xs font-semibold leading-5 text-ink/50">Pubblicata: visibile allo studente. Bozza o archiviata: non visibile. La scadenza non blocca l’accesso automaticamente.</p>
              </section>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
