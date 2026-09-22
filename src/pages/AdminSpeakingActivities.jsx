import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Clock3,
  Dices,
  Eye,
  Heart,
  MessageCircleMore,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import SEO from '../components/SEO';
import AdminPageHeader from '../components/admin/AdminPageHeader.jsx';
import { loadSpeakingActivities, updateSpeakingActivity } from '../lib/adminSpeakingActivitiesApi.js';

const typeLabels = {
  speaking_game: 'Gioco speaking',
  conversation: 'Conversazione',
  fluency: 'Fluency',
  vocabulary: 'Vocabolario',
  storytelling: 'Storytelling',
  debate: 'Debate',
  warmup: 'Warm-up',
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function PreviewModal({ activity, onClose }) {
  const prompts = asArray(activity?.prompts);
  const [index, setIndex] = useState(0);

  useEffect(() => setIndex(0), [activity?.id]);

  if (!activity) return null;
  const current = prompts[index] ?? 'Nessun prompt salvato.';

  function nextPrompt() {
    if (!prompts.length) return;
    setIndex((currentIndex) => (currentIndex + 1) % prompts.length);
  }

  function randomPrompt() {
    if (prompts.length < 2) return;
    setIndex((currentIndex) => {
      let next = currentIndex;
      while (next === currentIndex) next = Math.floor(Math.random() * prompts.length);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-ink/55 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label={`Anteprima ${activity.title}`}>
      <div className="mx-auto my-3 max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-paper shadow-2xl dark:bg-surface-950">
        <header className="flex items-start justify-between gap-4 border-b border-ink/10 px-5 py-5 dark:border-white/10 sm:px-7">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-clay dark:text-coral">Anteprima lezione</p>
            <h2 className="mt-1 text-2xl font-black text-ink dark:text-white sm:text-3xl">{activity.title}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {asArray(activity.levels).map((level) => <span key={level} className="rounded-full bg-linen px-2.5 py-1 text-xs font-black text-ink dark:bg-white/10 dark:text-white">{level}</span>)}
              {activity.duration_minutes ? <span className="inline-flex items-center gap-1 rounded-full bg-linen px-2.5 py-1 text-xs font-black text-ink dark:bg-white/10 dark:text-white"><Clock3 className="h-3.5 w-3.5" />{activity.duration_minutes} min</span> : null}
            </div>
          </div>
          <button type="button" onClick={onClose} className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/10 bg-white dark:border-white/10 dark:bg-white/10" aria-label="Chiudi anteprima"><X className="h-4 w-4" /></button>
        </header>

        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
          <section>
            <div className="rounded-3xl bg-ink p-6 text-white sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-white/60">Prompt {prompts.length ? index + 1 : 0}/{prompts.length}</p>
                <MessageCircleMore className="h-5 w-5 text-orange-300" />
              </div>
              <p className="mt-8 whitespace-pre-wrap text-2xl font-black leading-snug sm:text-3xl">{String(current)}</p>
              <div className="mt-8 flex flex-wrap gap-2">
                <button type="button" onClick={nextPrompt} disabled={!prompts.length} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-black text-ink disabled:opacity-40">
                  Prossimo <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={randomPrompt} disabled={prompts.length < 2} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">
                  <Dices className="h-4 w-4" /> Casuale
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-surface-900">
              <p className="text-xs font-black uppercase tracking-wide text-clay dark:text-coral">Come si gioca</p>
              <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-7 text-ink/75 dark:text-white/70">{activity.instructions}</p>
            </div>
          </section>

          <aside className="grid content-start gap-4">
            <div className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-surface-900">
              <p className="text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">Obiettivi</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {asArray(activity.goals).map((goal) => <span key={goal} className="rounded-full bg-mint/60 px-3 py-1.5 text-xs font-black text-ink dark:bg-emerald-300/10 dark:text-emerald-100">{goal}</span>)}
              </div>
            </div>

            <div className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-surface-900">
              <p className="text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">Varianti</p>
              <div className="mt-3 grid gap-3">
                {asArray(activity.variants).map((variant, variantIndex) => (
                  <div key={`${variantIndex}-${variant}`} className="border-l-2 border-clay pl-3 text-sm font-semibold leading-6 text-ink/75 dark:text-white/70">{variant}</div>
                ))}
              </div>
            </div>

            {activity.teacher_notes ? (
              <div className="rounded-2xl border border-dashed border-ink/15 bg-linen/40 p-5 dark:border-white/15 dark:bg-white/[0.04]">
                <p className="text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">Nota personale</p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6">{activity.teacher_notes}</p>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function AdminSpeakingActivities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');
  const [type, setType] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [preview, setPreview] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setActivities(await loadSpeakingActivities());
    } catch (loadError) {
      setActivities([]);
      setError(loadError.message || 'Non è stato possibile caricare la libreria speaking.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const types = useMemo(() => Array.from(new Set(activities.map((activity) => activity.activity_type).filter(Boolean))).sort(), [activities]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return activities.filter((activity) => {
      if (favoritesOnly && !activity.favorite) return false;
      if (level !== 'all' && !asArray(activity.levels).includes(level)) return false;
      if (type !== 'all' && activity.activity_type !== type) return false;
      if (!needle) return true;
      return [
        activity.title,
        activity.summary,
        ...asArray(activity.goals),
        ...asArray(activity.tags),
      ].some((value) => String(value || '').toLowerCase().includes(needle));
    });
  }, [activities, favoritesOnly, level, query, type]);

  async function toggleFavorite(activity) {
    const next = !activity.favorite;
    setActivities((current) => current.map((item) => item.id === activity.id ? { ...item, favorite: next } : item));
    try {
      const saved = await updateSpeakingActivity(activity.id, { favorite: next });
      setActivities((current) => current.map((item) => item.id === saved.id ? saved : item));
    } catch (saveError) {
      setActivities((current) => current.map((item) => item.id === activity.id ? { ...item, favorite: activity.favorite } : item));
      setError(saveError.message || 'Non è stato possibile aggiornare i preferiti.');
    }
  }

  return (
    <>
      <SEO title="Libreria speaking | Admin | Sblocco Inglese" description="Giochi e attività speaking riutilizzabili per le lezioni." />
      <section className="section-shell py-8 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <AdminPageHeader
            eyebrow="Live teaching"
            title="Libreria speaking"
            description="Giochi, prompt e attività pronti da aprire durante la lezione. Pensata per parlare, non per riempire schede."
            actions={(
              <button type="button" onClick={load} disabled={loading} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-black dark:border-white/15 dark:bg-white/[0.06]">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Aggiorna
              </button>
            )}
          />

          <div className="mt-6 grid gap-3 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-surface-900 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35 dark:text-white/35" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca gioco, obiettivo o tag…" className="focus-ring w-full rounded-xl border border-ink/10 bg-paper py-2.5 pl-9 pr-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.05]" />
            </label>
            <select value={level} onChange={(event) => setLevel(event.target.value)} className="focus-ring rounded-xl border border-ink/10 bg-paper px-3 py-2.5 text-sm font-black dark:border-white/10 dark:bg-white/[0.05]">
              <option value="all">Tutti i livelli</option>
              {['A1','A2','B1','B2','C1','C2'].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={type} onChange={(event) => setType(event.target.value)} className="focus-ring rounded-xl border border-ink/10 bg-paper px-3 py-2.5 text-sm font-black dark:border-white/10 dark:bg-white/[0.05]">
              <option value="all">Tutti i formati</option>
              {types.map((item) => <option key={item} value={item}>{typeLabels[item] || item}</option>)}
            </select>
            <button type="button" onClick={() => setFavoritesOnly((value) => !value)} className={`focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-black ${favoritesOnly ? 'border-clay bg-blush text-clay dark:bg-coral/10 dark:text-coral' : 'border-ink/10 bg-paper dark:border-white/10 dark:bg-white/[0.05]'}`}>
              <Heart className={`h-4 w-4 ${favoritesOnly ? 'fill-current' : ''}`} /> Preferiti
            </button>
          </div>

          {error ? <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-950 dark:bg-red-400/10 dark:text-red-100">{error}</div> : null}
          {loading ? <p className="mt-6 text-sm font-bold text-ink/55 dark:text-white/55">Caricamento attività…</p> : null}

          {!loading && filtered.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((activity) => (
                <article key={activity.id} className="flex min-h-[24rem] flex-col rounded-3xl border border-ink/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-clay/25 dark:border-white/10 dark:bg-surface-900">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-clay dark:text-coral">{typeLabels[activity.activity_type] || activity.activity_type}</p>
                      <h2 className="mt-2 text-xl font-black leading-tight">{activity.title}</h2>
                    </div>
                    <button type="button" onClick={() => toggleFavorite(activity)} className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/10 dark:border-white/10" aria-label={activity.favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}>
                      <Heart className={`h-4 w-4 ${activity.favorite ? 'fill-clay text-clay' : 'text-ink/40 dark:text-white/40'}`} />
                    </button>
                  </div>

                  <p className="mt-3 text-sm font-semibold leading-6 text-ink/65 dark:text-white/65">{activity.summary}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {asArray(activity.levels).map((item) => <span key={item} className="rounded-full bg-linen px-2.5 py-1 text-xs font-black dark:bg-white/10">{item}</span>)}
                    {activity.duration_minutes ? <span className="inline-flex items-center gap-1 rounded-full bg-linen px-2.5 py-1 text-xs font-black dark:bg-white/10"><Clock3 className="h-3 w-3" />{activity.duration_minutes} min</span> : null}
                    {activity.group_size ? <span className="rounded-full bg-linen px-2.5 py-1 text-xs font-black dark:bg-white/10">{activity.group_size}</span> : null}
                  </div>

                  <div className="mt-5">
                    <p className="text-xs font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Speaking focus</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {asArray(activity.goals).slice(0, 4).map((goal) => <span key={goal} className="rounded-full bg-mint/60 px-2.5 py-1 text-xs font-black dark:bg-emerald-300/10 dark:text-emerald-100">{goal}</span>)}
                    </div>
                  </div>

                  <div className="mt-auto pt-6">
                    <button type="button" onClick={() => setPreview(activity)} className="focus-ring inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-black text-white transition hover:bg-clay dark:bg-clay dark:hover:bg-coral">
                      <Eye className="h-4 w-4" /> Anteprima lezione
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {!loading && !filtered.length ? (
            <div className="mt-6 rounded-2xl border border-dashed border-ink/15 bg-white p-8 text-center dark:border-white/15 dark:bg-surface-900">
              <Sparkles className="mx-auto h-6 w-6 text-clay" />
              <p className="mt-3 font-black">Nessuna attività con questi filtri.</p>
            </div>
          ) : null}
        </div>
      </section>
      <PreviewModal activity={preview} onClose={() => setPreview(null)} />
    </>
  );
}
