import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookMarked, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import {
  loadLearnerVocabularyBank,
  removeLearnerVocabularyBankItem,
} from '../lib/learnerVocabularyBankApi.js';

export default function LearnerVocabularyBank() {
  const [items, setItems] = useState([]);
  const [kind, setKind] = useState('word');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const rows = await loadLearnerVocabularyBank();
        if (active) setItems(rows);
      } catch (loadError) {
        if (active) setError(loadError.message || 'Non è stato possibile caricare il tuo vocabolario.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => ({
    word: items.filter((item) => item.bank_kind === 'word').length,
    chunk: items.filter((item) => item.bank_kind === 'chunk').length,
  }), [items]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return items.filter((item) => {
      if (item.bank_kind !== kind) return false;
      if (!needle) return true;
      return [
        item.display_text,
        item.english_meaning,
        item.italian_support,
        item.example,
        item.source_activity_title,
      ].some((value) => String(value || '').toLocaleLowerCase().includes(needle));
    });
  }, [items, kind, query]);

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

  return (
    <div className="min-h-screen bg-paper px-4 py-8 text-ink dark:bg-surface-950 dark:text-white sm:px-6 lg:px-8">
      <SEO title="Word & Chunk Bank | Sblocco Inglese" description="Le parole e i chunk incontrati nelle tue attività Sblocco Inglese." />

      <div className="mx-auto max-w-6xl">
        <Link to="/dashboard" className="focus-ring inline-flex items-center gap-2 text-sm font-black text-clay underline dark:text-[#f7a98d]">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>

        <header className="mt-6 overflow-hidden rounded-[2rem] border border-ink/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.035] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">Your language bank</p>
              <h1 className="mt-2 text-3xl font-black sm:text-5xl">Words & chunks you’ve actually met.</h1>
              <p className="mt-3 text-sm font-semibold leading-7 text-ink/60 dark:text-white/60">
                Sblocco adds vocabulary here when you complete an activity. Repeated items are reused instead of duplicated.
              </p>
            </div>
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-300/10 dark:text-orange-200">
              <BookMarked className="h-6 w-6" />
            </span>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {[
              ['word', 'Word Bank', counts.word],
              ['chunk', 'Chunk Bank', counts.chunk],
            ].map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                className={`focus-ring rounded-full px-4 py-2.5 text-sm font-black transition ${
                  kind === value
                    ? 'bg-ink text-white dark:bg-orange-400 dark:text-ink'
                    : 'border border-ink/10 bg-white text-ink/65 dark:border-white/10 dark:bg-white/[0.035] dark:text-white/65'
                }`}
              >
                {label} · {count}
              </button>
            ))}
          </div>
        </header>

        <div className="mt-5 rounded-2xl border border-ink/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
          <label className="flex items-center gap-3 rounded-xl bg-linen/50 px-3 dark:bg-white/[0.04]">
            <Search className="h-4 w-4 shrink-0 text-ink/35 dark:text-white/35" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={kind === 'word' ? 'Search your words…' : 'Search your chunks…'}
              className="min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold outline-none placeholder:text-ink/35 dark:placeholder:text-white/35"
            />
          </label>
        </div>

        {error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100">{error}</div> : null}

        {loading ? (
          <div className="mt-5 rounded-2xl border border-ink/10 bg-white p-8 text-center text-sm font-black dark:border-white/10 dark:bg-white/[0.035]">Loading your bank…</div>
        ) : visible.length ? (
          <section className="mt-5 grid gap-4 md:grid-cols-2">
            {visible.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
                <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 py-4 dark:border-white/10">
                  <div className="min-w-0">
                    <p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">{item.bank_kind === 'word' ? 'Word' : 'Chunk'}</p>
                    <h2 className="mt-1 text-xl font-black leading-7">{item.display_text}</h2>
                  </div>
                  <button type="button" onClick={() => removeItem(item.id)} className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink/35 hover:bg-red-50 hover:text-red-700 dark:text-white/35 dark:hover:bg-red-300/10 dark:hover:text-red-200" aria-label="Remove from bank">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-0">
                  {item.english_meaning ? (
                    <div className="border-b border-ink/10 px-5 py-4 dark:border-white/10">
                      <p className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-ink/40 dark:text-white/40">Meaning</p>
                      <p className="mt-1.5 text-sm font-semibold leading-6 text-ink/80 dark:text-white/80">{item.english_meaning}</p>
                    </div>
                  ) : null}
                  {item.italian_support ? (
                    <div className="border-b border-ink/10 bg-sky-50/45 px-5 py-4 dark:border-white/10 dark:bg-sky-300/[0.035]">
                      <p className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-sky-700 dark:text-sky-300">Italian support</p>
                      <p className="mt-1.5 text-sm font-bold leading-6">{item.italian_support}</p>
                    </div>
                  ) : null}
                  {item.example ? (
                    <div className="px-5 py-4">
                      <p className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-ink/40 dark:text-white/40">Example</p>
                      <p className="mt-1.5 border-l-2 border-orange-400 pl-3 text-sm font-semibold italic leading-6 text-ink/70 dark:text-white/70">{item.example}</p>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-ink/10 bg-linen/35 px-5 py-3 text-[0.68rem] font-bold text-ink/45 dark:border-white/10 dark:bg-white/[0.025] dark:text-white/45">
                  {item.level ? <span>{item.level}</span> : null}
                  {item.source_activity_title ? <><span>·</span><span className="min-w-0 truncate">From: {item.source_activity_title}</span></> : null}
                  {Number(item.encounter_count || 0) > 1 ? <><span>·</span><span>Seen {item.encounter_count}×</span></> : null}
                </div>
              </article>
            ))}
          </section>
        ) : (
          <div className="mt-5 rounded-[2rem] border border-dashed border-ink/15 bg-white/65 p-10 text-center dark:border-white/15 dark:bg-white/[0.025]">
            <h2 className="text-xl font-black">{kind === 'word' ? 'Your Word Bank is empty.' : 'Your Chunk Bank is empty.'}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-ink/55 dark:text-white/55">
              Complete a Sblocco activity containing vocabulary and the relevant items will appear here automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
