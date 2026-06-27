import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, RotateCcw, Target, XCircle } from 'lucide-react';
import SEO from '../components/SEO';
import { grammarA1Questions, grammarTopicRecommendations, grammarTopicRules } from '../data/grammarA1Test';

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');

function correctAnswer(question) {
  return question.type === 'choice' ? question.options[question.correct] : question.answer;
}

function isCorrect(question, value) {
  if (question.type === 'choice') return Number(value) === question.correct;
  return question.accepted.map(normalize).includes(normalize(value));
}

export default function GrammarA1Test() {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const resultsRef = useRef(null);

  const results = useMemo(() => {
    if (!submitted) return null;
    const checked = grammarA1Questions.map((question) => ({ question, correct: isCorrect(question, answers[question.id]) }));
    const topics = Object.fromEntries(Object.keys(grammarTopicRules).map((topic) => {
      const items = checked.filter((item) => item.question.topic === topic);
      const correct = items.filter((item) => item.correct).length;
      const percent = Math.round((correct / items.length) * 100);
      return [topic, { correct, total: items.length, percent, status: percent >= 80 ? 'Solido' : percent >= 60 ? 'In sviluppo' : 'Da ripassare' }];
    }));
    return { checked, topics, score: checked.filter((item) => item.correct).length };
  }, [answers, submitted]);

  const submit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    window.localStorage.setItem('sblocco_grammar_a1_last_result', JSON.stringify({ answers, completedAt: new Date().toISOString() }));
    window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <SEO title="A1 Grammar Diagnostic | Sblocco Inglese" description="Test A1 di 60 domande con spiegazioni e feedback per argomento." />
      <section className="section-shell py-12">
        <span className="eyebrow"><Target aria-hidden="true" className="h-4 w-4" />A1 diagnostic</span>
        <h1 className="mt-5 text-4xl font-black sm:text-5xl">A1 English Grammar Test</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-ink/70">60 punti: Present Simple, verb be, Past Simple, articles e plurals. Completa tutte le domande per ricevere spiegazioni e una diagnosi per argomento.</p>

        <form onSubmit={submit} className="mt-10 grid gap-5">
          {grammarA1Questions.map((question) => {
            const checked = submitted ? isCorrect(question, answers[question.id]) : null;
            return (
              <fieldset key={question.id} className={'rounded-lg border bg-white p-5 shadow-sm ' + (submitted ? checked ? 'border-moss/30' : 'border-coral/35' : 'border-ink/10')}>
                <legend className="px-2 text-sm font-black text-moss">Question {question.id} · {question.topic}</legend>
                <p className="mt-2 text-base font-black leading-6">{question.prompt}</p>
                {question.type === 'choice' ? (
                  <div className="mt-4 grid gap-2">
                    {question.options.map((option, index) => (
                      <label key={option} className="flex cursor-pointer gap-3 rounded-lg border border-ink/10 p-3 text-sm font-semibold hover:bg-mint/30">
                        <input type="radio" name={'question-' + question.id} value={index} checked={String(answers[question.id]) === String(index)} onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })} required disabled={submitted} />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <input className="focus-ring mt-4 w-full max-w-md rounded-lg border border-ink/15 px-4 py-3" value={answers[question.id] || ''} onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })} required disabled={submitted} placeholder="Write your answer" />
                )}
                {submitted ? (
                  <div className={'mt-4 rounded-lg p-4 text-sm leading-6 ' + (checked ? 'bg-mint' : 'bg-blush')}>
                    <p className="flex items-center gap-2 font-black">{checked ? <CheckCircle2 className="h-4 w-4 text-moss" /> : <XCircle className="h-4 w-4 text-coral" />}{checked ? 'Correct' : 'Review this answer'}</p>
                    <p className="mt-2"><strong>Correct answer:</strong> {correctAnswer(question)}</p>
                    <p className="mt-1"><strong>Why:</strong> {question.why || grammarTopicRules[question.topic]}</p>
                  </div>
                ) : null}
              </fieldset>
            );
          })}

          {!submitted ? <button className="focus-ring rounded-full bg-moss px-6 py-4 font-black text-white" type="submit">Finish test and show feedback</button> : null}
        </form>

        {results ? (
          <section ref={resultsRef} className="scroll-mt-24 mt-12 rounded-lg bg-ink p-6 text-white sm:p-8">
            <p className="text-sm font-black uppercase tracking-wider text-mint">Your result</p>
            <h2 className="mt-3 text-4xl font-black">{results.score} / 60</h2>
            <div className="mt-7 grid gap-3 md:grid-cols-2">
              {Object.entries(results.topics).map(([topic, result]) => (
                <article key={topic} className="rounded-lg border border-white/10 bg-white/[0.07] p-4">
                  <div className="flex justify-between gap-3"><h3 className="font-black">{topic}</h3><span className="font-black text-mint">{result.percent}%</span></div>
                  <p className="mt-2 text-sm font-bold">{result.status} · {result.correct}/{result.total}</p>
                  {result.percent < 80 ? <p className="mt-2 text-sm text-white/70">{grammarTopicRecommendations[topic]}</p> : null}
                </article>
              ))}
            </div>
            <button type="button" onClick={reset} className="focus-ring mt-7 inline-flex items-center gap-2 rounded-full bg-butter px-5 py-3 font-black text-ink"><RotateCcw className="h-4 w-4" />Try again</button>
          </section>
        ) : null}
      </section>
    </>
  );
}
