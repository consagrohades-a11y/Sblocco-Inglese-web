import React, { useEffect, useMemo, useState } from 'react';
import { Archive, Clock3, Eye, Heart, Pencil, Plus, Search, UsersRound, X } from 'lucide-react';
import SEO from '../components/SEO.jsx';
import AdminPageHeader from '../components/admin/AdminPageHeader.jsx';
import { archiveSpeakingActivity, loadSpeakingActivities, saveSpeakingActivity, setSpeakingActivityFavorite } from '../lib/adminSpeakingActivitiesApi.js';

const TYPES = {
  speaking_game: 'Gioco speaking',
  conversation: 'Conversazione',
  roleplay: 'Roleplay',
  vocabulary: 'Vocabolario',
  warmup: 'Warm-up',
  debate: 'Debate',
  storytelling: 'Storytelling',
  fluency: 'Fluency',
  other: 'Altro',
};

const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const EMPTY = {
  title: '', summary: '', activity_type: 'speaking_game', levels: ['B1'], goals: [], tags: [],
  duration_minutes: 10, group_size: '1–4', instructions: '', prompts: [], variants: [],
  teacher_notes: '', favorite: false,
};

function parseLines(value) {
  return String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);
}

function PreviewDrawer({ activity, onClose, onEdit }) {
  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-ink/45 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Chiudi anteprima" />
      <aside className="relative z-10 h-full w-full max-w-2xl overflow-y-auto bg-paper p-5 shadow-2xl dark:bg-surface-950 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">{TYPES[activity.activity_type] || activity.activity_type}</p>
            <h2 className="mt-2 text-3xl font-black">{activity.title}</h2>
            {activity.summary ? <p className="mt-3 text-sm font-semibold leading-6 text-ink/65 dark:text-white/65">{activity.summary}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/10 dark:border-white/10"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">
          {(activity.levels || []).map((level) => <span key={level} className="rounded-full bg-orange-100 px-3 py-1.5 text-orange-900 dark:bg-orange-300/10 dark:text-orange-200">{level}</span>)}
          {activity.duration_minutes ? <span className="inline-flex items-center gap-1.5 rounded-full bg-linen px-3 py-1.5 dark:bg-white/10"><Clock3 className="h-3.5 w-3.5" />{activity.duration_minutes} min</span> : null}
          {activity.group_size ? <span className="inline-flex items-center gap-1.5 rounded-full bg-linen px-3 py-1.5 dark:bg-white/10"><UsersRound className="h-3.5 w-3.5" />{activity.group_size}</span> : null}
        </div>

        <section className="mt-7 rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-surface-900">
          <p className="text-xs font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Come si gioca</p>
          <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-7">{activity.instructions}</p>
        </section>

        <section className="mt-6">
          <div className="flex items-end justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-wide text-orange-700 dark:text-orange-300">Prompt pronti</p><h3 className="mt-1 text-xl font-black">Apri e usa direttamente a lezione</h3></div>
            <span className="rounded-full bg-ink px-3 py-1.5 text-xs font-black text-white dark:bg-white dark:text-ink">{(activity.prompts || []).length}</span>
          </div>
          <div className="mt-4 grid gap-3">
            {(activity.prompts || []).map((prompt, index) => (
              <article key={index} className="rounded-2xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-surface-900">
                <p className="text-[0.65rem] font-black uppercase tracking-wide text-ink/40 dark:text-white/40">Prompt {index + 1}</p>
                <p className="mt-1 text-sm font-black leading-6">{prompt}</p>
              </article>
            ))}
          </div>
        </section>

        {(activity.variants || []).length ? (
          <section className="mt-6 rounded-2xl border border-dashed border-ink/15 p-5 dark:border-white/15">
            <p className="text-xs font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Varianti</p>
            <div className="mt-3 grid gap-2">{activity.variants.map((variant, index) => <p key={index} className="text-sm font-semibold leading-6 text-ink/70 dark:text-white/70">• {variant}</p>)}</div>
          </section>
        ) : null}

        <button type="button" onClick={() => onEdit(activity)} className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-black text-white dark:bg-orange-400 dark:text-surface-950"><Pencil className="h-4 w-4" />Modifica attività</button>
      </aside>
    </div>
  );
}

