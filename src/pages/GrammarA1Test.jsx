import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, RotateCcw, Target, XCircle } from 'lucide-react';
import SEO from '../components/SEO';
import { grammarA1Checkpoints } from '../data/grammarA1Test';

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');

function getExerciseItems(exercise) {
  return exercise.items || [];
}

function getCheckpointItems(checkpoint) {
  return checkpoint.exercises.flatMap(getExerciseItems);
}

function correctAnswer(item) {
  return item.type === 'choice' ? item.options[item.correct] : item.answer;
}

function isCorrect(item, value) {
  if (item.type === 'choice') return Number(value) === item.correct;
  return item.accepted.map(normalize).includes(normalize(value));
}

function getScore(items, answers) {
  const correct = items.filter((item) => isCorrect(item, answers[item.id])).length;
  return { correct, total: items.length, percent: items.length ? Math.round((correct / items.length) * 100) : 0 };
}

function getStatus(percent) {
  if (percent >= 85) return 'Solido';
  if (percent >= 65) return 'In sviluppo';
  return 'Da ripassare';
}

function CorrectionList({ items, answers }) {
  return (
    <div className="mt-5 rounded-lg border border-ink/10 bg-linen/70 p-4 dark:border-white/10 dark:bg-white/[0.06]">
      <p className="text-sm font-black uppercase tracking-wide text-ink/70 dark:text-white/70">Correzioni</p>
      <div className="mt-3 grid gap-3">
        {items.map((item) => {
          const checked = isCorrect(item, answers[item.id]);
          return (
            <article key={item.id} className="rounded-lg bg-white p-3 text-sm leading-6 shadow-sm dark:bg-white/[0.07]">
              <p className="flex items-start gap-2 font-black text-ink dark:text-white">
                {checked ? <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-moss dark:text-mint" /> : <XCircle className="mt-1 h-4 w-4 shrink-0 text-coral" />}
                <span>{checked ? 'Corretto' : 'Da correggere'} · {item.prompt}</span>
              </p>
              <p className="mt-2 text-ink/75 dark:text-white/75"><strong>Risposta corretta:</strong> {correctAnswer(item)}</p>
              <p className="mt-1 text-ink/70 dark:text-white/70"><strong>Perché:</strong> {item.feedback}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ChoiceSet({ exercise, answers, setAnswer, submitted }) {
  return (
    <div className="grid gap-4">
      {exercise.items.map((item, index) => {
        const checked = submitted ? isCorrect(item, answers[item.id]) : null;
        return (
          <fieldset key={item.id} className={'rounded-lg border p-4 ' + (submitted ? checked ? 'border-moss/30 bg-mint/40 dark:bg-mint/10' : 'border-coral/35 bg-blush/60 dark:bg-coral/10' : 'border-ink/10 bg-white dark:border-white/10 dark:bg-white/[0.04]')}>
            <legend className="px-2 text-xs font-black uppercase tracking-wide text-moss dark:text-mint">Domanda {index + 1}</legend>
            <p className="mt-2 text-sm font-black leading-6 text-ink dark:text-white">{item.prompt}</p>
            <div className="mt-3 grid gap-2">
              {item.options.map((option, optionIndex) => (
                <label key={option} className="flex cursor-pointer gap-3 rounded-lg border border-ink/10 bg-white/80 p-3 text-sm font-semibold text-ink hover:bg-mint/30 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/10">
                  <input
                    type="radio"
                    name={item.id}
                    value={optionIndex}
                    checked={String(answers[item.id]) === String(optionIndex)}
                    onChange={(event) => setAnswer(item.id, event.target.value)}
                    required
                    disabled={submitted}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

function BlankSet({ exercise, answers, setAnswer, submitted }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {exercise.items.map((item) => (
        <label key={item.id} className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <span className="block text-sm font-black text-ink dark:text-white">{item.prompt}</span>
          <input
            className="focus-ring mt-3 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink dark:border-white/10 dark:bg-[#101816] dark:text-white"
            value={answers[item.id] || ''}
            onChange={(event) => setAnswer(item.id, event.target.value)}
            required
            disabled={submitted}
            placeholder="Scrivi la risposta"
          />
        </label>
      ))}
    </div>
  );
}

function DialogueExercise({ exercise, answers, setAnswer, submitted }) {
  const itemsById = useMemo(() => Object.fromEntries(exercise.items.map((item) => [item.id, item])), [exercise.items]);

  return (
    <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className="grid gap-3">
        {exercise.lines.map((line, lineIndex) => (
          <p key={`${line.speaker}-${lineIndex}`} className="text-base leading-8 text-ink dark:text-white">
            <span className="mr-2 font-black text-moss dark:text-mint">{line.speaker}:</span>
            {line.parts.map((part, partIndex) => {
              if (typeof part === 'string') return <React.Fragment key={partIndex}>{part}</React.Fragment>;

              const item = itemsById[part.blankId];
              return (
                <input
                  key={part.blankId}
                  className="focus-ring mx-1 inline-block w-28 rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-center text-sm font-black text-ink dark:border-white/10 dark:bg-[#101816] dark:text-white"
                  aria-label={item.prompt}
                  value={answers[item.id] || ''}
                  onChange={(event) => setAnswer(item.id, event.target.value)}
                  required
                  disabled={submitted}
                  placeholder="..."
                />
              );
            })}
          </p>
        ))}
      </div>
    </div>
  );
}

function ExerciseCard({ exercise, answers, setAnswer, submitted }) {
  const score = submitted ? getScore(getExerciseItems(exercise), answers) : null;

  return (
    <article id={exercise.id} className="scroll-mt-28 rounded-2xl border border-ink/10 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-ink dark:text-white">{exercise.title}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/70 dark:text-white/70">{exercise.instruction}</p>
        </div>
        {score ? (
          <span className="rounded-full bg-ink px-3 py-1 text-sm font-black text-white dark:bg-mint dark:text-ink">
            {score.correct}/{score.total}
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        {exercise.type === 'choiceSet' ? <ChoiceSet exercise={exercise} answers={answers} setAnswer={setAnswer} submitted={submitted} /> : null}
        {exercise.type === 'blankSet' ? <BlankSet exercise={exercise} answers={answers} setAnswer={setAnswer} submitted={submitted} /> : null}
        {exercise.type === 'dialogue' ? <DialogueExercise exercise={exercise} answers={answers} setAnswer={setAnswer} submitted={submitted} /> : null}
      </div>

      {submitted ? <CorrectionList items={getExerciseItems(exercise)} answers={answers} /> : null}
    </article>
  );
}

function TopicNotFound() {
  return (
    <section className="section-shell py-12">
      <Link to="/grammar/a1" className="focus-ring inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-ink shadow-sm dark:bg-white/10 dark:text-white">
        <ArrowLeft className="h-4 w-4" />Torna ad A1 Grammar
      </Link>
      <div className="mt-8 rounded-[2rem] border border-ink/10 bg-white/80 p-7 shadow-soft dark:border-white/10 dark:bg-white/[0.05]">
        <h1 className="text-3xl font-black text-ink dark:text-white">Argomento non trovato.</h1>
        <p className="mt-3 text-ink/70 dark:text-white/70">Scegli uno degli argomenti A1 disponibili.</p>
      </div>
    </section>
  );
}

export default function GrammarA1Test() {
  const { topicId } = useParams();
  const checkpoint = grammarA1Checkpoints.find((item) => item.id === topicId);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  if (!checkpoint) return <TopicNotFound />;

  const checkpointItems = getCheckpointItems(checkpoint);
  const score = submitted ? getScore(checkpointItems, answers) : null;
  const status = score ? getStatus(score.percent) : null;

  const setAnswer = (id, value) => {
    setAnswers((current) => ({ ...current, [id]: value }));
  };

  const submitTopic = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  const resetTopic = () => {
    setAnswers({});
    setSubmitted(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <SEO title={`${checkpoint.title} | A1 Grammar`} description={`${checkpoint.title}: checkpoint A1 con esercizi, dialoghi e correzioni in italiano.`} />
      <section className="section-shell py-12">
        <Link to="/grammar/a1" className="focus-ring inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-ink shadow-sm dark:bg-white/10 dark:text-white">
          <ArrowLeft className="h-4 w-4" />Torna agli argomenti A1
        </Link>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="eyebrow"><Target aria-hidden="true" className="h-4 w-4" />{checkpoint.eyebrow}</span>
            <h1 className="mt-5 max-w-5xl text-4xl font-black leading-tight sm:text-5xl dark:text-white">{checkpoint.title}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-ink/70 dark:text-white/70">{checkpoint.description}</p>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
            <p className="text-sm font-black uppercase tracking-wide text-ink/65 dark:text-white/65">Cosa controlla</p>
            <ul className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-ink/75 dark:text-white/75">
              {checkpoint.checks.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-ink/10 bg-linen/80 p-5 dark:border-white/10 dark:bg-white/[0.05]">
          <p className="text-sm font-black uppercase tracking-wide text-moss dark:text-mint">Test disponibili</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {checkpoint.exercises.map((exercise) => (
              <a key={exercise.id} href={`#${exercise.id}`} className="focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-ink shadow-sm transition hover:-translate-y-0.5 dark:bg-white/10 dark:text-white">
                {exercise.title}
              </a>
            ))}
          </div>
        </div>

        <form onSubmit={submitTopic} className="mt-8 grid gap-5">
          {checkpoint.exercises.map((exercise) => (
            <ExerciseCard key={exercise.id} exercise={exercise} answers={answers} setAnswer={setAnswer} submitted={submitted} />
          ))}

          {score ? (
            <div className="rounded-2xl bg-ink p-5 text-white dark:bg-mint dark:text-ink">
              <p className="text-sm font-black uppercase tracking-wider opacity-75">Risultato argomento</p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-3xl font-black">{score.correct}/{score.total} · {status}</h2>
                <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-black dark:bg-ink/10">{score.percent}%</span>
              </div>
              {score.percent < 85 ? <p className="mt-3 text-sm font-semibold opacity-80">{checkpoint.recommendation}</p> : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {!submitted ? (
              <button className="focus-ring rounded-full bg-moss px-6 py-4 font-black text-white shadow-lift" type="submit">Controlla questo argomento</button>
            ) : (
              <button type="button" onClick={resetTopic} className="focus-ring inline-flex items-center gap-2 rounded-full bg-butter px-5 py-3 font-black text-ink">
                <RotateCcw className="h-4 w-4" />Rifai argomento
              </button>
            )}
          </div>
        </form>
      </section>
    </>
  );
}
