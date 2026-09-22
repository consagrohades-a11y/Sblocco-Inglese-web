import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Clock3,
  Download,
  Eye,
  ExternalLink,
  Heart,
  Pencil,
  Plus,
  Upload,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import SEO from '../components/SEO';
import AdminPageHeader from '../components/admin/AdminPageHeader.jsx';
import SpeakingActivityEditorModal from '../components/admin/SpeakingActivityEditorModal.jsx';
import SpeakingLiveController from '../components/admin/SpeakingLiveController.jsx';
import SpeakingItemImportModal from '../components/admin/SpeakingItemImportModal.jsx';
import SpeakingPromptContent from '../components/speaking/SpeakingPromptContent.jsx';
import LearnerAvatar from '../components/learner/LearnerAvatar.jsx';
import LearnerQuickFacts from '../components/admin/LearnerQuickFacts.jsx';
import { loadAdminLearners } from '../lib/adminLearnersApi.js';
import { useAdminLearnerContext } from '../context/AdminLearnerContext.jsx';
import { createSpeakingControlId } from '../lib/speakingLiveControl.js';
import { loadSpeakingActivities, loadSpeakingActivityHistory, updateSpeakingActivity } from '../lib/adminSpeakingActivitiesApi.js';

const LEVELS = ['A1','A2','B1','B2','C1','C2'];
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

function normaliseItem(item, fallbackLevels = []) {
  if (typeof item === 'string') return { text: item, levels: fallbackLevels, student_support: '', challenge: '', teacher_note: '' };
  return {
    text: item?.text || '',
    levels: asArray(item?.levels).length ? asArray(item.levels) : fallbackLevels,
    student_support: item?.student_support || item?.support || '',
    challenge: item?.challenge || '',
    teacher_note: item?.teacher_note || '',
  };
}

function itemCounts(activity) {
  const items = asArray(activity.prompts).map((item) => normaliseItem(item, asArray(activity.levels)));
  return Object.fromEntries(LEVELS.map((level) => [level, items.filter((item) => asArray(item.levels).includes(level)).length]));
}

