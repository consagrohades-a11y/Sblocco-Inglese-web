import React from 'react';
import SpeakingRoundContent from './SpeakingRoundContent.jsx';
import { projectSpeakingRoundForLearner, SPEAKING_ROUND_FORMATS } from '../../lib/speakingRoundContract.js';
import { adaptLegacySpeakingItem } from '../../lib/speakingPresenterLegacyAdapter.js';

const STRUCTURED_FORMATS = new Set(SPEAKING_ROUND_FORMATS.map((item) => item.id));

function Eyebrow({ children }) {
  return <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-clay">{children}</p>;
}

function Prompt({ children, compact = false, align = 'center' }) {
  const size = compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl lg:text-5xl';
  const alignment = align === 'left' ? 'text-left' : 'text-center';
  return (
    <p className={'whitespace-pre-wrap font-black leading-[1.08] text-ink dark:text-white ' + size + ' ' + alignment}>
      {children}
    </p>
  );
}

function Token({ children, strong = false }) {
  const tone = strong
    ? 'border-clay/30 bg-clay/10 text-ink dark:border-coral/30 dark:bg-coral/10 dark:text-white'
    : 'border-ink/10 bg-linen/70 text-ink dark:border-white/10 dark:bg-white/[0.06] dark:text-white';
  return (
    <span className={'inline-flex min-h-11 items-center justify-center rounded-2xl border px-4 py-2 text-base font-black sm:text-lg ' + tone}>
      {children}
    </span>
  );
}

function ConstraintFocus({ legacy }) {
  if (legacy.forbidden) {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-7 text-center">
        <div>
          <Eyebrow>{legacy.variant === 'forbidden_words' ? 'Your topic' : 'Explain this'}</Eyebrow>
          <div className="mt-3"><Prompt>{legacy.forbidden.prompt}</Prompt></div>
        </div>
        <section className="rounded-[1.75rem] border border-clay/20 bg-clay/[0.06] px-5 py-5 sm:px-7">
          <Eyebrow>Don’t say</Eyebrow>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {legacy.forbidden.words.map((word) => <Token key={word} strong>{word}</Token>)}
          </div>
        </section>
      </div>
    );
  }

  if (legacy.requiredChunks) {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-7 text-center">
        <div>
          <Eyebrow>Topic</Eyebrow>
          <div className="mt-3"><Prompt>{legacy.requiredChunks.topic}</Prompt></div>
        </div>
        <section>
          <Eyebrow>Use all three</Eyebrow>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {legacy.requiredChunks.chunks.map((chunk) => <Token key={chunk} strong>{chunk}</Token>)}
          </div>
        </section>
      </div>
    );
  }

  const rule = legacy.variant === 'no_yes'
    ? 'Don’t say YES'
    : legacy.variant === 'no_adjectives'
      ? 'No adjectives'
      : '';

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 text-center">
      <Prompt>{legacy.text}</Prompt>
      {rule ? <div className="flex justify-center"><Token strong>{rule}</Token></div> : null}
    </div>
  );
}

function DialogueStack({ dialogue }) {
  return (
    <div className="grid gap-3">
      {dialogue.turns.map((turn, index) => (
        <div key={turn.speaker + '-' + index} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-left dark:border-white/10 dark:bg-white/[0.05] sm:grid-cols-[5rem_minmax(0,1fr)]">
          <span className="text-xs font-black uppercase tracking-[0.1em] text-clay">{turn.speaker}</span>
          <p className="text-base font-bold leading-6 text-ink dark:text-white sm:text-lg">{turn.text}</p>
        </div>
      ))}
    </div>
  );
}

function SituationResponse({ legacy }) {
  if (legacy.dialogue) {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        <DialogueStack dialogue={legacy.dialogue} />
        <div className="text-center">
          <Eyebrow>Your move</Eyebrow>
          <p className="mt-2 text-2xl font-black text-ink dark:text-white">Keep the conversation going.</p>
        </div>
      </div>
    );
  }

  const actions = {
    what_would_you_say: 'What would you say?',
    roleplay: 'Play the situation naturally.',
    interrupt: 'Interrupt naturally and politely.',
    restart: 'Restart the conversation.',
    urgent_response: 'Say what you need clearly.',
    response: 'Respond naturally.',
  };
  const action = actions[legacy.variant] || 'What would you say?';

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <section className="rounded-[1.75rem] border border-ink/10 bg-linen/45 px-5 py-7 text-left dark:border-white/10 dark:bg-white/[0.04] sm:px-7">
        <Eyebrow>Situation</Eyebrow>
        <div className="mt-3"><Prompt align="left">{legacy.text}</Prompt></div>
      </section>
      <div className="text-center">
        <Eyebrow>Your move</Eyebrow>
        <p className="mt-2 text-2xl font-black text-ink dark:text-white sm:text-3xl">{action}</p>
      </div>
    </div>
  );
}

