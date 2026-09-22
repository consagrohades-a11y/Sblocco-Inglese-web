import React from 'react';

function splitBadGood(text) {
  const source = String(text || '').trim();
  const match = source.match(/^\s*BAD\s*:\s*([\s\S]*?)\s*GOOD\s*:\s*([\s\S]+)$/i);
  if (!match) return null;
  return { bad: match[1].trim(), good: match[2].trim() };
}

function TextBlock({ children, compact = false }) {
  return (
    <p className={`mx-auto whitespace-pre-wrap text-center font-black leading-tight ${compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-5xl'}`}>
      {children}
    </p>
  );
}

export default function SpeakingPromptContent({ item, style, compact = false }) {
  const text = String(item?.text || '');
  const comparison = splitBadGood(text);

  if (comparison) {
    return (
      <div className="mx-auto grid w-full max-w-4xl gap-4">
        <section className="rounded-3xl border border-coral/35 bg-white/[0.06] p-5 text-center sm:p-6">
          <span className="inline-flex rounded-full border border-coral/35 bg-coral/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.15em] text-[#f0a27d]">Bad</span>
          <p className={`mx-auto mt-4 whitespace-pre-wrap text-center font-black leading-snug ${compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-4xl'}`}>{comparison.bad}</p>
        </section>
        <section className="rounded-3xl bg-white p-5 text-center text-ink sm:p-6">
          <span className="inline-flex rounded-full border border-ink/10 bg-linen px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.15em] text-ink/55">Good</span>
          <p className={`mx-auto mt-4 whitespace-pre-wrap text-center font-black leading-snug ${compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-4xl'}`}>{comparison.good}</p>
        </section>
      </div>
    );
  }

  if (style === 'odd_one_out') {
    const choices = text.split('·').map((part) => part.trim()).filter(Boolean);
    if (choices.length > 1) {
      return (
        <div className="mx-auto grid w-full max-w-4xl gap-3 sm:grid-cols-2">
          {choices.map((choice, index) => (
            <div key={`${choice}-${index}`} className={`grid place-items-center rounded-2xl border border-white/15 bg-white/[0.07] p-5 text-center font-black ${compact ? 'min-h-20 text-xl sm:text-2xl' : 'min-h-28 text-2xl sm:text-3xl'}`}>
              {choice}
            </div>
          ))}
        </div>
      );
    }
  }

  if (style === 'taboo') {
    const match = text.match(/^(.+?)\s*(?:\||—)\s*forbidden:\s*(.+)$/i);
    if (match) {
      const forbidden = match[2].split(',').map((word) => word.trim()).filter(Boolean);
      return (
        <div className="mx-auto w-full max-w-4xl text-center">
          <TextBlock compact={compact}>{match[1].trim()}</TextBlock>
          <div className="mt-8">
            <p className="text-center text-xs font-black uppercase tracking-[0.16em] text-white/55">Do not say</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {forbidden.map((word) => <span key={word} className="rounded-full border border-white/20 bg-white/[0.08] px-4 py-2 text-sm font-black">{word}</span>)}
            </div>
          </div>
        </div>
      );
    }
  }

  if (style === 'repair') {
    return <div className="mx-auto w-full max-w-4xl text-center"><p className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Original line</p><div className="mt-4"><TextBlock compact={compact}>{text}</TextBlock></div></div>;
  }

  if (style === 'story') {
    return <div className="mx-auto w-full max-w-4xl text-center"><p className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Story seed</p><div className="mt-4"><TextBlock compact={compact}>{text}</TextBlock></div></div>;
  }

  return <TextBlock compact={compact}>{text}</TextBlock>;
}
