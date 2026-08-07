import React, { useEffect, useState } from 'react';
import { CalendarDays, Save, Trash2 } from 'lucide-react';
import { deleteNextLesson, loadNextLessonForLearner, saveNextLesson } from '../../lib/nextLessonApi.js';
import { adminButton } from '../../styles/adminUi.js';

const MAX_PLAN_LENGTH = 5000;

function toLocalDateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export default function LearnerNextLessonPanel({ learnerId, learnerName }) {
  const [plan, setPlan] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [savedPlan, setSavedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadNextLessonForLearner(learnerId)
      .then((value) => {
        if (!active) return;
        setSavedPlan(value);
        setPlan(value?.plan || '');
        setScheduledAt(toLocalDateTimeInput(value?.scheduled_at));
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Non è stato possibile caricare il programma della prossima lezione.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [learnerId]);

  async function handleSave() {
    if (!plan.trim() || saving) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const value = await saveNextLesson(learnerId, {
        plan,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      });
      setSavedPlan(value);
      setPlan(value.plan);
      setScheduledAt(toLocalDateTimeInput(value.scheduled_at));
      setMessage('Programma della prossima lezione salvato e visibile allo studente.');
    } catch (saveError) {
      setError(saveError.message || 'Non è stato possibile salvare il programma.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!savedPlan || saving) return;
    if (!window.confirm(`Rimuovere il programma della prossima lezione per ${learnerName}?`)) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await deleteNextLesson(learnerId);
      setSavedPlan(null);
      setPlan('');
      setScheduledAt('');
      setMessage('Programma rimosso dalla pagina dello studente.');
    } catch (deleteError) {
      setError(deleteError.message || 'Non è stato possibile rimuovere il programma.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-white to-violet-50/60 p-6 shadow-sm dark:border-violet-300/20 dark:from-surface-900 dark:to-violet-300/[0.06] sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-300/15 dark:text-violet-200"><CalendarDays className="h-6 w-6" /></span>
          <div><p className="text-xs font-bold uppercase tracking-wide text-violet-700 dark:text-violet-200">Visibile allo studente</p><h2 className="mt-2 text-2xl font-black text-ink dark:text-white">Prossima lezione</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/65">Scrivi cosa farete insieme. Il programma sostituisce quello precedente e appare nella pagina personale dello studente.</p></div>
        </div>
        {savedPlan ? <button type="button" disabled={saving} onClick={handleDelete} className={adminButton.destructive}><Trash2 className="h-4 w-4" />Rimuovi</button> : null}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <label className="grid gap-2"><span className="text-sm font-black text-ink dark:text-white">Cosa farete</span><textarea value={plan} onChange={(event) => setPlan(event.target.value)} maxLength={MAX_PLAN_LENGTH} rows={6} disabled={loading || saving} placeholder="Per esempio: ripasso del present simple, domande con do e does, conversazione guidata..." className="focus-ring w-full resize-y rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold leading-6 text-ink outline-none focus:border-violet-400 disabled:opacity-60 dark:border-white/20 dark:bg-surface-800 dark:text-white" /><span className="text-xs font-bold text-ink/50 dark:text-white/50">{MAX_PLAN_LENGTH - plan.length} caratteri disponibili</span></label>
        <label className="grid content-start gap-2"><span className="text-sm font-black text-ink dark:text-white">Data e ora, facoltative</span><input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} disabled={loading || saving} className="focus-ring min-h-12 rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-bold text-ink outline-none focus:border-violet-400 disabled:opacity-60 dark:border-white/20 dark:bg-surface-800 dark:text-white" /><span className="text-xs font-semibold leading-5 text-ink/50 dark:text-white/50">Se non le indichi, lo studente vedrà comunque il programma.</span></label>
      </div>

      {error ? <p className="mt-4 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-900 dark:bg-red-300/10 dark:text-red-100">{error}</p> : null}
      {message ? <p className="mt-4 border-l-4 border-moss bg-mint/35 p-4 text-sm font-bold text-ink dark:bg-emerald-300/10 dark:text-emerald-100">{message}</p> : null}
      <div className="mt-5 flex justify-end"><button type="button" disabled={loading || saving || !plan.trim()} onClick={handleSave} className={adminButton.primary}><Save className="h-4 w-4" />{saving ? 'Salvataggio...' : savedPlan ? 'Aggiorna programma' : 'Pubblica per lo studente'}</button></div>
    </section>
  );
}