function Inference({ legacy }) {
  if (legacy.answerFirst) {
    return (
      <div className="mx-auto grid w-full max-w-4xl gap-6 text-center">
        <section className="rounded-[1.75rem] border border-ink/10 bg-linen/55 px-6 py-8 dark:border-white/10 dark:bg-white/[0.05]">
          <Eyebrow>You already have the answer</Eyebrow>
          <div className="mt-3"><Prompt>{legacy.answerFirst.answer}</Prompt></div>
        </section>
        <p className="text-2xl font-black text-ink dark:text-white">What was the question?</p>
      </div>
    );
  }

  if (legacy.dialogue) {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        <DialogueStack dialogue={legacy.dialogue} />
        {legacy.dialogue.remainder.length ? (
          <section className="rounded-2xl border-l-4 border-clay bg-linen/55 px-5 py-4 text-left dark:bg-white/[0.04]">
            <Eyebrow>Detective question</Eyebrow>
            <p className="mt-2 text-xl font-black leading-snug text-ink dark:text-white">{legacy.dialogue.remainder.join(' ')}</p>
          </section>
        ) : (
          <div className="text-center">
            <Eyebrow>Look for clues</Eyebrow>
            <p className="mt-2 text-xl font-black text-ink dark:text-white">What can you infer?</p>
          </div>
        )}
      </div>
    );
  }

  if (legacy.quotedPrompt) {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        <blockquote className="rounded-[1.75rem] border border-ink/10 bg-linen/55 px-6 py-8 text-center text-3xl font-black leading-tight text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white sm:text-4xl">
          “{legacy.quotedPrompt.quote}”
        </blockquote>
        <p className="text-center text-xl font-black leading-snug text-ink dark:text-white sm:text-2xl">{legacy.quotedPrompt.question}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5 text-center">
      <Eyebrow>Find the clue</Eyebrow>
      <Prompt>{legacy.text}</Prompt>
    </div>
  );
}

