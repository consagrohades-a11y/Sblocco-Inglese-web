import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Filter, Mail, MessageCircle, RefreshCw, Search, Sparkles, UserRoundCheck } from 'lucide-react';
import SEO from '../components/SEO';
import { loadAssessmentLeads, updateAssessmentLead } from '../lib/assessmentLeadsApi.js';

const statusLabels = {
  new: 'Nuovo',
  qualified: 'Qualificato',
  contacted: 'Contattato',
  waitlist: 'Lista d’attesa',
  enrolled: 'Iscritto',
  not_fit: 'Non adatto',
  archived: 'Archiviato',
};

const courseLabels = {
  'business-english-flow': 'Business English Flow',
  'speaking-under-pressure': 'Speaking Under Pressure',
  'interview-sprint': 'Interview Sprint',
  'english-foundations': 'English Foundations',
  'everyday-english-flow': 'Everyday English Flow',
  'listening-response-lab': 'Listening & Response Lab',
  'private-coaching': 'Private Coaching',
  'team-training': 'Team Training',
};

const inputClass = 'w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-moss dark:border-white/15 dark:bg-white/[0.05] dark:text-white';

export default function AdminAssessmentLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [course, setCourse] = useState('all');
  const [betaOnly, setBetaOnly] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [savingId, setSavingId] = useState('');

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const data = await loadAssessmentLeads();
      setLeads(data);
      if (!selectedId && data[0]?.id) setSelectedId(data[0].id);
    } catch (loadError) {
      setError(loadError.message || 'Impossibile caricare i lead del profilo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => leads.filter((lead) => {
    if (status !== 'all' && lead.status !== status) return false;
    if (course !== 'all' && lead.recommended_course !== course) return false;
    if (betaOnly && !lead.beta_eligible) return false;
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return [lead.full_name, lead.email, lead.profession, lead.primary_blocker, lead.recommended_course]
      .some((value) => String(value || '').toLowerCase().includes(term));
  }), [leads, query, status, course, betaOnly]);

  const selected = leads.find((lead) => lead.id === selectedId) || null;
  const counts = useMemo(() => ({
    total: leads.length,
    beta: leads.filter((lead) => lead.beta_eligible).length,
    followup: leads.filter((lead) => lead.followup_requested).length,
    enrolled: leads.filter((lead) => lead.status === 'enrolled').length,
  }), [leads]);

  async function saveLead(id, updates) {
    setSavingId(id);
    setError('');
    try {
      const updated = await updateAssessmentLead(id, updates);
      setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, ...updated } : lead));
    } catch (saveError) {
      setError(saveError.message || 'Non è stato possibile aggiornare il lead.');
    } finally {
      setSavingId('');
    }
  }

  return (
    <>
      <SEO title="Lead assessment | Admin | Sblocco Inglese" description="Profili, beta cohort e richieste di ricontatto." />
      <section className="section-shell py-8 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <header className="rounded-[1.75rem] border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-[#16211e] sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="eyebrow"><Sparkles aria-hidden="true" className="h-4 w-4" />Recruitment</span>
                <h1 className="mt-4 text-3xl font-black text-ink dark:text-white sm:text-4xl">Lead dal Profilo Sblocco</h1>
                <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-ink/60 dark:text-white/60">Valuta idoneità alla cohort, obiettivo, urgenza, consenso marketing e richiesta di ricontatto senza ricostruire le informazioni da WhatsApp.</p>
              </div>
              <button type="button" onClick={refresh} disabled={loading} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 text-sm font-black dark:border-white/15">
                <RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Aggiorna
              </button>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Profili totali', counts.total, UserRoundCheck],
                ['Adatti alla beta', counts.beta, Sparkles],
                ['Ricontatto richiesto', counts.followup, MessageCircle],
                ['Iscritti', counts.enrolled, CheckCircle2],
              ].map(([label, value, Icon]) => (
                <div key={label} className="rounded-2xl bg-linen/70 p-4 dark:bg-white/[0.05]">
                  <Icon aria-hidden="true" className="h-5 w-5 text-moss dark:text-mint" />
                  <p className="mt-3 text-2xl font-black">{value}</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.08em] text-ink/42 dark:text-white/42">{label}</p>
                </div>
              ))}
            </div>
          </header>

          {error ? <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-950 dark:bg-red-400/10 dark:text-red-100">{error}</div> : null}

          <div className="mt-6 grid gap-4 rounded-2xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-[#16211e] lg:grid-cols-[minmax(0,1fr)_12rem_15rem_auto]">
            <label className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ink/35 dark:text-white/35" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca nome, email, professione o blocco" className={`${inputClass} pl-10`} />
            </label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>
              <option value="all">Tutti gli stati</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={course} onChange={(event) => setCourse(event.target.value)} className={inputClass}>
              <option value="all">Tutti i percorsi</option>
              {Object.entries(courseLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-ink/10 px-4 py-3 text-sm font-black dark:border-white/10">
              <input type="checkbox" checked={betaOnly} onChange={(event) => setBetaOnly(event.target.checked)} />
              Solo beta
            </label>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
            <div className="grid content-start gap-3">
              {loading ? <p className="rounded-2xl border border-dashed border-ink/15 p-6 text-sm font-bold dark:border-white/15">Caricamento lead...</p> : null}
              {!loading && !filtered.length ? <p className="rounded-2xl border border-dashed border-ink/15 p-6 text-sm font-bold text-ink/50 dark:border-white/15 dark:text-white/50">Nessun profilo corrisponde ai filtri.</p> : null}
              {filtered.map((lead) => (
                <button key={lead.id} type="button" onClick={() => setSelectedId(lead.id)} className={`focus-ring w-full rounded-2xl border p-5 text-left transition ${selectedId === lead.id ? 'border-moss bg-mint/35 shadow-soft dark:border-mint/35 dark:bg-mint/[0.08]' : 'border-ink/10 bg-white hover:border-moss/30 dark:border-white/10 dark:bg-[#16211e]'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black">{lead.full_name}</h2>
                        {lead.beta_eligible ? <span className="rounded-full bg-coral px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wide text-white">Beta</span> : null}
                        {lead.followup_requested ? <span className="rounded-full bg-moss px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wide text-white">Ricontatto</span> : null}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-ink/50 dark:text-white/50">{lead.email}</p>
                    </div>
                    <span className="rounded-full bg-linen px-3 py-1.5 text-xs font-black dark:bg-white/10">{statusLabels[lead.status]}</span>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl bg-linen/60 p-3 dark:bg-white/[0.05]"><p className="text-[0.65rem] font-black uppercase tracking-wide text-ink/40 dark:text-white/40">Percorso</p><p className="mt-1 text-sm font-black">{courseLabels[lead.recommended_course] || lead.recommended_course}</p></div>
                    <div className="rounded-xl bg-linen/60 p-3 dark:bg-white/[0.05]"><p className="text-[0.65rem] font-black uppercase tracking-wide text-ink/40 dark:text-white/40">Arrivato</p><p className="mt-1 text-sm font-black">{new Date(lead.created_at).toLocaleDateString('it-IT')}</p></div>
                  </div>
                </button>
              ))}
            </div>

            <aside className="xl:sticky xl:top-6 xl:self-start">
              {selected ? (
                <div className="rounded-[1.75rem] border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-[#16211e]">
                  <div className="flex items-start justify-between gap-4">
                    <div><p className="text-xs font-black uppercase tracking-[0.1em] text-coral">Dettaglio profilo</p><h2 className="mt-2 text-2xl font-black">{selected.full_name}</h2><p className="mt-1 text-sm font-semibold text-ink/50 dark:text-white/50">{selected.profession || 'Professione non indicata'}</p></div>
                    <Filter aria-hidden="true" className="h-5 w-5 text-moss dark:text-mint" />
                  </div>
                  <div className="mt-5 grid gap-3">
                    <a href={`mailto:${selected.email}`} className="focus-ring flex items-center gap-3 rounded-xl border border-ink/10 p-3 text-sm font-black dark:border-white/10"><Mail aria-hidden="true" className="h-4 w-4 text-moss dark:text-mint" />{selected.email}</a>
                    {selected.whatsapp ? <a href={`https://wa.me/${selected.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="focus-ring flex items-center gap-3 rounded-xl border border-ink/10 p-3 text-sm font-black dark:border-white/10"><MessageCircle aria-hidden="true" className="h-4 w-4 text-moss dark:text-mint" />{selected.whatsapp}</a> : null}
                  </div>
                  <div className="mt-5 rounded-2xl bg-linen/65 p-4 dark:bg-white/[0.05]"><p className="text-xs font-black uppercase tracking-wide text-coral">Blocco principale</p><p className="mt-2 text-sm font-bold leading-6">{selected.primary_blocker}</p></div>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-xs font-bold">
                    <div className="rounded-xl border border-ink/10 p-3 dark:border-white/10"><p className="text-ink/40 dark:text-white/40">Email risultato</p><p className="mt-1 font-black">{selected.email_status}</p></div>
                    <div className="rounded-xl border border-ink/10 p-3 dark:border-white/10"><p className="text-ink/40 dark:text-white/40">Marketing</p><p className="mt-1 font-black">{selected.marketing_consent ? 'Consenso sì' : 'Solo risultato'}</p></div>
                  </div>
                  <label className="mt-5 block text-xs font-black">Stato
                    <select value={selected.status} onChange={(event) => saveLead(selected.id, { status: event.target.value, notes: selected.notes })} disabled={savingId === selected.id} className={`${inputClass} mt-2`}>
                      {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label className="mt-4 block text-xs font-black">Note interne
                    <textarea rows={5} value={selected.notes || ''} onChange={(event) => setLeads((current) => current.map((lead) => lead.id === selected.id ? { ...lead, notes: event.target.value } : lead))} className={`${inputClass} mt-2`} />
                  </label>
                  <button type="button" onClick={() => saveLead(selected.id, { status: selected.status, notes: selected.notes })} disabled={savingId === selected.id} className="mt-4 w-full rounded-full bg-ink px-5 py-3 text-sm font-black text-white disabled:opacity-50 dark:bg-mint dark:text-ink">{savingId === selected.id ? 'Salvataggio...' : 'Salva note e stato'}</button>
                </div>
              ) : <div className="rounded-2xl border border-dashed border-ink/15 p-6 text-sm font-bold text-ink/50 dark:border-white/15 dark:text-white/50">Seleziona un lead per vedere il dettaglio.</div>}
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
