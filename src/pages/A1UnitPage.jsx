import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import ExerciseRenderer from '../components/exercises/ExerciseRenderer';
import DiagnosticResult from '../components/diagnostics/DiagnosticResult';
import { buildDiagnosticProfile } from '../engines/diagnosticEngine';
import { buildRecommendations } from '../engines/recommendationEngine';
import { unitBeBasicSentences } from '../content/levels/a1/unitBeBasicSentences';
import { unitPresentSimpleNormalVerbs } from '../content/levels/a1/unitPresentSimpleNormalVerbs';

const units = {
  'be-basic-sentences': unitBeBasicSentences,
  'present-simple-normal-verbs': unitPresentSimpleNormalVerbs,
};

function NavigationCard({ item, direction }) {
  if (!item) return null;
  const Icon = direction === 'previous' ? ArrowLeft : ArrowRight;

  return (
    <Link
      to={item.path}
      className="focus-ring group rounded-2xl border border-ink/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <p className="flex items-center gap-2 text-sm font-black text-moss">
        {direction === 'previous' ? <Icon className="h-4 w-4" /> : null}
        {item.label}
        {direction === 'next' ? <Icon className="h-4 w-4" /> : null}
      </p>
      <p className="mt-2 text-sm leading-6 text-ink/65">{item.description}</p>
    </Link>
  );
}

