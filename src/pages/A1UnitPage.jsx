import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import ExerciseRenderer from '../components/exercises/ExerciseRenderer';
import {
  EditorialContinuation,
  EditorialLessonHero,
  EditorialLearningShell,
  EditorialTeachingBlock,
} from '../components/learning/EditorialLearning.jsx';
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
      className="focus-ring group border border-ink/10 bg-white/80 p-5 transition hover:-translate-y-0.5 hover:border-coral/25 dark:border-white/10 dark:bg-white/[0.05]"
    >
      <p className="flex items-center gap-2 text-sm font-black text-coral dark:text-[#ff8d61]">
        {direction === 'previous' ? <Icon className="h-4 w-4" /> : null}
        {item.label}
        {direction === 'next' ? <Icon className="h-4 w-4" /> : null}
      </p>
      <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/65">{item.description}</p>
    </Link>
  );
}

function formatComparisonColumn(column) {
  return [column.rule, ...(column.examples || [])].filter(Boolean).join('\n');
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
      <EditorialLearningShell>
        <section className="section-shell py-12">
          <EditorialTeachingBlock
            prompt="Unità A1 non trovata"
            content={{
              presentation: 'note',
              body: 'Questa unità non è disponibile o il collegamento non è più valido.',
            }}
          />
          <Link to="/grammar/a1" className="focus-ring mt-5 inline-flex rounded-sm bg-coral px-5 py-3 font-black text-white">
            Torna ad A1 English Foundations
          </Link>
        </section>
      </EditorialLearningShell>
    );
  }

  return (
    <EditorialLearningShell>
      <section className="section-shell py-10 sm:py-12">
        <SEO title={`${unit.displayTitle} | Sblocco Inglese`} description={unit.outcome} />

        <EditorialLessonHero
          eyebrow="English Foundations · A1"
          title={unit.displayTitle}
          intro={unit.subtitle}
          meta={[
            { label: 'Grammatica essenziale', icon: 'topic' },
            { label: `${unit.exercises?.length || 0} attività` },
          ]}
        />

        <div id="unit-active-section" className="mt-8 grid scroll-mt-24 gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <EditorialTeachingBlock
            prompt="Regole grammaticali in questa unità"
            content={{
              presentation: 'note',
              eyebrow: 'Mappa grammaticale',
              body: (unit.grammarPoints || []).map((point) => `• ${point}`).join('\n'),
            }}
          />
          <EditorialTeachingBlock
            prompt="Cosa renderai attivo"
            content={{
              presentation: 'recap',
              eyebrow: 'Uso attivo',
              body: unit.outcome,
              items: unit.activeLanguageOutcomes || [],
            }}
          />
        </div>

        <section className="mt-12">
          <div className="max-w-3xl">
            <p className="sblocco-learning-eyebrow">Spiegazione grammaticale</p>
            <h2 className="sblocco-learning-display mt-2 text-[clamp(2.5rem,6vw,4.8rem)] leading-[0.96]">Capire prima di esercitarsi.</h2>
            <p className="mt-4 text-sm font-semibold leading-7 text-ink/65 dark:text-white/65">
              Qui trovi solo la teoria che serve per usare la struttura. Gli esempi vengono prima della pratica, non al posto della pratica.
            </p>
          </div>

          <div className="mt-6 grid gap-5">
            {(unit.ruleCards || []).map((card) => (
              <EditorialTeachingBlock
                key={card.grammarPoint}
                prompt={card.grammarPoint}
                content={{
                  presentation: 'examples',
                  eyebrow: 'La regola in uso',
                  body: `${card.explanation}${card.activeUse ? `\n\nUso attivo: ${card.activeUse}` : ''}`,
                  examples: card.examples || [],
                }}
              />
            ))}
          </div>
        </section>

        {(unit.italianTransferNotes || []).length ? (
          <section className="mt-10">
            <div className="max-w-3xl">
              <p className="sblocco-learning-eyebrow">Italiano → inglese</p>
              <h2 className="sblocco-learning-display mt-2 text-[clamp(2.1rem,5vw,3.8rem)] leading-none">Dove l’italiano può portarti fuori strada.</h2>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {unit.italianTransferNotes.map((note) => (
                <EditorialTeachingBlock
                  key={note.title}
                  prompt={note.title}
                  content={{
                    presentation: 'common_error',
                    body: note.body,
                  }}
                />
              ))}
            </div>
          </section>
        ) : null}

        {unit.comparison ? (
          <section className="mt-10">
            <EditorialTeachingBlock
              prompt={unit.comparison.title}
              content={{
                presentation: 'contrast',
                eyebrow: 'Distinzione grammaticale',
                body: unit.comparison.introduction,
                left_label: unit.comparison.columns?.[0]?.label,
                left_body: formatComparisonColumn(unit.comparison.columns?.[0] || {}),
                right_label: unit.comparison.columns?.[1]?.label,
                right_body: formatComparisonColumn(unit.comparison.columns?.[1] || {}),
              }}
            />
          </section>
        ) : null}

        {(unit.usefulChunks || []).length ? (
          <section className="mt-10">
            <EditorialTeachingBlock
              prompt="Frasi da rendere automatiche"
              content={{
                presentation: 'examples',
                eyebrow: 'Espressioni utili',
                body: 'Non serve memorizzare una regola astratta se poi non riesci a produrre una frase. Queste sono buone unità da riutilizzare.',
                examples: unit.usefulChunks,
              }}
            />
          </section>
        ) : null}

        {!practiceStarted ? (
          <EditorialContinuation
            eyebrow="Ora usalo"
            title="La teoria finisce qui."
            body="Passiamo agli esercizi per verificare se la struttura è davvero disponibile quando devi usarla."
          >
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startPractice}
                aria-expanded={practiceStarted}
                className="sblocco-learning-action focus-ring"
              >
                Esercizi per vedere se hai capito <ArrowRight className="h-4 w-4" />
              </button>
              {unit.id === 'a1-present-simple-normal-verbs' && finalExercise ? (
                <button
                  type="button"
                  onClick={openFinalTest}
                  aria-pressed={isFinal}
                  className="learner-secondary-button focus-ring"
                >
                  Vai al test finale
                </button>
              ) : null}
            </div>
          </EditorialContinuation>
        ) : null}

        {practiceStarted ? (
          <>
            <nav id="unit-exercise-navigation" className="mt-8 scroll-mt-24 overflow-x-auto border-y border-ink/10 py-4 dark:border-white/10" aria-label="Esercizi dell’unità">
              <div className="flex min-w-max gap-2">
                {exerciseNavigation.map((step) => {
                  const active = step.id === activeExerciseId;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => selectExercise(step.id)}
                      aria-current={active ? 'step' : undefined}
                      className={`focus-ring px-4 py-2 text-sm font-black transition ${
                        active
                          ? 'bg-coral text-white'
                          : 'border border-ink/10 bg-white/70 text-ink/70 hover:border-coral/30 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/70'
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
                <div className="mb-5 max-w-3xl">
                  <p className="sblocco-learning-eyebrow">Allenati</p>
                  <h2 className="sblocco-learning-display mt-2 text-[clamp(2.2rem,5vw,4rem)] leading-none">{activeExercise.title}</h2>
                </div>
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

        <nav className="mt-12 grid gap-px overflow-hidden border border-ink/10 bg-ink/10 dark:border-white/10 dark:bg-white/10 sm:grid-cols-2" aria-label="Navigazione A1">
          <NavigationCard item={unit.navigation?.previous} direction="previous" />
          <NavigationCard item={unit.navigation?.next} direction="next" />
        </nav>
      </section>
    </EditorialLearningShell>
  );
}
