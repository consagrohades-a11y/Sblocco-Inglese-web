import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { loadLearnerGroups, saveLearnerGroup } from '../lib/learnerGroupsApi.js';

const fieldClass = 'mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-moss dark:border-white/20 dark:bg-[#101a17] dark:text-white';
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
    <header className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-[#16211e] sm:p-8"><span className="eyebrow">Studenti</span><div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-black text-ink dark:text-white sm:text-4xl">Gruppi e cohort</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/65">Organizza gli studenti senza condividere assegnazioni, tentativi o feedback tra membri.</p></div><Link to="/admin/learners" className="rounded-full border border-ink/15 px-5 py-2.5 text-sm font-black dark:border-white/20">Elenco studenti</Link></div></header>
    {error ? <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-950">{error}</div> : null}
    <div className="mt-6 grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e]"><p className="text-xs font-black uppercase tracking-wide text-moss">Nuovo gruppo</p><label className="mt-4 block text-xs font-black">Nome<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={fieldClass} /></label><label className="mt-4 block text-xs font-black">Tipo<select value={form.group_type} onChange={(event) => setForm({ ...form, group_type: event.target.value })} className={fieldClass}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="mt-4 block text-xs font-black">Stato<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className={fieldClass}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="mt-4 block text-xs font-black">Descrizione<textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={fieldClass} /></label><button type="button" disabled={saving} onClick={createGroup} className="mt-5 w-full rounded-full bg-ink px-5 py-3 text-sm font-black text-white disabled:opacity-50 dark:bg-emerald-300 dark:text-[#102019]">{saving ? 'Creazione...' : 'Crea gruppo'}</button></aside>
      <main><div className="grid gap-3 rounded-2xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-[#16211e] sm:grid-cols-[minmax(0,1fr)_13rem]"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca nome, ID o descrizione" className={fieldClass.replace('mt-2 ', '')} /><select value={status} onChange={(event) => setStatus(event.target.value)} className={fieldClass.replace('mt-2 ', '')}><option value="all">Tutti gli stati</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="mt-4 grid gap-4 sm:grid-cols-2">{loading ? <p className="text-sm font-bold">Caricamento gruppi...</p> : null}{!loading && filtered.map((group) => <Link key={group.id} to={`/admin/groups/${group.id}`} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm transition hover:border-moss/40 dark:border-white/10 dark:bg-[#16211e]"><div className="flex items-center justify-between gap-3"><span className="text-xs font-black text-moss">{group.public_id}</span><span className="rounded-full bg-linen px-2.5 py-1 text-xs font-black dark:bg-white/10">{statusLabels[group.status]}</span></div><h2 className="mt-3 text-xl font-black">{group.name}</h2><p className="mt-1 text-xs font-bold text-ink/60 dark:text-white/60">{typeLabels[group.group_type]}</p>{group.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/60 dark:text-white/60">{group.description}</p> : null}<div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-linen p-2 dark:bg-white/[0.06]"><p className="font-black">{group.active_member_count}</p><p className="text-[0.65rem] font-bold">membri</p></div><div className="rounded-lg bg-linen p-2 dark:bg-white/[0.06]"><p className="font-black">{group.assignment_count}</p><p className="text-[0.65rem] font-bold">attività</p></div><div className="rounded-lg bg-linen p-2 dark:bg-white/[0.06]"><p className="font-black">{group.pending_review_count}</p><p className="text-[0.65rem] font-bold">feedback</p></div></div></Link>)}{!loading && !filtered.length ? <p className="rounded-2xl border border-dashed border-ink/15 p-6 text-sm font-bold text-ink/65 dark:text-white/65 sm:col-span-2">Nessun gruppo corrisponde ai filtri.</p> : null}</div></main>
    </div>
  </div></section></>;
}
