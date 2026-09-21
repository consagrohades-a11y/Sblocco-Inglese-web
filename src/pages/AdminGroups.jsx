import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import AdminPageHeader from '../components/admin/AdminPageHeader.jsx';
import { loadLearnerGroups, saveLearnerGroup } from '../lib/learnerGroupsApi.js';

const fieldClass = 'mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-clay dark:border-white/20 dark:bg-surface-800 dark:text-white';
const typeLabels = { cohort: 'Cohort', company: 'Azienda', class: 'Classe', private_segment: 'Segmento privato', other: 'Altro' };
const statusLabels = { draft: 'Bozza', active: 'Attivo', completed: 'Completato', archived: 'Archiviato' };

export default function AdminGroups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [form, setForm] = useState({ name: '', group_type: 'cohort', status: 'draft', description: '' });

  async function refresh() {
    setLoading(true); setError('');
    try { setGroups(await loadLearnerGroups()); } catch (loadError) { setError(loadError.message || 'Impossibile caricare i gruppi.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => groups.filter((group) => {
    if (status !== 'all' && group.status !== status) return false;
    const term = query.trim().toLowerCase();
    return !term || [group.name, group.public_id, group.description].some((value) => String(value || '').toLowerCase().includes(term));
  }), [groups, query, status]);

  async function createGroup() {
    if (!form.name.trim()) { setError('Inserisci il nome del gruppo.'); return; }
    setSaving(true); setError('');
    try {
      const id = await saveLearnerGroup(null, form);
      navigate(`/admin/groups/${id}`);
    } catch (saveError) { setError(saveError.message || 'Impossibile creare il gruppo.'); }
    finally { setSaving(false); }
  }

  return <><SEO title="Gruppi studenti | Admin | Sblocco Inglese" description="Cohort, classi e segmenti di studenti." /><section className="section-shell py-8 lg:py-10"><div className="mx-auto max-w-7xl">
    <AdminPageHeader
      eyebrow="Studenti"
      title="Gruppi"
      description="Organizza learner e cohort. Ogni studente mantiene assegnazioni, tentativi e feedback separati."
      actions={(
        <Link
          to="/admin/learners"
          className="focus-ring inline-flex min-h-10 items-center rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-black text-ink transition hover:border-clay/35 hover:text-clay dark:border-white/15 dark:bg-white/[0.06] dark:text-white"
        >
          Elenco studenti
        </Link>
      )}
    />
    {error ? <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-950">{error}</div> : null}
    <div className="mt-6 grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-900"><p className="text-xs font-bold uppercase tracking-wide text-clay">Nuovo gruppo</p><label className="mt-4 block text-xs font-black">Nome<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={fieldClass} /></label><label className="mt-4 block text-xs font-black">Tipo<select value={form.group_type} onChange={(event) => setForm({ ...form, group_type: event.target.value })} className={fieldClass}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="mt-4 block text-xs font-black">Stato<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className={fieldClass}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="mt-4 block text-xs font-black">Descrizione<textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={fieldClass} /></label><button type="button" disabled={saving} onClick={createGroup} className="mt-5 w-full rounded-full bg-ink px-5 py-3 text-sm font-black text-white transition hover:bg-clay disabled:opacity-50 dark:bg-clay dark:text-white dark:hover:bg-coral">{saving ? 'Creazione...' : 'Crea gruppo'}</button></aside>
      <main><div className="grid gap-3 rounded-2xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-surface-900 sm:grid-cols-[minmax(0,1fr)_13rem]"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca nome, ID o descrizione" className={fieldClass.replace('mt-2 ', '')} /><select value={status} onChange={(event) => setStatus(event.target.value)} className={fieldClass.replace('mt-2 ', '')}><option value="all">Tutti gli stati</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="mt-4 grid gap-4 sm:grid-cols-2">{loading ? <p className="text-sm font-bold">Caricamento gruppi...</p> : null}{!loading && filtered.map((group) => <Link key={group.id} to={`/admin/groups/${group.id}`} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm transition hover:border-clay/35 dark:border-white/10 dark:bg-surface-900"><div className="flex items-center justify-between gap-3"><span className="text-xs font-black text-clay">{group.public_id}</span><span className="rounded-full bg-linen px-2.5 py-1 text-xs font-black dark:bg-white/10">{statusLabels[group.status]}</span></div><h2 className="mt-3 text-xl font-black">{group.name}</h2><p className="mt-1 text-xs font-bold text-ink/60 dark:text-white/60">{typeLabels[group.group_type]}</p>{group.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/60 dark:text-white/60">{group.description}</p> : null}<div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-linen p-2 dark:bg-white/[0.06]"><p className="font-black">{group.active_member_count}</p><p className="text-[0.65rem] font-bold">membri</p></div><div className="rounded-lg bg-linen p-2 dark:bg-white/[0.06]"><p className="font-black">{group.assignment_count}</p><p className="text-[0.65rem] font-bold">attività</p></div><div className="rounded-lg bg-linen p-2 dark:bg-white/[0.06]"><p className="font-black">{group.pending_review_count}</p><p className="text-[0.65rem] font-bold">feedback</p></div></div></Link>)}{!loading && !filtered.length ? <p className="rounded-2xl border border-dashed border-ink/15 p-6 text-sm font-bold text-ink/65 dark:text-white/65 sm:col-span-2">Nessun gruppo corrisponde ai filtri.</p> : null}</div></main>
    </div>
  </div></section></>;
}
