import React, { useRef, useState } from 'react';
import { FileAudio2, FileVideo2, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { getStudioBlockDefinition } from '../../../lib/exerciseStudioBlockRegistry.js';
import StudioSelect from './StudioSelect.jsx';
import {
  deleteStudioContentMedia,
  uploadStudioContentMedia,
} from '../../../lib/exerciseStudioMediaApi.js';

function Label({ children, hint }) {
  return (
    <label className="flex w-full min-w-0 flex-col gap-1.5 text-xs font-black uppercase tracking-[0.08em] text-ink/65 dark:text-white/65">
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
        className="focus-ring w-full min-w-0 rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-ink shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
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
        className="focus-ring w-full min-w-0 resize-y rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-semibold leading-6 normal-case tracking-normal text-ink shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
      />
    </Label>
  );
}

function SelectInput({ label, value, onChange, options, hint = '' }) {
  return (
    <Label hint={hint}>
      {label}
      <StudioSelect
        value={value || ''}
        onChange={onChange}
        options={options}
        ariaLabel={label}
      />
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
        className="focus-ring w-full min-w-0 rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-ink shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
      />
    </Label>
  );
}


function LongTextEditor({ label, value, onChange, hint = '', placeholder = '' }) {
  const [expanded, setExpanded] = useState(false);
  const textValue = value || '';
  return (
    <div className="grid min-w-0 gap-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-ink/65 dark:text-white/65">{label}</p>
          {hint ? <p className="mt-1 text-xs font-semibold leading-5 text-ink/45 dark:text-white/45">{hint}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[0.68rem] font-bold tabular-nums text-ink/40 dark:text-white/40">{textValue.length.toLocaleString()} characters</span>
          <button type="button" onClick={() => setExpanded((current) => !current)} className="focus-ring rounded-full border border-ink/10 px-2.5 py-1.5 text-[0.68rem] font-black text-ink/60 dark:border-white/10 dark:text-white/60">
            {expanded ? 'Compact' : 'Expand'}
          </button>
        </div>
      </div>
      <textarea
        value={textValue}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`focus-ring w-full min-w-0 resize-none overflow-y-auto overscroll-contain rounded-2xl border border-ink/10 bg-white px-3.5 py-3 text-sm font-semibold leading-6 normal-case tracking-normal text-ink shadow-sm [scrollbar-width:thin] dark:border-white/10 dark:bg-white/[0.05] dark:text-white ${expanded ? 'h-[32rem]' : 'h-64'}`}
      />
      <p className="text-[0.7rem] font-semibold leading-5 text-ink/40 dark:text-white/40">Scroll inside the transcript field. The full text remains stored.</p>
    </div>
  );
}

function StructuredContextEditor({ block, patch }) {
  return (
    <section className="grid min-w-0 gap-3 rounded-2xl border border-orange-200/70 bg-orange-50/45 p-4 dark:border-orange-300/15 dark:bg-orange-300/[0.04]">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.1em] text-orange-800 dark:text-orange-200">Context</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-ink/50 dark:text-white/50">Separate the situation from the learner’s role and goal so the task is easier to understand.</p>
      </div>
      <TextArea
        label="Situation / background"
        value={block.context_situation ?? block.context ?? ''}
        onChange={(value) => patch({ context_situation: value, context: value })}
        rows={4}
        placeholder="What is happening? What does the learner need to know before answering?"
      />
      <div className="grid min-w-0 gap-3">
        <TextInput label="Learner role" value={block.context_role || ''} onChange={(value) => patch({ context_role: value })} placeholder="e.g. You are a hotel receptionist" />
        <TextInput label="Audience / recipient" value={block.context_audience || ''} onChange={(value) => patch({ context_audience: value })} placeholder="e.g. A dissatisfied guest" />
      </div>
      <TextArea
        label="Goal / outcome"
        value={block.context_goal || ''}
        onChange={(value) => patch({ context_goal: value })}
        rows={3}
        placeholder="What should the learner achieve with the response?"
      />
    </section>
  );
}

function TranslationEditor({ block, patch }) {
  return (
    <>
      <TextArea label="Prompt / source text" value={block.prompt} onChange={(value) => patch({ prompt: value })} rows={4} />
      <TextInput label="Learner instruction" value={block.instructions} onChange={(value) => patch({ instructions: value })} placeholder="Translate naturally into English." />
      <StringListEditor
        label="Accepted answers"
        items={block.accepted_answers || []}
        onChange={(accepted_answers) => patch({ accepted_answers })}
        placeholder="One valid answer"
        hint="Add the natural alternatives you want automatic grading to accept."
      />
      <TextArea label="Feedback explanation" value={block.feedback?.explanation || ''} onChange={(value) => patch({ feedback: { ...(block.feedback || {}), explanation: value } })} rows={3} />
    </>
  );
}

