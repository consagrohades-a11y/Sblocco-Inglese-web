import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, NotebookPen, Pencil, Save, Trash2, X } from 'lucide-react';
import {
  createLearnerNote,
  deleteLearnerNote,
  loadLearnerNotes,
  updateLearnerNote,
} from '../../lib/learnerNotesApi.js';
import { adminButton } from '../../styles/adminUi.js';

const ROME_TIME_ZONE = 'Europe/Rome';
const MAX_NOTE_LENGTH = 5000;

function capitalizeFirst(value) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : '';
}

function formatRomeDateTime(value, includeSeconds = false) {
  const formatted = new Intl.DateTimeFormat('it-IT', {
    timeZone: ROME_TIME_ZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {}),
  }).format(new Date(value));

  return capitalizeFirst(formatted);
}

export default function LearnerNotesPanel({ learnerId, learnerName }) {
  const [notes, setNotes] = useState([]);
  const [draft, setDraft] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingDraft, setEditingDraft] = useState('');
  const [busyNoteId, setBusyNoteId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchNotes() {
      setLoading(true);
      setError('');

      try {
        const loadedNotes = await loadLearnerNotes(learnerId);
        if (active) setNotes(loadedNotes);
      } catch (loadError) {
        if (active) {
          setNotes([]);
          setError(loadError.message || 'Non è stato possibile caricare le note.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchNotes();
    return () => {
      active = false;
    };
  }, [learnerId]);

  const remainingCharacters = useMemo(
    () => MAX_NOTE_LENGTH - draft.length,
    [draft.length],
  );

  async function handleSubmit(event) {
    event.preventDefault();
    if (!draft.trim() || saving) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const savedNote = await createLearnerNote(learnerId, draft);
      setNotes((current) => [savedNote, ...current]);
      setDraft('');
      setMessage('Nota salvata.');
    } catch (saveError) {
      setError(saveError.message || 'Non è stato possibile salvare la nota.');
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(note) {
    setEditingId(note.id);
    setEditingDraft(note.note);
    setError('');
    setMessage('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingDraft('');
  }

  async function saveEdit(noteId) {
    if (!editingDraft.trim() || busyNoteId) return;
    setBusyNoteId(noteId);
    setError('');
    setMessage('');
    try {
      const updatedNote = await updateLearnerNote(noteId, editingDraft);
      setNotes((current) => current.map((note) => note.id === noteId ? updatedNote : note));
      cancelEdit();
      setMessage('Nota aggiornata.');
    } catch (updateError) {
      setError(updateError.message || 'Non è stato possibile aggiornare la nota.');
    } finally {
      setBusyNoteId(null);
    }
  }

  async function removeNote(note) {
    if (busyNoteId) return;
    const preview = note.note.length > 90 ? `${note.note.slice(0, 90)}…` : note.note;
    if (!window.confirm(`Eliminare definitivamente questa nota?\n\n${preview}`)) return;
    setBusyNoteId(note.id);
    setError('');
    setMessage('');
    try {
      await deleteLearnerNote(note.id);
      setNotes((current) => current.filter((item) => item.id !== note.id));
      if (editingId === note.id) cancelEdit();
      setMessage('Nota eliminata.');
    } catch (deleteError) {
      setError(deleteError.message || 'Non è stato possibile eliminare la nota.');
    } finally {
      setBusyNoteId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-surface-900 sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-moss dark:text-emerald-300">
            <NotebookPen className="h-4 w-4" aria-hidden="true" />
            <p className="text-xs font-bold uppercase tracking-wide">Note private</p>
          </div>
          <h2 className="mt-2 text-2xl font-black text-ink dark:text-white">
            Appunti su {learnerName || 'questo studente'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65 dark:text-white/60">
            Queste note sono visibili solo agli amministratori. Data e ora vengono registrate automaticamente al salvataggio.
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-moss/20 bg-mint/45 px-4 py-2 text-xs font-black text-ink dark:border-emerald-300/25 dark:bg-emerald-400/10 dark:text-emerald-100">
          <Clock3 className="h-4 w-4" aria-hidden="true" />
          <time dateTime={now.toISOString()}>{formatRomeDateTime(now, true)}</time>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6">
        <label htmlFor="learner-admin-note" className="text-sm font-black text-ink dark:text-white">
          Nuova nota
        </label>
        <textarea
          id="learner-admin-note"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setMessage('');
          }}
          maxLength={MAX_NOTE_LENGTH}
          rows={5}
          placeholder="Scrivi osservazioni sulla lezione, obiettivi, difficoltà o prossimi passi..."
          className="focus-ring mt-2 w-full resize-y rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold leading-6 text-ink outline-none placeholder:text-ink/40 focus:border-moss focus:ring-4 focus:ring-mint/40 dark:border-white/20 dark:bg-surface-800 dark:text-white dark:placeholder:text-white/35 dark:focus:border-emerald-300 dark:focus:ring-emerald-400/15"
        />

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-ink/55 dark:text-white/50">
            {remainingCharacters} caratteri disponibili
          </p>
          <button
            type="submit"
            disabled={saving || !draft.trim()}
            className={adminButton.primary}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? 'Salvataggio...' : 'Salva nota'}
          </button>
        </div>
      </form>

      <div aria-live="polite">
        {error ? (
          <div className="mt-4 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold leading-6 text-red-900 dark:bg-red-400/10 dark:text-red-100">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="mt-4 border-l-4 border-moss bg-mint/30 p-4 text-sm font-bold text-ink dark:bg-emerald-400/10 dark:text-emerald-100">
            {message}
          </div>
        ) : null}
      </div>

      <div className="mt-8 border-t border-ink/10 pt-6 dark:border-white/10">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-black text-ink dark:text-white">Cronologia note</h3>
          <span className="rounded-full bg-linen px-3 py-1 text-xs font-black text-ink dark:bg-white/10 dark:text-white">
            {notes.length}
          </span>
        </div>

        {loading ? (
          <p className="mt-4 text-sm font-bold text-ink/60 dark:text-white/55">Caricamento note...</p>
        ) : null}

        {!loading && notes.length === 0 && !error ? (
          <div className="mt-4 rounded-xl border border-dashed border-ink/15 bg-linen/35 p-5 dark:border-white/15 dark:bg-white/[0.04]">
            <p className="text-sm font-black text-ink dark:text-white">Nessuna nota</p>
            <p className="mt-1 text-sm leading-6 text-ink/60 dark:text-white/55">
              La prima nota salvata apparirà qui con giorno, data e ora.
            </p>
          </div>
        ) : null}

        {!loading && notes.length > 0 ? (
          <div className="mt-4 divide-y divide-ink/10 dark:divide-white/10">
            {notes.map((note) => (
              <article key={note.id} className="py-5 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <time dateTime={note.created_at} className="inline-flex items-center gap-2 text-xs font-black text-moss dark:text-emerald-300">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatRomeDateTime(note.created_at)}
                    </time>
                    {note.updated_at ? <p className="mt-1 text-xs font-bold text-ink/45 dark:text-white/45">Modificata: {formatRomeDateTime(note.updated_at)}</p> : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" disabled={Boolean(busyNoteId)} onClick={() => beginEdit(note)} className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-full border border-ink/15 px-3 py-1.5 text-xs font-black text-ink transition hover:bg-linen disabled:opacity-40 dark:border-white/15 dark:text-white dark:hover:bg-white/10"><Pencil className="h-3.5 w-3.5" />Modifica</button>
                    <button type="button" disabled={Boolean(busyNoteId)} onClick={() => removeNote(note)} className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-full border border-red-300 px-3 py-1.5 text-xs font-black text-red-700 transition hover:bg-red-50 disabled:opacity-40 dark:border-red-300/30 dark:text-red-200 dark:hover:bg-red-300/10"><Trash2 className="h-3.5 w-3.5" />Elimina</button>
                  </div>
                </div>
                {editingId === note.id ? (
                  <div className="mt-4 rounded-xl border border-moss/20 bg-mint/20 p-4 dark:border-emerald-300/20 dark:bg-emerald-300/[0.06]">
                    <textarea value={editingDraft} onChange={(event) => setEditingDraft(event.target.value)} maxLength={MAX_NOTE_LENGTH} rows={5} autoFocus className="focus-ring w-full resize-y rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold leading-6 text-ink outline-none focus:border-moss dark:border-white/20 dark:bg-surface-800 dark:text-white" />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-bold text-ink/55 dark:text-white/50">{MAX_NOTE_LENGTH - editingDraft.length} caratteri disponibili</p>
                      <div className="flex gap-2">
                        <button type="button" disabled={busyNoteId === note.id} onClick={cancelEdit} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-xs font-black dark:border-white/15"><X className="h-3.5 w-3.5" />Annulla</button>
                        <button type="button" disabled={busyNoteId === note.id || !editingDraft.trim()} onClick={() => saveEdit(note.id)} className={adminButton.primary}><Save className="h-4 w-4" />{busyNoteId === note.id ? 'Salvataggio...' : 'Salva modifiche'}</button>
                      </div>
                    </div>
                  </div>
                ) : <p className="mt-3 whitespace-pre-wrap break-words text-sm font-semibold leading-7 text-ink/80 dark:text-white/75">{note.note}</p>}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
