import React, { useMemo } from 'react';
import InlineExerciseFeedback from './InlineExerciseFeedback';

export default function DialogueGapFill({
  exercise,
  answers,
  setAnswer,
  disabled = false,
  attemptItemsById = {},
}) {
  const itemsById = useMemo(
    () => Object.fromEntries((exercise.items || []).map((item) => [item.id, item])),
    [exercise.items],
  );

  // TODO: Future dialogue variants must select lines and items together as complete scenario bundles.
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm">
      <div className="grid gap-4">
        {(exercise.lines || []).map((line, lineIndex) => {
          const lineItemIds = (line.parts || [])
            .filter((part) => typeof part !== 'string' && part.blankId)
            .map((part) => part.blankId);

          return (
            <div key={`${line.speaker || 'line'}-${lineIndex}`}>
              <p className="text-base leading-9 text-ink">
                {line.speaker ? <span className="mr-2 font-black text-moss">{line.speaker}:</span> : null}
                {(line.parts || []).map((part, partIndex) => {
                  if (typeof part === 'string') {
                    return <React.Fragment key={`${lineIndex}-${partIndex}`}>{part}</React.Fragment>;
                  }

                  const item = itemsById[part.blankId];
                  if (!item) {
                    return <span key={`${lineIndex}-${partIndex}`} className="mx-1 text-coral">[spazio mancante]</span>;
                  }

                  return (
                    <React.Fragment key={item.id}>
                      <input
                        className="focus-ring mx-1 inline-block w-28 rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-center text-sm font-black text-ink"
                        name={item.id}
                        aria-label={item.prompt || item.id}
                        value={answers[item.id] ?? ''}
                        onChange={(event) => setAnswer(item.id, event.target.value)}
                        disabled={disabled}
                        autoComplete="off"
                        placeholder="..."
                      />
                      {item.baseForm ? (
                        <span className="mx-1 rounded-full bg-butter px-2 py-0.5 text-xs font-black text-ink">
                          ({item.baseForm})
                        </span>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </p>
              {lineItemIds.map((itemId) => (
                <InlineExerciseFeedback key={itemId} item={attemptItemsById[itemId]} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
