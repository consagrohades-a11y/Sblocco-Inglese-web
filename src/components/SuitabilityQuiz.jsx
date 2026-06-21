import React from 'react';
import { useMemo, useState } from 'react';
import { CheckCircle2, HelpCircle, RotateCcw } from 'lucide-react';
import CTAButton from './CTAButton';

const questions = [
  {
    question: 'Quando devi parlare inglese in una situazione reale, cosa succede di solito?',
    options: ['Parto, ma mi correggo troppo', 'Capisco, ma rispondo lentamente', 'Mi blocco quasi subito'],
  },
  {
    question: 'Cosa vorresti capire con una simulazione?',
    options: ['Quali errori ripeto', 'Quali frasi usare meglio', 'Se il mio livello regge una call'],
  },
  {
    question: 'Hai già una situazione concreta da preparare?',
    options: ['Sì: colloquio o call', 'Sì: lavoro, studio o trasferimento', 'Non ancora, voglio orientarmi'],
  },
];

function getResult(answers) {
  if (answers[0] === 'Mi blocco quasi subito' && answers[2] === 'Non ancora, voglio orientarmi') {
    return {
      label: 'Da chiarire',
      tone: 'bg-butter text-ink',
      text:
        'Il quiz completo ti aiuta a capire se la simulazione da 30 minuti è il passo giusto oppure se conviene partire da basi più semplici.',
    };
  }

  if (answers[2] === 'Non ancora, voglio orientarmi') {
    return {
      label: 'Orientamento utile',
      tone: 'bg-blush text-ink',
      text:
        'Può avere senso fare il quiz completo prima di prenotare: ti dirà se procedere con slot e pagamento oppure fermarti.',
    };
  }

  return {
    label: 'Buon segnale',
    tone: 'bg-mint text-moss',
    text:
      'Hai già un contesto abbastanza concreto. Il passo successivo è il quiz completo, che invia le risposte e ti mostra subito un esito.',
  };
}

export default function SuitabilityQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const completed = Object.keys(answers).length === questions.length;
  const result = useMemo(() => (completed ? getResult(answers) : null), [answers, completed]);

  const choose = (option) => {
    setAnswers((current) => ({ ...current, [step]: option }));
    if (step < questions.length - 1) {
      setStep((value) => value + 1);
    }
  };

  const reset = () => {
    setAnswers({});
    setStep(0);
  };

  return (
    <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="eyebrow">
            <HelpCircle aria-hidden="true" className="h-3.5 w-3.5" />
            Mini-check
          </span>
          <h3 className="mt-4 text-2xl font-black text-ink">Non sei sicuro/a?</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
            Rispondi a tre domande veloci per orientarti. Questo mini-check non invia dati e non sostituisce il quiz
            completo di idoneità.
          </p>
          <div className="mt-4">
            <CTAButton>Compila il quiz completo</CTAButton>
          </div>
        </div>
        <div className="rounded-full bg-linen px-3 py-1 text-xs font-black text-ink">
          {completed ? 'Risultato' : `${step + 1}/${questions.length}`}
        </div>
      </div>

      <div className="mt-6 h-2 rounded-full bg-linen">
        <div
          className="h-2 rounded-full bg-moss transition-all"
          style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
        />
      </div>

      {completed ? (
        <div className="mt-6 rounded-lg border border-ink/10 bg-paper p-5">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.08em] ${result.tone}`}>
            {result.label}
          </span>
          <p className="mt-4 text-lg font-extrabold leading-7 text-ink">{result.text}</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <CTAButton>Vai al quiz completo</CTAButton>
            <button
              type="button"
              onClick={reset}
              className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-ink/10 px-5 py-3 text-sm font-extrabold text-ink transition hover:bg-white"
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Rifai il mini-check
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <p className="text-xl font-black text-ink">{questions[step].question}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {questions[step].options.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => choose(option)}
                className="focus-ring group flex min-h-14 items-center justify-between gap-3 rounded-lg border border-ink/10 bg-paper px-4 py-3 text-left font-bold text-ink transition hover:-translate-y-0.5 hover:border-moss/30 hover:bg-mint/50"
              >
                <span>{option}</span>
                <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-moss opacity-0 transition group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
