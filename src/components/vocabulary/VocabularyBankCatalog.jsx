import React, { useMemo, useState } from 'react';
import { BookOpenText, Search, Sparkles, Trash2, UserPlus } from 'lucide-react';

function topicLabel(value) {
  const text = String(value || '').trim();
  if (!text) return 'Personal';
  return text
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sourceMatches(item, source) {
  if (source === 'self') return item.self_added;
  if (source === 'activity') return item.activity_added;
  return true;
}

export default function VocabularyBankCatalog({
  items = [],
  allowRemove = false,
  onRemove,
  emptyMessage = 'No vocabulary here yet.',
  compact = false,
}) {
  const [kind, setKind] = useState('word');
  const [source, setSource] = useState('all');
  const [topic, setTopic] = useState('all');
  const [sort, setSort] = useState('recent');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => ({
    word: items.filter((item) => item.bank_kind === 'word').length,
    chunk: items.filter((item) => item.bank_kind === 'chunk').length,
    self: items.filter((item) => item.self_added).length,
    activity: items.filter((item) => item.activity_added).length,
  }), [items]);

  const topics = useMemo(() => Array.from(new Set(
    items.map((item) => String(item.topic || '').trim()).filter(Boolean),
  )).sort((a, b) => topicLabel(a).localeCompare(topicLabel(b))), [items]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const filtered = items.filter((item) => {
      if (item.bank_kind !== kind) return false;
      if (!sourceMatches(item, source)) return false;
      if (topic !== 'all' && item.topic !== topic) return false;
      if (!needle) return true;
      return [
        item.display_text,
        item.english_meaning,
        item.italian_support,
        item.example,
        item.topic,
        item.level,
        item.source_activity_title,
      ].some((value) => String(value || '').toLocaleLowerCase().includes(needle));
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'alphabetical') return String(a.display_text || '').localeCompare(String(b.display_text || ''));
      if (sort === 'encounters') return Number(b.encounter_count || 0) - Number(a.encounter_count || 0);
      return new Date(b.last_seen_at || b.created_at || 0) - new Date(a.last_seen_at || a.created_at || 0);
    });
  }, [items, kind, source, topic, sort, query]);

  return (
    <div className={compact ? 'grid gap-4' : 'grid gap-5'}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Words', counts.word],
          ['Chunks', counts.chunk],
          ['From activities', counts.activity],
          ['Self-added', counts.self],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-ink/10 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-ink/40 dark:text-white/40">{label}</p>
            <p className="mt-1 text-2xl font-black text-ink dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
        <div className="flex flex-wrap gap-2 border-b border-ink/10 p-3 dark:border-white/10">
          {[
            ['word', 'Word Bank', counts.word],
            ['chunk', 'Chunk Bank', counts.chunk],
          ].map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={`focus-ring rounded-full px-4 py-2 text-sm font-black transition ${
                kind === value
                  ? 'bg-ink text-white dark:bg-orange-400 dark:text-ink'
                  : 'bg-linen/60 text-ink/65 hover:text-ink dark:bg-white/[0.06] dark:text-white/65 dark:hover:text-white'
              }`}
            >
              {label} <span className="ml-1 opacity-60">{count}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="flex min-w-0 items-center gap-3 rounded-xl border border-ink/10 bg-linen/35 px-3 dark:border-white/10 dark:bg-white/[0.035]">
            <Search className="h-4 w-4 shrink-0 text-ink/35 dark:text-white/35" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={kind === 'word' ? 'Search words, meanings, topics…' : 'Search chunks, meanings, topics…'}
              className="min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold text-ink outline-none placeholder:text-ink/35 dark:text-white dark:placeholder:text-white/35"
            />
          </label>

          <select
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            className="focus-ring min-h-11 rounded-xl border border-ink/10 bg-white px-3 text-sm font-bold text-ink dark:border-white/10 dark:bg-surface-900 dark:text-white"
            aria-label="Filter by topic"
          >
            <option value="all">All topics</option>
            {topics.map((value) => <option key={value} value={value}>{topicLabel(value)}</option>)}
          </select>

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="focus-ring min-h-11 rounded-xl border border-ink/10 bg-white px-3 text-sm font-bold text-ink dark:border-white/10 dark:bg-surface-900 dark:text-white"
            aria-label="Sort vocabulary"
          >
            <option value="recent">Most recent</option>
            <option value="alphabetical">A–Z</option>
            <option value="encounters">Most encountered</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-ink/10 px-3 py-3 dark:border-white/10">
          {[
            ['all', 'All'],
            ['activity', 'From activities'],
            ['self', 'Self-added'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSource(value)}
              className={`focus-ring rounded-full border px-3 py-1.5 text-xs font-black transition ${
                source === value
                  ? 'border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-300/30 dark:bg-orange-300/10 dark:text-orange-200'
                  : 'border-ink/10 text-ink/55 hover:text-ink dark:border-white/10 dark:text-white/55 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length ? (
        <div className={compact ? 'grid gap-3 xl:grid-cols-2' : 'grid gap-4 md:grid-cols-2 xl:grid-cols-3'}>
          {visible.map((item) => (
            <article key={item.id} className="group overflow-hidden rounded-[1.5rem] border border-ink/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/[0.035]">
              <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 py-4 dark:border-white/10">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-orange-800 dark:bg-orange-300/10 dark:text-orange-200">
                      {item.bank_kind === 'word' ? 'Word' : 'Chunk'}
                    </span>
                    {item.self_added ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.08em] text-sky-800 dark:bg-sky-300/10 dark:text-sky-200">
                        <UserPlus className="h-3 w-3" /> Self-added
                      </span>
                    ) : null}
                    {item.activity_added ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.08em] text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200">
                        <BookOpenText className="h-3 w-3" /> Activity
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 break-words text-xl font-black leading-7 text-ink dark:text-white">{item.display_text}</h3>
                </div>
                {allowRemove ? (
                  <button
                    type="button"
                    onClick={() => onRemove?.(item.id)}
                    className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink/30 transition hover:bg-red-50 hover:text-red-700 dark:text-white/30 dark:hover:bg-red-300/10 dark:hover:text-red-200"
                    aria-label={`Remove ${item.display_text} from bank`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <div className="grid divide-y divide-ink/10 dark:divide-white/10">
                {item.english_meaning ? (
                  <div className="px-5 py-4">
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">Meaning</p>
                    <p className="mt-1.5 text-sm font-semibold leading-6 text-ink/80 dark:text-white/80">{item.english_meaning}</p>
                  </div>
                ) : null}
                {item.italian_support ? (
                  <div className="bg-sky-50/45 px-5 py-4 dark:bg-sky-300/[0.035]">
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-sky-700 dark:text-sky-300">Italian support</p>
                    <p className="mt-1.5 text-sm font-bold leading-6 text-ink dark:text-white">{item.italian_support}</p>
                  </div>
                ) : null}
                {item.example ? (
                  <div className="px-5 py-4">
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-ink/35 dark:text-white/35">Example</p>
                    <p className="mt-1.5 border-l-2 border-orange-400 pl-3 text-sm font-semibold italic leading-6 text-ink/70 dark:text-white/70">{item.example}</p>
                  </div>
                ) : null}
                {!item.english_meaning && !item.italian_support && !item.example ? (
                  <div className="px-5 py-4">
                    <p className="text-sm font-semibold leading-6 text-ink/45 dark:text-white/45">Saved for later review.</p>
                  </div>
                ) : null}
              </div>

              <footer className="border-t border-ink/10 bg-linen/35 px-5 py-3 dark:border-white/10 dark:bg-white/[0.025]">
                <div className="flex flex-wrap gap-2">
                  {item.level ? <span className="rounded-full bg-white px-2.5 py-1 text-[0.65rem] font-black text-ink/55 shadow-sm dark:bg-white/[0.07] dark:text-white/55">{item.level}</span> : null}
                  {item.topic ? <span className="rounded-full bg-white px-2.5 py-1 text-[0.65rem] font-black text-ink/55 shadow-sm dark:bg-white/[0.07] dark:text-white/55">{topicLabel(item.topic)}</span> : null}
                  {Number(item.encounter_count || 0) > 1 ? <span className="rounded-full bg-white px-2.5 py-1 text-[0.65rem] font-black text-ink/55 shadow-sm dark:bg-white/[0.07] dark:text-white/55">Seen {item.encounter_count}×</span> : null}
                </div>
                {item.source_activity_title ? (
                  <p className="mt-2 truncate text-[0.68rem] font-bold text-ink/40 dark:text-white/40">From: {item.source_activity_title}</p>
                ) : item.self_added ? (
                  <p className="mt-2 inline-flex items-center gap-1 text-[0.68rem] font-bold text-sky-700/70 dark:text-sky-200/65"><Sparkles className="h-3 w-3" /> Added by the learner</p>
                ) : null}
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-[1.75rem] border border-dashed border-ink/15 bg-white/65 p-9 text-center dark:border-white/15 dark:bg-white/[0.025]">
          <p className="text-lg font-black text-ink dark:text-white">{emptyMessage}</p>
          <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-ink/50 dark:text-white/50">Try changing the filters or search.</p>
        </div>
      )}
    </div>
  );
}
