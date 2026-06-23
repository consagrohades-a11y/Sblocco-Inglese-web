import React from 'react';
import { useEffect, useState } from 'react';
import { AlertCircle, BookOpen, CheckCircle2, Eye, RotateCcw, Zap } from 'lucide-react';
import { formatDueLabel, reviewRatings } from '../utils/srsAlgorithm';

const ratingStyles = {
  again: 'border-coral/30 bg-blush text-ink hover:border-coral/50 hover:bg-coral/10',
  hard: 'border-clay/30 bg-white text-ink hover:border-clay/50 hover:bg-linen',
  good: 'border-moss/30 bg-mint/60 text-ink hover:border-moss/50 hover:bg-mint',
  easy: 'border-sea/30 bg-white text-ink hover:border-sea/50 hover:bg-sea/10',
};

const ratingIcons = {
  again: RotateCcw,
  hard: AlertCircle,
  good: CheckCircle2,
  easy: Zap,
};

function MarkdownText({ text, className = '' }) {
  const parts = text.split(/(\*\*.+?\*\*)/g);

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

export default function SrsCard({ card, progress, onRate }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
  }, [card.id]);

  const dueLabel = progress?.dueAt ? formatDueLabel(progress.dueAt) : 'nuova';

  return (
    <article className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-mint px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-moss">
          {card.category}
        </span>
        <span className="rounded-full border border-ink/10 bg-paper px-3 py-1 text-xs font-black text-ink/70">
          {card.level}
        </span>
        <span className="rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-black text-ink/60">
          {card.type}
        </span>
        <span className="ml-auto rounded-full bg-ink px-3 py-1 text-xs font-black text-white">
          {dueLabel}
        </span>
      </div>

      <div className="mt-8 min-h-[11rem]">
        <p className="text-sm font-black uppercase tracking-[0.08em] text-ink/50">Front side</p>
        <h2 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-4xl">
          {card.expression}
        </h2>
        <p className="mt-4 rounded-lg bg-paper p-4 text-sm font-semibold leading-6 text-ink/70">
          {card.pronunciation}
        </p>

        {!revealed ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="focus-ring mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-moss px-5 py-3 text-sm font-extrabold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-[#096d58]"
          >
            <Eye aria-hidden="true" className="h-4 w-4" />
            Mostra risposta
          </button>
        ) : null}
      </div>

      {revealed ? (
        <div className="mt-6 border-t border-ink/10 pt-6">
          <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
            <div className="rounded-lg bg-mint/60 p-4">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-moss">Italiano</p>
              <p className="mt-2 text-lg font-black leading-7 text-ink">{card.italian}</p>
            </div>

            <div className="grid gap-3">
              <MarkdownText
                text={card.example1}
                className="rounded-lg border border-ink/10 bg-white p-4 text-sm font-semibold leading-6 text-ink/75"
              />
              <MarkdownText
                text={card.example2}
                className="rounded-lg border border-ink/10 bg-white p-4 text-sm font-semibold leading-6 text-ink/75"
              />
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-lg bg-paper p-4">
            <BookOpen aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-moss" />
            <p className="text-sm font-semibold leading-6 text-ink/70">{card.note}</p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {reviewRatings.map((rating) => {
              const Icon = ratingIcons[rating.value];

              return (
                <button
                  key={rating.value}
                  type="button"
                  onClick={() => onRate(rating.value)}
                  className={`focus-ring rounded-lg border px-4 py-3 text-left transition hover:-translate-y-0.5 ${ratingStyles[rating.value]}`}
                >
                  <span className="flex items-center gap-2 text-base font-black">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                    {rating.label}
                  </span>
                  <span className="mt-1 block text-xs font-bold text-ink/55">{rating.helper}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </article>
  );
}
