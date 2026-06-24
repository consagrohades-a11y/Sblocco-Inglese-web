import React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, CheckCircle2, Moon, RotateCcw, Sparkles, Sun } from 'lucide-react';
import DeckSelector from './DeckSelector';
import ReviewStats from './ReviewStats';
import SEO from './SEO';
import SrsCard from './SrsCard';
import TrainerLayout from './TrainerLayout';
import {
  buildReviewQueue,
  cleanProgress,
  formatDueLabel,
  getCategoryCardCounts,
  getDeckStats,
  getNextDueCard,
  getTodayISO,
  loadProgress,
  reinsertCardAfterDelay,
  reviewCard,
  saveProgress,
} from '../utils/srsAlgorithm';
import {
  buildExpectedCategoryCounts,
  expressionRequiredSrsCardFields,
  warnAboutSrsCardIssues,
  wordTrainerRequiredSrsCardFields,
} from '../utils/validateSrsCards';

const SESSION_LIMIT = 30;
const DAILY_NEW_LIMIT = 10;
const emptyRatings = { again: 0, hard: 0, good: 0, easy: 0 };

function toggleValue(values, value) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function matchesSelection(value, selectedValues) {
  return selectedValues.length === 0 || selectedValues.includes(value);
}

function SessionPanel({
  title,
  children,
  icon: Icon,
  actions,
  dark = false,
}) {
  return (
    <div
      className={`mx-auto w-full max-w-4xl rounded-lg border p-4 text-center shadow-soft sm:p-8 ${
        dark ? 'border-white/10 bg-white/[0.07] text-white' : 'border-ink/10 bg-white text-ink'
      }`}
    >
      <span className={`mx-auto inline-flex h-10 w-10 items-center justify-center rounded-lg sm:h-12 sm:w-12 ${dark ? 'bg-mint/20 text-mint' : 'bg-mint text-moss'}`}>
        <Icon aria-hidden="true" className="h-6 w-6" />
      </span>
      <h2 className={`mt-4 text-xl font-black sm:mt-5 sm:text-2xl ${dark ? 'text-white' : 'text-ink'}`}>{title}</h2>
      <div className={`mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 ${dark ? 'text-white/70' : 'text-ink/70'}`}>{children}</div>
      {actions ? <div className="mt-4 flex flex-col justify-center gap-3 sm:mt-6 sm:flex-row">{actions}</div> : null}
    </div>
  );
}

