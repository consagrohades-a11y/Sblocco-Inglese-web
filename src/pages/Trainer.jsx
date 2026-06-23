import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarClock, RotateCcw, Sparkles } from 'lucide-react';
import DeckSelector from '../components/DeckSelector';
import SEO from '../components/SEO';
import SrsCard from '../components/SrsCard';
import { srsCards } from '../data/srsCards';
import {
  SRS_STORAGE_KEY,
  cleanProgress,
  formatDueLabel,
  getCardState,
  getDeckStats,
  getNextDueCard,
  getReviewQueue,
  rateCard,
} from '../utils/srsAlgorithm';

function loadStoredProgress() {
  if (typeof window === 'undefined') return {};

  try {
    const stored = window.localStorage.getItem(SRS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function StatCard({ label, value, helper }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.08em] text-ink/50">{label}</p>
      <p className="mt-2 text-3xl font-black text-ink">{value}</p>
      <p className="mt-1 text-sm font-semibold text-ink/60">{helper}</p>
    </div>
  );
}

export default function Trainer() {
  const [progress, setProgress] = useState(() => cleanProgress(loadStoredProgress(), srsCards));
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    try {
      window.localStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Progress is intentionally local-only; if storage is unavailable, the trainer still works for the session.
    }
  }, [progress]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const categories = useMemo(() => Array.from(new Set(srsCards.map((card) => card.category))), []);
  const stats = useMemo(() => getDeckStats(srsCards, progress, now), [progress, now]);
  const queue = useMemo(
    () => getReviewQueue(srsCards, progress, { category: selectedCategory, level: selectedLevel, now }),
    [progress, selectedCategory, selectedLevel, now],
  );
  const currentCard = queue[0];
  const currentProgress = currentCard ? getCardState(progress, currentCard.id) : null;
  const nextDue = useMemo(
    () => getNextDueCard(srsCards, progress, { category: selectedCategory, level: selectedLevel, now }),
    [progress, selectedCategory, selectedLevel, now],
  );

  const handleRate = (rating) => {
    if (!currentCard) return;

    const reviewTime = new Date();
    setProgress((currentProgressMap) => rateCard(currentProgressMap, currentCard.id, rating, reviewTime));
    setNow(reviewTime);
  };

  const handleReset = () => {
    const confirmed = window.confirm('Vuoi azzerare i progressi del trainer su questo dispositivo?');
    if (confirmed) {
      setProgress({});
      setNow(new Date());
    }
  };

  const progressWidth = `${stats.progressPercent}%`;

  return (
    <>
      <SEO
        title="Trainer SRS | Sblocco Inglese"
        description="Trainer SRS per ripassare espressioni utili in colloqui, lavoro, meeting, email e situazioni professionali."
      />

      <section className="section-shell pb-8 pt-10 lg:pt-12">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <span className="eyebrow">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
              Trainer SRS
            </span>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight text-ink sm:text-5xl">
              150 espressioni per colloqui, lavoro e call
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-ink/70">
              Ripassa le card in base a quando sono dovute. Il contenuto resta fisso nel dataset, mentre i tuoi progressi
              restano salvati solo su questo dispositivo.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-extrabold text-ink transition hover:border-coral/30 hover:bg-blush"
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Azzera progressi
          </button>
        </div>
      </section>

      <section className="section-shell pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Card totali" value={stats.total} helper="dataset fisso" />
          <StatCard label="Dovute" value={stats.due} helper="da ripassare ora" />
          <StatCard label="Nuove" value={stats.new} helper="mai viste" />
          <StatCard label="Ripassate oggi" value={stats.reviewedToday} helper="su questo browser" />
          <StatCard label="Progressi" value={`${stats.progressPercent}%`} helper={`${stats.reviewed} viste`} />
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-moss transition-all" style={{ width: progressWidth }} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid content-start gap-5">
            <DeckSelector
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedLevel={selectedLevel}
              onLevelChange={setSelectedLevel}
              statsByCategory={stats.byCategory}
            />

            <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-linen text-clay">
                  <BarChart3 aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-ink">Sessione</h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-ink/60">
                    {queue.length > 0
                      ? `${queue.length} card disponibili con i filtri attuali.`
                      : 'Nessuna card disponibile con i filtri attuali.'}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {categories.map((category) => {
                  const categoryStats = stats.byCategory[category];
                  return (
                    <div key={category} className="flex items-center justify-between gap-3 border-t border-ink/10 pt-3 text-sm">
                      <span className="font-black text-ink">{category}</span>
                      <span className="font-semibold text-ink/60">
                        {categoryStats.due} due / {categoryStats.new} nuove
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            {currentCard ? (
              <SrsCard card={currentCard} progress={currentProgress} onRate={handleRate} />
            ) : (
              <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-mint text-moss">
                  <CalendarClock aria-hidden="true" className="h-6 w-6" />
                </span>
                <h2 className="mt-5 text-2xl font-black text-ink">Per ora sei in pari</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-ink/70">
                  Non ci sono card nuove o dovute per questo filtro. Cambia categoria, cambia livello o torna quando la
                  prossima card sarà pronta.
                </p>
                {nextDue ? (
                  <p className="mt-4 rounded-lg bg-paper p-4 text-sm font-black text-ink/70">
                    Prossima card: {formatDueLabel(nextDue.state.dueAt, now)}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
