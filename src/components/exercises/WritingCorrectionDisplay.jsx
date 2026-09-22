import React, { useMemo } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { diffText } from '../../lib/textDiff.js';

const CATEGORY_LABELS = {
  grammar: 'Grammatica',
  vocabulary: 'Lessico',
  spelling: 'Ortografia',
  punctuation: 'Punteggiatura',
  style: 'Stile',
  clarity: 'Chiarezza',
  register: 'Registro',
  structure: 'Struttura',
  other: 'Altro',
};

const CATEGORY_STYLES = {
  grammar: {
    removed: 'bg-[#f6ddd3] text-[#87351f] decoration-[#b95a3f] dark:bg-[#8a3d2a]/25 dark:text-[#ffc1ae]',
    added: 'bg-[#f9e9e2] text-[#87351f] decoration-[#b95a3f] dark:bg-[#8a3d2a]/18 dark:text-[#ffc1ae]',
    badge: 'bg-[#f6ddd3] text-[#87351f] dark:bg-[#8a3d2a]/25 dark:text-[#ffc1ae]',
  },
  vocabulary: {
    removed: 'bg-[#dce8ef] text-[#234f67] decoration-[#557f96] dark:bg-[#7aa4bc]/20 dark:text-[#cfe8f5]',
    added: 'bg-[#e7f0f5] text-[#234f67] decoration-[#557f96] dark:bg-[#7aa4bc]/16 dark:text-[#cfe8f5]',
    badge: 'bg-[#dce8ef] text-[#234f67] dark:bg-[#7aa4bc]/20 dark:text-[#cfe8f5]',
  },
  spelling: {
    removed: 'bg-[#f1d5cd] text-[#7f3125] decoration-[#a64e3d] dark:bg-[#9c4f3d]/20 dark:text-[#ffc9bb]',
    added: 'bg-[#f7e5df] text-[#7f3125] decoration-[#a64e3d] dark:bg-[#9c4f3d]/16 dark:text-[#ffc9bb]',
    badge: 'bg-[#f1d5cd] text-[#7f3125] dark:bg-[#9c4f3d]/20 dark:text-[#ffc9bb]',
  },
  punctuation: {
    removed: 'bg-[#efe5d5] text-[#6e532f] decoration-[#9a7745] dark:bg-[#c49d5b]/15 dark:text-[#f5ddb0]',
    added: 'bg-[#f5eee3] text-[#6e532f] decoration-[#9a7745] dark:bg-[#c49d5b]/12 dark:text-[#f5ddb0]',
    badge: 'bg-[#efe5d5] text-[#6e532f] dark:bg-[#c49d5b]/15 dark:text-[#f5ddb0]',
  },
  register: {
    removed: 'bg-[#f4e8bf] text-[#69551c] decoration-[#a68931] dark:bg-[#c5a844]/15 dark:text-[#f5dfa0]',
    added: 'bg-[#f8f0d4] text-[#69551c] decoration-[#a68931] dark:bg-[#c5a844]/12 dark:text-[#f5dfa0]',
    badge: 'bg-[#f4e8bf] text-[#69551c] dark:bg-[#c5a844]/15 dark:text-[#f5dfa0]',
  },
  structure: {
    removed: 'bg-[#dfe4ea] text-[#26394b] decoration-[#536b80] dark:bg-[#7891a8]/15 dark:text-[#dce8f1]',
    added: 'bg-[#e9edf1] text-[#26394b] decoration-[#536b80] dark:bg-[#7891a8]/12 dark:text-[#dce8f1]',
    badge: 'bg-[#dfe4ea] text-[#26394b] dark:bg-[#7891a8]/15 dark:text-[#dce8f1]',
  },
  style: {
    removed: 'bg-[#e8dfd7] text-[#5d4638] decoration-[#8e6f5b] dark:bg-[#a98268]/15 dark:text-[#ead6c8]',
    added: 'bg-[#f0e9e3] text-[#5d4638] decoration-[#8e6f5b] dark:bg-[#a98268]/12 dark:text-[#ead6c8]',
    badge: 'bg-[#e8dfd7] text-[#5d4638] dark:bg-[#a98268]/15 dark:text-[#ead6c8]',
  },
  clarity: {
    removed: 'bg-[#e8e3dc] text-[#4f4a43] decoration-[#80776d] dark:bg-white/10 dark:text-white/80',
    added: 'bg-[#f0ece7] text-[#4f4a43] decoration-[#80776d] dark:bg-white/[0.07] dark:text-white/80',
    badge: 'bg-[#e8e3dc] text-[#4f4a43] dark:bg-white/10 dark:text-white/80',
  },
  other: {
    removed: 'bg-[#ece8e2] text-[#5a5148] decoration-[#928579] dark:bg-white/10 dark:text-white/80',
    added: 'bg-[#f3f0ec] text-[#5a5148] decoration-[#928579] dark:bg-white/[0.07] dark:text-white/80',
    badge: 'bg-[#ece8e2] text-[#5a5148] dark:bg-white/10 dark:text-white/80',
  },
};

function styleForCategory(category) {
  return CATEGORY_STYLES[category] || CATEGORY_STYLES.other;
}

function isRangedReason(reason, textLength) {
  const start = Number(reason?.start);
  const end = Number(reason?.end);
  return Number.isInteger(start)
    && Number.isInteger(end)
    && start >= 0
    && end > start
    && end <= textLength;
}

