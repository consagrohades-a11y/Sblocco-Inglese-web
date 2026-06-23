import React from 'react';
import { AlertCircle, BookOpen, CheckCircle2, Eye, RotateCcw, Zap } from 'lucide-react';
import { formatDueLabel, reviewRatings } from '../utils/srsAlgorithm';

const ratingStyles = {
  again: 'border-coral/35 bg-blush text-ink hover:border-coral/60 hover:bg-coral/10',
  hard: 'border-clay/30 bg-white text-ink hover:border-clay/55 hover:bg-linen',
  good: 'border-moss/30 bg-mint/60 text-ink hover:border-moss/55 hover:bg-mint',
  easy: 'border-sea/30 bg-white text-ink hover:border-sea/55 hover:bg-sea/10',
};

const ratingIcons = {
  again: RotateCcw,
  hard: AlertCircle,
  good: CheckCircle2,
  easy: Zap,
};

function MarkdownText({ text, className = '' }) {
  const parts = String(text || '').split(/(\*\*.+?\*\*)/g);

  return (
    <p className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={`${part}-${index}`} className="font-black text-moss">
              {part.slice(2, -2)}
            </strong>
          );
        }

        return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
      })}
    </p>
  );
}

export default function SrsCard({
  card,
  progress,
  revealed,
  onReveal,
  onRate,
  sessionLabel,
  targetLabel,
}) {
  const targetText = card?.expression || card?.word || 'Contenuto mancante';
  const displayTargetLabel = targetLabel || (card?.word ? 'Word' : 'Expression');
  const safeCard = {
    id: card?.id || 'missing-card-id',
    category: card?.category || 'Categoria mancante',
    level: card?.level || 'Livello mancante',
    type: card?.type || 'Tipo mancante',
    expression: targetText,
    partOfSpeech: card?.partOfSpeech || '',
    pronunciation: card?.pronunciation || 'Pronuncia mancante',
    italian: card?.italian || 'Traduzione mancante',
    collocations: card?.collocations || '',
    example1: card?.example1 || 'Example missing.',
    example2: card?.example2 || 'Example missing.',
    note: card?.note || 'Nota mancante.',
  };
  const dueLabel = progress?.dueDate ? formatDueLabel(progress.dueDate) : 'nuova';

  return (
    <article className="mx-auto w-full max-w-3xl overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft">
      <div className="border-b border-ink/10 bg-white px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="max-w-full break-words rounded-full bg-mint px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-moss">
            {safeCard.category}
          </span>
          <span className="rounded-full border border-ink/10 bg-paper px-3 py-1 text-xs font-black text-ink/70">
            {safeCard.level}
          </span>
          <span className="rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-black text-ink/55">
            {safeCard.type}
          </span>
          {safeCard.partOfSpeech ? (
            <span className="rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-black text-ink/55">
              {safeCard.partOfSpeech}
            </span>
          ) : null}
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-black text-white sm:ml-auto">
            {dueLabel}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs font-black uppercase tracking-[0.08em] text-ink/40">
          <span>{sessionLabel}</span>
          <span>Shortcuts: Space, 1, 2, 3, 4</span>
        </div>
      </div>

      <div className="px-5 py-7 sm:px-7 sm:py-8">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-ink/50">{displayTargetLabel}</p>
          <h2 className="mx-auto mt-3 max-w-2xl break-words text-3xl font-black leading-tight text-ink sm:text-4xl">
            {safeCard.expression}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl break-words rounded-lg bg-paper px-4 py-3 text-sm font-semibold leading-6 text-ink/70">
            {safeCard.pronunciation}
          </p>

          {!revealed ? (
            <button
              type="button"
              onClick={onReveal}
              className="focus-ring mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-moss px-6 py-3 text-sm font-extrabold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-[#096d58]"
            >
              <Eye aria-hidden="true" className="h-4 w-4" />
              Show answer
            </button>
          ) : null}
        </div>

        {revealed ? (
          <div className="mt-7 border-t border-ink/10 pt-6">
            <div className="rounded-lg bg-mint/60 p-4 text-center">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-moss">Italiano</p>
              <p className="mt-2 break-words text-lg font-black leading-7 text-ink">{safeCard.italian}</p>
            </div>

            {safeCard.collocations ? (
              <div className="mt-4 rounded-lg border border-ink/10 bg-paper p-4">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-ink/50">Collocations</p>
                <p className="mt-2 break-words text-sm font-semibold leading-6 text-ink/75">
                  {safeCard.collocations}
                </p>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3">
              <MarkdownText
                text={safeCard.example1}
                className="rounded-lg border border-ink/10 bg-white p-4 text-sm font-semibold leading-6 text-ink/75"
              />
              <MarkdownText
                text={safeCard.example2}
                className="rounded-lg border border-ink/10 bg-white p-4 text-sm font-semibold leading-6 text-ink/75"
              />
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-lg bg-paper p-4">
              <BookOpen aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-moss" />
              <p className="break-words text-sm font-semibold leading-6 text-ink/70">{safeCard.note}</p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {reviewRatings.map((rating, index) => {
                const Icon = ratingIcons[rating.value];

                return (
                  <button
                    key={rating.value}
                    type="button"
                    onClick={() => onRate(rating.value)}
                    className={`focus-ring min-h-16 rounded-lg border px-4 py-3 text-left transition hover:-translate-y-0.5 ${ratingStyles[rating.value]}`}
                  >
                    <span className="flex items-center gap-2 text-base font-black">
                      <Icon aria-hidden="true" className="h-4 w-4" />
                      {rating.label}
                      <span className="ml-auto text-xs text-ink/50">{index + 1}</span>
                    </span>
                    <span className="mt-1 block text-xs font-bold text-ink/55">{rating.helper}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