function PracticeSelectionOptionsEditor({ options = [], onChange }) {
  const values = Array.isArray(options) ? options.map((option) => typeof option === 'string'
    ? { text: option, vocab_bank: false, vocab_kind: null }
    : option) : [];

  function patchOption(index, optionPatch) {
    onChange(values.map((option, current) => current === index ? { ...option, ...optionPatch } : option));
  }

  function remove(index) {
    onChange(values.filter((_, current) => current !== index));
  }

  return (
    <div className="grid min-w-0 gap-3">
      <div className="grid gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.08em] text-ink/65 dark:text-white/65">Options</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-ink/45 dark:text-white/45">
            Mark useful lexical items now so a separate vocabulary bank can use them later without re-editing the activity.
          </p>
        </div>
        {values.length ? (
          <div className="grid gap-2 rounded-2xl border border-orange-200/70 bg-orange-50/45 p-3 dark:border-orange-300/15 dark:bg-orange-300/[0.04]">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-orange-800 dark:text-orange-200">Bulk vocab controls</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onChange(values.map((option) => ({
                  ...option,
                  vocab_bank: true,
                  vocab_kind: option.vocab_kind || 'word',
                })))}
                className="focus-ring rounded-full border border-orange-300 bg-white px-3 py-2 text-[0.7rem] font-black text-orange-900 dark:border-orange-300/30 dark:bg-white/[0.04] dark:text-orange-100"
              >
                Add all to Vocab bank
              </button>
              <button
                type="button"
                onClick={() => onChange(values.map((option) => ({ ...option, vocab_bank: false, vocab_kind: null })))}
                className="focus-ring rounded-full border border-ink/10 bg-white px-3 py-2 text-[0.7rem] font-black text-ink/60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60"
              >
                Remove all
              </button>
              <button
                type="button"
                onClick={() => onChange(values.map((option) => ({ ...option, vocab_bank: true, vocab_kind: 'word' })))}
                className="focus-ring rounded-full border border-ink/10 bg-white px-3 py-2 text-[0.7rem] font-black text-ink dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
              >
                All → Word
              </button>
              <button
                type="button"
                onClick={() => onChange(values.map((option) => ({ ...option, vocab_bank: true, vocab_kind: 'chunk' })))}
                className="focus-ring rounded-full border border-ink/10 bg-white px-3 py-2 text-[0.7rem] font-black text-ink dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
              >
                All → Chunk
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {values.map((option, index) => (
        <div key={option.key || index} className="grid min-w-0 gap-2 rounded-2xl border border-ink/10 bg-linen/25 p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex min-w-0 items-center gap-2">
            <input
              value={option.text || ''}
              onChange={(event) => patchOption(index, { text: event.target.value })}
              placeholder={`Option ${index + 1}`}
              className="focus-ring min-w-0 flex-1 rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-semibold text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
            />
            <button type="button" onClick={() => remove(index)} className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-ink/10 text-ink/55 hover:bg-red-50 hover:text-red-700 dark:border-white/10 dark:text-white/55 dark:hover:bg-red-300/10 dark:hover:text-red-200" aria-label="Remove option">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ink/5 bg-white/65 px-3 py-2.5 dark:border-white/5 dark:bg-white/[0.025]">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-black text-ink/70 dark:text-white/70">
              <input
                type="checkbox"
                checked={Boolean(option.vocab_bank)}
                onChange={(event) => patchOption(index, {
                  vocab_bank: event.target.checked,
                  vocab_kind: event.target.checked ? (option.vocab_kind || 'word') : null,
                })}
              />
              Vocab bank
            </label>

            {option.vocab_bank ? (
              <div className="min-w-36 flex-1">
                <StudioSelect
                  value={option.vocab_kind || 'word'}
                  onChange={(value) => patchOption(index, { vocab_kind: value })}
                  options={[['word', 'Word'], ['chunk', 'Chunk']]}
                  ariaLabel={`Vocabulary bank type for option ${index + 1}`}
                />
              </div>
            ) : (
              <span className="text-[0.7rem] font-semibold text-ink/40 dark:text-white/40">Not saved for the future vocabulary bank.</span>
            )}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...values, { text: '', vocab_bank: false, vocab_kind: null }])}
        className="focus-ring inline-flex w-fit items-center gap-2 rounded-full border border-orange-300 px-3 py-2 text-xs font-black text-orange-800 hover:bg-orange-50 dark:border-orange-300/30 dark:text-orange-200 dark:hover:bg-orange-300/[0.08]"
      >
        <Plus className="h-3.5 w-3.5" /> Add option
      </button>
    </div>
  );
}