export default function A1UnitPage({ unitId }) {
  const unit = units[unitId];
  const [attemptsByExercise, setAttemptsByExercise] = useState({});
  const [practiceStarted, setPracticeStarted] = useState(false);
  const [activeExerciseId, setActiveExerciseId] = useState(() => (
    unit?.exerciseNavigation?.[0]?.id || unit?.exercises?.[0]?.id || null
  ));
  const attempts = useMemo(() => Object.values(attemptsByExercise), [attemptsByExercise]);
  const exerciseNavigation = useMemo(() => {
    if (!unit) return [];
    if (unit.exerciseNavigation?.length) return unit.exerciseNavigation;

    return unit.exercises.map((exercise, index) => ({
      id: exercise.id,
      title: exercise.purpose === 'final-check' ? 'Test finale' : `${index + 1}. Esercizio`,
    }));
  }, [unit]);
  const activeExerciseIndex = exerciseNavigation.findIndex((step) => step.id === activeExerciseId);
  const activeExercise = unit?.exercises.find((exercise) => exercise.id === activeExerciseId);
  const finalExercise = unit?.exercises.find((exercise) => exercise.purpose === 'final-check');
  const nextExerciseStep = activeExerciseIndex >= 0
    ? exerciseNavigation[activeExerciseIndex + 1]
    : null;
  const nextExercise = unit?.exercises.find((exercise) => exercise.id === nextExerciseStep?.id)
    || (activeExerciseIndex === exerciseNavigation.length - 1 ? finalExercise : null);
  const isFinal = activeExercise?.purpose === 'final-check';
  const continueLabel = nextExercise?.purpose === 'final-check'
    ? 'Inizia il test finale'
    : `Prossimo: ${nextExercise?.title || nextExerciseStep?.title || 'A1 English Foundations'}`;

  const selectExercise = (exerciseId) => {
    setActiveExerciseId(exerciseId);
    window.requestAnimationFrame(() => {
      document.getElementById('unit-active-exercise')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const startPractice = () => {
    setPracticeStarted(true);
    if (isFinal && exerciseNavigation[0]) setActiveExerciseId(exerciseNavigation[0].id);
    window.requestAnimationFrame(() => {
      document.getElementById('unit-exercise-navigation')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openFinalTest = () => {
    if (!finalExercise) return;
    setPracticeStarted(true);
    selectExercise(finalExercise.id);
  };
  const diagnosticResult = useMemo(() => {
    if (!unit || !attempts.length) return null;
    const profile = buildDiagnosticProfile(attempts);
    return {
      ...profile,
      estimatedLevel: `${unit.displayTitle} — diagnostic profile`,
      recommendations: buildRecommendations(profile),
    };
  }, [attempts, unit]);

  if (!unit) {
    return (
      <section className="section-shell py-12">
        <div className="rounded-[2rem] border border-ink/10 bg-white p-7 shadow-soft">
          <h1 className="text-3xl font-black text-ink">Unità A1 non trovata.</h1>
          <Link to="/grammar/a1" className="focus-ring mt-5 inline-flex rounded-full bg-moss px-5 py-3 font-black text-white">
            Torna ad A1 English Foundations
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section-shell py-12">
      <SEO title={`${unit.displayTitle} | Sblocco Inglese`} description={unit.outcome} />

      <div className="rounded-[2rem] bg-ink p-7 text-white shadow-soft sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-mint">Unità A1 English Foundations</p>
        <h1 className="mt-4 max-w-5xl text-4xl font-black leading-tight sm:text-5xl">{unit.displayTitle}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-white/75">{unit.subtitle}</p>
        <div className="mt-6 rounded-2xl bg-white/10 p-5">
          <p className="text-xs font-black uppercase tracking-wide text-mint">Obiettivo</p>
          <p className="mt-2 max-w-4xl leading-7 text-white/85">{unit.outcome}</p>
        </div>
      </div>

      <div id="unit-active-section" className="mt-8 grid scroll-mt-24 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-moss">
            <BookOpen className="h-4 w-4" /> Mappa grammaticale
          </p>
          <h2 className="mt-3 text-2xl font-black text-ink">Regole grammaticali in questa unità</h2>
          <ul className="mt-4 grid gap-2 text-sm font-semibold leading-6 text-ink/70">
            {unit.grammarPoints.map((point) => <li key={point}>• {point}</li>)}
          </ul>
        </section>

        <section className="rounded-2xl border border-ink/10 bg-linen/70 p-6">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-moss">
            <Target className="h-4 w-4" /> Uso attivo
          </p>
          <h2 className="mt-3 text-2xl font-black text-ink">Cosa renderai attivo</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {unit.activeLanguageOutcomes.map((outcome) => (
              <li key={outcome} className="rounded-xl bg-white p-4 text-sm font-semibold leading-6 text-ink/70 shadow-sm">
                {outcome}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-8">
        <p className="text-xs font-black uppercase tracking-wide text-moss">Spiegazione grammaticale</p>
        <h2 className="mt-2 text-3xl font-black text-ink">Come funziona la grammatica</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {unit.ruleCards.map((card) => (
            <article key={card.grammarPoint} className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
              <p className="text-sm font-black text-moss">{card.grammarPoint}</p>
              <p className="mt-3 text-sm leading-7 text-ink/75">{card.explanation}</p>
              <div className="mt-4 rounded-xl bg-mint/35 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-ink/55">Uso attivo nel parlato</p>
                <p className="mt-2 text-sm leading-6 text-ink/70">{card.activeUse}</p>
              </div>
              <ul className="mt-4 grid gap-1 text-sm font-black text-ink">
                {card.examples.map((example) => <li key={example}>{example}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-coral/20 bg-blush/70 p-6 sm:p-7">
        <p className="text-xs font-black uppercase tracking-wide text-coral">Interferenze italiano → inglese</p>
        <h2 className="mt-2 text-2xl font-black text-ink">Dove l’italiano può interferire</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {unit.italianTransferNotes.map((note) => (
            <article key={note.title} className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="font-black text-ink">{note.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink/70">{note.body}</p>
            </article>
          ))}
        </div>
      </section>

      {unit.comparison ? (
        <section className="mt-8 rounded-[2rem] bg-ink p-6 text-white sm:p-7">
          <p className="text-xs font-black uppercase tracking-wide text-mint">Distinzione grammaticale</p>
          <h2 className="mt-2 text-2xl font-black">{unit.comparison.title}</h2>
          <p className="mt-3 max-w-4xl leading-7 text-white/70">{unit.comparison.introduction}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {unit.comparison.columns.map((column) => (
              <article key={column.label} className="rounded-2xl bg-white p-5 text-ink">
                <h3 className="font-black">{column.label}</h3>
                <p className="mt-2 rounded-lg bg-butter px-3 py-2 text-sm font-black">{column.rule}</p>
                <ul className="mt-3 grid gap-1 text-sm font-semibold">
                  {column.examples.map((example) => <li key={example}>{example}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8 rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-moss">Espressioni utili</p>
        <h2 className="mt-2 text-2xl font-black text-ink">Frasi da rendere automatiche</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {unit.usefulChunks.map((chunk) => (
            <span key={chunk} className="rounded-full bg-butter px-4 py-2 text-sm font-black text-ink">{chunk}</span>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={startPractice}
        aria-expanded={practiceStarted}
        className="focus-ring mt-5 rounded-full bg-coral px-5 py-3 font-black text-white shadow-lift transition hover:brightness-105"
      >
        Esercizi per vedere se hai capito
      </button>

      {unit.id === 'a1-present-simple-normal-verbs' && finalExercise ? (
        <button
          type="button"
          onClick={openFinalTest}
          aria-pressed={isFinal}
          className="focus-ring mt-3 block rounded-full bg-ink px-5 py-3 font-black text-white shadow-lift transition hover:brightness-110"
        >
          Test finale
        </button>
      ) : null}

      {practiceStarted ? (
        <>
      <nav id="unit-exercise-navigation" className="mt-5 scroll-mt-24 overflow-x-auto pb-2" aria-label="Esercizi dell’unità">
        <div className="flex min-w-max gap-2">
          {exerciseNavigation.map((step) => {
            const active = step.id === activeExerciseId;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => selectExercise(step.id)}
                aria-current={active ? 'step' : undefined}
                className={`focus-ring rounded-full px-4 py-2 text-sm font-black transition ${
                  active ? 'bg-ink text-white' : 'border border-ink/10 bg-white text-ink/70 hover:border-moss/30'
                }`}
              >
                {step.title}
              </button>
            );
          })}
        </div>
      </nav>

      {activeExercise ? (
        <section id="unit-active-exercise" className="mt-8 scroll-mt-24">
          <h2 className="mb-4 text-3xl font-black text-ink">{activeExercise.title}</h2>
          <ExerciseRenderer
            key={activeExercise.id}
            exercise={activeExercise}
            showHeader={false}
            isFinal={isFinal}
            continueLabel={continueLabel}
            onContinue={() => nextExercise && selectExercise(nextExercise.id)}
            onComplete={(attempt) => setAttemptsByExercise((current) => ({
              ...current,
              [activeExercise.id]: attempt,
            }))}
          />
        </section>
      ) : null}
        </>
      ) : null}

      {diagnosticResult && !unit.exerciseNavigation ? (
        <div className="mt-10">
          <DiagnosticResult result={diagnosticResult} level={unit.level} track={unit.track} />
        </div>
      ) : null}

      <nav className="mt-10 grid gap-4 sm:grid-cols-2" aria-label="Navigazione A1">
        <NavigationCard item={unit.navigation?.previous} direction="previous" />
        <NavigationCard item={unit.navigation?.next} direction="next" />
      </nav>
    </section>
  );
}

