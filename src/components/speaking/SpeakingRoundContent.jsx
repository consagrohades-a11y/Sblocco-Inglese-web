import React from 'react';

const FORMAT_LABELS = {
  number_mission: 'Number Mission',
  picture_detective: 'Picture Detective',
  explain_without_saying: 'Explain Without Saying',
  conversation_detective: 'Conversation Detective',
  make_the_choice: 'Make the Choice',
};

function Support({ items = [] }) {
  if (!items.length) return null;
  return (
    <section className="rounded-2xl border border-orange-200 bg-orange-50/70 p-4 dark:border-orange-300/20 dark:bg-orange-300/[0.06]">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-orange-800 dark:text-orange-200">Useful language</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item, index) => <span key={index} className="rounded-full border border-orange-200 bg-white px-3 py-2 text-sm font-black text-ink dark:border-orange-300/20 dark:bg-white/[0.05] dark:text-white">{item}</span>)}
      </div>
    </section>
  );
}

function NumberMission({ round }) {
  const facts = Array.isArray(round.material?.facts) ? round.material.facts : [];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {facts.map((fact, index) => (
        <section key={fact.key || index} className="rounded-2xl border border-ink/10 bg-white p-4 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
          <p className="text-[0.66rem] font-black uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">{fact.label}</p>
          <p className="mt-2 text-3xl font-black leading-none text-ink dark:text-white">{fact.display || String(fact.value ?? '')}</p>
        </section>
      ))}
    </div>
  );
}

function PictureDetective({ round }) {
  const options = Array.isArray(round.material?.options) ? round.material.options : [];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option, index) => (
        <figure key={option.key || index} className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
          <div className="aspect-[4/3] bg-linen/60 dark:bg-white/[0.04]">
            <img src={option.image_url} alt={option.image_alt || option.label || 'Speaking choice'} className="h-full w-full object-contain p-4" />
          </div>
          <figcaption className="flex items-center gap-3 border-t border-ink/10 px-4 py-3 dark:border-white/10">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-orange-500 text-xs font-black text-white">{option.key || String.fromCharCode(65 + index)}</span>
            {round.material?.show_labels ? <span className="text-sm font-black text-ink dark:text-white">{option.label}</span> : <span className="text-xs font-bold text-ink/45 dark:text-white/45">Ask questions before you guess.</span>}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function ExplainWithoutSaying({ round }) {
  const forbidden = Array.isArray(round.material?.forbidden_words) ? round.material.forbidden_words : [];
  return (
    <div className="grid gap-5 text-center">
      <section className="rounded-3xl border border-orange-200 bg-orange-50/65 px-5 py-7 dark:border-orange-300/20 dark:bg-orange-300/[0.06]">
        <p className="text-[0.66rem] font-black uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">Target</p>
        <p className="mt-2 text-3xl font-black leading-tight text-ink sm:text-4xl dark:text-white">{round.material?.target}</p>
      </section>
      <section>
        <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-ink/55 dark:text-white/55">Do not say</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {forbidden.map((word) => <span key={word} className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-black text-ink dark:border-white/15 dark:bg-white/[0.05] dark:text-white">{word}</span>)}
        </div>
      </section>
    </div>
  );
}

function ConversationDetective({ round }) {
  const turns = Array.isArray(round.material?.turns) ? round.material.turns : [];
  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        {turns.map((turn, index) => (
          <div key={index} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.05]">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-orange-700 dark:text-orange-300">{turn.speaker}</p>
            <p className="text-base font-bold leading-6 text-ink dark:text-white">{turn.text}</p>
          </div>
        ))}
      </div>
      <section className="rounded-2xl border-l-4 border-orange-500 bg-linen/60 p-4 dark:bg-white/[0.04]">
        <p className="text-xl font-black leading-snug text-ink dark:text-white">{round.material?.question}</p>
        {round.material?.follow_up ? <p className="mt-2 text-sm font-bold leading-6 text-ink/65 dark:text-white/65">{round.material.follow_up}</p> : null}
      </section>
    </div>
  );
}

function MakeTheChoice({ round }) {
  const options = Array.isArray(round.material?.options) ? round.material.options : [];
  return (
    <div className="grid gap-5">
      {round.material?.situation ? <p className="rounded-2xl bg-linen/65 px-4 py-3 text-sm font-bold leading-6 text-ink dark:bg-white/[0.04] dark:text-white">{round.material.situation}</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {options.map((option, index) => (
          <section key={option.key || index} className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
            <header className="border-b border-ink/10 bg-orange-50/70 px-4 py-3 dark:border-white/10 dark:bg-orange-300/[0.06]">
              <p className="text-lg font-black text-ink dark:text-white">{option.title}</p>
            </header>
            <dl className="divide-y divide-ink/10 dark:divide-white/10">
              {(option.details || []).map((detail, detailIndex) => (
                <div key={detailIndex} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 px-4 py-3">
                  <dt className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-ink/45 dark:text-white/45">{detail.label}</dt>
                  <dd className="text-sm font-bold leading-5 text-ink dark:text-white">{detail.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      {round.material?.task ? <p className="text-center text-xl font-black leading-snug text-ink dark:text-white">{round.material.task}</p> : null}
    </div>
  );
}

export default function SpeakingRoundContent({ round, showSupport = true }) {
  if (!round || typeof round !== 'object') return null;
  const format = round.format;

  return (
    <article className="mx-auto grid w-full max-w-5xl gap-5 rounded-[1.75rem] border border-ink/10 bg-[#fffaf1] p-5 text-ink shadow-sm dark:border-white/10 dark:bg-[#17211e] dark:text-white sm:p-7">
      <header className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-orange-500 px-3 py-1 text-[0.66rem] font-black uppercase tracking-[0.12em] text-white">{FORMAT_LABELS[format] || 'Speaking'}</span>
          {round.has_challenge ? <span className="rounded-full border border-ink/10 bg-white px-3 py-1 text-[0.66rem] font-black text-ink/55 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/60">Second stage available</span> : null}
        </div>
        <h3 className="text-2xl font-black leading-tight text-ink sm:text-3xl dark:text-white">{round.title}</h3>
        <p className="text-base font-bold leading-7 text-ink/75 dark:text-white/75">{round.instructions}</p>
        {round.situation ? <p className="text-sm font-semibold leading-6 text-ink/60 dark:text-white/60">{round.situation}</p> : null}
      </header>

      {format === 'number_mission' ? <NumberMission round={round} /> : null}
      {format === 'picture_detective' ? <PictureDetective round={round} /> : null}
      {format === 'explain_without_saying' ? <ExplainWithoutSaying round={round} /> : null}
      {format === 'conversation_detective' ? <ConversationDetective round={round} /> : null}
      {format === 'make_the_choice' ? <MakeTheChoice round={round} /> : null}

      {showSupport ? <Support items={round.support || []} /> : null}

      {round.outcome ? (
        <footer className="rounded-2xl border border-ink/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-[0.66rem] font-black uppercase tracking-[0.1em] text-orange-700 dark:text-orange-300">Goal</p>
          <p className="mt-1 text-sm font-bold leading-6 text-ink dark:text-white">{round.outcome}</p>
        </footer>
      ) : null}
    </article>
  );
}