function PracticeSelectionEditor({ block, patch }) {
  return (
    <>
      <TextArea label="Prompt" value={block.prompt} onChange={(value) => patch({ prompt: value })} rows={3} />
      <TextInput label="Learner instruction" value={block.instructions} onChange={(value) => patch({ instructions: value })} placeholder="Select the expressions you would use." />
      <SelectInput
        label="Selection behaviour"
        value={block.selection_mode || 'multiple'}
        onChange={(value) => patch({ selection_mode: value })}
        options={[['single', 'Choose one'], ['multiple', 'Choose one or more']]}
        hint="There is no correct answer. The learner’s selection is simply saved."
      />
      <PracticeSelectionOptionsEditor
        options={block.options || []}
        onChange={(options) => patch({ options })}
      />
    </>
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

  function fieldLabel(label, tone = 'neutral') {
    const toneClass = tone === 'orange'
      ? 'text-orange-700 dark:text-orange-300'
      : tone === 'italian'
        ? 'text-sky-700 dark:text-sky-300'
        : 'text-ink/45 dark:text-white/45';
    return `text-[0.62rem] font-black uppercase tracking-[0.1em] ${toneClass}`;
  }

  return (
    <div className="grid min-w-0 gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.08em] text-ink/65 dark:text-white/65">Vocabulary items</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-ink/45 dark:text-white/45">
          Each word or chunk keeps a reusable pool of 3–5 natural contexts. Only one is shown in the lesson; the full pool follows the item into Bank and Replay.
        </p>
      </div>

      {values.map((item, index) => (
        <section
          key={index}
          className="overflow-hidden rounded-2xl border border-ink/10 bg-white/75 shadow-sm dark:border-white/10 dark:bg-white/[0.025]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-ink/10 bg-linen/45 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.035]">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-500 text-[0.65rem] font-black text-white">
                {index + 1}
              </span>
              <span className="text-[0.68rem] font-black uppercase tracking-[0.1em] text-ink/55 dark:text-white/55">Vocabulary item</span>
            </div>
            <button
              type="button"
              onClick={() => onChange(values.filter((_, current) => current !== index))}
              className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink/35 transition hover:bg-red-50 hover:text-red-700 dark:text-white/35 dark:hover:bg-red-300/10 dark:hover:text-red-200"
              aria-label={`Remove vocabulary item ${index + 1}`}
              title="Remove item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="grid min-w-0 gap-0">
            <label className="grid min-w-0 gap-1.5 border-b border-ink/10 px-3 py-3 dark:border-white/10">
              <span className={fieldLabel('Word / chunk', 'orange')}>Word / chunk</span>
              <input
                value={item.term || ''}
                onChange={(event) => patch(index, { term: event.target.value })}
                placeholder="e.g. where someone is coming from"
                className="focus-ring min-w-0 rounded-xl border border-orange-200 bg-orange-50/55 px-3 py-2.5 text-sm font-black text-ink shadow-sm dark:border-orange-300/20 dark:bg-orange-300/[0.055] dark:text-white"
              />
            </label>

            <div className="grid min-w-0 gap-1.5 border-b border-ink/10 px-3 py-3 dark:border-white/10">
              <span className={fieldLabel('Type')}>Word or chunk</span>
              <StudioSelect
                value={item.kind || ((item.term || '').trim().includes(' ') ? 'chunk' : 'word')}
                onChange={(value) => patch(index, { kind: value })}
                options={[['word', 'Word'], ['chunk', 'Chunk']]}
                ariaLabel={`Vocabulary type for item ${index + 1}`}
              />
            </div>

            <label className="grid min-w-0 gap-1.5 border-b border-ink/10 px-3 py-3 dark:border-white/10">
              <span className={fieldLabel('Meaning')}>Meaning</span>
              <textarea
                rows={2}
                value={item.meaning || ''}
                onChange={(event) => patch(index, { meaning: event.target.value })}
                placeholder="Explain what the expression means in clear English."
                className="focus-ring min-w-0 resize-y rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-semibold leading-6 text-ink shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
              />
            </label>

            <label className="grid min-w-0 gap-1.5 border-b border-ink/10 bg-sky-50/45 px-3 py-3 dark:border-white/10 dark:bg-sky-300/[0.035]">
              <span className={fieldLabel('Italian support', 'italian')}>Italian support</span>
              <input
                value={item.translation || ''}
                onChange={(event) => patch(index, { translation: event.target.value })}
                placeholder="Optional Italian gloss or support"
                className="focus-ring min-w-0 rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm font-bold text-ink shadow-sm dark:border-sky-300/20 dark:bg-white/[0.04] dark:text-white"
              />
            </label>

            <div className="grid min-w-0 gap-3 px-3 py-3">
              <StringListEditor
                label="Context pool"
                items={Array.isArray(item.examples) ? item.examples : item.example ? [item.example] : []}
                onChange={(examples) => patch(index, {
                  examples,
                  example: examples[Math.max(0, Math.min(examples.length - 1, Number(item.display_example_index) || 0))] || '',
                })}
                placeholder="A natural sentence using the target item"
                hint="Aim for 3–5 genuinely different contexts. Sblocco stores them all for future retrieval practice."
              />
              {(Array.isArray(item.examples) ? item.examples : item.example ? [item.example] : []).length ? (
                <SelectInput
                  label="Example shown in this exercise"
                  value={String(Math.max(0, Math.min((item.examples || [item.example]).length - 1, Number(item.display_example_index) || 0)))}
                  onChange={(value) => {
                    const examples = Array.isArray(item.examples) ? item.examples : item.example ? [item.example] : [];
                    const display_example_index = Number(value) || 0;
                    patch(index, {
                      display_example_index,
                      example: examples[display_example_index] || '',
                    });
                  }}
                  options={(Array.isArray(item.examples) ? item.examples : item.example ? [item.example] : []).map((example, exampleIndex) => [String(exampleIndex), `Context ${exampleIndex + 1}: ${example.slice(0, 64)}`])}
                  hint="Learners see one context here. Replay can use the others later."
                />
              ) : null}
            </div>
          </div>
        </section>
      ))}

      <button
        type="button"
        onClick={() => onChange([...values, { term: '', kind: 'word', meaning: '', translation: '', examples: ['', '', ''], display_example_index: 0, example: '' }])}
        className="focus-ring inline-flex w-fit items-center gap-2 rounded-full border border-orange-300 px-3 py-2 text-xs font-black text-orange-800 hover:bg-orange-50 dark:border-orange-300/30 dark:text-orange-200"
      >
        <Plus className="h-3.5 w-3.5" /> Add word or chunk
      </button>
    </div>
  );
}

function OpenAnswerSetEditor({ block, patch }) {
  const items = Array.isArray(block.items) ? block.items : [];

  function patchItem(index, itemPatch) {
    patch({ items: items.map((item, current) => current === index ? { ...item, ...itemPatch } : item) });
  }

  function addQuestion() {
    patch({ items: [...items, { prompt: '', accepted_answers: [], feedback: '' }] });
  }

  function duplicateQuestion(index) {
    const source = items[index];
    if (!source) return;
    patch({
      items: [
        ...items.slice(0, index + 1),
        {
          ...source,
          key: undefined,
          accepted_answers: [...(source.accepted_answers || [])],
        },
        ...items.slice(index + 1),
      ],
    });
  }

  return (
    <>
      <TextInput label="Set title" value={block.title} onChange={(value) => patch({ title: value })} placeholder="Translate naturally" />
      <TextArea
        label="Shared task"
        value={block.prompt}
        onChange={(value) => patch({ prompt: value })}
        rows={2}
        hint="Shown once above the whole set."
      />
      <TextInput
        label="Shared learner instruction"
        value={block.instructions}
        onChange={(value) => patch({ instructions: value })}
        placeholder="Write one natural answer for each item."
        hint="Write the repeated instruction once."
      />

      <div className="grid min-w-0 gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.08em] text-ink/65 dark:text-white/65">Questions</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-ink/45 dark:text-white/45">Each answer is checked independently inside the set.</p>
          </div>
          <button type="button" onClick={addQuestion} className="focus-ring inline-flex items-center gap-2 rounded-full border border-orange-300 px-3 py-2 text-xs font-black text-orange-800 dark:border-orange-300/30 dark:text-orange-200">
            <Plus className="h-3.5 w-3.5" /> Add question
          </button>
        </div>

        {items.map((item, itemIndex) => (
          <section key={item.key || itemIndex} className="grid min-w-0 gap-3 rounded-2xl border border-ink/10 bg-white/65 p-3 dark:border-white/10 dark:bg-white/[0.025]">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[0.68rem] font-black text-orange-900 dark:bg-orange-300/10 dark:text-orange-100">Item {itemIndex + 1}</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => duplicateQuestion(itemIndex)} className="focus-ring text-[0.68rem] font-black text-ink/55 dark:text-white/55">Duplicate</button>
                <button
                  type="button"
                  onClick={() => patch({ items: items.filter((_, current) => current !== itemIndex) })}
                  className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-ink/45 hover:bg-red-50 hover:text-red-700 dark:text-white/45 dark:hover:bg-red-300/10 dark:hover:text-red-200"
                  aria-label={`Remove question ${itemIndex + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <TextArea
              label="Prompt / source text"
              value={item.prompt || ''}
              onChange={(value) => patchItem(itemIndex, { prompt: value })}
              rows={2}
              placeholder="e.g. Traduci: Non posso rimandarlo ancora."
            />

            <StringListEditor
              label="Accepted answers"
              items={item.accepted_answers || []}
              onChange={(accepted_answers) => patchItem(itemIndex, { accepted_answers })}
              placeholder="One natural accepted answer"
              hint="Add natural variants that should count as correct."
            />

            <TextArea
              label="Optional feedback"
              value={item.feedback || ''}
              onChange={(value) => patchItem(itemIndex, { feedback: value })}
              rows={2}
              hint="Explain the language point only when useful."
            />
          </section>
        ))}
      </div>
    </>
  );
}

function MultipleChoiceSetEditor({ block, patch }) {
  const items = Array.isArray(block.items) ? block.items : [];

  function patchItem(index, itemPatch) {
    patch({ items: items.map((item, current) => current === index ? { ...item, ...itemPatch } : item) });
  }

  function patchOption(itemIndex, optionIndex, optionPatch) {
    const item = items[itemIndex] || {};
    const options = Array.isArray(item.options) ? item.options : [];
    patchItem(itemIndex, {
      options: options.map((option, current) => current === optionIndex ? { ...option, ...optionPatch } : option),
    });
  }

  function chooseCorrect(itemIndex, optionIndex) {
    const item = items[itemIndex] || {};
    const options = Array.isArray(item.options) ? item.options : [];
    patchItem(itemIndex, {
      options: options.map((option, current) => ({ ...option, is_correct: current === optionIndex })),
    });
  }

  function addQuestion() {
    patch({
      items: [...items, {
        prompt: '',
        options: [
          { text: '', is_correct: true },
          { text: '', is_correct: false },
          { text: '', is_correct: false },
        ],
        feedback: '',
      }],
    });
  }

  function duplicateQuestion(index) {
    const source = items[index];
    if (!source) return;
    patch({
      items: [
        ...items.slice(0, index + 1),
        {
          ...source,
          key: undefined,
          options: (source.options || []).map((option) => ({ ...option, key: undefined })),
        },
        ...items.slice(index + 1),
      ],
    });
  }

  return (
    <>
      <TextInput label="Set title" value={block.title} onChange={(value) => patch({ title: value })} placeholder="Which sounds natural?" />
      <TextArea
        label="Shared task"
        value={block.prompt}
        onChange={(value) => patch({ prompt: value })}
        rows={2}
        hint="Shown once above the whole set."
      />
      <TextInput
        label="Shared learner instruction"
        value={block.instructions}
        onChange={(value) => patch({ instructions: value })}
        placeholder="Choose the most natural sentence in each example."
        hint="Write this once instead of repeating it for every question."
      />

      <div className="grid min-w-0 gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.08em] text-ink/65 dark:text-white/65">Questions</p>
            <p className="mt-1 text-xs font-semibold text-ink/45 dark:text-white/45">Each question is graded independently inside the set.</p>
          </div>
          <button type="button" onClick={addQuestion} className="focus-ring inline-flex items-center gap-2 rounded-full border border-orange-300 px-3 py-2 text-xs font-black text-orange-800 dark:border-orange-300/30 dark:text-orange-200">
            <Plus className="h-3.5 w-3.5" /> Add question
          </button>
        </div>

        {items.map((item, itemIndex) => {
          const options = Array.isArray(item.options) ? item.options : [];
          return (
            <section key={item.key || itemIndex} className="grid min-w-0 gap-3 rounded-2xl border border-ink/10 bg-white/65 p-3 dark:border-white/10 dark:bg-white/[0.025]">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[0.68rem] font-black text-orange-900 dark:bg-orange-300/10 dark:text-orange-100">Example {itemIndex + 1}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => duplicateQuestion(itemIndex)} className="focus-ring text-[0.68rem] font-black text-ink/55 dark:text-white/55">Duplicate</button>
                  <button type="button" onClick={() => patch({ items: items.filter((_, current) => current !== itemIndex) })} className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-ink/45 hover:bg-red-50 hover:text-red-700 dark:text-white/45 dark:hover:bg-red-300/10 dark:hover:text-red-200" aria-label={`Remove question ${itemIndex + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <textarea
                rows={2}
                value={item.prompt || ''}
                onChange={(event) => patchItem(itemIndex, { prompt: event.target.value })}
                placeholder="Question or sentence stem"
                className="focus-ring w-full min-w-0 resize-y rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-semibold leading-6 text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
              />

              <div className="grid gap-2">
                {options.map((option, optionIndex) => (
                  <div key={option.key || optionIndex} className="flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => chooseCorrect(itemIndex, optionIndex)}
                      className={`focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full border text-xs font-black ${option.is_correct ? 'border-orange-500 bg-orange-500 text-white' : 'border-ink/15 text-ink/45 dark:border-white/15 dark:text-white/45'}`}
                      aria-label={option.is_correct ? 'Correct answer' : 'Mark as correct'}
                      title={option.is_correct ? 'Correct answer' : 'Mark as correct'}
                    >
                      {String.fromCharCode(65 + optionIndex)}
                    </button>
                    <input
                      value={option.text || ''}
                      onChange={(event) => patchOption(itemIndex, optionIndex, { text: event.target.value })}
                      placeholder={`Answer ${String.fromCharCode(65 + optionIndex)}`}
                      className="focus-ring min-w-0 flex-1 rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => patchItem(itemIndex, { options: options.filter((_, current) => current !== optionIndex) })}
                      className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink/45 hover:bg-red-50 hover:text-red-700 dark:text-white/45 dark:hover:bg-red-300/10 dark:hover:text-red-200"
                      aria-label="Remove answer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => patchItem(itemIndex, { options: [...options, { text: '', is_correct: false }] })}
                  className="focus-ring inline-flex w-fit items-center gap-2 rounded-full border border-ink/10 px-3 py-1.5 text-[0.7rem] font-black text-ink/60 dark:border-white/10 dark:text-white/60"
                >
                  <Plus className="h-3.5 w-3.5" /> Answer
                </button>
              </div>

              <TextArea
                label="Optional feedback"
                value={item.feedback || ''}
                onChange={(value) => patchItem(itemIndex, { feedback: value })}
                rows={2}
                hint="Useful when this item needs a short explanation after grading."
              />
            </section>
          );
        })}
      </div>
    </>
  );
}

function makeReadingPart5Items() {
  return Array.from({ length: 6 }, () => ({
    prompt: '',
    options: [
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
    ],
    feedback: '',
  }));
}

function makeReadingPart6Parts() {
  return Array.from({ length: 13 }, (_, index) => (
    index % 2 === 0
      ? { type: 'text', text: '' }
      : { type: 'gap', correct_option_index: null }
  ));
}

function makeReadingPart6Options() {
  return Array.from({ length: 7 }, () => ({ text: '' }));
}

function makeReadingPart7Sections() {
  return Array.from({ length: 4 }, () => ({ title: '', text: '' }));
}

function makeReadingPart7Items() {
  return Array.from({ length: 10 }, () => ({
    prompt: '',
    correct_section_index: null,
    feedback: '',
  }));
}

function ReadingChoiceItemsEditor({ items = [], onChange, fixedFour = false }) {
  const values = Array.isArray(items) ? items : [];

  function patchItem(index, itemPatch) {
    onChange(values.map((item, current) => current === index ? { ...item, ...itemPatch } : item));
  }

  function patchOption(itemIndex, optionIndex, optionPatch) {
    const item = values[itemIndex] || {};
    const options = Array.isArray(item.options) ? item.options : [];
    patchItem(itemIndex, {
      options: options.map((option, current) => current === optionIndex ? { ...option, ...optionPatch } : option),
    });
  }

  function chooseCorrect(itemIndex, optionIndex) {
    const item = values[itemIndex] || {};
    const options = Array.isArray(item.options) ? item.options : [];
    patchItem(itemIndex, {
      options: options.map((option, current) => ({ ...option, is_correct: current === optionIndex })),
    });
  }

  return (
    <div className="grid min-w-0 gap-3">
      {values.map((item, itemIndex) => {
        const options = Array.isArray(item.options) ? item.options : [];
        return (
          <section key={item.key || itemIndex} className="grid min-w-0 gap-3 rounded-2xl border border-ink/10 bg-white/65 p-3 dark:border-white/10 dark:bg-white/[0.025]">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[0.68rem] font-black text-orange-900 dark:bg-orange-300/10 dark:text-orange-100">
                Question {itemIndex + 1}
              </span>
              {!fixedFour ? (
                <button type="button" onClick={() => onChange(values.filter((_, current) => current !== itemIndex))} className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-ink/45 hover:bg-red-50 hover:text-red-700 dark:text-white/45 dark:hover:bg-red-300/10 dark:hover:text-red-200" aria-label={`Remove question ${itemIndex + 1}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <TextArea
              label="Question"
              value={item.prompt || ''}
              onChange={(value) => patchItem(itemIndex, { prompt: value })}
              rows={2}
              placeholder="Ask about detail, attitude, purpose, implication or main idea."
            />

            <div className="grid gap-2">
              {options.map((option, optionIndex) => (
                <div key={option.key || optionIndex} className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => chooseCorrect(itemIndex, optionIndex)}
                    className={`focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full border text-xs font-black ${option.is_correct ? 'border-orange-500 bg-orange-500 text-white' : 'border-ink/15 text-ink/45 dark:border-white/15 dark:text-white/45'}`}
                    aria-label={option.is_correct ? 'Correct answer' : 'Mark as correct'}
                  >
                    {String.fromCharCode(65 + optionIndex)}
                  </button>
                  <input
                    value={option.text || ''}
                    onChange={(event) => patchOption(itemIndex, optionIndex, { text: event.target.value })}
                    placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                    className="focus-ring min-w-0 flex-1 rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                  />
                  {!fixedFour ? (
                    <button type="button" onClick={() => patchItem(itemIndex, { options: options.filter((_, current) => current !== optionIndex) })} className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink/45 hover:bg-red-50 hover:text-red-700 dark:text-white/45 dark:hover:bg-red-300/10 dark:hover:text-red-200" aria-label="Remove option">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ))}
              {!fixedFour ? (
                <button type="button" onClick={() => patchItem(itemIndex, { options: [...options, { text: '', is_correct: false }] })} className="focus-ring inline-flex w-fit items-center gap-2 rounded-full border border-ink/10 px-3 py-1.5 text-[0.7rem] font-black text-ink/60 dark:border-white/10 dark:text-white/60">
                  <Plus className="h-3.5 w-3.5" /> Add option
                </button>
              ) : null}
            </div>

            <TextArea
              label="Optional feedback"
              value={item.feedback || ''}
              onChange={(value) => patchItem(itemIndex, { feedback: value })}
              rows={2}
              hint="Explain the evidence in the text rather than only revealing the answer."
            />
          </section>
        );
      })}
    </div>
  );
}

function ReadingPart6Editor({ block, patch }) {
  const parts = Array.isArray(block.passage_parts) ? block.passage_parts : [];
  const paragraphs = Array.isArray(block.paragraph_options) ? block.paragraph_options : [];
  let gapCounter = 0;

  function patchPart(index, partPatch) {
    patch({ passage_parts: parts.map((part, current) => current === index ? { ...part, ...partPatch } : part) });
  }

  function patchParagraph(index, value) {
    patch({ paragraph_options: paragraphs.map((item, current) => current === index ? { ...item, text: value } : item) });
  }

  return (
    <>
      <div className="rounded-2xl border border-orange-200/70 bg-orange-50/45 p-4 dark:border-orange-300/15 dark:bg-orange-300/[0.04]">
        <p className="text-xs font-black uppercase tracking-[0.08em] text-orange-800 dark:text-orange-200">B2 Part 6 structure</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-ink/55 dark:text-white/55">
          Six paragraphs are removed from the text. Add seven options below: one remains unused.
        </p>
      </div>

      <div className="grid gap-3">
        <p className="text-xs font-black uppercase tracking-[0.08em] text-ink/65 dark:text-white/65">Reading text</p>
        {parts.map((part, index) => {
          if (part.type === 'gap') {
            gapCounter += 1;
            const gapNumber = gapCounter;
            return (
              <div key={index} className="grid gap-2 rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50/50 p-3 dark:border-orange-300/30 dark:bg-orange-300/[0.05]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-orange-800 dark:text-orange-200">Gap {gapNumber}</span>
                  <button type="button" onClick={() => patch({ passage_parts: parts.filter((_, current) => current !== index) })} className="focus-ring text-[0.68rem] font-black text-red-700 dark:text-red-200">Remove</button>
                </div>
                <SelectInput
                  label="Correct missing paragraph"
                  value={Number.isInteger(part.correct_option_index) ? String(part.correct_option_index) : ''}
                  onChange={(value) => patchPart(index, { correct_option_index: value === '' ? null : Number(value) })}
                  options={[
                    ['', 'Choose the correct paragraph'],
                    ...paragraphs.map((_, optionIndex) => [String(optionIndex), `Paragraph ${String.fromCharCode(65 + optionIndex)}`]),
                  ]}
                  hint="Students will see paragraph letters; the system keeps the internal keys."
                />
              </div>
            );
          }
          return (
            <div key={index} className="grid gap-2 rounded-2xl border border-ink/10 bg-white/65 p-3 dark:border-white/10 dark:bg-white/[0.025]">
              <TextArea
                label="Text section"
                value={part.text || ''}
                onChange={(value) => patchPart(index, { text: value })}
                rows={5}
                placeholder="Text that remains visible before or after a missing paragraph."
              />
              <button type="button" onClick={() => patch({ passage_parts: parts.filter((_, current) => current !== index) })} className="focus-ring w-fit text-[0.68rem] font-black text-red-700 dark:text-red-200">Remove section</button>
            </div>
          );
        })}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => patch({ passage_parts: [...parts, { type: 'text', text: '' }] })} className="focus-ring inline-flex items-center gap-2 rounded-full border border-ink/10 px-3 py-2 text-xs font-black text-ink/65 dark:border-white/10 dark:text-white/65">
            <Plus className="h-3.5 w-3.5" /> Text section
          </button>
          <button type="button" onClick={() => patch({ passage_parts: [...parts, { type: 'gap', correct_option_index: null }] })} className="focus-ring inline-flex items-center gap-2 rounded-full border border-orange-300 px-3 py-2 text-xs font-black text-orange-800 dark:border-orange-300/30 dark:text-orange-200">
            <Plus className="h-3.5 w-3.5" /> Missing paragraph
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.08em] text-ink/65 dark:text-white/65">Paragraph bank</p>
          <p className="mt-1 text-xs font-semibold text-ink/45 dark:text-white/45">For exam-style B2 practice use exactly seven paragraphs.</p>
        </div>
        {paragraphs.map((paragraph, index) => (
          <div key={index} className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-xs font-black text-white dark:bg-clay">{String.fromCharCode(65 + index)}</span>
            <TextArea
              label={`Paragraph ${String.fromCharCode(65 + index)}`}
              value={paragraph.text || ''}
              onChange={(value) => patchParagraph(index, value)}
              rows={4}
            />
          </div>
        ))}
      </div>
    </>
  );
}

function ReadingPart7Editor({ block, patch }) {
  const sections = Array.isArray(block.sections) ? block.sections : [];
  const items = Array.isArray(block.items) ? block.items : [];

  function patchSection(index, sectionPatch) {
    patch({ sections: sections.map((section, current) => current === index ? { ...section, ...sectionPatch } : section) });
  }

  function patchItem(index, itemPatch) {
    patch({ items: items.map((item, current) => current === index ? { ...item, ...itemPatch } : item) });
  }

  return (
    <>
      <div className="rounded-2xl border border-orange-200/70 bg-orange-50/45 p-4 dark:border-orange-300/15 dark:bg-orange-300/[0.04]">
        <p className="text-xs font-black uppercase tracking-[0.08em] text-orange-800 dark:text-orange-200">B2 Part 7 structure</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-ink/55 dark:text-white/55">
          Learners match ten statements to the text sections. A section can be used more than once.
        </p>
      </div>

      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-ink/65 dark:text-white/65">Text sections</p>
          <button type="button" onClick={() => patch({ sections: [...sections, { title: '', text: '' }] })} className="focus-ring inline-flex items-center gap-2 rounded-full border border-orange-300 px-3 py-2 text-xs font-black text-orange-800 dark:border-orange-300/30 dark:text-orange-200">
            <Plus className="h-3.5 w-3.5" /> Add section
          </button>
        </div>
        {sections.map((section, index) => (
          <section key={index} className="grid gap-2 rounded-2xl border border-ink/10 bg-white/65 p-3 dark:border-white/10 dark:bg-white/[0.025]">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-ink px-2.5 py-1 text-[0.68rem] font-black text-white dark:bg-clay">Section {String.fromCharCode(65 + index)}</span>
              <button type="button" onClick={() => patch({ sections: sections.filter((_, current) => current !== index) })} className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-ink/45 hover:bg-red-50 hover:text-red-700 dark:text-white/45 dark:hover:bg-red-300/10 dark:hover:text-red-200" aria-label="Remove section">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <TextInput label="Optional section title" value={section.title || ''} onChange={(value) => patchSection(index, { title: value })} />
            <TextArea label="Text" value={section.text || ''} onChange={(value) => patchSection(index, { text: value })} rows={6} />
          </section>
        ))}
      </div>

      <div className="grid gap-3">
        <p className="text-xs font-black uppercase tracking-[0.08em] text-ink/65 dark:text-white/65">Statements to match</p>
        {items.map((item, index) => (
          <section key={index} className="grid gap-3 rounded-2xl border border-ink/10 bg-linen/25 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <span className="text-[0.68rem] font-black text-orange-700 dark:text-orange-300">Statement {index + 1}</span>
            <TextArea label="Statement" value={item.prompt || ''} onChange={(value) => patchItem(index, { prompt: value })} rows={2} />
            <SelectInput
              label="Matching section"
              value={Number.isInteger(item.correct_section_index) ? String(item.correct_section_index) : ''}
              onChange={(value) => patchItem(index, { correct_section_index: value === '' ? null : Number(value) })}
              options={[
                ['', 'Choose section'],
                ...sections.map((_, sectionIndex) => [String(sectionIndex), `Section ${String.fromCharCode(65 + sectionIndex)}`]),
              ]}
            />
          </section>
        ))}
      </div>
    </>
  );
}

function ReadingComprehensionEditor({ block, patch }) {
  const format = block.format || 'standard';

  function changeFormat(nextFormat) {
    if (nextFormat === format) return;
    if (nextFormat === 'b2_part5') {
      patch({
        format: nextFormat,
        items: makeReadingPart5Items(),
        passage_parts: [],
        paragraph_options: [],
        sections: [],
        primary_skill: 'reading',
      });
      return;
    }
    if (nextFormat === 'b2_part6') {
      patch({
        format: nextFormat,
        items: [],
        passage_parts: makeReadingPart6Parts(),
        paragraph_options: makeReadingPart6Options(),
        sections: [],
        primary_skill: 'reading',
      });
      return;
    }
    if (nextFormat === 'b2_part7') {
      patch({
        format: nextFormat,
        items: makeReadingPart7Items(),
        sections: makeReadingPart7Sections(),
        passage_parts: [],
        paragraph_options: [],
        primary_skill: 'reading',
      });
      return;
    }
    patch({ format: 'standard', passage_parts: [], paragraph_options: [], sections: [], primary_skill: 'reading' });
  }

  const items = Array.isArray(block.items) ? block.items : [];

  return (
    <>
      <TextInput label="Reading title" value={block.title || ''} onChange={(value) => patch({ title: value })} placeholder="Optional title shown above the text" />
      <SelectInput
        label="Reading format"
        value={format}
        onChange={changeFormat}
        options={[
          ['standard', 'Standard reading comprehension'],
          ['b2_part5', 'B2 exam style · Part 5 · Multiple choice'],
          ['b2_part6', 'B2 exam style · Part 6 · Gapped text'],
          ['b2_part7', 'B2 exam style · Part 7 · Multiple matching'],
        ]}
        hint="One Reading block, different learner interactions. Technical keys and scoring are generated automatically."
      />
      <TextArea label="Task" value={block.prompt || ''} onChange={(value) => patch({ prompt: value })} rows={2} />
      <TextInput label="Learner instruction" value={block.instructions || ''} onChange={(value) => patch({ instructions: value })} />

      {(format === 'standard' || format === 'b2_part5') ? (
        <LongTextEditor
          label="Reading passage"
          value={block.passage || ''}
          onChange={(value) => patch({ passage: value })}
          hint={format === 'b2_part5' ? 'For B2 Part 5, write one substantial original text with enough evidence for six questions.' : 'Use original or licensed teaching material.'}
          placeholder="Paste or write the complete reading text here."
        />
      ) : null}

      {format === 'b2_part5' ? (
        <>
          <div className="rounded-2xl border border-orange-200/70 bg-orange-50/45 p-4 dark:border-orange-300/15 dark:bg-orange-300/[0.04]">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-orange-800 dark:text-orange-200">B2 Part 5</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-ink/55 dark:text-white/55">
              Six questions, four options each. Each correct answer is worth 2 points automatically.
            </p>
          </div>
          <ReadingChoiceItemsEditor items={items} onChange={(nextItems) => patch({ items: nextItems })} fixedFour />
        </>
      ) : null}

      {format === 'b2_part6' ? <ReadingPart6Editor block={block} patch={patch} /> : null}
      {format === 'b2_part7' ? <ReadingPart7Editor block={block} patch={patch} /> : null}

      {format === 'standard' ? (
        <>
          <ReadingChoiceItemsEditor items={items} onChange={(nextItems) => patch({ items: nextItems })} />
          <button
            type="button"
            onClick={() => patch({
              items: [...items, {
                type: 'multiple_choice',
                prompt: '',
                options: [
                  { text: '', is_correct: true },
                  { text: '', is_correct: false },
                  { text: '', is_correct: false },
                ],
                feedback: '',
              }],
            })}
            className="focus-ring inline-flex w-fit items-center gap-2 rounded-full border border-orange-300 px-3 py-2 text-xs font-black text-orange-800 dark:border-orange-300/30 dark:text-orange-200"
          >
            <Plus className="h-3.5 w-3.5" /> Add question
          </button>
        </>
      ) : null}

      <TextInput
        label="Source note"
        value={block.source_note || ''}
        onChange={(value) => patch({ source_note: value })}
        placeholder="Optional source / adaptation note"
        hint="Use original or properly licensed texts. Do not paste protected exam passages."
      />
    </>
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

function MediaEditor({ block, patch, activityId }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  async function removeUploadedFile() {
    const bucket = block.storage_bucket;
    const path = block.storage_path;
    patch({
      storage_bucket: '',
      storage_path: '',
      uploaded_file_name: '',
      uploaded_mime_type: '',
      uploaded_size_bytes: null,
    });
    if (bucket && path) {
      try {
        await deleteStudioContentMedia(bucket, path);
      } catch {
        // Do not block authoring if best-effort Storage cleanup fails.
      }
    }
  }

  async function uploadFile(file) {
    if (!file || uploading) return;
    setUploading(true);
    setUploadError('');

    const previous = {
      bucket: block.storage_bucket,
      path: block.storage_path,
    };

    try {
      const uploaded = await uploadStudioContentMedia({
        file,
        activityId,
        blockId: block.id,
      });

      patch({
        ...uploaded,
        url: '',
      });

      if (previous.bucket && previous.path && previous.path !== uploaded.storage_path) {
        deleteStudioContentMedia(previous.bucket, previous.path).catch(() => undefined);
      }
    } catch (error) {
      setUploadError(error.message || 'Could not upload this media file.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function changeSourceType(value) {
    const hadUpload = Boolean(block.storage_bucket && block.storage_path);
    patch({
      source_type: value,
      ...(value === 'youtube' ? {
        storage_bucket: '',
        storage_path: '',
        uploaded_file_name: '',
        uploaded_mime_type: '',
        uploaded_size_bytes: null,
      } : {}),
    });
    if (value === 'youtube' && hadUpload) {
      deleteStudioContentMedia(block.storage_bucket, block.storage_path).catch(() => undefined);
    }
  }

  function changeUrl(value) {
    const hadUpload = Boolean(value && block.storage_bucket && block.storage_path);
    patch({
      url: value,
      storage_bucket: value ? '' : block.storage_bucket,
      storage_path: value ? '' : block.storage_path,
      uploaded_file_name: value ? '' : block.uploaded_file_name,
      uploaded_mime_type: value ? '' : block.uploaded_mime_type,
      uploaded_size_bytes: value ? null : block.uploaded_size_bytes,
    });
    if (hadUpload) {
      deleteStudioContentMedia(block.storage_bucket, block.storage_path).catch(() => undefined);
    }
  }

  const hasUpload = Boolean(block.storage_path);
  const UploadedIcon = block.source_type === 'video' ? FileVideo2 : FileAudio2;

  return (
    <>
      <TextInput label="Title" value={block.title} onChange={(value) => patch({ title: value })} />
      <TextInput label="Learner instruction" value={block.instructions} onChange={(value) => patch({ instructions: value })} />
      <SelectInput
        label="Media type"
        value={block.source_type || 'audio'}
        onChange={changeSourceType}
        options={[['audio', 'Audio'], ['video', 'Video'], ['youtube', 'YouTube']]}
      />

      {block.source_type === 'youtube' ? (
        <TextInput label="YouTube URL" value={block.url} onChange={changeUrl} placeholder="https://www.youtube.com/watch?v=..." />
      ) : (
        <div className="grid gap-3 rounded-2xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.08em] text-ink/65 dark:text-white/65">Media file</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-ink/45 dark:text-white/45">
              Choose the file. Sblocco manages the private Storage location automatically.
            </p>
          </div>

          {hasUpload ? (
            <div className="flex items-center gap-3 rounded-xl bg-linen/60 p-3 dark:bg-white/[0.05]">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-300/10 dark:text-orange-200">
                <UploadedIcon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-ink dark:text-white">{block.uploaded_file_name || 'Uploaded media'}</span>
                <span className="mt-0.5 block text-xs font-semibold text-ink/45 dark:text-white/45">
                  {block.uploaded_size_bytes ? `${(Number(block.uploaded_size_bytes) / (1024 * 1024)).toFixed(1)} MB` : 'Stored privately'}
                </span>
              </span>
              <button type="button" onClick={() => removeUploadedFile()} className="focus-ring text-xs font-black text-red-700 dark:text-red-200">Remove</button>
            </div>
          ) : null}

          <input
            ref={fileRef}
            type="file"
            accept={block.source_type === 'video' ? 'video/*' : 'audio/*'}
            className="hidden"
            onChange={(event) => uploadFile(event.target.files?.[0])}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="focus-ring inline-flex w-fit items-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Uploading' : hasUpload ? 'Replace file' : 'Upload file'}
          </button>

          {uploadError ? <p className="text-xs font-bold leading-5 text-red-700 dark:text-red-200">{uploadError}</p> : null}

          {!hasUpload ? (
            <TextInput
              label="Or use a direct media URL"
              value={block.url}
              onChange={changeUrl}
              placeholder="https://..."
              hint="Optional. Uploading is usually safer for lesson media you control."
            />
          ) : null}
        </div>
      )}

      <details className="rounded-xl border border-ink/10 p-3 dark:border-white/10">
        <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.08em] text-ink/65 dark:text-white/65">Clip settings</summary>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <NumberInput label="Start seconds" value={block.start_seconds} onChange={(value) => patch({ start_seconds: value })} />
          <NumberInput label="End seconds" value={block.end_seconds} onChange={(value) => patch({ end_seconds: value })} />
        </div>
      </details>
      <LongTextEditor
        label="Transcript"
        value={block.transcript}
        onChange={(value) => patch({ transcript: value })}
        hint="Paste the complete transcript here. Long transcripts are preserved in full."
        placeholder="Paste or write the full transcript…"
      />
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
      <section className="grid gap-3 rounded-2xl border border-ink/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.025]">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.1em] text-orange-700 dark:text-orange-300">Task</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-ink/45 dark:text-white/45">The main instruction the learner sees before writing.</p>
        </div>
        <TextArea label="Writing prompt" value={block.prompt} onChange={(value) => patch({ prompt: value })} rows={4} />
      </section>

      <StructuredContextEditor block={block} patch={patch} />

      <section className="grid gap-3 rounded-2xl border border-ink/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.025]">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.1em] text-orange-700 dark:text-orange-300">Requirements</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-ink/45 dark:text-white/45">Keep the learner focused on what must actually be included.</p>
        </div>
        <StringListEditor label="Required points" items={block.required_points || []} onChange={(required_points) => patch({ required_points })} hint="Concrete content the learner should include." />
        <div className="grid min-w-0 grid-cols-2 gap-3 border-t border-ink/5 pt-3 dark:border-white/5">
          <NumberInput label="Min words" value={block.min_words} min={1} onChange={(value) => patch({ min_words: value })} />
          <NumberInput label="Max words" value={block.max_words} min={1} onChange={(value) => patch({ max_words: value })} />
        </div>
      </section>

      <p className="rounded-xl bg-linen/55 px-3 py-2 text-xs font-semibold leading-5 text-ink/50 dark:bg-white/[0.04] dark:text-white/50">
        Review criteria are generated safely by Sblocco. You only need to define the teaching task here.
      </p>
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

export default function StudioBlockEditor({ block, issues = [], onChange, onDelete, activityId }) {
  const definition = getStudioBlockDefinition(block?.type);
  if (!block || !definition) {
    return <div className="p-5 text-sm font-semibold text-ink/60 dark:text-white/60">Select a supported block to edit it.</div>;
  }

  function patch(value) {
    onChange({ ...block, ...value });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-ink/10 bg-[#fbf8f1] px-4 py-4 dark:border-white/10 dark:bg-[#121a17] xl:px-5">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">{definition.category}</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-xl font-black leading-tight text-ink dark:text-white">{definition.label}</h2>
          <span className="shrink-0 rounded-full bg-linen px-2.5 py-1 text-[0.65rem] font-black text-ink/45 dark:bg-white/[0.06] dark:text-white/45">Editor</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 xl:px-5">
        <div className="grid min-w-0 gap-5">
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

          <div className="grid min-w-0 gap-4">
        {block.type === 'open_answer_set' ? <OpenAnswerSetEditor block={block} patch={patch} /> : null}
        {block.type === 'multiple_choice_set' ? <MultipleChoiceSetEditor block={block} patch={patch} /> : null}
        {block.type === 'reading_comprehension' ? <ReadingComprehensionEditor block={block} patch={patch} /> : null}
        {block.type === 'multiple_choice' ? <MultipleChoiceEditor block={block} patch={patch} /> : null}
        {block.type === 'gap_fill' ? <GapFillEditor block={block} patch={patch} /> : null}
        {block.type === 'word_order' ? (
          <>
            <TextInput label="Prompt" value={block.prompt} onChange={(value) => patch({ prompt: value })} />
            <StringListEditor label="Movable chunks in the correct order" items={block.chunks || []} onChange={(chunks) => patch({ chunks })} hint="Multiword chunks stay together. Learners will see a stable randomized starting order." />
            <TextInput label="Final punctuation" value={block.terminal_punctuation} onChange={(value) => patch({ terminal_punctuation: value })} placeholder="?" />
          </>
        ) : null}
        {block.type === 'practice_selection' ? <PracticeSelectionEditor block={block} patch={patch} /> : null}
        {block.type === 'translation' ? <TranslationEditor block={block} patch={patch} /> : null}
        {block.type === 'written_response' ? <WritingEditor block={block} patch={patch} /> : null}
        {block.type === 'media' ? <MediaEditor block={block} patch={patch} activityId={activityId} /> : null}
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
      </div>
    </div>
  );
}
