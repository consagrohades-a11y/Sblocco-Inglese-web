import React, { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import SEO from '../components/SEO';
import { grammarA1Checkpoints } from '../data/grammarA1Test';

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
const getItems = (checkpoint) => checkpoint.exercises.flatMap((exercise) => exercise.items);
const isCorrect = (item, value) => item.type === 'choice' ? Number(value) === item.correct : item.accepted.map(normalize).includes(normalize(value));
const answerLabel = (item) => item.type === 'choice' ? item.options[item.correct] : item.answer;

function Feedback({ item, answers }) {
  const checked = isCorrect(item, answers[item.id]);
  return (
    <div className="mt-4 rounded-lg bg-white/80 p-3 text-sm leading-6 dark:bg-white/[0.06]">
      <p className="flex items-center gap-2 font-black text-ink dark:text-white">{checked ? <CheckCircle2 className="h-4 w-4 text-moss dark:text-mint" /> : <XCircle className="h-4 w-4 text-coral" />}{checked ? 'Corretto' : 'Da correggere'} · {item.prompt}</p>
      <p className="mt-2 text-ink/75 dark:text-white/75"><strong>Risposta corretta:</strong> {answerLabel(item)}</p>
      <p className="mt-1 text-ink/70 dark:text-white/70"><strong>Perché:</strong> {item.feedback}</p>
    </div>
  );
}

function Question({ item, answers, setAnswer, submitted }) {
  const checked = submitted ? isCorrect(item, answers[item.id]) : null;

  return (
    <fieldset className={'rounded-lg border p-4 ' + (submitted ? checked ? 'border-moss/30 bg-mint/40 dark:bg-mint/10' : 'border-coral/35 bg-blush/60 dark:bg-coral/10' : 'border-ink/10 bg-white dark:border-white/10 dark:bg-white/[0.04]')}>
      <legend className="px-2 text-xs font-black uppercase tracking-wide text-moss dark:text-mint">Domanda</legend>
      <p className="mt-2 text-sm font-black leading-6 text-ink dark:text-white">{item.prompt}</p>

      {item.type === 'choice' ? (
        <div className="mt-3 grid gap-2">
          {item.options.map((option, index) => (
            <label key={option} className="flex cursor-pointer gap-3 rounded-lg border border-ink/10 bg-white/80 p-3 text-sm font-semibold text-ink hover:bg-mint/30 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/10">
              <input type="radio" name={item.id} value={index} checked={String(answers[item.id]) === String(index)} onChange={(event) => setAnswer(item.id, event.target.value)} required disabled={submitted} />
              <span>{option}</span>
            </label>
          ))}
        </div>
      ) : (
        <input className="focus-ring mt-3 w-full max-w-md rounded-lg border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink dark:border-white/10 dark:bg-[#101816] dark:text-white" value={answers[item.id] || ''} onChange={(event) => setAnswer(item.id, event.target.value)} required disabled={submitted} placeholder="Scrivi la risposta" />
      )}

      {submitted ? <Feedback item={item} answers={answers} /> : null}
    </fieldset>
  );
}

function Dialogue({ exercise, answers, setAnswer, submitted }) {
  const itemsById = useMemo(() => Object.fromEntries(exercise.items.map((item) => [item.id, item])), [exercise.items]);

  return (
    <>
      <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="grid gap-3">
          {exercise.lines.map((line, lineIndex) => (
            <p key={`${line.speaker}-${lineIndex}`} className="text-base leading-8 text-ink dark:text-white">
              <span className="mr-2 font-black text-moss dark:text-mint">{line.speaker}:</span>
              {line.parts.map((part, partIndex) => {
                if (typeof part === 'string') return <React.Fragment key={partIndex}>{part}</React.Fragment>;
                const item = itemsById[part.blankId];
                return <input key={item.id} className="focus-ring mx-1 inline-block w-28 rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-center text-sm font-black text-ink dark:border-white/10 dark:bg-[#101816] dark:text-white" aria-label={item.prompt} value={answers[item.id] || ''} onChange={(event) => setAnswer(item.id, event.target.value)} required disabled={submitted} placeholder="..." />;
              })}
            </p>
          ))}
        </div>
      </div>
      {submitted ? <div className="grid gap-3">{exercise.items.map((item) => <Feedback key={item.id} item={item} answers={answers} />)}</div> : null}
    </>
  );
}

export default function GrammarA1Topic() {
  const { topicId } = useParams();
  const checkpoint = grammarA1Checkpoints.find((item) => item.id === topicId);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  if (!checkpoint) return <Navigate to="/grammar/a1" replace />;

  const allItems = getItems(checkpoint);
  const correct = submitted ? allItems.filter((item) => isCorrect(item, answers[item.id])).length : 0;
  const percent = submitted ? Math.round((correct / allItems.length) * 100) : 0;
  const status = percent >= 85 ? 'Solido' : percent >= 65 ? 'In sviluppo' : 'Da ripassare';
  const setAnswer = (id, value) => setAnswers((current) => ({ ...current, [id]: value }));

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <>
      <SEO title={`${checkpoint.title} | A1 Grammar`} description={`${checkpoint.title}: test A1 con correzioni in italiano.`} />
      <section className="section-shell py-12">
        <Link to="/grammar/a1" className="focus-ring inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-ink shadow-sm dark:bg-white/10 dark:text-white"><ArrowLeft className="h-4 w-4" />Torna agli A1 topics</Link>

        <span className="eyebrow mt-8">{checkpoint.eyebrow}</span>
        <h1 className="mt-5 max-w-5xl text-4xl font-black leading-tight sm:text-5xl dark:text-white">{checkpoint.title}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-ink/70 dark:text-white/70">{checkpoint.description}</p>

        <div className="mt-8 grid gap-3 rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.05] md:grid-cols-3">
          {checkpoint.exercises.map((exercise) => <a key={exercise.id} href={`#${exercise.id}`} className="focus-ring rounded-xl bg-mint/60 p-4 text-sm font-black text-ink transition hover:-translate-y-0.5 dark:bg-mint/10 dark:text-white">{exercise.title}</a>)}
        </div>

        <form onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }} className="mt-8 grid gap-5">
          {checkpoint.exercises.map((exercise) => (
            <article key={exercise.id} id={exercise.id} className="scroll-mt-28 rounded-2xl border border-ink/10 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
              <h2 className="text-xl font-black text-ink dark:text-white">{exercise.title}</h2>
              <p className="mt-2 text-sm leading-6 text-ink/70 dark:text-white/70">{exercise.instruction}</p>
              <div className="mt-5 grid gap-4">
                {exercise.type === 'dialogue' ? <Dialogue exercise={exercise} answers={answers} setAnswer={setAnswer} submitted={submitted} /> : exercise.items.map((item) => <Question key={item.id} item={item} answers={answers} setAnswer={setAnswer} submitted={submitted} />)}
              </div>
            </article>
          ))}

          {submitted ? (
            <div className="rounded-2xl bg-ink p-5 text-white dark:bg-mint dark:text-ink">
              <p className="text-sm font-black uppercase tracking-wider opacity-75">Risultato topic</p>
              <h3 className="mt-2 text-3xl font-black">{correct}/{allItems.length} · {status}</h3>
              <p className="mt-3 text-sm font-semibold opacity-80">{percent < 85 ? checkpoint.recommendation : 'Ottimo: puoi passare al topic successivo o rifare il test più avanti.'}</p>
            </div>
          ) : null}

          {!submitted ? <button className="focus-ring rounded-full bg-moss px-6 py-4 font-black text-white shadow-lift" type="submit">Controlla questo topic</button> : <button type="button" onClick={reset} className="focus-ring rounded-full bg-butter px-5 py-3 font-black text-ink">Rifai topic</button>}
        </form>
      </section>
    </>
  );
}
