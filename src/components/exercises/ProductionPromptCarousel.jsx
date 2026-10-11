import React from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

/**
 * The authoring contract keeps prompts as plain strings. Extract editorial
 * sections when authors provide recognizable labels; otherwise render their
 * exact prose rather than making up a scenario or teaching instructions.
 */
export function parseProductionPrompt(value) {
  const raw = String(value || '').trim();
  const topicMatch = raw.match(/^Topic\s*\d+\s*[|:]\s*(.+?)(?=\s+Your friend says\s*:|\s+Record a natural reply\s*:|\s+Your task\s*:|$)/i);
  const title = topicMatch ? topicMatch[1].trim() : '';
  const remaining = topicMatch ? raw.slice(topicMatch[0].length).trim() : raw;
  const instructionMatch = remaining.match(/\b(?:Record a natural reply|Write a natural reply|Your response should|Your task)\s*:/i);
  const scenario = instructionMatch ? remaining.slice(0, instructionMatch.index).trim() : remaining;
  const task = instructionMatch ? remaining.slice(instructionMatch.index + instructionMatch[0].length).trim() : '';
  const friendMatch = scenario.match(/^Your friend says\s*:\s*/i);
  const friendText = friendMatch ? scenario.slice(friendMatch[0].length).trim().replace(/^['“‘"]|['”’"]$/g, '').trim() : '';
  const bulletParts = task && task.includes(', ')
    ? task.split(/,\s*(?:and\s+)?/i).map((item) => item.replace(/^and\s+/i, '').replace(/[.;,\s]+$/, '').trim()).filter(Boolean)
    : [];
  return { title, scenario: friendMatch ? '' : scenario, friendText, task, bulletParts: bulletParts.length >= 2 ? bulletParts : [] };
}

function NumberedBullets({ items }) {
  return <ul className="grid gap-3">{items.map((item, i) => (
    <li key={i} className="flex items-start gap-3">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-orange-100 text-orange-800 dark:bg-orange-300/15 dark:text-orange-200">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <span className="text-sm font-semibold leading-7 text-[#41515a] dark:text-white/80">{item}</span>
    </li>
  ))}</ul>;
}

/** Shared presentation for written and recorded answers; never owns answer data. */
export default function ProductionPromptCarousel({
  options, index, onNavigate, navigationLocked = false, kind = 'speaking', children,
}) {
  const selected = Math.max(0, Math.min(index, Math.max(0, options.length - 1)));
  const current = parseProductionPrompt(options[selected]);
  const total = options.length;
  const multiple = total > 1;
  const title = current.title || (kind === 'writing' ? 'Make it yours.' : 'Your opinion matters.');
  const instructions = kind === 'writing'
    ? 'Browse the topics and write a response to one.'
    : 'Explore the topics, then record your response to one.';

  return (
    <section className="my-4 overflow-hidden rounded-[1.4rem] border border-[#e6dacb] bg-[#fbf7f1] shadow-sm dark:border-white/10 dark:bg-surface-900">
      <div className="px-5 pb-4 pt-5 sm:px-7">
        <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#b74611] dark:text-orange-300">
          {kind === 'writing' ? 'Writing challenge' : 'Speaking challenge'}
        </p>
        <p className="mt-1 text-sm font-semibold leading-6 text-[#69716e] dark:text-white/60">{instructions}</p>
      </div>

      <div className="mx-3 overflow-hidden rounded-2xl bg-[#172d32] px-4 py-5 text-white sm:mx-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-[0.69rem] font-black uppercase tracking-[0.12em] text-[#ffb888]">
            Topic {selected + 1} of {total}
          </p>
          {multiple ? (
            <div className="flex items-center gap-2">
              <button type="button" disabled={navigationLocked} onClick={() => onNavigate((selected - 1 + total) % total)}
                aria-label="Previous prompt" className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-white/30 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35">
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button type="button" disabled={navigationLocked} onClick={() => onNavigate((selected + 1) % total)}
                aria-label="Next prompt" className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-white/30 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35">
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
        <h3 className="mt-3 max-w-2xl font-editorial text-[1.55rem] font-black leading-tight tracking-tight sm:text-[1.85rem]">{title}</h3>
        {multiple ? (
          <div className="mt-5 flex items-center justify-center gap-1.5" aria-label={`Topic ${selected + 1} of ${total}`}>
            {options.map((_, i) => <span key={i} aria-hidden="true" className={`h-1 rounded-full transition-all ${i === selected ? 'w-9 bg-orange-400' : 'w-5 bg-white/30'}`} />)}
          </div>
        ) : null}
      </div>

      <div className="mx-3 mb-3 rounded-b-2xl border border-t-0 border-[#e6dacb] bg-white px-4 py-6 sm:mx-5 sm:mb-5 sm:px-7 dark:border-white/10 dark:bg-surface-950">
        {current.friendText ? (
          <div className="mb-6">
            <p className="mb-3 text-[0.67rem] font-black uppercase tracking-[0.12em] text-[#b74611] dark:text-orange-300">Your friend says</p>
            <blockquote className="border-l-[3px] border-orange-400 pl-4 text-[0.95rem] font-semibold leading-8 text-[#34434a] dark:text-white/85 sm:pl-5">
              “{current.friendText}”
            </blockquote>
          </div>
        ) : null}
        {current.scenario ? <div className="mb-6 whitespace-pre-wrap text-[0.95rem] font-semibold leading-8 text-[#34434a] dark:text-white/85">{current.scenario}</div> : null}
        {current.task ? (
          <div className="mb-6 border-t border-[#e8dfd5] pt-5 dark:border-white/10">
            <p className="mb-3 text-[0.67rem] font-black uppercase tracking-[0.12em] text-[#b74611] dark:text-orange-300">Your response should</p>
            {current.bulletParts.length ? <NumberedBullets items={current.bulletParts} /> : <p className="whitespace-pre-wrap text-sm font-semibold leading-7 text-[#41515a] dark:text-white/80">{current.task}</p>}
          </div>
        ) : null}
        <div className="border-t border-[#e8dfd5] pt-5 dark:border-white/10">{children}</div>
        {navigationLocked && multiple ? (
          <p className="mt-4 text-xs font-semibold leading-5 text-[#66716e] dark:text-white/60">
            This topic stays selected while your answer is being recorded or saved.
          </p>
        ) : null}
      </div>
    </section>
  );
}
