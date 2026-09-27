import React from 'react';
import { SPEAKING_ROUND_FORMAT_LABELS } from '../../lib/speakingRoundContract.js';

function Panel({ label, children, tone = 'plain' }) {
  const classes = tone === 'accent'
    ? 'border-orange-200 bg-orange-50/65 dark:border-orange-300/20 dark:bg-orange-300/[0.06]'
    : 'border-ink/10 bg-white/75 dark:border-white/10 dark:bg-white/[0.035]';
  return (
    <section className={`rounded-2xl border p-4 sm:p-5 ${classes}`}>
      {label ? <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">{label}</p> : null}
      <div className={label ? 'mt-2' : ''}>{children}</div>
    </section>
  );
}

function Support({ items }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <Panel label="Useful language">
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <span key={index} className="rounded-full border border-ink/10 bg-linen px-3 py-1.5 text-sm font-bold text-ink dark:border-white/10 dark:bg-white/[0.07] dark:text-white">
            {item}
          </span>
        ))}
      </div>
    </Panel>
  );
}

function NumberMission({ round }) {
  const facts = Array.isArray(round.material?.facts) ? round.material.facts : [];
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        {facts.map((fact, index) => (
          <Panel key={index} label={fact.label} tone="accent">
            <p className="text-2xl font-black text-ink dark:text-white">{fact.display || String(fact.value ?? '')}</p>
          </Panel>
        ))}
      </div>
      {round.situation ? <Panel label="Situation"><p className="text-sm font-semibold leading-6 text-ink/75 dark:text-white/75">{round.situation}</p></Panel> : null}
    </>
  );
}

