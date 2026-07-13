import React, { useEffect, useMemo, useState } from 'react';
import SrsTrainer from '../components/SrsTrainer';
import SEO from '../components/SEO';
import TrainerLayout from '../components/TrainerLayout';
import { getTrainerById } from '../data/trainerConfig';
import { supabase } from '../lib/supabaseClient.js';

function mapPublishedWordCard(row) {
  const pronunciation = [row.pronunciation_ipa_us, row.pronunciation_learner_us]
    .filter(Boolean)
    .join('  ·  ');

  return {
    id: row.public_id,
    databaseId: row.id,
    type: 'word',
    level: row.level,
    category: row.category || 'General vocabulary',
    word: row.lemma,
    partOfSpeech: row.part_of_speech || '',
    pronunciation: pronunciation || 'Pronuncia non disponibile',
    italian: row.italian_meaning,
    collocations: Array.isArray(row.common_collocations) ? row.common_collocations.join(' · ') : '',
    example1: row.example_1 || 'Example missing.',
    example2: row.example_2 || 'Example missing.',
    note: row.usage_note || row.common_mistakes || row.english_definition,
    acceptedAnswers: row.accepted_answers || [],
    tags: row.tags || [],
  };
}

export default function WordTrainer() {
  const trainer = getTrainerById('word-trainer');
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadCards() {
      setLoading(true);
      setError('');

      const { data, error: rpcError } = await supabase.rpc('list_published_word_cards');
      if (!active) return;

      if (rpcError) {
        setCards([]);
        setError('Il Word Trainer non è ancora collegato al nuovo database. Applica la migrazione word_trainer_content in Supabase.');
      } else {
        setCards((data || []).map(mapPublishedWordCard));
      }

      setLoading(false);
    }

    loadCards();
    return () => { active = false; };
  }, []);

  const liveTrainer = useMemo(() => ({
    ...trainer,
    cardCount: cards.length,
    categories: Array.from(new Set(cards.map((card) => card.category))),
  }), [cards, trainer]);

  if (loading || error) {
    return (
      <>
        <SEO title="Word Trainer | Sblocco Inglese" description="Word Trainer collegato ai contenuti pubblicati in Supabase." />
        <TrainerLayout>
          <div className="mx-auto max-w-4xl rounded-2xl border border-ink/10 bg-white p-7 shadow-soft sm:p-10">
            <span className="eyebrow">Word Trainer</span>
            <h1 className="mt-4 text-3xl font-black text-ink sm:text-5xl">
              {loading ? 'Caricamento delle card...' : 'Word Trainer non disponibile'}
            </h1>
            <p className="mt-4 text-base leading-7 text-ink/70">
              {loading ? 'Sto caricando esclusivamente le card revisionate e pubblicate.' : error}
            </p>
          </div>
        </TrainerLayout>
      </>
    );
  }

  return (
    <SrsTrainer
      cards={cards}
      trainer={liveTrainer}
      storageKey={trainer.storageKey}
      seoTitle="Word Trainer | Sblocco Inglese"
      seoDescription="Learn published English words with American pronunciation, Italian meaning, examples, collocations and review timing."
    />
  );
}
