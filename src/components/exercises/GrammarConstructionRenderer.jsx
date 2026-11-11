import React, { useEffect, useState } from 'react';
import ExerciseQuestionRendererV2 from './ExerciseQuestionRendererV2.jsx';

/**
 * Common learner presentation for grammar construction.
 * Answer interaction and grading stay with the existing validated runtime:
 * word_order (tiles), translation (constrained typing), content_block (oral).
 */
export default function GrammarConstructionRenderer(props) {
  const question = props.item?.question || {};
  const grammar = question.content?.grammar || {};
  const [showHint, setShowHint] = useState(false);
  useEffect(() => setShowHint(false), [question.client_key, props.item?.id]);
  const oral = grammar.mode === 'oral';
  const hasSupport = Boolean(grammar.target_pattern || grammar.learner_hint);
  return (
    <div className="grid gap-4">
      <div className="border-l-4 border-orange-500 pl-4">
        <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">
          Grammar in Action · {oral ? 'Speak' : grammar.mode === 'typed' ? 'Construct' : 'Build'}
        </p>
        {grammar.context ? <p className="mt-2 whitespace-pre-wrap text-base font-semibold leading-7 text-ink dark:text-white">{grammar.context}</p> : null}
      </div>
      {oral ? (
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <h3 className="text-lg font-black text-ink dark:text-white">{question.prompt}</h3>
          {question.instructions ? <p className="mt-2 text-sm font-semibold leading-6 text-ink/70 dark:text-white/70">{question.instructions}</p> : null}
          <p className="mt-4 text-xs font-bold text-ink/55 dark:text-white/55">
            Say your response aloud. Your teacher can give corrections before you try again.
          </p>
        </div>
      ) : <ExerciseQuestionRendererV2 {...props} />}
      {hasSupport ? (
        <div className="justify-self-start">
          <button type="button" onClick={() => setShowHint((current) => !current)}
            aria-expanded={showHint}
            className="focus-ring rounded-full border border-orange-300 px-4 py-2 text-xs font-black text-orange-800 dark:border-orange-300/30 dark:text-orange-200">
            {showHint ? 'Hide language support' : 'Show language support'}
          </button>
          {showHint ? (
            <div className="mt-3 grid gap-2 rounded-xl bg-orange-50 px-4 py-3 text-sm font-semibold leading-6 text-ink dark:bg-orange-300/[0.07] dark:text-white">
              {grammar.target_pattern ? <p><strong>Pattern:</strong> {grammar.target_pattern}</p> : null}
              {grammar.learner_hint ? <p>{grammar.learner_hint}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
