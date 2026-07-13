import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, CheckCircle2, Eye, RotateCcw, Send, Zap } from 'lucide-react';
import { formatDueLabel, reviewRatings } from '../utils/srsAlgorithm';

const ratingStyles = {
  again: 'border-coral/35 bg-blush text-ink hover:border-coral/60 hover:bg-coral/10',
  hard: 'border-clay/30 bg-white text-ink hover:border-clay/55 hover:bg-linen',
  good: 'border-moss/30 bg-mint/60 text-ink hover:border-moss/55 hover:bg-mint',
  easy: 'border-sea/30 bg-white text-ink hover:border-sea/55 hover:bg-sea/10',
};

const darkRatingStyles = {
  again: 'border-coral/35 bg-coral/15 text-white hover:border-coral/70 hover:bg-coral/25',
  hard: 'border-clay/35 bg-white/[0.08] text-white hover:border-clay/60 hover:bg-white/[0.14]',
  good: 'border-mint/35 bg-mint/15 text-white hover:border-mint/70 hover:bg-mint/25',
  easy: 'border-sea/45 bg-sea/25 text-white hover:border-sea/70 hover:bg-sea/35',
};

const ratingIcons = {
  again: RotateCcw,
  hard: AlertCircle,
  good: CheckCircle2,
  easy: Zap,
};

function MarkdownText({ text, className = '', dark = false }) {
  const parts = String(text || '').split(/(\*\*.+?\*\*)/g);

  return (
    <p className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={`${part}-${index}`} className={`font-black ${dark ? 'text-mint' : 'text-moss'}`}>
              {part.slice(2, -2)}
            </strong>
          );
        }

        return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
      })}
    </p>
  );
}

function normalizeAnswer(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(first, second) {
  const rows = second.length + 1;
  const columns = first.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(columns).fill(0));

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
  for (let column = 0; column < columns; column += 1) matrix[0][column] = column;

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const cost = second[row - 1] === first[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
    }
  }

  return matrix[rows - 1][columns - 1];
}

function evaluateAnswer(answer, target) {
  const normalizedAnswer = normalizeAnswer(answer);
  const normalizedTarget = normalizeAnswer(target);

  if (!normalizedAnswer) {
    return {
      status: 'empty',
      label: 'Scrivi una risposta',
      message: 'Prova a produrre l’espressione in inglese prima di vedere la soluzione.',
    };
  }

  if (normalizedAnswer === normalizedTarget) {
    return {
      status: 'correct',
      label: 'Corretto',
      message: 'La risposta corrisponde all’espressione prevista.',
    };
  }

  const compactAnswer = normalizedAnswer.replace(/\s/g, '');
  const compactTarget = normalizedTarget.replace(/\s/g, '');
  const distance = levenshteinDistance(compactAnswer, compactTarget);
  const allowedDistance = compactTarget.length <= 8 ? 1 : compactTarget.length <= 18 ? 2 : 3;

  if (distance <= allowedDistance) {
    return {
      status: 'nearly',
      label: 'Quasi corretto',
      message: 'La struttura è molto vicina. Controlla spelling, apostrofi o una piccola parola mancante.',
    };
  }

  return {
    status: 'incorrect',
    label: 'Da rivedere',
    message: 'Confronta la tua risposta con la soluzione e prova a ripeterla ad alta voce.',
  };
}

const feedbackStyles = {
  correct: 'border-moss/30 bg-mint/70 text-ink',
  nearly: 'border-clay/30 bg-butter/70 text-ink',
  incorrect: 'border-coral/30 bg-blush text-ink',
  empty: 'border-ink/10 bg-paper text-ink',
};

const darkFeedbackStyles = {
  correct: 'border-mint/35 bg-mint/15 text-white',
  nearly: 'border-clay/40 bg-clay/15 text-white',
  incorrect: 'border-coral/40 bg-coral/15 text-white',
  empty: 'border-white/10 bg-white/[0.06] text-white',
};

