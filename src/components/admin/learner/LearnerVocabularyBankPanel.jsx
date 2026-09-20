import React, { useEffect, useState } from 'react';
import { BookMarked } from 'lucide-react';
import VocabularyBankCatalog from '../../vocabulary/VocabularyBankCatalog.jsx';
import { loadLearnerVocabularyBank } from '../../../lib/learnerVocabularyBankApi.js';

export default function LearnerVocabularyBankPanel({ learnerId, learnerName }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const rows = await loadLearnerVocabularyBank(learnerId);
        if (active) setItems(rows);
      } catch (loadError) {
        if (active) setError(loadError.message || 'Non è stato possibile caricare il vocabolario dello studente.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [learnerId]);

  return (
    <section className="overflow-hidden rounded-[2rem] border border-ink/10 bg-[#fbf8f1] shadow-sm dark:border-white/10 dark:bg-white/[0.025]">
      <div className="border-b border-ink/10 bg-white px-6 py-5 dark:border-white/10 dark:bg-white/[0.025]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">Vocabulary intelligence</p>
            <h2 className="mt-2 text-2xl font-black text-ink dark:text-white">{learnerName || 'Student'} · Word & Chunk Bank</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-ink/55 dark:text-white/55">
              See what came from completed activities and what the learner chose to save independently. Self-added items are explicitly flagged.
            </p>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-300/10 dark:text-orange-200">
            <BookMarked className="h-5 w-5" />
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {loading ? (
          <div className="rounded-2xl border border-ink/10 bg-white p-6 text-center text-sm font-black text-ink/60 dark:border-white/10 dark:bg-white/[0.035] dark:text-white/60">Caricamento vocabulary bank…</div>
        ) : error ? (
          <div className="border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-900 dark:bg-red-300/10 dark:text-red-100">{error}</div>
        ) : (
          <VocabularyBankCatalog
            items={items}
            compact
            emptyMessage="This learner’s bank is empty."
          />
        )}
      </div>
    </section>
  );
}
