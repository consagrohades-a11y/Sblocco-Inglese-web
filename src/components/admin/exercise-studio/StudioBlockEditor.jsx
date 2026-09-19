import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { getStudioBlockDefinition } from '../../../lib/exerciseStudioBlockRegistry.js';

function Label({ children, hint }) {
  return (
    <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.08em] text-ink/65 dark:text-white/65">
      <span>{children}</span>
      {hint ? <span className="normal-case tracking-normal font-semibold text-ink/45 dark:text-white/45">{hint}</span> : null}
    </label>
  );
}

function TextInput({ label, value, onChange, placeholder = '', hint = '' }) {
  return (
    <Label hint={hint}>
      {label}
      <input
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="focus-ring rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-ink shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
      />
    </Label>
  );
}

function TextArea({ label, value, onChange, placeholder = '', rows = 5, hint = '' }) {
  return (
    <Label hint={hint}>
      {label}
      <textarea
        rows={rows}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="focus-ring resize-y rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-semibold leading-6 normal-case tracking-normal text-ink shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
      />
    </Label>
  );
}

function SelectInput({ label, value, onChange, options, hint = '' }) {
  return (
    <Label hint={hint}>
      {label}
      <select
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        className="focus-ring rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-ink shadow-sm dark:border-white/10 dark:bg-surface-900 dark:text-white"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </Label>
  );
}

function NumberInput({ label, value, onChange, min = 0, hint = '' }) {
  return (
    <Label hint={hint}>
      {label}
      <input
        type="number"
        min={min}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
        className="focus-ring rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-ink shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
      />
    </Label>
  );
}