function EditorDrawer({ activity, onClose, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY, ...activity });
  const [promptText, setPromptText] = useState((activity?.prompts || []).join('\n'));
  const [variantText, setVariantText] = useState((activity?.variants || []).join('\n'));
  const [goalText, setGoalText] = useState((activity?.goals || []).join(', '));
  const [tagText, setTagText] = useState((activity?.tags || []).join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const field = 'mt-2 w-full rounded-xl border border-ink/10 bg-white px-3.5 py-3 text-sm font-semibold dark:border-white/10 dark:bg-surface-800';

  async function save() {
    setSaving(true);
    setError('');
    try {
      const saved = await saveSpeakingActivity({
        ...form,
        prompts: parseLines(promptText),
        variants: parseLines(variantText),
        goals: goalText.split(',').map((value) => value.trim()).filter(Boolean),
        tags: tagText.split(',').map((value) => value.trim()).filter(Boolean),
      });
      onSaved(saved);
    } catch (saveError) {
      setError(saveError.message || 'Impossibile salvare l’attività.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[125] flex justify-end bg-ink/45 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Chiudi editor" />
      <aside className="relative z-10 h-full w-full max-w-2xl overflow-y-auto bg-paper p-5 shadow-2xl dark:bg-surface-950 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">Libreria speaking</p><h2 className="mt-1 text-2xl font-black">{form.id ? 'Modifica attività' : 'Nuova attività'}</h2></div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-ink/10 dark:border-white/10"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-6 grid gap-5">
          <label className="text-xs font-black uppercase">Titolo<input className={field} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label className="text-xs font-black uppercase">Descrizione<textarea rows={3} className={field} value={form.summary || ''} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-xs font-black uppercase">Tipo<select className={field} value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })}>{Object.entries(TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-xs font-black uppercase">Minuti<input type="number" min="1" className={field} value={form.duration_minutes || ''} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} /></label>
            <label className="text-xs font-black uppercase">Partecipanti<input className={field} value={form.group_size || ''} onChange={(e) => setForm({ ...form, group_size: e.target.value })} /></label>
          </div>

          <div>
            <p className="text-xs font-black uppercase">Livelli</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {LEVELS.map((level) => {
                const active = (form.levels || []).includes(level);
                return <button key={level} type="button" onClick={() => setForm({ ...form, levels: active ? form.levels.filter((item) => item !== level) : [...(form.levels || []), level] })} className={`rounded-full border px-3 py-1.5 text-xs font-black ${active ? 'border-orange-400 bg-orange-100 text-orange-900' : 'border-ink/10 bg-white text-ink/50'}`}>{level}</button>;
              })}
            </div>
          </div>

          <label className="text-xs font-black uppercase">Obiettivi, separati da virgola<input className={field} value={goalText} onChange={(e) => setGoalText(e.target.value)} /></label>
          <label className="text-xs font-black uppercase">Come si usa<textarea rows={5} className={field} value={form.instructions || ''} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></label>
          <label className="text-xs font-black uppercase">Prompt — uno per riga<textarea rows={9} className={field} value={promptText} onChange={(e) => setPromptText(e.target.value)} /></label>
          <label className="text-xs font-black uppercase">Varianti — una per riga<textarea rows={5} className={field} value={variantText} onChange={(e) => setVariantText(e.target.value)} /></label>
          <label className="text-xs font-black uppercase">Tag, separati da virgola<input className={field} value={tagText} onChange={(e) => setTagText(e.target.value)} /></label>
          <label className="flex items-center gap-3 text-sm font-black"><input type="checkbox" checked={Boolean(form.favorite)} onChange={(e) => setForm({ ...form, favorite: e.target.checked })} />Preferita</label>
        </div>

        {error ? <p className="mt-4 text-sm font-bold text-red-700 dark:text-red-300">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-ink/10 px-4 py-2.5 text-xs font-black dark:border-white/10">Annulla</button>
          <button type="button" onClick={save} disabled={saving} className="rounded-full bg-ink px-5 py-2.5 text-xs font-black text-white disabled:opacity-40 dark:bg-orange-400 dark:text-surface-950">{saving ? 'Salvataggio...' : 'Salva attività'}</button>
        </div>
      </aside>
    </div>
  );
}

export default function AdminSpeakingActivities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');
  const [type, setType] = useState('all');
  const [preview, setPreview] = useState(null);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    loadSpeakingActivities().then(setActivities).catch((loadError) => setError(loadError.message || 'Impossibile caricare la libreria.')).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => activities.filter((activity) => {
    if (level !== 'all' && !(activity.levels || []).includes(level)) return false;
    if (type !== 'all' && activity.activity_type !== type) return false;
    const needle = search.trim().toLowerCase();
    return !needle || [activity.title, activity.summary, ...(activity.goals || []), ...(activity.tags || []), ...(activity.prompts || [])]
      .filter(Boolean).join(' ').toLowerCase().includes(needle);
  }), [activities, level, search, type]);

  async function toggleFavorite(activity) {
    try {
      const updated = await setSpeakingActivityFavorite(activity.id, !activity.favorite);
      setActivities((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch (nextError) {
      setError(nextError.message || 'Impossibile aggiornare il preferito.');
    }
  }

  async function archive(activity) {
    if (!window.confirm(`Archiviare “${activity.title}”?`)) return;
    try {
      await archiveSpeakingActivity(activity.id);
      setActivities((items) => items.filter((item) => item.id !== activity.id));
    } catch (nextError) {
      setError(nextError.message || 'Impossibile archiviare.');
    }
  }

  return (
    <>
      <SEO title="Libreria speaking | Admin | Sblocco Inglese" description="Giochi e attività speaking pronti per le lezioni." />
      <section className="section-shell py-8 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <AdminPageHeader
            eyebrow="Lezione"
            title="Libreria speaking"
            description="Giochi e attività ad alta produzione orale, pronti da aprire mentre insegni. Salvali una volta, riusali senza rigenerare prompt."
            actions={<button type="button" onClick={() => setEditing({ ...EMPTY })} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-black text-white dark:bg-orange-400 dark:text-surface-950"><Plus className="h-4 w-4" />Nuova attività</button>}
          />

          <div className="mt-6 grid gap-3 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-surface-900 md:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca gioco, obiettivo, prompt..." className="w-full rounded-xl border border-ink/10 bg-white py-3 pl-9 pr-3 text-sm font-semibold dark:border-white/10 dark:bg-surface-800" /></label>
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm font-black dark:border-white/10 dark:bg-surface-800"><option value="all">Tutti i livelli</option>{LEVELS.map((item) => <option key={item}>{item}</option>)}</select>
            <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm font-black dark:border-white/10 dark:bg-surface-800"><option value="all">Tutti i formati</option>{Object.entries(TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          </div>

          {error ? <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-950">{error}</div> : null}
          {loading ? <p className="mt-6 text-sm font-bold text-ink/55 dark:text-white/55">Caricamento attività...</p> : null}

          {!loading ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {filtered.map((activity) => (
                <article key={activity.id} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-900">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap gap-2"><span className="rounded-full bg-orange-100 px-2.5 py-1 text-[0.65rem] font-black uppercase text-orange-900 dark:bg-orange-300/10 dark:text-orange-200">{TYPES[activity.activity_type]}</span>{(activity.levels || []).map((item) => <span key={item} className="text-[0.65rem] font-black text-ink/45 dark:text-white/45">{item}</span>)}</div>
                      <h2 className="mt-3 text-xl font-black">{activity.title}</h2>
                    </div>
                    <button type="button" onClick={() => toggleFavorite(activity)} className={`grid h-10 w-10 place-items-center rounded-full border ${activity.favorite ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-ink/10 text-ink/35'}`}><Heart className={`h-4 w-4 ${activity.favorite ? 'fill-current' : ''}`} /></button>
                  </div>

                  {activity.summary ? <p className="mt-3 text-sm font-semibold leading-6 text-ink/60 dark:text-white/60">{activity.summary}</p> : null}

                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-ink/55 dark:text-white/55">
                    {activity.duration_minutes ? <span className="rounded-full bg-linen px-3 py-1.5 dark:bg-white/10">{activity.duration_minutes} min</span> : null}
                    {activity.group_size ? <span className="rounded-full bg-linen px-3 py-1.5 dark:bg-white/10">{activity.group_size}</span> : null}
                  </div>

                  <div className="mt-4 grid gap-2">
                    {(activity.prompts || []).slice(0, 2).map((prompt, index) => <div key={index} className="rounded-xl border border-ink/10 bg-linen/35 px-3.5 py-3 text-sm font-bold leading-5 dark:border-white/10 dark:bg-white/[0.035]"><span className="mr-2 text-orange-600">#{index + 1}</span>{prompt}</div>)}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setPreview(activity)} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-black text-white dark:bg-white dark:text-ink"><Eye className="h-3.5 w-3.5" />Anteprima</button>
                    <button type="button" onClick={() => setEditing(activity)} className="inline-flex items-center gap-2 rounded-full border border-ink/10 px-4 py-2.5 text-xs font-black"><Pencil className="h-3.5 w-3.5" />Modifica</button>
                    <button type="button" onClick={() => archive(activity)} className="ml-auto inline-flex items-center gap-2 px-3 py-2.5 text-xs font-black text-ink/40"><Archive className="h-3.5 w-3.5" />Archivia</button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {preview ? <PreviewDrawer activity={preview} onClose={() => setPreview(null)} onEdit={(activity) => { setPreview(null); setEditing(activity); }} /> : null}
      {editing ? <EditorDrawer activity={editing} onClose={() => setEditing(null)} onSaved={(saved) => { setActivities((items) => items.some((item) => item.id === saved.id) ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items]); setEditing(null); }} /> : null}
    </>
  );
}
