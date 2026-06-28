import React, { useMemo } from 'react';

export default function DialogueGapFill({ exercise, answers, setAnswer, disabled = false }) {
  const itemsById = useMemo(
    () => Object.fromEntries((exercise.items || []).map((item) => [item.id, item])),
    [exercise.items],
  );

  return (
    <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm">
      <div className="grid gap-3">
        {(exercise.lines || []).map((line, lineIndex) => (
          <p key={`${line.speaker || 'line'}-${lineIndex}`} className="text-base leading-9 text-ink">
            {line.speaker ? <span className="mr-2 font-black text-moss">{line.speaker}:</span> : null}
            {(line.parts || []).map((part, partIndex) => {
              if (typeof part === 'string') {
                return <React.Fragment key={`${lineIndex}-${partIndex}`}>{part}</React.Fragment>;
              }

              const item = itemsById[part.blankId];
              if (!item) {
                return <span key={`${lineIndex}-${partIndex}`} className="mx-1 text-coral">[missing blank]</span>;
              }

              return (
                <React.Fragment key={item.id}>
                  <input
                    className="focus-ring mx-1 inline-block w-28 rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-center text-sm font-black text-ink"
                    name={item.id}
                    aria-label={item.prompt || item.id}
                    value={answers[item.id] ?? ''}
                    onChange={(event) => setAnswer(item.id, event.target.value)}
                    required
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
        ))}
      </div>
    </div>
  );
}