function CompletionStats({ ratings, reviewed, dark = false }) {
  const items = [
    ['Cards reviewed', reviewed],
    ['Again', ratings.again],
    ['Hard', ratings.hard],
    ['Good', ratings.good],
    ['Easy', ratings.easy],
  ];

  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-5 sm:gap-3">
      {items.map(([label, value]) => (
        <div
          key={label}
          className={`rounded-lg border px-3 py-3 ${
            dark ? 'border-white/10 bg-white/[0.08]' : 'border-ink/10 bg-paper'
          }`}
        >
          <p className={`text-[0.68rem] font-black uppercase tracking-[0.08em] ${dark ? 'text-white/55' : 'text-ink/50'}`}>{label}</p>
          <p className={`mt-1 text-2xl font-black ${dark ? 'text-white' : 'text-ink'}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}

export default function SrsTrainer({
  cards,
  trainer,
  storageKey,
  title = trainer?.title || 'Expression Trainer',
  subtitle = trainer?.description || 'Review useful English with spaced repetition.',
  seoTitle = `${title} | Sblocco Inglese`,
  seoDescription = subtitle,
}) {
  const filtersRef = useRef(null);
  const mobileFiltersRef = useRef(null);
  const trainerCards = cards || [];
  const trainerType = trainer?.cardType || 'expression';
  const targetLabel = trainerType === 'word' ? 'Word' : 'Expression';
  const [progress, setProgress] = useState(() => cleanProgress(loadProgress(trainerCards, storageKey), trainerCards));
  const progressRef = useRef(progress);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedLevels, setSelectedLevels] = useState([]);
  const [now, setNow] = useState(() => new Date());
  const [sessionQueue, setSessionQueue] = useState([]);
  const [sessionReviewedCount, setSessionReviewedCount] = useState(0);
  const [sessionRatings, setSessionRatings] = useState(emptyRatings);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [sessionStep, setSessionStep] = useState(0);
  const themeStorageKey = `${storageKey || 'srs-trainer'}:theme`;
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    return window.localStorage.getItem(themeStorageKey) || 'dark';
  });
  const isDark = theme === 'dark';

  const categories = useMemo(() => Array.from(new Set(trainerCards.map((card) => card.category))), [trainerCards]);
  const categoryCounts = useMemo(() => getCategoryCardCounts(trainerCards), [trainerCards]);
  const cardById = useMemo(() => new Map(trainerCards.map((card) => [card.id, card])), [trainerCards]);
  const expectedCategories = useMemo(
    () => buildExpectedCategoryCounts(trainer?.categories?.length ? trainer.categories : categories),
    [trainer?.categories, categories],
  );
  const validationOptions = useMemo(
    () => ({
      expectedCategories,
      requiredFields: trainerType === 'word' ? wordTrainerRequiredSrsCardFields : expressionRequiredSrsCardFields,
      targetField: trainerType === 'word' ? 'word' : 'expression',
    }),
    [expectedCategories, trainerType],
  );
  const selectedCategoryKey = selectedCategories.join('|');
  const selectedLevelKey = selectedLevels.join('|');

  const filteredCards = useMemo(
    () =>
      trainerCards.filter(
        (card) => matchesSelection(card.category, selectedCategories) && matchesSelection(card.level, selectedLevels),
      ),
    [trainerCards, selectedCategoryKey, selectedLevelKey],
  );

  const allStats = useMemo(() => getDeckStats(trainerCards, progress, now), [trainerCards, progress, now]);
  const filteredStats = useMemo(() => getDeckStats(filteredCards, progress, now), [filteredCards, progress, now]);
  const stats = useMemo(
    () => ({
      ...filteredStats,
      newAvailableToday: Math.min(filteredStats.new, allStats.newAvailableToday),
    }),
    [allStats.newAvailableToday, filteredStats],
  );

  const currentCard = sessionQueue.length > 0 ? cardById.get(sessionQueue[0]) : null;
  const nextDue = useMemo(
    () =>
      getNextDueCard(trainerCards, progress, {
        category: selectedCategories,
        levels: selectedLevels,
        today: getTodayISO(now),
      }),
    [trainerCards, progress, selectedCategoryKey, selectedLevelKey, now],
  );

  const buildSessionIds = useCallback(
    (progressSnapshot = progressRef.current) =>
      buildReviewQueue(trainerCards, progressSnapshot, selectedCategories, {
        levels: selectedLevels,
        today: getTodayISO(new Date()),
        totalLimit: SESSION_LIMIT,
        newLimit: DAILY_NEW_LIMIT,
      }).map((card) => card.id),
    [trainerCards, selectedCategoryKey, selectedLevelKey],
  );

  const startSession = useCallback(() => {
    setNow(new Date());
    setSessionQueue(buildSessionIds());
    setSessionReviewedCount(0);
    setSessionRatings(emptyRatings);
    setAnswerVisible(false);
    setSessionStep((step) => step + 1);
  }, [buildSessionIds]);

  useEffect(() => {
    warnAboutSrsCardIssues(trainerCards, console, validationOptions);
  }, [trainerCards, validationOptions]);

  useEffect(() => {
    saveProgress(progress, storageKey);
    progressRef.current = progress;
  }, [progress, storageKey]);

  useEffect(() => {
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme, themeStorageKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setSessionQueue(buildSessionIds());
    setSessionReviewedCount(0);
    setSessionRatings(emptyRatings);
    setAnswerVisible(false);
    setSessionStep((step) => step + 1);
  }, [selectedCategoryKey, selectedLevelKey, buildSessionIds]);

  useEffect(() => {
    if (sessionQueue.length > 0 && !currentCard) {
      setSessionQueue((queue) => queue.slice(1));
    }
  }, [currentCard, sessionQueue.length]);

  const handleRate = useCallback(
    (rating) => {
      if (!currentCard) return;

      const reviewTime = new Date();
      const today = getTodayISO(reviewTime);
      setProgress((currentProgressMap) => reviewCard(currentCard.id, rating, currentProgressMap, today));
      setSessionRatings((ratings) => ({ ...ratings, [rating]: ratings[rating] + 1 }));
      setSessionReviewedCount((count) => count + 1);
      setSessionQueue((queue) => {
        const remainingQueue = queue.slice(1);

        if (rating !== 'again') return remainingQueue;
        return reinsertCardAfterDelay(remainingQueue, currentCard.id, 3);
      });
      setAnswerVisible(false);
      setNow(reviewTime);
      setSessionStep((step) => step + 1);
    },
    [currentCard],
  );

  useEffect(() => {
    function handleShortcut(event) {
      const target = event.target;
      const isTyping =
        target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

      if (isTyping || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.code === 'Space' && currentCard && !answerVisible) {
        event.preventDefault();
        setAnswerVisible(true);
        return;
      }

      if (!currentCard || !answerVisible) return;

      const ratingByKey = {
        1: 'again',
        2: 'hard',
        3: 'good',
        4: 'easy',
      };
      const rating = ratingByKey[event.key];

      if (rating) {
        event.preventDefault();
        handleRate(rating);
      }
    }

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [answerVisible, currentCard, handleRate]);

  const handleReset = () => {
    const confirmed = window.confirm('Vuoi azzerare i progressi del trainer su questo dispositivo?');
    if (confirmed) {
      setProgress({});
      saveProgress({}, storageKey);
      setNow(new Date());
      setSessionQueue(buildReviewQueue(trainerCards, {}, selectedCategories, {
        levels: selectedLevels,
        today: getTodayISO(new Date()),
        totalLimit: SESSION_LIMIT,
        newLimit: DAILY_NEW_LIMIT,
      }).map((card) => card.id));
      setSessionReviewedCount(0);
      setSessionRatings(emptyRatings);
      setAnswerVisible(false);
      setSessionStep((step) => step + 1);
    }
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedLevels([]);
  };

  const scrollToFilters = () => {
    const desktopFiltersVisible = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
    const target = desktopFiltersVisible ? filtersRef.current : mobileFiltersRef.current;
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const sessionLabel = currentCard
    ? `Card ${Math.min(sessionReviewedCount + 1, SESSION_LIMIT)} of ${SESSION_LIMIT}`
    : `Card ${sessionReviewedCount} of ${SESSION_LIMIT}`;
  const noMatchingCards = !currentCard && filteredCards.length === 0;
  const noReadyCards = !currentCard && filteredCards.length > 0 && sessionReviewedCount === 0;
  const sessionComplete = !currentCard && filteredCards.length > 0 && sessionReviewedCount > 0;
  const deckSelectorProps = {
    categories,
    categoryCounts,
    selectedCategories,
    onToggleCategory: (category) => setSelectedCategories((values) => toggleValue(values, category)),
    selectedLevels,
    onToggleLevel: (level) => setSelectedLevels((values) => toggleValue(values, level)),
    onClear: clearFilters,
    dark: isDark,
  };

  return (
    <>
      <SEO
        title={seoTitle}
        description={seoDescription}
      />

      <TrainerLayout>
        <div
          className={`mx-auto max-w-7xl overflow-hidden rounded-lg border shadow-soft transition ${
            isDark ? 'border-white/10 bg-ink p-4 text-white sm:p-6' : 'border-ink/10 bg-white/85 p-4 text-ink sm:p-6'
          }`}
        >
          <div className="-mx-4 -mt-4 mb-5 h-1 scanline sm:-mx-6 sm:-mt-6" />
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.08em] shadow-sm ${
                  isDark ? 'border-white/15 bg-white text-ink' : 'border-moss/20 bg-white/90 text-moss'
                }`}
              >
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                Available trainer
              </span>
              <h1 className={`mt-4 max-w-4xl text-3xl font-black leading-tight sm:mt-5 sm:text-5xl ${isDark ? 'text-white' : 'text-ink'}`}>
                {title}
              </h1>
              <p className={`mt-3 max-w-3xl text-base font-semibold leading-7 sm:mt-5 sm:text-lg sm:font-normal sm:leading-8 ${isDark ? 'text-white/70' : 'text-ink/70'}`}>
                {subtitle}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <button
                type="button"
                onClick={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
                aria-label={isDark ? 'Passa alla modalita chiara' : 'Passa alla modalita scura'}
                className={`focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-extrabold transition ${
                  isDark
                    ? 'border-white/15 bg-white/[0.08] text-white hover:bg-white hover:text-ink'
                    : 'border-moss/20 bg-white text-ink hover:bg-mint/50'
                }`}
              >
                {isDark ? <Sun aria-hidden="true" className="h-4 w-4" /> : <Moon aria-hidden="true" className="h-4 w-4" />}
                {isDark ? 'Light' : 'Dark'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className={`focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-extrabold transition lg:justify-self-end ${
                  isDark
                    ? 'border-white/15 bg-white/[0.08] text-white hover:border-coral/40 hover:bg-blush hover:text-ink'
                    : 'border-ink/15 bg-white text-ink hover:border-coral/30 hover:bg-blush'
                }`}
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                Azzera progressi
              </button>
            </div>
          </div>

          <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(260px,0.38fr)_minmax(0,1fr)] lg:items-start">
            <aside className="grid min-w-0 gap-4 lg:sticky lg:top-24">
              <ReviewStats
                dueToday={stats.due}
                newAvailable={stats.newAvailableToday}
                reviewedToday={stats.reviewedToday}
                sessionReviewed={sessionReviewedCount}
                sessionLimit={SESSION_LIMIT}
                dark={isDark}
                compact
              />

              <div ref={filtersRef} className="hidden min-w-0 lg:block">
                <DeckSelector {...deckSelectorProps} />
              </div>
            </aside>

            <div className="min-w-0">
              {currentCard ? (
                <SrsCard
                  key={`${currentCard.id}-${sessionStep}`}
                  card={currentCard}
                  progress={progress[currentCard.id]}
                  revealed={answerVisible}
                  onReveal={() => setAnswerVisible(true)}
                  onRate={handleRate}
                  sessionLabel={sessionLabel}
                  targetLabel={targetLabel}
                  dark={isDark}
                />
              ) : null}

              {noMatchingCards ? (
                <SessionPanel
                  title="No cards match these filters."
                  icon={CalendarClock}
                  dark={isDark}
                  actions={
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full bg-moss px-5 py-3 text-sm font-extrabold text-white shadow-lift transition hover:bg-[#096d58]"
                    >
                      Clear filters
                    </button>
                  }
                >
                  Try selecting more categories or levels.
                </SessionPanel>
              ) : null}

              {noReadyCards ? (
                <SessionPanel
                  title="No cards ready right now"
                  icon={CalendarClock}
                  dark={isDark}
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={startSession}
                        className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full bg-moss px-5 py-3 text-sm font-extrabold text-white shadow-lift transition hover:bg-[#096d58]"
                      >
                        Start another session
                      </button>
                      <button
                        type="button"
                        onClick={scrollToFilters}
                        className={`focus-ring inline-flex min-h-11 items-center justify-center rounded-full border px-5 py-3 text-sm font-extrabold transition ${
                          isDark
                            ? 'border-white/15 bg-white/[0.08] text-white hover:bg-white hover:text-ink'
                            : 'border-ink/15 bg-white text-ink hover:bg-mint/50'
                        }`}
                      >
                        Change filters
                      </button>
                    </>
                  }
                >
                  {nextDue ? (
                    <>Next review: {formatDueLabel(nextDue.state.dueDate, now)}.</>
                  ) : (
                    <>Try widening your filters or come back later.</>
                  )}
                </SessionPanel>
              ) : null}

              {sessionComplete ? (
                <SessionPanel
                  title="Session complete"
                  icon={CheckCircle2}
                  dark={isDark}
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={startSession}
                        className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full bg-moss px-5 py-3 text-sm font-extrabold text-white shadow-lift transition hover:bg-[#096d58]"
                      >
                        Start another session
                      </button>
                      <button
                        type="button"
                        onClick={scrollToFilters}
                        className={`focus-ring inline-flex min-h-11 items-center justify-center rounded-full border px-5 py-3 text-sm font-extrabold transition ${
                          isDark
                            ? 'border-white/15 bg-white/[0.08] text-white hover:bg-white hover:text-ink'
                            : 'border-ink/15 bg-white text-ink hover:bg-mint/50'
                        }`}
                      >
                        Change filters
                      </button>
                    </>
                  }
                >
                  <p>Suggested next step: Use 3 of these expressions in your next speaking lesson.</p>
                  <CompletionStats ratings={sessionRatings} reviewed={sessionReviewedCount} dark={isDark} />
                </SessionPanel>
              ) : null}
            </div>

            <div ref={mobileFiltersRef} className="min-w-0 lg:hidden">
              <DeckSelector {...deckSelectorProps} />
            </div>
          </div>
        </div>
      </TrainerLayout>
    </>
  );
}
