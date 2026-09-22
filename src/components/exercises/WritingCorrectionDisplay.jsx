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

function DiffText({ segments, view }) {
  return (
    <p className="whitespace-pre-wrap text-sm font-semibold leading-7 text-ink/85 dark:text-white/85">
      {segments
        .filter((segment) => view === 'original' ? segment.type !== 'add' : segment.type !== 'remove')
        .map((segment, index) => {
          if (segment.type === 'equal') return <React.Fragment key={index}>{segment.text}</React.Fragment>;
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
  const segments = useMemo(
    () => diffText(originalText, correctedText),
    [originalText, correctedText],
  );

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
          {correction?.summary ? (
            <p className="mt-1 text-sm font-semibold leading-6 text-ink/60 dark:text-white/60">{correction.summary}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        <div className="border-b border-[#eadbd1] p-4 dark:border-white/10 lg:border-b-0 lg:border-r sm:p-5">
          <p className="mb-3 text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#87351f] dark:text-[#ffc1ae]">La tua versione</p>
          <DiffText segments={segments} view="original" />
        </div>
        <div className="p-4 sm:p-5">
          <p className="mb-3 text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#315f78] dark:text-[#cfe8f5]">Versione corretta</p>
          <DiffText segments={segments} view="corrected" />
        </div>
      </div>

      {reasons.length ? (
        <div className="border-t border-[#eadbd1] px-4 py-4 dark:border-white/10 sm:px-5">
          <p className="text-[0.66rem] font-black uppercase tracking-[0.12em] text-ink/45 dark:text-white/45">Perché</p>
          <div className="mt-3 grid gap-2.5">
            {reasons.map((reason, index) => (
              <article key={`${reason?.original || 'reason'}-${index}`} className="rounded-xl border border-ink/10 bg-white/75 p-3.5 dark:border-white/10 dark:bg-white/[0.035]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-linen px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-wide text-ink/55 dark:bg-white/10 dark:text-white/55">
                    {CATEGORY_LABELS[reason?.category] || CATEGORY_LABELS.other}
                  </span>
                  {(reason?.original || reason?.corrected) ? (
                    <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-bold text-ink/65 dark:text-white/65">
                      {reason?.original ? <span className="line-through decoration-clay/70">{reason.original}</span> : null}
                      {reason?.original && reason?.corrected ? <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
                      {reason?.corrected ? <span className="text-[#315f78] dark:text-[#cfe8f5]">{reason.corrected}</span> : null}
                    </span>
                  ) : null}
                </div>
                {reason?.reason ? <p className="mt-2 text-sm font-semibold italic leading-6 text-ink/70 dark:text-white/70">{reason.reason}</p> : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
