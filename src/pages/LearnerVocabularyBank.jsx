import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BookMarked, Plus, Sparkles, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import VocabularyBankCatalog from '../components/vocabulary/VocabularyBankCatalog.jsx';
import VocabularyReplay from '../components/vocabulary/VocabularyReplay.jsx';
import {
  addSelfVocabularyBankItem,
  loadLearnerVocabularyBank,
  removeLearnerVocabularyBankItem,
} from '../lib/learnerVocabularyBankApi.js';

const EMPTY_FORM = {
  bankKind: 'word',
  displayText: '',
  englishMeaning: '',
  italianSupport: '',
  example: '',
  topic: '',
};

function inputClass() {
  return 'focus-ring w-full rounded-xl border border-ink/10 bg-white px-3.5 py-3 text-sm font-semibold text-ink shadow-sm outline-none placeholder:text-ink/35 dark:border-white/10 dark:bg-[#181d1a] dark:text-white dark:placeholder:text-white/35';
}

export default function LearnerVocabularyBank() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await loadLearnerVocabularyBank();
      setItems(rows);
    } catch (loadError) {
      setError(loadError.message || 'Non è stato possibile caricare il tuo vocabolario.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function removeItem(id) {
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== id));
    try {
      await removeLearnerVocabularyBankItem(id);
    } catch (removeError) {
      setItems(previous);
      setError(removeError.message || 'Non è stato possibile rimuovere questo elemento.');
    }
  }

  async function addItem(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await addSelfVocabularyBankItem(form);
      if (result.status === 'exists') {
        setNotice('This item is already in your bank and was already marked as self-added.');
      } else if (result.status === 'marked_self_added') {
        setNotice('Already in your bank from an activity — now also marked as self-added.');
      } else {
        setNotice(form.bankKind === 'word' ? 'Word added to your bank.' : 'Chunk added to your bank.');
      }
      setForm(EMPTY_FORM);
      setAddOpen(false);
      await load();
    } catch (saveError) {
      setError(saveError.message || 'Non è stato possibile aggiungere questo elemento.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f4ee] px-4 py-8 text-ink dark:bg-[#111513] dark:text-[#f3eee7] sm:px-6 lg:px-8">
      <SEO title="Word & Chunk Bank | Sblocco Inglese" description="Le parole e i chunk incontrati nelle tue attività Sblocco Inglese." />

      <div className="mx-auto max-w-7xl">
        <Link to="/dashboard" className="focus-ring inline-flex items-center gap-2 text-sm font-black text-clay underline dark:text-[#f7a98d]">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>

        <header className="relative mt-6 overflow-hidden rounded-[2.25rem] border border-ink/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#181d1a] sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-orange-100/70 blur-3xl dark:bg-orange-300/[0.07]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">Your language bank</p>
              <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">Keep the language you want to use again.</h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-ink/60 dark:text-white/60">
                Vocabulary from completed activities appears automatically. You can also save your own words and chunks; anything you add yourself is clearly labelled <strong>Self-added</strong>.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-300/10 dark:text-orange-200">
                <BookMarked className="h-5 w-5" />
              </span>
              <button
                type="button"
                onClick={() => setAddOpen((value) => !value)}
                className="focus-ring inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-black text-white transition hover:bg-moss dark:bg-orange-400 dark:text-ink dark:hover:bg-orange-300"
              >
                {addOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {addOpen ? 'Close' : 'Add to my bank'}
              </button>
            </div>
          </div>
        </header>

        {!loading ? (
          <VocabularyReplay
            items={items}
            autoStart={searchParams.get('replay') === '1'}
            onItemRated={(memory) => setItems((current) => current.map((item) => item.id === memory.id ? { ...item, ...memory } : item))}
          />
        ) : null}

        {addOpen ? (
          <section className="mt-5 overflow-hidden rounded-[2rem] border border-orange-200 bg-[#fffaf3] shadow-sm dark:border-orange-300/15 dark:bg-[#181d1a]">
            <div className="border-b border-orange-200/70 px-5 py-4 dark:border-orange-300/10 sm:px-6">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500 text-white dark:text-surface-950">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">Self-added vocabulary</p>
                  <h2 className="mt-1 text-xl font-black">Save something you want to remember.</h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-ink/55 dark:text-white/55">Only the English item is required. Add support if it helps you retrieve it later.</p>
                </div>
              </div>
            </div>

            <form onSubmit={addItem} className="grid gap-5 p-5 sm:p-6">
              <div>
                <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-ink/45 dark:text-white/45">Save as</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    ['word', 'Word', 'A single lexical item'],
                    ['chunk', 'Chunk', 'A phrase or reusable expression'],
                  ].map(([value, label, detail]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, bankKind: value }))}
                      className={`focus-ring rounded-2xl border px-4 py-3 text-left transition ${
                        form.bankKind === value
                          ? 'border-orange-400 bg-orange-100/70 text-ink dark:border-orange-300/50 dark:bg-orange-300/10 dark:text-white'
                          : 'border-ink/10 bg-white text-ink dark:border-white/10 dark:bg-white/[0.035] dark:text-white'
                      }`}
                    >
                      <strong className="block text-sm">{label}</strong>
                      <span className="mt-0.5 block text-xs font-semibold opacity-55">{detail}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="lg:col-span-2">
                  <span className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-ink/45 dark:text-white/45">{form.bankKind === 'word' ? 'Word' : 'Chunk'} *</span>
                  <input
                    autoFocus
                    required
                    value={form.displayText}
                    onChange={(event) => setForm((current) => ({ ...current, displayText: event.target.value }))}
                    placeholder={form.bankKind === 'word' ? 'e.g. frazzled' : 'e.g. get something off my plate'}
                    className={`mt-2 ${inputClass()}`}
                  />
                </label>

                <label>
                  <span className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-orange-700/75 dark:text-orange-300/75">Italian support</span>
                  <input
                    value={form.italianSupport}
                    onChange={(event) => setForm((current) => ({ ...current, italianSupport: event.target.value }))}
                    placeholder="Optional translation or cue"
                    className={`mt-2 ${inputClass()}`}
                  />
                </label>

                <label>
                  <span className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-ink/45 dark:text-white/45">Topic / category</span>
                  <input
                    value={form.topic}
                    onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value }))}
                    placeholder="e.g. Work, travel, meetings"
                    className={`mt-2 ${inputClass()}`}
                  />
                </label>

                <label className="lg:col-span-2">
                  <span className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-ink/45 dark:text-white/45">Meaning</span>
                  <textarea
                    value={form.englishMeaning}
                    onChange={(event) => setForm((current) => ({ ...current, englishMeaning: event.target.value }))}
                    placeholder="Optional short explanation in English"
                    rows={2}
                    className={`mt-2 resize-y ${inputClass()}`}
                  />
                </label>

                <label className="lg:col-span-2">
                  <span className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-ink/45 dark:text-white/45">Example in context</span>
                  <textarea
                    value={form.example}
                    onChange={(event) => setForm((current) => ({ ...current, example: event.target.value }))}
                    placeholder="Optional example sentence"
                    rows={2}
                    className={`mt-2 resize-y ${inputClass()}`}
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-orange-200/70 pt-4 dark:border-orange-300/10">
                <p className="text-xs font-semibold text-ink/45 dark:text-white/45">This entry will be visibly marked as <strong>Self-added</strong>.</p>
                <button
                  type="submit"
                  disabled={saving || !form.displayText.trim()}
                  className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-45 dark:text-surface-950"
                >
                  <Plus className="h-4 w-4" /> {saving ? 'Saving…' : 'Add to bank'}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {notice ? <div className="mt-5 border-l-4 border-moss bg-mint/35 p-4 text-sm font-bold text-ink dark:bg-emerald-300/10 dark:text-emerald-100">{notice}</div> : null}
        {error ? <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-900 dark:bg-red-300/10 dark:text-red-100">{error}</div> : null}

        <main className="mt-6">
          {loading ? (
            <div className="rounded-[2rem] border border-ink/10 bg-white p-10 text-center text-sm font-black dark:border-white/10 dark:bg-white/[0.035]">Loading your bank…</div>
          ) : (
            <VocabularyBankCatalog
              items={items}
              allowRemove
              onRemove={removeItem}
              emptyMessage="Nothing matches this part of your bank yet."
            />
          )}
        </main>
      </div>
    </div>
  );
}
