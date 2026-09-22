import React from 'react';

export function learnerQuickFactParts(learner, { includeNote = true } = {}) {
  if (!learner) return [];

  const parts = [];
  const profession = String(learner.profession || '').trim();
  const age = Number(learner.age);
  const note = String(learner.admin_context_note || '').trim();

  if (profession) parts.push(profession);
  if (Number.isFinite(age) && age > 0) parts.push(`${age} anni`);
  if (includeNote && note) parts.push(note);

  return parts;
}

export function learnerContextSeed(learner) {
  return learnerQuickFactParts(learner, { includeNote: false }).join(' · ');
}

export default function LearnerQuickFacts({
  learner,
  includeNote = true,
  fallback = null,
  className = '',
  separatorClassName = '',
}) {
  const parts = learnerQuickFactParts(learner, { includeNote });

  if (!parts.length) return fallback;

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`.trim()}>
      {parts.map((part, index) => (
        <React.Fragment key={`${part}-${index}`}>
          <span>{part}</span>
          {index < parts.length - 1 ? (
            <span aria-hidden="true" className={`font-black opacity-45 ${separatorClassName}`.trim()}>·</span>
          ) : null}
        </React.Fragment>
      ))}
    </span>
  );
}
