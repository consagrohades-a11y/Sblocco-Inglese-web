import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { assignmentActivityCatalog } from '../data/assignmentActivityCatalog.js';
import { supabase } from '../lib/supabaseClient.js';

export default function AdminAssignmentContent() {
  const { learnerId, assignmentId } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');

      const [{ data: assignmentData, error: assignmentError }, { data: resourceData, error: resourceError }] = await Promise.all([
        supabase
          .from('assignments')
          .select('id, learner_id, title, status')
          .eq('id', assignmentId)
          .eq('learner_id', learnerId)
          .maybeSingle(),
        supabase
          .from('assignment_resources')
          .select('resource_key, sequence_index')
          .eq('assignment_id', assignmentId)
          .order('sequence_index', { ascending: true }),
      ]);

      if (!active) return;

      if (assignmentError || resourceError) {
        setError('Non è stato possibile caricare i contenuti dell’assegnazione. Verifica che la nuova migrazione sia stata applicata in Supabase.');
        setAssignment(null);
      } else {
        setAssignment(assignmentData ?? null);
        setSelectedKeys((resourceData ?? []).map((item) => item.resource_key));
      }

      setLoading(false);
    }

    load();
    return () => { active = false; };
  }, [assignmentId, learnerId]);

  const selectedActivities = useMemo(
    () => selectedKeys
      .map((key) => assignmentActivityCatalog.find((activity) => activity.key === key))
      .filter(Boolean),
    [selectedKeys],
  );

  function toggleActivity(key) {
    setSelectedKeys((current) => current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key]);
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

  async function saveResources() {
    setSaving(true);
    setError('');

    const resources = selectedActivities.map((activity, index) => ({
      key: activity.key,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      route: activity.route,
      sequence_index: index + 1,
    }));

    const { error: saveError } = await supabase.rpc('admin_replace_assignment_resources', {
      target_assignment_id: assignmentId,
      resources,
    });

    setSaving(false);

    if (saveError) {
      setError('Non è stato possibile salvare i contenuti. Verifica che la migrazione assignment_resources sia stata applicata in Supabase.');
      return;
    }

    navigate(`/admin/learners/${learnerId}`, { replace: true });
  }

  return (
    <>
      <SEO title="Contenuti assegnazione | Sblocco Inglese" description="Seleziona e ordina le attività assegnate allo studente." />
      <section className="section-shell py-12 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft sm:p-8">
            <span className="eyebrow">Assegnazione</span>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-black text-ink sm:text-4xl">Scegli i contenuti</h1>
                <p className="mt-3 text-base leading-7 text-ink/70">
                  {assignment ? `Attività disponibili per “${assignment.title}”.` : 'Caricamento assegnazione...'}
                </p>
              </div>
              <Link to={`/admin/learners/${learnerId}`} className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm font-black text-ink hover:bg-linen">
                Annulla
              </Link>
            </div>
          </div>

          {loading ? <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-6 text-sm font-bold text-ink/65">Caricamento contenuti...</div> : null}
          {error ? <div className="mt-6 border-l-4 border-red-400 bg-red-50 p-5 text-sm font-bold text-red-900">{error}</div> : null}

          {!loading && assignment ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
              <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-moss">Catalogo</p>
                <h2 className="mt-2 text-2xl font-black text-ink">Attività disponibili</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {assignmentActivityCatalog.map((activity) => {
                    const selected = selectedKeys.includes(activity.key);
                    return (
                      <button
                        key={activity.key}
                        type="button"
                        onClick={() => toggleActivity(activity.key)}
                        className={`focus-ring rounded-xl border p-5 text-left transition ${selected ? 'border-moss bg-mint/30' : 'border-ink/10 bg-white hover:bg-linen/45'}`}
                      >
                        <span className="text-xs font-black uppercase tracking-wide text-moss">{activity.type === 'trainer' ? 'Trainer' : 'Unità grammaticale'}</span>
                        <h3 className="mt-2 text-base font-black text-ink">{activity.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-ink/65">{activity.description}</p>
                        <span className="mt-4 inline-flex text-sm font-black text-moss">{selected ? 'Selezionata' : 'Aggiungi'}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <aside className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm lg:sticky lg:top-24 lg:self-start">
                <p className="text-xs font-black uppercase tracking-wide text-moss">Ordine</p>
                <h2 className="mt-2 text-xl font-black text-ink">Contenuti selezionati</h2>
                {selectedActivities.length === 0 ? (
                  <p className="mt-4 text-sm leading-6 text-ink/60">Nessun contenuto selezionato. Puoi anche salvare un’assegnazione con sole istruzioni scritte.</p>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {selectedActivities.map((activity, index) => (
                      <div key={activity.key} className="rounded-xl border border-ink/10 bg-linen/35 p-4">
                        <p className="text-sm font-black text-ink">{index + 1}. {activity.title}</p>
                        <div className="mt-3 flex gap-2">
                          <button type="button" disabled={index === 0} onClick={() => moveActivity(index, -1)} className="rounded-full border border-ink/15 bg-white px-3 py-1.5 text-xs font-black disabled:opacity-35">Su</button>
                          <button type="button" disabled={index === selectedActivities.length - 1} onClick={() => moveActivity(index, 1)} className="rounded-full border border-ink/15 bg-white px-3 py-1.5 text-xs font-black disabled:opacity-35">Giù</button>
                          <button type="button" onClick={() => toggleActivity(activity.key)} className="ml-auto text-xs font-black text-red-700 underline">Rimuovi</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button type="button" disabled={saving} onClick={saveResources} className="focus-ring mt-6 w-full rounded-full bg-ink px-5 py-3 text-sm font-black text-white hover:bg-moss disabled:opacity-50">
                  {saving ? 'Salvataggio...' : 'Salva contenuti'}
                </button>
              </aside>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