function StringListEditor({ label, items = [], onChange, placeholder = 'Add item', hint = '' }) {
  const values = Array.isArray(items) ? items : [];
  function update(index, value) {
    onChange(values.map((item, current) => current === index ? value : item));
  }
  function remove(index) {
    onChange(values.filter((_, current) => current !== index));
  }
  return (
    <div className="grid gap-2">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.08em] text-ink/65 dark:text-white/65">{label}</p>
        {hint ? <p className="mt-1 text-xs font-semibold leading-5 text-ink/45 dark:text-white/45">{hint}</p> : null}
      </div>
      {values.map((item, index) => (
        <div key={index} className="flex gap-2">
          <input
            value={item || ''}
            onChange={(event) => update(index, event.target.value)}
            placeholder={placeholder}
            className="focus-ring min-w-0 flex-1 rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
          />
          <button type="button" onClick={() => remove(index)} className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-ink/10 text-ink/55 hover:bg-red-50 hover:text-red-700 dark:border-white/10 dark:text-white/55 dark:hover:bg-red-300/10 dark:hover:text-red-200" aria-label="Remove item">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...values, ''])}
        className="focus-ring inline-flex w-fit items-center gap-2 rounded-full border border-orange-300 px-3 py-2 text-xs font-black text-orange-800 hover:bg-orange-50 dark:border-orange-300/30 dark:text-orange-200 dark:hover:bg-orange-300/[0.08]"
      >
        <Plus className="h-3.5 w-3.5" /> Add
      </button>
    </div>
  );
}

function VocabularyEditor({ items = [], onChange }) {
  const values = Array.isArray(items) ? items : [];
  function patch(index, patchValue) {
    onChange(values.map((item, current) => current === index ? { ...item, ...patchValue } : item));
  }
  return (
    <div className="grid gap-3">
      <p className="text-xs font-black uppercase tracking-[0.08em] text-ink/65 dark:text-white/65">Vocabulary items</p>
      {values.map((item, index) => (
        <div key={index} className="grid gap-2 rounded-2xl border border-ink/10 bg-linen/25 p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <TextInput label="Term / chunk" value={item.term} onChange={(value) => patch(index, { term: value })} />
          <TextInput label="Meaning" value={item.meaning} onChange={(value) => patch(index, { meaning: value })} />
          <TextInput label="Italian support" value={item.translation} onChange={(value) => patch(index, { translation: value })} />
          <TextInput label="Example" value={item.example} onChange={(value) => patch(index, { example: value })} />
          <button type="button" onClick={() => onChange(values.filter((_, current) => current !== index))} className="focus-ring inline-flex w-fit items-center gap-2 text-xs font-black text-red-700 dark:text-red-200">
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...values, { term: '', meaning: '', translation: '', example: '' }])} className="focus-ring inline-flex w-fit items-center gap-2 rounded-full border border-orange-300 px-3 py-2 text-xs font-black text-orange-800 hover:bg-orange-50 dark:border-orange-300/30 dark:text-orange-200">
        <Plus className="h-3.5 w-3.5" /> Add word or chunk
      </button>
    </div>
  );
}

function MultipleChoiceEditor({ block, patch }) {
  const options = Array.isArray(block.options) ? block.options : [];
  function patchOption(index, optionPatch) {
    patch({ options: options.map((item, current) => current === index ? { ...item, ...optionPatch } : item) });
  }
  function chooseCorrect(index) {
    patch({ options: options.map((item, current) => ({ ...item, is_correct: current === index })) });
  }
  return (
    <>
      <TextArea label="Question" value={block.prompt} onChange={(value) => patch({ prompt: value })} rows={3} />
      <TextInput label="Learner instruction" value={block.instructions} onChange={(value) => patch({ instructions: value })} />
      <div className="grid gap-2">
        <p className="text-xs font-black uppercase tracking-[0.08em] text-ink/65 dark:text-white/65">Answers</p>
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => chooseCorrect(index)}
              className={`focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full border text-xs font-black ${option.is_correct ? 'border-orange-500 bg-orange-500 text-white' : 'border-ink/15 text-ink/45 dark:border-white/15 dark:text-white/45'}`}
              aria-label={option.is_correct ? 'Correct answer' : 'Mark as correct'}
              title={option.is_correct ? 'Correct answer' : 'Mark as correct'}
            >
              ✓
            </button>
            <input
              value={option.text || ''}
              onChange={(event) => patchOption(index, { text: event.target.value })}
              className="focus-ring min-w-0 flex-1 rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
              placeholder={`Answer ${index + 1}`}
            />
            <button type="button" onClick={() => patch({ options: options.filter((_, current) => current !== index) })} className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink/45 hover:bg-red-50 hover:text-red-700 dark:text-white/45 dark:hover:bg-red-300/10 dark:hover:text-red-200" aria-label="Remove answer">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => patch({ options: [...options, { text: '', is_correct: false }] })} className="focus-ring inline-flex w-fit items-center gap-2 rounded-full border border-orange-300 px-3 py-2 text-xs font-black text-orange-800 dark:border-orange-300/30 dark:text-orange-200">
          <Plus className="h-3.5 w-3.5" /> Add answer
        </button>
      </div>
      <TextArea label="Feedback explanation" value={block.feedback?.explanation || ''} onChange={(value) => patch({ feedback: { ...(block.feedback || {}), explanation: value } })} rows={3} hint="Explain why, rather than just repeating the answer." />
    </>
  );
}

function GapFillEditor({ block, patch }) {
  const blanks = Array.isArray(block.blanks) ? block.blanks : [];
  function patchBlank(index, blankPatch) {
    patch({ blanks: blanks.map((item, current) => current === index ? { ...item, ...blankPatch } : item) });
  }
  return (
    <>
      <TextInput label="Prompt" value={block.prompt} onChange={(value) => patch({ prompt: value })} />
      <TextArea
        label="Sentence / text"
        value={block.text_template}
        onChange={(value) => patch({ text_template: value })}
        rows={4}
        hint="Use [[blank_1]], [[blank_2]] etc. The system owns the gap keys."
      />
      <div className="grid gap-3">
        {blanks.map((blank, index) => (
          <div key={index} className="grid gap-2 rounded-2xl border border-ink/10 bg-linen/25 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-xs font-black text-orange-700 dark:text-orange-300">Gap {index + 1} · [[blank_{index + 1}]]</p>
            <StringListEditor
              label="Accepted answers"
              items={blank.accepted_answers || []}
              onChange={(accepted_answers) => patchBlank(index, { accepted_answers })}
              placeholder="Accepted answer"
            />
            <button type="button" onClick={() => patch({ blanks: blanks.filter((_, current) => current !== index) })} className="focus-ring inline-flex w-fit items-center gap-2 text-xs font-black text-red-700 dark:text-red-200">
              <Trash2 className="h-3.5 w-3.5" /> Remove gap
            </button>
          </div>
        ))}
        <button type="button" onClick={() => patch({ blanks: [...blanks, { accepted_answers: [] }] })} className="focus-ring inline-flex w-fit items-center gap-2 rounded-full border border-orange-300 px-3 py-2 text-xs font-black text-orange-800 dark:border-orange-300/30 dark:text-orange-200">
          <Plus className="h-3.5 w-3.5" /> Add gap
        </button>
      </div>
    </>
  );
}

function MediaEditor({ block, patch }) {
  return (
    <>
      <TextInput label="Title" value={block.title} onChange={(value) => patch({ title: value })} />
      <TextInput label="Learner instruction" value={block.instructions} onChange={(value) => patch({ instructions: value })} />
      <SelectInput
        label="Media type"
        value={block.source_type || 'audio'}
        onChange={(value) => patch({ source_type: value })}
        options={[['audio', 'Audio'], ['video', 'Direct video'], ['youtube', 'YouTube']]}
      />
      <TextInput label="Media URL" value={block.url} onChange={(value) => patch({ url: value })} placeholder="https://..." />
      <details className="rounded-xl border border-ink/10 p-3 dark:border-white/10">
        <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.08em] text-ink/65 dark:text-white/65">Private Storage / clip settings</summary>
        <div className="mt-3 grid gap-3">
          <TextInput label="Storage bucket" value={block.storage_bucket} onChange={(value) => patch({ storage_bucket: value })} />
          <TextInput label="Storage path" value={block.storage_path} onChange={(value) => patch({ storage_path: value })} />
          <div className="grid grid-cols-2 gap-2">
            <NumberInput label="Start seconds" value={block.start_seconds} onChange={(value) => patch({ start_seconds: value })} />
            <NumberInput label="End seconds" value={block.end_seconds} onChange={(value) => patch({ end_seconds: value })} />
          </div>
        </div>
      </details>
      <TextArea label="Transcript" value={block.transcript} onChange={(value) => patch({ transcript: value })} rows={6} />
      <SelectInput
        label="Transcript visibility"
        value={block.transcript_visibility || 'after_submit'}
        onChange={(value) => patch({ transcript_visibility: value })}
        options={[['after_submit', 'Reveal after completing / submitting'], ['always', 'Available immediately'], ['never', 'Never show']]}
      />
    </>
  );
}