function PictureDetective({ round }) {
  const choices = Array.isArray(round.material?.choices) ? round.material.choices : [];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {choices.map((choice) => (
        <article key={choice.key} className="overflow-hidden rounded-2xl border border-ink/10 bg-white dark:border-white/10 dark:bg-white/[0.035]">
          {choice.image_src ? (
            <div className="aspect-[4/3] overflow-hidden bg-linen/50 dark:bg-white/[0.04]">
              <img src={choice.image_src} alt={choice.alt || choice.label} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="grid aspect-[4/3] place-items-center border-b border-dashed border-ink/10 bg-linen/40 px-4 text-center text-sm font-bold text-ink/40 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/40">
              Image required
            </div>
          )}
          <div className="flex items-center gap-3 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-500 text-sm font-black text-white">{choice.key}</span>
            <div className="min-w-0">
              <p className="font-black text-ink dark:text-white">{choice.label}</p>
              {choice.description ? <p className="mt-1 text-xs font-semibold leading-5 text-ink/55 dark:text-white/55">{choice.description}</p> : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function ExplainWithoutSaying({ round }) {
  const forbidden = Array.isArray(round.material?.forbidden_words) ? round.material.forbidden_words : [];
  return (
    <>
      <Panel label="Target" tone="accent">
        <p className="text-3xl font-black leading-tight text-ink dark:text-white">{round.material?.target}</p>
      </Panel>
      <Panel label="Do not say">
        <div className="flex flex-wrap gap-2">
          {forbidden.map((word) => <span key={word} className="rounded-full bg-ink px-3 py-1.5 text-sm font-black text-white dark:bg-white dark:text-ink">{word}</span>)}
        </div>
      </Panel>
      {round.situation ? <Panel label="Next step"><p className="text-sm font-semibold leading-6 text-ink/75 dark:text-white/75">{round.situation}</p></Panel> : null}
    </>
  );
}

function ConversationDetective({ round }) {
  const turns = Array.isArray(round.material?.turns) ? round.material.turns : [];
  return (
    <>
      <div className="grid gap-2">
        {turns.map((turn, index) => (
          <div key={index} className="grid gap-1 rounded-2xl border border-ink/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.035] sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
            <p className="text-xs font-black uppercase tracking-[0.1em] text-orange-700 dark:text-orange-300">{turn.speaker}</p>
            <p className="text-sm font-semibold leading-6 text-ink dark:text-white">“{turn.text}”</p>
          </div>
        ))}
      </div>
      <Panel label="Your question" tone="accent">
        <p className="text-xl font-black leading-7 text-ink dark:text-white">{round.material?.question}</p>
      </Panel>
      {Array.isArray(round.material?.vocabulary) && round.material.vocabulary.length ? (
        <Panel label="Vocabulary">
          <div className="flex flex-wrap gap-2">{round.material.vocabulary.map((item) => <span key={item} className="rounded-full bg-linen px-3 py-1.5 text-sm font-bold text-ink dark:bg-white/[0.07] dark:text-white">{item}</span>)}</div>
        </Panel>
      ) : null}
    </>
  );
}

function MakeChoice({ round }) {
  const options = Array.isArray(round.material?.options) ? round.material.options : [];
  return (
    <>
      {round.situation ? <Panel label="Situation" tone="accent"><p className="text-sm font-semibold leading-6 text-ink/75 dark:text-white/75">{round.situation}</p></Panel> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {options.map((option) => (
          <article key={option.key} className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-white/[0.035]">
            <p className="text-xl font-black text-ink dark:text-white">{option.title}</p>
            {option.subtitle ? <p className="mt-1 text-xs font-black uppercase tracking-[0.08em] text-orange-700 dark:text-orange-300">{option.subtitle}</p> : null}
            {option.description ? <p className="mt-3 text-sm font-semibold leading-6 text-ink/70 dark:text-white/70">{option.description}</p> : null}
            {Array.isArray(option.facts) && option.facts.length ? (
              <dl className="mt-4 grid gap-2">
                {option.facts.map((fact, index) => (
                  <div key={index} className="flex items-baseline justify-between gap-4 border-t border-ink/10 pt-2 text-sm dark:border-white/10">
                    <dt className="font-bold text-ink/50 dark:text-white/50">{fact.label}</dt>
                    <dd className="text-right font-black text-ink dark:text-white">{fact.display || String(fact.value ?? '')}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </article>
        ))}
      </div>
      {Array.isArray(round.material?.constraints) && round.material.constraints.length ? <Support items={round.material.constraints} /> : null}
    </>
  );
}

export default function SpeakingRoundContent({ round }) {
  const safeRound = round && typeof round === 'object' ? round : {};
  const format = safeRound.format;
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4">
      <header className="border-b border-ink/10 pb-4 dark:border-white/10">
        <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">
          {SPEAKING_ROUND_FORMAT_LABELS[format] || 'Speaking'}
        </p>
        {safeRound.title ? <h3 className="mt-1 text-2xl font-black leading-tight text-ink dark:text-white">{safeRound.title}</h3> : null}
        {safeRound.instruction ? <p className="mt-2 text-base font-semibold leading-7 text-ink/70 dark:text-white/70">{safeRound.instruction}</p> : null}
      </header>

      {format === 'number_mission' ? <NumberMission round={safeRound} /> : null}
      {format === 'picture_detective' ? <PictureDetective round={safeRound} /> : null}
      {format === 'explain_without_saying' ? <ExplainWithoutSaying round={safeRound} /> : null}
      {format === 'conversation_detective' ? <ConversationDetective round={safeRound} /> : null}
      {format === 'make_choice' ? <MakeChoice round={safeRound} /> : null}

      <Support items={safeRound.support} />

      {safeRound.challenge?.text ? (
        <Panel label="Challenge">
          <p className="text-sm font-semibold leading-6 text-ink/75 dark:text-white/75">{safeRound.challenge.text}</p>
        </Panel>
      ) : null}

      {safeRound.outcome ? (
        <p className="border-l-4 border-orange-400 pl-4 text-sm font-bold leading-6 text-ink/60 dark:text-white/60">
          Goal: {safeRound.outcome}
        </p>
      ) : null}
    </div>
  );
}
