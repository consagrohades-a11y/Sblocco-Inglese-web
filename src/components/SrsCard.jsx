import React from 'react';
import { AlertCircle, BookOpen, CheckCircle2, Eye, RotateCcw, Zap } from 'lucide-react';
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
  const activeRatingStyles = dark ? darkRatingStyles : ratingStyles;

  return (
    <article
      className={`mx-auto w-full min-w-0 max-w-none overflow-hidden rounded-lg border shadow-soft ${
        dark ? 'border-white/10 bg-[#111f1b] text-white' : 'border-ink/10 bg-white text-ink'
      }`}
    >
      <div className={`border-b px-4 py-3 sm:px-6 sm:py-4 ${dark ? 'border-white/10 bg-white/[0.05]' : 'border-ink/10 bg-white'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="max-w-full break-words rounded-full bg-mint px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.08em] text-moss sm:text-xs">
            {safeCard.category}
          </span>
          <span className={`rounded-full border px-3 py-1 text-[0.68rem] font-black sm:text-xs ${dark ? 'border-white/10 bg-white/[0.08] text-white/70' : 'border-ink/10 bg-paper text-ink/70'}`}>
            {safeCard.level}
          </span>
          <span className={`rounded-full border px-3 py-1 text-[0.68rem] font-black sm:text-xs ${dark ? 'border-white/10 bg-white/[0.08] text-white/60' : 'border-ink/10 bg-white text-ink/55'}`}>
            {safeCard.type}
          </span>
          {safeCard.partOfSpeech ? (
            <span className={`rounded-full border px-3 py-1 text-[0.68rem] font-black sm:text-xs ${dark ? 'border-white/10 bg-white/[0.08] text-white/60' : 'border-ink/10 bg-white text-ink/55'}`}>
              {safeCard.partOfSpeech}
            </span>
          ) : null}
          <span className={`rounded-full px-3 py-1 text-[0.68rem] font-black sm:ml-auto sm:text-xs ${dark ? 'bg-white text-ink' : 'bg-ink text-white'}`}>
            {dueLabel}
          </span>
        </div>
        <div className={`mt-3 flex flex-wrap items-center justify-between gap-2 text-[0.68rem] font-black uppercase tracking-[0.08em] sm:text-xs ${dark ? 'text-white/40' : 'text-ink/40'}`}>
          <span>{sessionLabel}</span>
          <span className="hidden sm:inline">Shortcuts: Space, 1, 2, 3, 4</span>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-7 sm:py-8">
        <div className="text-center">
          <p className={`text-xs font-black uppercase tracking-[0.08em] ${dark ? 'text-white/50' : 'text-ink/50'}`}>{displayTargetLabel}</p>
          <h2 className={`mx-auto mt-2 max-w-4xl break-words text-2xl font-black leading-tight sm:mt-3 sm:text-4xl lg:text-5xl ${dark ? 'text-white' : 'text-ink'}`}>
            {safeCard.expression}
          </h2>
          <p className={`mx-auto mt-3 max-w-4xl break-words rounded-lg px-4 py-2.5 text-sm font-semibold leading-6 sm:mt-5 sm:py-3 ${
            dark ? 'bg-white/[0.07] text-white/70' : 'bg-paper text-ink/70'
          }`}>
            {safeCard.pronunciation}
          </p>

          {!revealed ? (
            <button
              type="button"
              onClick={onReveal}
              className="focus-ring mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-moss px-6 py-3 text-sm font-extrabold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-[#096d58] sm:mt-7 sm:min-h-12"
            >
              <Eye aria-hidden="true" className="h-4 w-4" />
              Show answer
            </button>
          ) : null}
        </div>

        {revealed ? (
          <div className={`mt-5 border-t pt-5 sm:mt-7 sm:pt-6 ${dark ? 'border-white/10' : 'border-ink/10'}`}>
            <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
              <div className="grid gap-3">
                <div className={`rounded-lg p-4 text-center ${dark ? 'bg-mint/15' : 'bg-mint/60'}`}>
                  <p className={`text-xs font-black uppercase tracking-[0.08em] ${dark ? 'text-mint' : 'text-moss'}`}>Italiano</p>
                  <p className={`mt-2 break-words text-lg font-black leading-7 ${dark ? 'text-white' : 'text-ink'}`}>{safeCard.italian}</p>
                </div>

                {safeCard.collocations ? (
                  <div className={`rounded-lg border p-4 ${dark ? 'border-white/10 bg-white/[0.06]' : 'border-ink/10 bg-paper'}`}>
                    <p className={`text-xs font-black uppercase tracking-[0.08em] ${dark ? 'text-white/50' : 'text-ink/50'}`}>Collocations</p>
                    <p className={`mt-2 break-words text-sm font-semibold leading-6 ${dark ? 'text-white/70' : 'text-ink/75'}`}>
                      {safeCard.collocations}
                    </p>
                  </div>
                ) : null}

                <div className={`flex items-start gap-3 rounded-lg p-4 ${dark ? 'bg-white/[0.06]' : 'bg-paper'}`}>
                  <BookOpen aria-hidden="true" className={`mt-1 h-5 w-5 shrink-0 ${dark ? 'text-mint' : 'text-moss'}`} />
                  <p className={`break-words text-sm font-semibold leading-6 ${dark ? 'text-white/70' : 'text-ink/70'}`}>{safeCard.note}</p>
                </div>
              </div>

              <div className="grid gap-3">
                <MarkdownText
                  text={safeCard.example1}
                  dark={dark}
                  className={`rounded-lg border p-4 text-sm font-semibold leading-6 ${dark ? 'border-white/10 bg-white/[0.06] text-white/75' : 'border-ink/10 bg-white text-ink/75'}`}
                />
                <MarkdownText
                  text={safeCard.example2}
                  dark={dark}
                  className={`rounded-lg border p-4 text-sm font-semibold leading-6 ${dark ? 'border-white/10 bg-white/[0.06] text-white/75' : 'border-ink/10 bg-white text-ink/75'}`}
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-3 lg:grid-cols-4">
              {reviewRatings.map((rating, index) => {
                const Icon = ratingIcons[rating.value];

                return (
                  <button
                    key={rating.value}
                    type="button"
                    onClick={() => onRate(rating.value)}
                    className={`focus-ring min-h-14 rounded-lg border px-3 py-3 text-left transition hover:-translate-y-0.5 sm:min-h-16 sm:px-4 ${activeRatingStyles[rating.value]}`}
                  >
                    <span className="flex items-center gap-2 text-sm font-black sm:text-base">
                      <Icon aria-hidden="true" className="h-4 w-4" />
                      {rating.label}
                      <span className={`ml-auto text-xs ${dark ? 'text-white/50' : 'text-ink/50'}`}>{index + 1}</span>
                    </span>
                    <span className={`mt-1 block text-xs font-bold ${dark ? 'text-white/60' : 'text-ink/55'}`}>{rating.helper}</span>
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