function WritingEditor({ block, patch }) {
  return (
    <>
      <TextArea label="Writing prompt" value={block.prompt} onChange={(value) => patch({ prompt: value })} rows={4} />
      <TextArea label="Context" value={block.context} onChange={(value) => patch({ context: value })} rows={3} />
      <StringListEditor label="Required points" items={block.required_points || []} onChange={(required_points) => patch({ required_points })} />
      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="Min words" value={block.min_words} min={1} onChange={(value) => patch({ min_words: value })} />
        <NumberInput label="Max words" value={block.max_words} min={1} onChange={(value) => patch({ max_words: value })} />
      </div>
      <p className="text-xs font-semibold leading-5 text-ink/50 dark:text-white/50">A safe default review rubric is created automatically. Rich inline teacher correction is a later Studio layer.</p>
    </>
  );
}

function TheoryEditor({ block, patch }) {
  if (block.type === 'examples') {
    return (
      <>
        <TextInput label="Heading" value={block.title} onChange={(value) => patch({ title: value })} />
        <StringListEditor label="Examples" items={block.examples || []} onChange={(examples) => patch({ examples })} />
      </>
    );
  }
  if (block.type === 'do_dont') {
    return (
      <>
        <TextInput label="Heading" value={block.title} onChange={(value) => patch({ title: value })} />
        <TextInput label="DON'T" value={block.wrong} onChange={(value) => patch({ wrong: value })} />
        <TextInput label="DO" value={block.correct} onChange={(value) => patch({ correct: value })} />
        <TextArea label="WHY" value={block.why} onChange={(value) => patch({ why: value })} rows={4} />
      </>
    );
  }
  if (block.type === 'contrast') {
    return (
      <>
        <TextInput label="Heading" value={block.title} onChange={(value) => patch({ title: value })} />
        <TextInput label="Left label" value={block.left_label} onChange={(value) => patch({ left_label: value })} />
        <TextArea label="Left side" value={block.left_body} onChange={(value) => patch({ left_body: value })} rows={3} />
        <TextInput label="Right label" value={block.right_label} onChange={(value) => patch({ right_label: value })} />
        <TextArea label="Right side" value={block.right_body} onChange={(value) => patch({ right_body: value })} rows={3} />
        <TextArea label="Explanation" value={block.body} onChange={(value) => patch({ body: value })} rows={3} />
      </>
    );
  }
  if (block.type === 'vocabulary') {
    return (
      <>
        <TextInput label="Heading" value={block.title} onChange={(value) => patch({ title: value })} />
        <TextArea label="Intro" value={block.body} onChange={(value) => patch({ body: value })} rows={3} />
        <VocabularyEditor items={block.items || []} onChange={(items) => patch({ items })} />
      </>
    );
  }
  if (block.type === 'language_bank' || block.type === 'pronunciation' || block.type === 'recap') {
    return (
      <>
        <TextInput label="Heading" value={block.title} onChange={(value) => patch({ title: value })} />
        <TextArea label="Intro / explanation" value={block.body} onChange={(value) => patch({ body: value })} rows={3} />
        <StringListEditor label={block.type === 'recap' ? 'Checklist points' : 'Items'} items={block.items || []} onChange={(items) => patch({ items })} />
      </>
    );
  }
  if (block.type === 'dialogue') {
    const turns = Array.isArray(block.turns) ? block.turns : [];
    return (
      <>
        <TextInput label="Heading" value={block.title} onChange={(value) => patch({ title: value })} />
        <TextArea label="Context" value={block.body} onChange={(value) => patch({ body: value })} rows={3} />
        <div className="grid gap-2">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-ink/65 dark:text-white/65">Dialogue turns</p>
          {turns.map((turn, index) => (
            <div key={index} className="grid grid-cols-[0.35fr_1fr_auto] gap-2">
              <input value={turn.speaker || ''} onChange={(event) => patch({ turns: turns.map((item, current) => current === index ? { ...item, speaker: event.target.value } : item) })} placeholder="Speaker" className="focus-ring min-w-0 rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white" />
              <input value={turn.text || ''} onChange={(event) => patch({ turns: turns.map((item, current) => current === index ? { ...item, text: event.target.value } : item) })} placeholder="Line" className="focus-ring min-w-0 rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white" />
              <button type="button" onClick={() => patch({ turns: turns.filter((_, current) => current !== index) })} className="focus-ring grid h-10 w-10 place-items-center rounded-xl text-ink/45 hover:bg-red-50 hover:text-red-700 dark:text-white/45"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <button type="button" onClick={() => patch({ turns: [...turns, { speaker: '', text: '' }] })} className="focus-ring inline-flex w-fit items-center gap-2 rounded-full border border-orange-300 px-3 py-2 text-xs font-black text-orange-800 dark:border-orange-300/30 dark:text-orange-200"><Plus className="h-3.5 w-3.5" /> Add turn</button>
        </div>
      </>
    );
  }
  return (
    <>
      <TextInput label="Heading" value={block.title} onChange={(value) => patch({ title: value })} />
      <TextArea label={block.type === 'rule' ? 'Rule' : block.type === 'tip' ? 'Tip' : 'Explanation'} value={block.body} onChange={(value) => patch({ body: value })} rows={6} />
      {block.type === 'rule' ? <StringListEditor label="Examples" items={block.examples || []} onChange={(examples) => patch({ examples })} /> : null}
    </>
  );
}

export default function StudioBlockEditor({ block, issues = [], onChange, onDelete }) {
  const definition = getStudioBlockDefinition(block?.type);
  if (!block || !definition) {
    return <div className="p-5 text-sm font-semibold text-ink/60 dark:text-white/60">Select a supported block to edit it.</div>;
  }

  function patch(value) {
    onChange({ ...block, ...value });
  }

  return (
    <div className="grid gap-5">
      <div className="border-b border-ink/10 pb-4 dark:border-white/10">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">{definition.category}</p>
        <h2 className="mt-1 text-xl font-black text-ink dark:text-white">{definition.label}</h2>
      </div>

      {issues.length ? (
        <div className="grid gap-2">
          {issues.map((item, index) => (
            <button
              key={index}
              type="button"
              className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs font-bold leading-5 text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100"
            >
              {item.message}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4">
        {block.type === 'multiple_choice' ? <MultipleChoiceEditor block={block} patch={patch} /> : null}
        {block.type === 'gap_fill' ? <GapFillEditor block={block} patch={patch} /> : null}
        {block.type === 'word_order' ? (
          <>
            <TextInput label="Prompt" value={block.prompt} onChange={(value) => patch({ prompt: value })} />
            <StringListEditor label="Movable chunks in the correct order" items={block.chunks || []} onChange={(chunks) => patch({ chunks })} hint="Multiword chunks stay together. Learners will see a stable randomized starting order." />
            <TextInput label="Final punctuation" value={block.terminal_punctuation} onChange={(value) => patch({ terminal_punctuation: value })} placeholder="?" />
          </>
        ) : null}
        {block.type === 'written_response' ? <WritingEditor block={block} patch={patch} /> : null}
        {block.type === 'media' ? <MediaEditor block={block} patch={patch} /> : null}
        {definition.category === 'theory' ? <TheoryEditor block={block} patch={patch} /> : null}
      </div>

      <details className="border-t border-ink/10 pt-4 dark:border-white/10">
        <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.08em] text-ink/45 dark:text-white/45">Advanced teaching metadata</summary>
        <div className="mt-4 grid gap-3">
          <TextInput label="Learning objective" value={block.learning_objective || ''} onChange={(value) => patch({ learning_objective: value })} />
          <TextInput label="Topic override" value={block.topic || ''} onChange={(value) => patch({ topic: value })} hint="Normally inherited from the activity." />
          <TextInput label="Tags" value={(block.tags || []).join(', ')} onChange={(value) => patch({ tags: value.split(',').map((item) => item.trim()).filter(Boolean) })} />
        </div>
      </details>

      <button type="button" onClick={onDelete} className="focus-ring inline-flex w-fit items-center gap-2 text-xs font-black text-red-700 dark:text-red-200">
        <Trash2 className="h-4 w-4" /> Delete block
      </button>
    </div>
  );
}