function PreviewModal({ activity, onClose }) {
  const items = useMemo(() => asArray(activity?.prompts).map((item) => normaliseItem(item, asArray(activity?.levels))), [activity]);
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [activity?.id]);
  if (!activity) return null;
  const current = items[index] || null;

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-ink/55 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto my-3 max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-paper shadow-2xl dark:bg-surface-950">
        <header className="flex items-start justify-between gap-4 border-b border-ink/10 px-5 py-5 dark:border-white/10 sm:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-clay dark:text-coral">Anteprima docente</p>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">{activity.title}</h2>
            <p className="mt-2 text-sm font-semibold text-ink/60 dark:text-white/60">A sinistra ciò che mostri; a destra ciò che resta solo a te.</p>
          </div>
          <button type="button" onClick={onClose} className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-ink/10 bg-white dark:border-white/10 dark:bg-white/10" aria-label="Chiudi"><X className="h-4 w-4" /></button>
        </header>

        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
          <section>
            <div className="rounded-3xl bg-ink p-6 text-white sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-white/55">Student screen</p>
                <p className="text-xs font-black text-white/55">{items.length ? `${index + 1}/${items.length}` : '0/0'}</p>
              </div>
              <div className="mt-7 grid min-h-[18rem] place-items-center"><SpeakingPromptContent item={current || { text: 'Nessun item' }} style={activity.presenter_style} compact /></div>
              {current?.student_support ? <div className="mt-7 rounded-2xl border border-white/15 bg-white/[0.07] p-4"><p className="text-xs font-black uppercase tracking-wide text-white/50">Support</p><p className="mt-2 text-sm font-bold leading-6">{current.student_support}</p></div> : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={!items.length} onClick={() => setIndex((value) => (value - 1 + items.length) % items.length)} className="focus-ring min-h-10 rounded-full border border-ink/15 bg-white px-4 text-xs font-black dark:border-white/15 dark:bg-white/[0.05]">← Prima</button>
              <button type="button" disabled={!items.length} onClick={() => setIndex((value) => (value + 1) % items.length)} className="focus-ring min-h-10 rounded-full bg-ink px-4 text-xs font-black text-white dark:bg-clay">Dopo →</button>
            </div>
          </section>

          <aside className="grid content-start gap-4">
            <div className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-surface-900">
              <p className="text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">Livelli item</p>
              <div className="mt-3 flex flex-wrap gap-2">{asArray(current?.levels).map((level) => <span key={level} className="rounded-full bg-linen px-2.5 py-1 text-xs font-black dark:bg-white/10">{level}</span>)}</div>
            </div>
            {current?.challenge ? <div className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-surface-900"><p className="text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">Challenge studente</p><p className="mt-2 text-sm font-bold leading-6">{current.challenge}</p></div> : null}
            <div className="rounded-2xl border border-clay/20 bg-blush/35 p-5 dark:border-coral/20 dark:bg-coral/[0.06]">
              <p className="text-xs font-black uppercase tracking-wide text-clay dark:text-coral">Nota / soluzione docente</p>
              <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-6">{current?.teacher_note || 'Nessuna nota per questo item.'}</p>
            </div>
            {activity.teacher_notes ? <div className="rounded-2xl border border-dashed border-ink/15 p-5 dark:border-white/15"><p className="text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">Note attività</p><p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6">{activity.teacher_notes}</p></div> : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

function PresentationLauncher({ activity, initialLearnerId = '', onClose, onStartLive }) {
  const [levels, setLevels] = useState(() => asArray(activity?.levels));
  const [learners, setLearners] = useState([]);
  const [learnerId, setLearnerId] = useState(initialLearnerId || '');
  const [learnerQuery, setLearnerQuery] = useState('');
  const [loadingLearners, setLoadingLearners] = useState(true);
  const [learnerError, setLearnerError] = useState('');
  const [activityHistory, setActivityHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoadingLearners(true);
      setLearnerError('');
      try {
        const rows = await loadAdminLearners();
        if (active) setLearners(rows.filter((learner) => learner.status === 'active'));
      } catch (error) {
        if (active) setLearnerError(error.message || 'Non è stato possibile caricare gli studenti.');
      } finally {
        if (active) setLoadingLearners(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setLearnerId(initialLearnerId || '');
    setLearnerQuery('');
  }, [activity?.id, initialLearnerId]);

  const filteredLearners = useMemo(() => {
    const needle = learnerQuery.trim().toLowerCase();
    if (!needle) return learners.slice(0, 10);
    return learners
      .filter((learner) => [learner.display_name, learner.email, learner.admin_context_note]
        .some((value) => String(value || '').toLowerCase().includes(needle)))
      .slice(0, 10);
  }, [learnerQuery, learners]);

  const selectedLearner = learners.find((learner) => learner.id === learnerId) || null;

  useEffect(() => {
    let active = true;

    if (!learnerId || !activity?.id) {
      setActivityHistory(null);
      setHistoryLoading(false);
      return () => { active = false; };
    }

    setHistoryLoading(true);
    loadSpeakingActivityHistory(learnerId)
      .then((rows) => {
        if (!active) return;
        setActivityHistory(rows.find((row) => row.activity_id === activity.id) || null);
      })
      .catch(() => {
        if (active) setActivityHistory(null);
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => { active = false; };
  }, [activity?.id, learnerId]);

  if (!activity) return null;

  function toggle(level) {
    setLevels((current) => current.includes(level) ? current.filter((item) => item !== level) : [...current, level]);
  }

  function open() {
    if (!levels.length) return;

    const controlId = createSpeakingControlId();
    const params = new URLSearchParams({
      levels: LEVELS.filter((level) => levels.includes(level)).join(','),
      control: controlId,
    });
    if (learnerId) params.set('learner', learnerId);

    const presenterUrl = `/admin/present/speaking/${activity.id}?${params.toString()}`;
    const windowName = `sblocco-speaking-${controlId}`;
    const studentWindow = window.open(
      presenterUrl,
      windowName,
      'popup=yes,width=1320,height=860,resizable=yes,scrollbars=yes',
    );

    if (!studentWindow) {
      setLearnerError('Il browser ha bloccato la finestra studente. Consenti i popup per Sblocco e riprova.');
      return;
    }

    onStartLive?.({
      activity,
      learner: selectedLearner,
      learnerId: learnerId || null,
      levels: LEVELS.filter((level) => levels.includes(level)),
      controlId,
      presenterUrl,
      windowName,
      studentWindow,
    });
    onClose();
  }

  const firstName = String(selectedLearner?.display_name || selectedLearner?.email || '')
    .trim()
    .split(/\s+/)[0];

  return (
    <div className="fixed inset-0 z-[125] overflow-y-auto bg-ink/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="mx-auto my-8 w-full max-w-2xl rounded-3xl border border-white/10 bg-paper p-6 shadow-2xl dark:bg-surface-950 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-clay dark:text-coral">Presenta</p>
            <h2 className="mt-1 text-2xl font-black">{activity.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-ink/10 dark:border-white/10" aria-label="Chiudi"><X className="h-4 w-4" /></button>
        </div>

        <section className="mt-6 rounded-2xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-ink/45 dark:text-white/45">Con chi lavori?</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-ink/60 dark:text-white/60">
            Se scegli uno studente, la finestra condivisa userà il suo avatar e lo saluterà per nome.
          </p>

          {selectedLearner ? (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-clay/20 bg-blush/35 p-3 dark:border-coral/20 dark:bg-coral/[0.06]">
              <LearnerAvatar
                avatarKey={selectedLearner.avatar_key}
                backgroundKey={selectedLearner.avatar_background_key}
                displayName={selectedLearner.display_name || selectedLearner.email}
                size="lg"
                eager
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black">{selectedLearner.display_name || selectedLearner.email}</p>
                <p className="mt-0.5 text-xs font-bold text-clay dark:text-coral">
                  {firstName ? `Working with ${firstName}` : 'Student selected'}
                </p>
                <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-ink/55 dark:text-white/55"><LearnerQuickFacts learner={selectedLearner} /></p>
                <p className="mt-1.5 text-[0.68rem] font-bold leading-5 text-ink/45 dark:text-white/45">
                  {historyLoading
                    ? 'Controllo storico…'
                    : activityHistory
                      ? `Questo gioco: ${activityHistory.session_count} session${Number(activityHistory.session_count) === 1 ? 'e' : 'i'} · ${activityHistory.items_seen} item già visti · ultima ${new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short' }).format(new Date(activityHistory.last_session_at))}`
                      : 'Questo gioco non risulta ancora usato con questo studente.'}
                </p>
                <p className="mt-0.5 text-[0.68rem] font-bold text-clay dark:text-coral">Smart no-repeat: evita prima gli item usati negli ultimi 60 giorni.</p>
              </div>
              <button type="button" onClick={() => setLearnerId('')} className="focus-ring min-h-9 rounded-full border border-ink/10 px-3 text-xs font-black dark:border-white/10">Cambia</button>
            </div>
          ) : (
            <>
              <input
                type="search"
                value={learnerQuery}
                onChange={(event) => setLearnerQuery(event.target.value)}
                placeholder="Cerca studente…"
                className="focus-ring mt-4 w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-sm font-semibold dark:border-white/15 dark:bg-white/[0.05]"
              />
              {loadingLearners ? <p className="mt-3 text-xs font-bold text-ink/45 dark:text-white/45">Caricamento studenti…</p> : null}
              {learnerError ? <p className="mt-3 text-xs font-bold text-red-700 dark:text-red-200">{learnerError}</p> : null}
              {!loadingLearners && !learnerError ? (
                <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-ink/10 dark:border-white/10">
                  {filteredLearners.map((learner) => (
                    <button
                      key={learner.id}
                      type="button"
                      onClick={() => { setLearnerId(learner.id); setLearnerQuery(''); }}
                      className="focus-ring flex w-full items-center gap-3 border-b border-ink/10 px-3 py-3 text-left last:border-b-0 hover:bg-linen/45 dark:border-white/10 dark:hover:bg-white/[0.04]"
                    >
                      <LearnerAvatar
                        avatarKey={learner.avatar_key}
                        backgroundKey={learner.avatar_background_key}
                        displayName={learner.display_name || learner.email}
                        size="md"
                      />
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm font-black">{learner.display_name || learner.email}</strong>
                        {learner.admin_context_note ? <span className="mt-0.5 block truncate text-xs font-semibold text-ink/45 dark:text-white/45">{learner.admin_context_note}</span> : null}
                      </span>
                    </button>
                  ))}
                  {!filteredLearners.length ? <p className="p-4 text-xs font-bold text-ink/45 dark:text-white/45">Nessuno studente trovato.</p> : null}
                </div>
              ) : null}
            </>
          )}
        </section>

        <section className="mt-5">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-ink/45 dark:text-white/45">Livelli da mostrare</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {asArray(activity.levels).map((level) => {
              const active = levels.includes(level);
              return <button key={level} type="button" onClick={() => toggle(level)} className={`focus-ring min-h-10 rounded-full border px-4 text-xs font-black ${active ? 'border-clay bg-blush text-clay dark:border-coral/40 dark:bg-coral/10 dark:text-coral' : 'border-ink/15 bg-white text-ink/55 dark:border-white/15 dark:bg-white/[0.04] dark:text-white/55'}`} aria-pressed={active}>{level}</button>;
            })}
          </div>
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold leading-5 text-ink/45 dark:text-white/45">
            Solo la finestra di presentazione va condivisa: note e soluzioni restano nel pannello admin.
          </p>
          <button type="button" disabled={!levels.length || Boolean(learnerId && !selectedLearner)} onClick={open} className="focus-ring inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-6 text-sm font-black text-white disabled:opacity-35 dark:bg-clay">
            <ExternalLink className="h-4 w-4" />
            {learnerId && !selectedLearner ? 'Caricamento studente…' : firstName ? `Apri con ${firstName}` : 'Apri finestra studente'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSpeakingActivities() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { getLearner } = useAdminLearnerContext();
  const focusedLearnerId = searchParams.get('learner') || '';
  const focusedLearner = focusedLearnerId ? getLearner(focusedLearnerId) : null;

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');
  const [type, setType] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [preview, setPreview] = useState(null);
  const [editor, setEditor] = useState(null);
  const [editingNew, setEditingNew] = useState(false);
  const [presenting, setPresenting] = useState(null);
  const [liveSession, setLiveSession] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

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
      const itemText = asArray(activity.prompts).map((item) => typeof item === 'string' ? item : item?.text).filter(Boolean);
      const itemMetadata = asArray(activity.prompts).flatMap((item) => typeof item === 'string' ? [] : [...asArray(item?.context_tags), ...asArray(item?.language_targets)]);
      return [activity.title, activity.summary, ...asArray(activity.goals), ...asArray(activity.tags), ...itemText, ...itemMetadata]
        .some((value) => String(value || '').toLowerCase().includes(needle));
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

  function handleSaved(saved) {
    setActivities((current) => {
      const exists = current.some((item) => item.id === saved.id);
      return exists ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current];
    });
    setEditor(null);
    setEditingNew(false);
  }

  function handleImported(savedActivities) {
    const savedById = new Map(asArray(savedActivities).map((activity) => [activity.id, activity]));
    setActivities((current) => current.map((activity) => savedById.get(activity.id) || activity));
  }

  function clearFocusedLearner() {
    const next = new URLSearchParams(searchParams);
    next.delete('learner');
    setSearchParams(next, { replace: true });
  }

  return (
    <>
      <SEO title="Libreria speaking | Admin | Sblocco Inglese" description="Giochi e attività speaking riutilizzabili per le lezioni." />
      <section className="section-shell py-8 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <AdminPageHeader
            eyebrow="Live teaching"
            title="Libreria speaking"
            description="Crea una volta, riusa in lezione. Ogni attività può contenere molti item, e ogni item può appartenere a più livelli."
            actions={(
              <>
                <a href="/templates/sblocco-speaking-authoring-kit-v1.json" download className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-black dark:border-white/15 dark:bg-white/[0.06]"><Download className="h-4 w-4" /> Authoring JSON</a>
                <button type="button" onClick={() => setImportOpen(true)} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full border border-clay/30 bg-blush/40 px-4 py-2 text-xs font-black text-clay dark:border-coral/30 dark:bg-coral/[0.08] dark:text-coral"><Upload className="h-4 w-4" /> Importa item</button>
                <button type="button" onClick={() => setEditingNew(true)} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-black text-white dark:bg-clay"><Plus className="h-4 w-4" /> Nuova attività</button>
                <button type="button" onClick={load} disabled={loading} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-black dark:border-white/15 dark:bg-white/[0.06]"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Aggiorna</button>
              </>
            )}
          />

          {focusedLearner ? (
            <div className="mt-6 flex flex-wrap items-center gap-4 rounded-3xl border border-clay/20 bg-blush/30 p-4 dark:border-coral/20 dark:bg-coral/[0.06] sm:p-5">
              <LearnerAvatar
                avatarKey={focusedLearner.avatar_key}
                backgroundKey={focusedLearner.avatar_background_key}
                displayName={focusedLearner.display_name || focusedLearner.email}
                size="lg"
                eager
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-clay dark:text-coral">Speaking session</p>
                <p className="mt-1 truncate text-xl font-black">Working with {String(focusedLearner.display_name || focusedLearner.email || '').trim().split(/\s+/)[0]}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-ink/55 dark:text-white/55">Scegli un gioco: lo studente sarà già selezionato quando premi Presenta.</p>
              </div>
              <button type="button" onClick={clearFocusedLearner} className="focus-ring min-h-10 rounded-full border border-ink/15 bg-white px-4 text-xs font-black dark:border-white/15 dark:bg-white/[0.05]">Cambia studente</button>
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-surface-900 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
            <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35 dark:text-white/35" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca gioco, item, obiettivo o tag…" className="focus-ring w-full rounded-xl border border-ink/10 bg-paper py-2.5 pl-9 pr-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.05]" /></label>
            <select value={level} onChange={(event) => setLevel(event.target.value)} className="focus-ring rounded-xl border border-ink/10 bg-paper px-3 py-2.5 text-sm font-black dark:border-white/10 dark:bg-white/[0.05]"><option value="all">Tutti i livelli</option>{LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <select value={type} onChange={(event) => setType(event.target.value)} className="focus-ring rounded-xl border border-ink/10 bg-paper px-3 py-2.5 text-sm font-black dark:border-white/10 dark:bg-white/[0.05]"><option value="all">Tutti i formati</option>{types.map((item) => <option key={item} value={item}>{typeLabels[item] || item}</option>)}</select>
            <button type="button" onClick={() => setFavoritesOnly((value) => !value)} className={`focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-black ${favoritesOnly ? 'border-clay bg-blush text-clay dark:bg-coral/10 dark:text-coral' : 'border-ink/10 bg-paper dark:border-white/10 dark:bg-white/[0.05]'}`}><Heart className={`h-4 w-4 ${favoritesOnly ? 'fill-current' : ''}`} /> Preferiti</button>
          </div>

          {error ? <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-950 dark:bg-red-400/10 dark:text-red-100">{error}</div> : null}
          {loading ? <p className="mt-6 text-sm font-bold text-ink/55 dark:text-white/55">Caricamento attività…</p> : null}

          {!loading && filtered.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((activity) => {
                const counts = itemCounts(activity);
                return (
                  <article key={activity.id} className="flex min-h-[27rem] flex-col rounded-3xl border border-ink/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-clay/25 dark:border-white/10 dark:bg-surface-900">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-xs font-black uppercase tracking-[0.14em] text-clay dark:text-coral">{typeLabels[activity.activity_type] || activity.activity_type}</p><h2 className="mt-2 text-xl font-black leading-tight">{activity.title}</h2></div>
                      <button type="button" onClick={() => toggleFavorite(activity)} className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/10 dark:border-white/10" aria-label={activity.favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}><Heart className={`h-4 w-4 ${activity.favorite ? 'fill-clay text-clay' : 'text-ink/40 dark:text-white/40'}`} /></button>
                    </div>

                    <p className="mt-3 text-sm font-semibold leading-6 text-ink/65 dark:text-white/65">{activity.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {asArray(activity.levels).map((item) => <span key={item} className="rounded-full bg-linen px-2.5 py-1 text-xs font-black dark:bg-white/10">{item} · {counts[item] || 0}</span>)}
                      {activity.duration_minutes ? <span className="inline-flex items-center gap-1 rounded-full bg-linen px-2.5 py-1 text-xs font-black dark:bg-white/10"><Clock3 className="h-3 w-3" />{activity.duration_minutes} min</span> : null}
                    </div>

                    <div className="mt-5"><p className="text-xs font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Speaking focus</p><div className="mt-2 flex flex-wrap gap-2">{asArray(activity.goals).slice(0, 4).map((goal) => <span key={goal} className="rounded-full bg-mint/60 px-2.5 py-1 text-xs font-black dark:bg-emerald-300/10 dark:text-emerald-100">{goal}</span>)}</div></div>

                    <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
                      <button type="button" onClick={() => setPreview(activity)} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-ink/15 px-4 text-xs font-black dark:border-white/15"><Eye className="h-4 w-4" /> Anteprima</button>
                      <button type="button" onClick={() => setEditor(activity)} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-ink/15 px-4 text-xs font-black dark:border-white/15"><Pencil className="h-4 w-4" /> Modifica</button>
                      <button type="button" onClick={() => setPresenting(activity)} className="focus-ring col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white dark:bg-clay"><ExternalLink className="h-4 w-4" /> Presenta in nuova finestra</button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          {!loading && !filtered.length ? <div className="mt-6 rounded-2xl border border-dashed border-ink/15 bg-white p-8 text-center dark:border-white/15 dark:bg-surface-900"><Sparkles className="mx-auto h-6 w-6 text-clay" /><p className="mt-3 font-black">Nessuna attività con questi filtri.</p></div> : null}
        </div>
      </section>

      <PreviewModal activity={preview} onClose={() => setPreview(null)} />
      <PresentationLauncher
        activity={presenting}
        initialLearnerId={focusedLearnerId}
        onClose={() => setPresenting(null)}
        onStartLive={setLiveSession}
      />
      <SpeakingLiveController session={liveSession} onEnd={() => setLiveSession(null)} />
      {importOpen ? <SpeakingItemImportModal activities={activities} onClose={() => setImportOpen(false)} onImported={handleImported} /> : null}
      {(editor || editingNew) ? <SpeakingActivityEditorModal activity={editingNew ? null : editor} catalogActivities={activities} onClose={() => { setEditor(null); setEditingNew(false); }} onSaved={handleSaved} /> : null}
    </>
  );
}
