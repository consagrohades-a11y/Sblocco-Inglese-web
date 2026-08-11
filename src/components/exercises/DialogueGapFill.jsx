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
    <div className="exercise-dialogue">
        {(exercise.lines || []).map((line, lineIndex) => {
          const lineItemIds = (line.parts || [])
            .filter((part) => typeof part !== 'string' && part.blankId)
            .map((part) => part.blankId);

          return (
            <div key={`${line.speaker || 'line'}-${lineIndex}`} className="exercise-dialogue-turn">
              <p className="exercise-dialogue-turn__speaker">{line.speaker || `Turno ${lineIndex + 1}`}</p>
              <div className="exercise-dialogue-turn__body">
              <p className="text-base leading-9 text-ink dark:text-white">
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
                        className="focus-ring exercise-inline-gap mx-1 inline-block px-3 py-1.5 text-center text-sm font-black"
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
            </div>
          );
        })}
    </div>
  );
}
