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
        rows={expanded ? 24 : 10}
        className={`focus-ring w-full min-w-0 resize-y rounded-2xl border border-ink/10 bg-white px-3.5 py-3 text-sm font-semibold leading-6 normal-case tracking-normal text-ink shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-white ${expanded ? 'min-h-[34rem]' : 'min-h-56'}`}
      />
      <p className="text-[0.7rem] font-semibold leading-5 text-ink/40 dark:text-white/40">The full text is stored. The editor never intentionally shortens the transcript.</p>
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
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
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
      <div>
        <p className="text-xs font-black uppercase tracking-[0.08em] text-ink/65 dark:text-white/65">Options</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-ink/45 dark:text-white/45">
          Mark useful lexical items now so a separate vocabulary bank can use them later without re-editing the activity.
        </p>
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
      <TextArea label="Writing prompt" value={block.prompt} onChange={(value) => patch({ prompt: value })} rows={4} />
      <StructuredContextEditor block={block} patch={patch} />
      <StringListEditor label="Required points" items={block.required_points || []} onChange={(required_points) => patch({ required_points })} hint="Concrete content the learner should include." />
      <div className="grid min-w-0 grid-cols-2 gap-2">
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

export default function StudioBlockEditor({ block, issues = [], onChange, onDelete, activityId }) {
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
  );
}
