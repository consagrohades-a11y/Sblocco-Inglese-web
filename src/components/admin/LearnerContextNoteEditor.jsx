import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useAdminLearnerContext } from '../../context/AdminLearnerContext.jsx';

export default function LearnerContextNoteEditor({ learnerId, initialNote = '', onSaved }) {
  const { saveContextNote } = useAdminLearnerContext();
  const [draft, setDraft] = useState(initialNote || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => setDraft(initialNote || ''), [initialNote, learnerId]);

  async function save() {
    if (saving) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const saved = await saveContextNote(learnerId, draft);
      setDraft(saved || '');
      setMessage('Promemoria aggiornato.');
      onSaved?.(saved || '');
    } catch (saveError) {
      setError(saveError.message || 'Non è stato possibile salvare il promemoria.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-clay/20 bg-blush/35 p-5 dark:border-coral/20 dark:bg-coral/[0.06]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-clay dark:text-coral">Promemoria rapido</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-ink/65 dark:text-white/65">
            Compare sotto il nome dello studente nelle viste admin. Usalo per identità, obiettivi e bisogni essenziali.
          </p>
        </div>
        <span className="text-xs font-black text-ink/45 dark:text-white/45">{draft.length}/280</span>
      </div>
      <textarea
        rows={2}
        maxLength={280}
        value={draft}
        onChange={(event) => { setDraft(event.target.value); setMessage(''); }}
        placeholder="Es. Tech Back Office Manager · A1 · viaggio · pronuncia/lettura · vuole più sicurezza nel dialogo"
        className="focus-ring mt-4 w-full resize-y rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold leading-6 text-ink dark:border-white/15 dark:bg-surface-900 dark:text-white"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div aria-live="polite" className="text-xs font-bold">
          {error ? <span className="text-red-700 dark:text-red-200">{error}</span> : null}
          {message ? <span className="text-moss dark:text-emerald-300">{message}</span> : null}
        </div>
        <button type="button" onClick={save} disabled={saving} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-black text-white disabled:opacity-40 dark:bg-clay">
          <Save className="h-3.5 w-3.5" /> {saving ? 'Salvataggio…' : 'Salva promemoria'}
        </button>
      </div>
    </section>
  );
}