function ChoiceTradeoff({ legacy }) {
  if (legacy.phraseAuction) {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-5">
        <div className="text-center">
          <Eyebrow>Situation</Eyebrow>
          <p className="mt-2 text-2xl font-black text-ink dark:text-white sm:text-3xl">{legacy.phraseAuction.situation}</p>
          {legacy.phraseAuction.budget ? <p className="mt-2 text-sm font-black uppercase tracking-[0.12em] text-ink/45 dark:text-white/45">Budget: {legacy.phraseAuction.budget}</p> : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {legacy.phraseAuction.phrases.map((phrase, index) => (
            <div key={phrase + '-' + index} className="rounded-2xl border border-ink/10 bg-white px-4 py-4 text-left text-base font-black text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white">
              {phrase}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (legacy.tradeoff) {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-6 text-center">
        <div>
          <Eyebrow>Choose {legacy.tradeoff.count}</Eyebrow>
          <p className="mt-2 text-2xl font-black text-ink dark:text-white sm:text-3xl">For {legacy.tradeoff.context}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {legacy.tradeoff.options.map((option) => <Token key={option}>{option}</Token>)}
        </div>
        <p className="text-lg font-black text-ink/70 dark:text-white/70">You cannot keep everything. Defend the trade-off.</p>
      </div>
    );
  }

  if (legacy.difference) {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-6 text-center">
        <Eyebrow>Explain the difference</Eyebrow>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="rounded-[1.75rem] border border-ink/10 bg-white px-5 py-7 text-3xl font-black text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white">{legacy.difference.left}</div>
          <span className="text-sm font-black uppercase tracking-[0.12em] text-ink/35 dark:text-white/35">vs</span>
          <div className="rounded-[1.75rem] border border-ink/10 bg-white px-5 py-7 text-3xl font-black text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white">{legacy.difference.right}</div>
        </div>
      </div>
    );
  }

  if (legacy.labelledChoices) {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-5">
        {legacy.labelledChoices.intro ? <p className="text-center text-xl font-black leading-snug text-ink dark:text-white sm:text-2xl">{legacy.labelledChoices.intro}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {legacy.labelledChoices.choices.map((choice) => (
            <section key={choice.key} className="grid min-h-28 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-ink/10 bg-white p-4 text-left dark:border-white/10 dark:bg-white/[0.05]">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-clay text-sm font-black text-white">{choice.key}</span>
              <p className="text-lg font-black leading-snug text-ink dark:text-white">{choice.text}</p>
            </section>
          ))}
        </div>
      </div>
    );
  }

  if (legacy.variant === 'odd_one_out' && legacy.dotOptions) {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-5">
        <Eyebrow>Which one is the odd one out?</Eyebrow>
        <div className="grid gap-3 sm:grid-cols-2">
          {legacy.dotOptions.map((choice, index) => (
            <div key={choice + '-' + index} className="grid min-h-28 place-items-center rounded-2xl border border-ink/10 bg-white p-5 text-center text-2xl font-black text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white">
              {choice}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5 text-center">
      <Eyebrow>{legacy.variant === 'stance' ? 'Take a position' : 'Make your choice'}</Eyebrow>
      <Prompt>{legacy.text}</Prompt>
    </div>
  );
}

function TransformRepair({ legacy }) {
  if (legacy.badGood) {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-4 sm:grid-cols-2">
        <section className="rounded-[1.75rem] border border-clay/25 bg-clay/[0.06] p-5 text-center">
          <Eyebrow>Bad</Eyebrow>
          <p className="mt-4 text-2xl font-black leading-snug text-ink dark:text-white sm:text-3xl">{legacy.badGood.bad}</p>
        </section>
        <section className="rounded-[1.75rem] border border-ink/10 bg-white p-5 text-center dark:border-white/10 dark:bg-white/[0.05]">
          <Eyebrow>Good</Eyebrow>
          <p className="mt-4 text-2xl font-black leading-snug text-ink dark:text-white sm:text-3xl">{legacy.badGood.good}</p>
        </section>
      </div>
    );
  }

  const actions = {
    naturalise: 'Say it like a real person.',
    soften: 'Make it softer without losing the message.',
    clarify: 'Make it clearer without making it rude.',
    specificity: 'Make it concrete.',
    repair: 'Repair the conversation.',
    three_ways: 'Say it three different ways.',
    upgrade: 'Upgrade the answer.',
    personalise: 'Make it specific to a real or invented person.',
    complaint_ladder: 'Build the complaint from polite to firm.',
  };
  const action = actions[legacy.variant] || 'Make it better.';

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <section className="rounded-[1.75rem] border border-ink/10 bg-linen/55 px-5 py-7 text-center dark:border-white/10 dark:bg-white/[0.05] sm:px-7">
        <Eyebrow>Original</Eyebrow>
        <div className="mt-3"><Prompt>{legacy.text}</Prompt></div>
      </section>
      <p className="text-center text-xl font-black text-ink dark:text-white sm:text-2xl">{action}</p>
    </div>
  );
}

function RapidFluency({ legacy }) {
  if (legacy.firstFollowup) {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-4">
        <section className="rounded-2xl border border-ink/10 bg-white px-5 py-5 dark:border-white/10 dark:bg-white/[0.05]">
          <Eyebrow>First</Eyebrow>
          <p className="mt-2 text-2xl font-black leading-snug text-ink dark:text-white">{legacy.firstFollowup.first}</p>
        </section>
        <section className="rounded-2xl border border-clay/20 bg-clay/[0.06] px-5 py-5">
          <Eyebrow>Then go deeper</Eyebrow>
          <p className="mt-2 text-2xl font-black leading-snug text-ink dark:text-white">{legacy.firstFollowup.followup}</p>
        </section>
      </div>
    );
  }

  const time = legacy.variant === 'thirty_seconds' ? '30 seconds' : legacy.variant === 'one_minute' ? '1 minute' : '';
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 text-center">
      {time ? <div className="mx-auto rounded-full border border-clay/25 bg-clay/[0.08] px-5 py-2 text-sm font-black uppercase tracking-[0.12em] text-clay">{time}</div> : null}
      <Prompt>{legacy.text}</Prompt>
    </div>
  );
}

function StorySequence({ legacy }) {
  if (legacy.variant === 'three_stage') {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-5 text-center">
        <Prompt>{legacy.text}</Prompt>
        <div className="grid gap-3 sm:grid-cols-3">
          {['Before', 'During', 'After'].map((stage, index) => (
            <div key={stage} className="rounded-2xl border border-ink/10 bg-white px-4 py-5 dark:border-white/10 dark:bg-white/[0.05]">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-clay">{index + 1}. {stage}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5 text-center">
      <Eyebrow>{legacy.variant === 'pitch' ? 'Your pitch' : 'Story seed'}</Eyebrow>
      <Prompt>{legacy.text}</Prompt>
    </div>
  );
}

export default function SpeakingPromptContent({ item, config, showSupport = false }) {
  if (STRUCTURED_FORMATS.has(item?.format)) {
    return <SpeakingRoundContent round={projectSpeakingRoundForLearner(item)} showSupport={showSupport} />;
  }

  const legacy = adaptLegacySpeakingItem(item, config);

  if (legacy.family === 'constraint_focus') return <ConstraintFocus legacy={legacy} />;
  if (legacy.family === 'dialogue_inference') return <Inference legacy={legacy} />;
  if (legacy.family === 'choice_tradeoff') return <ChoiceTradeoff legacy={legacy} />;
  if (legacy.family === 'transform_repair') return <TransformRepair legacy={legacy} />;
  if (legacy.family === 'rapid_fluency') return <RapidFluency legacy={legacy} />;
  if (legacy.family === 'story_sequence') return <StorySequence legacy={legacy} />;
  return <SituationResponse legacy={legacy} />;
}
