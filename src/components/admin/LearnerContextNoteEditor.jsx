import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient.js';

export default function LearnerContextNoteEditor({ learnerId, value = '', onSaved }) {
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => setDraft(value || ''), [value]);

  async function save() {
    if (saving) return;
    setSaving(true);
    setMessage('');
    setError('');

    const { data, error: rpcError } = await supabase.rpc('admin_set_learner_context_note', {
      target_learner_id: learnerId,
      context_note: draft,
    });

    if (rpcError) {
      setError(rpcError.message || 'Non è stato possibile salvare il promemoria.');
    } else {
      const next = data || '';
      setDraft(next);
      setMessage('Promemoria aggiornato.');
      onSaved?.(next);
    }

    setSaving(false);
  }

  return (
    <section className="rounded-2xl border border-orange-200/70 bg-orange-50/60 p-5 dark:border-orange-300/15 dark:bg-orange-300/[0.05]">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">Promemoria rapido</p>
      <h2 className="mt-1 text-lg font-black text-ink dark:text-white">Quello che vuoi ricordarti subito</h2>
      <p className="mt-1 text-xs font-semibold leading-5 text-ink/55 dark:text-white/55">
        Privato e solo admin. Compare sotto il nome dello studente nelle schermate operative.
      </p>

      <textarea
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value.slice(0, 280));
          setMessage('');
        }}
        rows={3}
        placeholder="Es. Tech Back Office Manager · A1 · viaggio · pronuncia e sicurezza nel parlato"
        className="focus-ring mt-4 w-full resize-y rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold leading-6 text-ink dark:border-white/10 dark:bg-surface-800 dark:text-white"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold text-ink/45 dark:text-white/45">{draft.length}/280</p>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="focus-ring inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-black text-white disabled:opacity-40 dark:bg-orange-400 dark:text-surface-950"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Salvataggio...' : 'Salva promemoria'}
        </button>
      </div>

      {message ? <p className="mt-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">{message}</p> : null}
      {error ? <p className="mt-3 text-xs font-bold text-red-700 dark:text-red-300">{error}</p> : null}
    </section>
  );
}
