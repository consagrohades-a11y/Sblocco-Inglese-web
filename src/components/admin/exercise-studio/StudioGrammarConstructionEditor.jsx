import React from 'react';

const inputClass = 'focus-ring w-full min-w-0 rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm font-semibold text-ink dark:border-white/15 dark:bg-white/[0.05] dark:text-white';

function Field({ label, hint, children }) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="text-xs font-black uppercase tracking-[0.07em] text-ink/65 dark:text-white/65">{label}</span>
      {children}
      {hint ? <span className="text-xs font-medium leading-5 text-ink/50 dark:text-white/50">{hint}</span> : null}
    </label>
  );
}
function TextField({ label, value, onChange, hint, multiline = false, placeholder = '' }) {
  return <Field label={label} hint={hint}>{multiline
    ? <textarea className={inputClass} rows={3} value={value || ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    : <input className={inputClass} value={value || ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />}
  </Field>;
}
function StringItems({ label, values = [], onChange, hint }) {
  return <div className="grid gap-2">
    <Field label={label} hint={hint}>
      <span className="sr-only">List of {label.toLowerCase()}</span>
    </Field>
    {values.map((item, index) => (
      <div key={index} className="flex items-center gap-2">
        <input
          className={inputClass} value={item} aria-label={label + ' ' + (index + 1)}
          onChange={(event) => onChange(values.map((value, i) => i === index ? event.target.value : value))}
        />
        <button type="button" aria-label={'Remove item ' + (index + 1)} onClick={() => onChange(values.filter((_, i) => i !== index))}
          className="shrink-0 rounded-lg border border-ink/15 px-3 py-2 text-xs font-bold text-ink/65 dark:border-white/15 dark:text-white/70">Remove</button>
      </div>
    ))}
    <button type="button" onClick={() => onChange([...values, ''])}
      className="w-fit rounded-full border border-orange-400 px-3 py-2 text-xs font-black text-orange-800 dark:text-orange-200">+ Add item</button>
  </div>;
}

export default function StudioGrammarConstructionEditor({ block, onChange }) {
  const patch = (next) => onChange(next);
  return <div className="grid gap-4">
    <div className="rounded-xl border-l-4 border-orange-500 bg-orange-50 px-3 py-3 text-xs font-semibold leading-5 text-ink dark:bg-orange-300/[0.07] dark:text-white">
      Build a real sentence. Tiles and constrained typing use automatic grading;
      free oral production remains teacher-led. The same block renders in Studio preview and the learner player.
    </div>
    <TextField label="Block heading" value={block.title} onChange={(title) => patch({ title })} />
    <Field label="Construction mode">
      <select className={inputClass} value={block.mode || 'tiles'} onChange={(event) => patch({ mode: event.target.value })}>
        <option value="tiles">Move and reorder chunks · automatically graded</option>
        <option value="typed">Type one constrained sentence · automatically graded</option>
        <option value="oral">Build and say a sentence · teacher-led</option>
      </select>
    </Field>
    <TextField label="Student task" value={block.prompt} multiline onChange={(prompt) => patch({ prompt })}
      placeholder="Turn these facts into a question about yesterday." />
    <TextField label="Student instruction" value={block.instructions} onChange={(instructions) => patch({ instructions })}
      placeholder="Build a sentence that expresses the intended meaning." />
    <TextField label="Meaning / facts provided" value={block.context} multiline onChange={(context) => patch({ context })}
      hint="Useful facts, short Italian meaning, or a situation. Do not give the correct answer away." />
    <TextField label="Target pattern (optional)" value={block.target_pattern} onChange={(target_pattern) => patch({ target_pattern })}
      hint="A grammar label, not the solution. Example: past continuous + when + past simple." />
    <TextField label="Optional learner hint" value={block.learner_hint} onChange={(learner_hint) => patch({ learner_hint })}
      hint="Learners may reveal this when they need support." />
    {block.mode === 'tiles' ? <>
      <StringItems label="Chunks in correct order" values={block.chunks || []} onChange={(chunks) => patch({ chunks })}
        hint="One word or multiword chunk per row. The learner's bank is shuffled by the existing runtime." />
      <TextField label="Final punctuation" value={block.terminal_punctuation} onChange={(terminal_punctuation) => patch({ terminal_punctuation })}
        placeholder="." hint="Use only . ! or ?. Keep punctuation out of the movable chunks." />
    </> : null}
    {block.mode === 'typed' ? <StringItems label="Accepted answers" values={block.accepted_answers || []} onChange={(accepted_answers) => patch({ accepted_answers })}
      hint="Only use this for constrained tasks. List legitimate alternatives; open-ended speaking must not use exact-match grading." /> : null}
    {block.mode !== 'oral' ? <TextField label="Feedback: explain the grammar" value={block.explanation} multiline onChange={(explanation) => patch({ explanation })}
      hint="Explain the structural decision and meaning, not just the answer." /> : null}
    <details className="rounded-xl border border-ink/10 p-3 dark:border-white/10">
      <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-ink/65 dark:text-white/65">Private teacher guidance</summary>
      <div className="mt-3">
        <TextField label="Teacher note (never shown to learners)" value={block.teacher_note} multiline onChange={(teacher_note) => patch({ teacher_note })}
          hint="Typical errors, oral follow-ups or possible acceptable variants. Not included in published question content." />
      </div>
    </details>
  </div>;
}