export default function SrsCard({
  card,
  progress,
  revealed,
  onReveal,
  onRate,
  sessionLabel,
  targetLabel,
  dark = false,
}) {
  const targetText = card?.expression || card?.word || 'Contenuto mancante';
  const displayTargetLabel = targetLabel || (card?.word ? 'Parola' : 'Espressione');
  const safeCard = {
    id: card?.id || 'missing-card-id',
    category: card?.category || 'Categoria mancante',
    level: card?.level || 'Livello mancante',
    type: card?.type || 'Tipo mancante',
    expression: targetText,
    partOfSpeech: card?.partOfSpeech || '',
    pronunciation: card?.pronunciation || '',
    italian: card?.italian || 'Traduzione mancante',
    collocations: card?.collocations || '',
    example1: card?.example1 || 'Esempio non disponibile.',
    example2: card?.example2 || 'Esempio non disponibile.',
    note: card?.note || 'Nota non disponibile.',
  };
  const dueLabel = progress?.dueDate ? formatDueLabel(progress.dueDate) : 'nuova';
  const activeRatingStyles = dark ? darkRatingStyles : ratingStyles;
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setAnswer('');
    setFeedback(null);
  }, [safeCard.id]);

  const answerEvaluation = useMemo(
    () => (feedback ? evaluateAnswer(answer, safeCard.expression) : null),
    [answer, feedback, safeCard.expression],
  );

  function submitAnswer(event) {
    event.preventDefault();
    const result = evaluateAnswer(answer, safeCard.expression);
    setFeedback(result.status);
    if (result.status !== 'empty') onReveal();
  }

  function revealWithoutAnswer() {
    setFeedback('empty');
    onReveal();
  }

  return (
    <article
      className={`mx-auto w-full min-w-0 max-w-none overflow-hidden rounded-lg border shadow-soft ${
        dark ? 'border-white/10 bg-[#111f1b] text-white' : 'border-ink/10 bg-white text-ink'
      }`}
    >
      <div className={`border-b px-3 py-2.5 sm:px-5 ${dark ? 'border-white/10 bg-white/[0.05]' : 'border-ink/10 bg-white'}`}>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="max-w-full break-words rounded-full bg-mint px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.08em] text-moss sm:text-xs">
            {safeCard.category}
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-[0.65rem] font-black sm:text-xs ${dark ? 'border-white/10 bg-white/[0.08] text-white/70' : 'border-ink/10 bg-paper text-ink/70'}`}>
            {safeCard.level}
          </span>
          {safeCard.partOfSpeech ? (
            <span className={`rounded-full border px-2.5 py-1 text-[0.65rem] font-black sm:text-xs ${dark ? 'border-white/10 bg-white/[0.08] text-white/60' : 'border-ink/10 bg-white text-ink/55'}`}>
              {safeCard.partOfSpeech}
            </span>
          ) : null}
          <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-black sm:ml-auto sm:text-xs ${dark ? 'bg-white text-ink' : 'bg-ink text-white'}`}>
            {dueLabel}
          </span>
        </div>
        <div className={`mt-2 flex flex-wrap items-center justify-between gap-2 text-[0.65rem] font-black uppercase tracking-[0.08em] sm:text-xs ${dark ? 'text-white/40' : 'text-ink/40'}`}>
          <span>{sessionLabel}</span>
          <span className="hidden sm:inline">Scorciatoie: spazio, 1, 2, 3, 4</span>
        </div>
      </div>

      <div className="px-3 py-4 sm:px-5 sm:py-5">
        <div className="text-center">
          <p className={`text-[0.68rem] font-black uppercase tracking-[0.08em] ${dark ? 'text-white/50' : 'text-ink/50'}`}>Traduci in inglese</p>
          <h2 className={`mx-auto mt-2 max-w-4xl break-words text-2xl font-black leading-tight sm:text-3xl lg:text-4xl ${dark ? 'text-white' : 'text-ink'}`}>
            {safeCard.italian}
          </h2>
          <p className={`mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 ${dark ? 'text-white/60' : 'text-ink/60'}`}>
            Scrivi l’espressione completa. Maiuscole e punteggiatura non influenzano il controllo.
          </p>

          {!revealed ? (
            <form onSubmit={submitAnswer} className="mx-auto mt-5 max-w-2xl">
              <label htmlFor={`trainer-answer-${safeCard.id}`} className="sr-only">La tua risposta in inglese</label>
              <input
                id={`trainer-answer-${safeCard.id}`}
                value={answer}
                onChange={(event) => {
                  setAnswer(event.target.value);
                  if (feedback) setFeedback(null);
                }}
                autoComplete="off"
                autoCapitalize="sentences"
                spellCheck="false"
                placeholder="Scrivi qui la risposta in inglese"
                className={`focus-ring w-full rounded-lg border px-4 py-3 text-base font-bold outline-none ${
                  dark ? 'border-white/15 bg-white/[0.08] text-white placeholder:text-white/35' : 'border-ink/15 bg-white text-ink placeholder:text-ink/35'
                }`}
              />
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="submit"
                  className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-moss px-6 py-3 text-sm font-extrabold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-[#096d58]"
                >
                  <Send aria-hidden="true" className="h-4 w-4" />
                  Controlla risposta
                </button>
                <button
                  type="button"
                  onClick={revealWithoutAnswer}
                  className={`focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-extrabold transition ${
                    dark ? 'border-white/15 bg-white/[0.06] text-white hover:bg-white hover:text-ink' : 'border-ink/15 bg-white text-ink hover:bg-linen'
                  }`}
                >
                  <Eye aria-hidden="true" className="h-4 w-4" />
                  Mostra soluzione
                </button>
              </div>
            </form>
          ) : null}
        </div>

        {revealed ? (
          <div className={`mt-5 border-t pt-5 ${dark ? 'border-white/10' : 'border-ink/10'}`}>
            {answerEvaluation ? (
              <div className={`mx-auto mb-4 max-w-2xl rounded-lg border p-4 text-left ${dark ? darkFeedbackStyles[answerEvaluation.status] : feedbackStyles[answerEvaluation.status]}`}>
                <p className="text-sm font-black">{answerEvaluation.label}</p>
                <p className="mt-1 text-sm font-semibold leading-6 opacity-80">{answerEvaluation.message}</p>
                {answer ? <p className="mt-2 break-words text-sm font-bold">La tua risposta: {answer}</p> : null}
              </div>
            ) : null}

            <div className={`mx-auto max-w-2xl rounded-lg p-4 text-center ${dark ? 'bg-mint/15' : 'bg-mint/60'}`}>
              <p className={`text-[0.68rem] font-black uppercase tracking-[0.08em] ${dark ? 'text-mint' : 'text-moss'}`}>{displayTargetLabel}</p>
              <p className={`mt-1.5 break-words text-xl font-black leading-7 ${dark ? 'text-white' : 'text-ink'}`}>{safeCard.expression}</p>
              {safeCard.pronunciation ? <p className={`mt-2 text-sm font-semibold ${dark ? 'text-white/65' : 'text-ink/65'}`}>{safeCard.pronunciation}</p> : null}
            </div>

            <div className="mt-3 grid gap-3">
              <div className="grid gap-3 lg:grid-cols-2">
                <MarkdownText
                  text={safeCard.example1}
                  dark={dark}
                  className={`rounded-lg border p-3 text-sm font-semibold leading-5 ${dark ? 'border-white/10 bg-white/[0.06] text-white/75' : 'border-ink/10 bg-white text-ink/75'}`}
                />
                <MarkdownText
                  text={safeCard.example2}
                  dark={dark}
                  className={`rounded-lg border p-3 text-sm font-semibold leading-5 ${dark ? 'border-white/10 bg-white/[0.06] text-white/75' : 'border-ink/10 bg-white text-ink/75'}`}
                />
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {safeCard.collocations ? (
                  <div className={`rounded-lg border p-3 ${dark ? 'border-white/10 bg-white/[0.06]' : 'border-ink/10 bg-paper'}`}>
                    <p className={`text-[0.68rem] font-black uppercase tracking-[0.08em] ${dark ? 'text-white/50' : 'text-ink/50'}`}>Combinazioni utili</p>
                    <p className={`mt-1.5 break-words text-sm font-semibold leading-5 ${dark ? 'text-white/70' : 'text-ink/75'}`}>
                      {safeCard.collocations}
                    </p>
                  </div>
                ) : null}

                <div className={`flex items-start gap-3 rounded-lg p-3 ${dark ? 'bg-white/[0.06]' : 'bg-paper'}`}>
                  <BookOpen aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${dark ? 'text-mint' : 'text-moss'}`} />
                  <p className={`break-words text-sm font-semibold leading-5 ${dark ? 'text-white/70' : 'text-ink/70'}`}>{safeCard.note}</p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <p className={`mb-2 text-center text-xs font-black uppercase tracking-[0.08em] ${dark ? 'text-white/50' : 'text-ink/50'}`}>
                Quanto è stato facile ricordarla?
              </p>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {reviewRatings.map((rating, index) => {
                  const Icon = ratingIcons[rating.value];

                  return (
                    <button
                      key={rating.value}
                      type="button"
                      onClick={() => onRate(rating.value)}
                      className={`focus-ring min-h-12 rounded-lg border px-3 py-2.5 text-left transition hover:-translate-y-0.5 sm:min-h-14 ${activeRatingStyles[rating.value]}`}
                    >
                      <span className="flex items-center gap-2 text-sm font-black sm:text-base">
                        <Icon aria-hidden="true" className="h-4 w-4" />
                        {rating.label}
                        <span className={`ml-auto text-xs ${dark ? 'text-white/50' : 'text-ink/50'}`}>{index + 1}</span>
                      </span>
                      <span className={`mt-0.5 block text-xs font-bold ${dark ? 'text-white/60' : 'text-ink/55'}`}>{rating.helper}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