function categorizedSegments(originalText, reasons, view) {
  const ranged = reasons
    .filter((reason) => isRangedReason(reason, originalText.length))
    .sort((a, b) => Number(a.start) - Number(b.start));

  if (!ranged.length) return null;

  const segments = [];
  let cursor = 0;

  ranged.forEach((reason) => {
    const start = Number(reason.start);
    const end = Number(reason.end);
    if (start < cursor) return;

    if (start > cursor) {
      segments.push({
        type: 'equal',
        text: originalText.slice(cursor, start),
      });
    }

    segments.push({
      type: 'reason',
      text: view === 'original'
        ? originalText.slice(start, end)
        : String(reason.corrected || ''),
      reason,
    });
    cursor = end;
  });

  if (cursor < originalText.length) {
    segments.push({
      type: 'equal',
      text: originalText.slice(cursor),
    });
  }

  return segments;
}

function CorrectionText({ originalText, correctedText, reasons, view }) {
  const categorized = useMemo(
    () => categorizedSegments(originalText, reasons, view),
    [originalText, reasons, view],
  );
  const fallback = useMemo(
    () => diffText(originalText, correctedText),
    [originalText, correctedText],
  );

  const segments = categorized || fallback
    .filter((segment) => view === 'original' ? segment.type !== 'add' : segment.type !== 'remove');

  return (
    <p className="whitespace-pre-wrap text-sm font-semibold leading-7 text-ink/85 dark:text-white/85">
      {segments.map((segment, index) => {
        if (segment.type === 'equal') return <React.Fragment key={index}>{segment.text}</React.Fragment>;

        if (segment.type === 'reason') {
          const category = segment.reason?.category || 'other';
          const style = styleForCategory(category);
          const label = CATEGORY_LABELS[category] || CATEGORY_LABELS.other;
          if (!segment.text) return null;

          return (
            <mark
              key={index}
              title={label}
              className={`rounded-sm px-0.5 font-black decoration-2 ${view === 'original'
                ? `line-through ${style.removed}`
                : `italic underline underline-offset-2 ${style.added}`}`}
            >
              {segment.text}
            </mark>
          );
        }

        if (segment.type === 'remove') {
          return (
            <mark
              key={index}
              className="rounded-sm bg-[#f5ddd4] px-0.5 font-black text-[#87351f] line-through decoration-2 dark:bg-[#8a3d2a]/25 dark:text-[#ffc1ae]"
            >
              {segment.text}
            </mark>
          );
        }

        return (
          <mark
            key={index}
            className="rounded-sm bg-[#dce8ef] px-0.5 font-black italic text-[#163d55] underline decoration-2 underline-offset-2 dark:bg-[#7aa4bc]/20 dark:text-[#cfe8f5]"
          >
            {segment.text}
          </mark>
        );
      })}
    </p>
  );
}

export default function WritingCorrectionDisplay({ originalText = '', correction = {}, compact = false }) {
  const correctedText = String(correction?.corrected_text || '');
  const reasons = Array.isArray(correction?.reasons) ? correction.reasons : [];

  if (!correctedText.trim()) return null;

  return (
    <section className={`mt-5 overflow-hidden rounded-2xl border border-[#d8c5b8] bg-[#fffaf5] shadow-sm dark:border-white/10 dark:bg-white/[0.035] ${compact ? 'text-sm' : ''}`}>
      <div className="flex items-start gap-3 border-b border-[#eadbd1] px-4 py-4 dark:border-white/10 sm:px-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-clay text-white dark:bg-coral">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[0.66rem] font-black uppercase tracking-[0.13em] text-clay dark:text-coral">Correzione del docente</p>
          <h3 className="mt-1 text-lg font-black text-ink dark:text-white">Guarda esattamente cosa è cambiato.</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-ink/50 dark:text-white/50">
            I colori indicano il tipo di errore e corrispondono alle categorie qui sotto.
          </p>
          {correction?.summary ? (
            <p className="mt-2 text-sm font-semibold leading-6 text-ink/60 dark:text-white/60">{correction.summary}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        <div className="border-b border-[#eadbd1] p-4 dark:border-white/10 lg:border-b-0 lg:border-r sm:p-5">
          <p className="mb-3 text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#87351f] dark:text-[#ffc1ae]">La tua versione</p>
          <CorrectionText originalText={originalText} correctedText={correctedText} reasons={reasons} view="original" />
        </div>
        <div className="p-4 sm:p-5">
          <p className="mb-3 text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#315f78] dark:text-[#cfe8f5]">Versione corretta</p>
          <CorrectionText originalText={originalText} correctedText={correctedText} reasons={reasons} view="corrected" />
        </div>
      </div>

      {reasons.length ? (
        <div className="border-t border-[#eadbd1] px-4 py-4 dark:border-white/10 sm:px-5">
          <p className="text-[0.66rem] font-black uppercase tracking-[0.12em] text-ink/45 dark:text-white/45">Perché</p>
          <div className="mt-3 grid gap-2.5">
            {reasons.map((reason, index) => {
              const category = reason?.category || 'other';
              const style = styleForCategory(category);
              return (
                <article key={`${reason?.original || 'reason'}-${index}`} className="rounded-xl border border-ink/10 bg-white/75 p-3.5 dark:border-white/10 dark:bg-white/[0.035]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-wide ${style.badge}`}>
                      {CATEGORY_LABELS[category] || CATEGORY_LABELS.other}
                    </span>
                    {(reason?.original || reason?.corrected) ? (
                      <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-bold text-ink/65 dark:text-white/65">
                        {reason?.original ? <span className={`line-through decoration-2 ${style.removed}`}>{reason.original}</span> : null}
                        {reason?.original && reason?.corrected ? <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
                        {reason?.corrected ? <span className={`font-black italic underline decoration-2 underline-offset-2 ${style.added}`}>{reason.corrected}</span> : null}
                      </span>
                    ) : null}
                  </div>
                  {reason?.reason ? <p className="mt-2 text-sm font-semibold italic leading-6 text-ink/70 dark:text-white/70">{reason.reason}</p> : null}
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
