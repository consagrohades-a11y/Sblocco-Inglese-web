import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SPEAKING_ROUND_FORMATS } from '../../../lib/speakingRoundContract.js';
import StudioSelect from './StudioSelect.jsx';

const inputClass = 'focus-ring w-full min-w-0 rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-semibold text-ink shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-white';
const areaClass = inputClass + ' resize-y leading-6';

function Field({ label, hint, children }) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="text-[0.68rem] font-black uppercase tracking-[0.09em] text-ink/60 dark:text-white/60">{label}</span>
      {hint ? <span className="text-xs font-semibold leading-5 text-ink/45 dark:text-white/45">{hint}</span> : null}
      {children}
    </label>
  );
}

function TextField({ label, value, onChange, placeholder = '', hint = '' }) {
  return <Field label={label} hint={hint}><input className={inputClass} value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></Field>;
}

function TextArea({ label, value, onChange, placeholder = '', rows = 3, hint = '' }) {
  return <Field label={label} hint={hint}><textarea className={areaClass} rows={rows} value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></Field>;
}

function StringList({ label, items = [], onChange, placeholder = 'Add item' }) {
  const values = Array.isArray(items) ? items : [];
  return (
    <div className="grid gap-2">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.09em] text-ink/60 dark:text-white/60">{label}</p>
      {values.map((item, index) => (
        <div key={index} className="flex gap-2">
          <input className={inputClass} value={item || ''} onChange={(event) => onChange(values.map((value, current) => current === index ? event.target.value : value))} placeholder={placeholder} />
          <button type="button" onClick={() => onChange(values.filter((_, current) => current !== index))} className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-ink/10 text-ink/45 dark:border-white/10 dark:text-white/45" aria-label="Remove item"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...values, ''])} className="focus-ring inline-flex w-fit items-center gap-2 rounded-full border border-orange-300 px-3 py-2 text-xs font-black text-orange-800 dark:border-orange-300/30 dark:text-orange-200"><Plus className="h-3.5 w-3.5" /> Add</button>
    </div>
  );
}

function Section({ eyebrow, children }) {
  return (
    <section className="grid gap-3 rounded-2xl border border-ink/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.025]">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.11em] text-orange-700 dark:text-orange-300">{eyebrow}</p>
      {children}
    </section>
  );
}

function NumberMissionEditor({ block, patchMaterial, patchTeacher }) {
  const facts = Array.isArray(block.material?.facts) ? block.material.facts : [];
  return (
    <>
      <Section eyebrow="Visible facts">
        {facts.map((fact, index) => (
          <div key={fact.key || index} className="grid gap-2 rounded-xl border border-ink/10 bg-linen/30 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="grid gap-2 sm:grid-cols-2">
              <TextField label="Label" value={fact.label} onChange={(value) => patchMaterial({ facts: facts.map((item, current) => current === index ? { ...item, label: value } : item) })} placeholder="People" />
              <TextField label="Value" value={fact.value} onChange={(value) => patchMaterial({ facts: facts.map((item, current) => current === index ? { ...item, value } : item) })} placeholder="2" />
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <TextField label="Display override" value={fact.display} onChange={(value) => patchMaterial({ facts: facts.map((item, current) => current === index ? { ...item, display: value } : item) })} placeholder="7 p.m." hint="Optional. Use this when the stored value should be displayed more naturally." />
              <button type="button" onClick={() => patchMaterial({ facts: facts.filter((_, current) => current !== index) })} className="focus-ring mt-5 h-10 rounded-xl border border-ink/10 px-3 text-xs font-black text-red-700 dark:border-white/10 dark:text-red-200">Remove</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => patchMaterial({ facts: [...facts, { label: '', value: '', display: '', kind: 'other' }] })} className="focus-ring inline-flex w-fit items-center gap-2 rounded-full border border-orange-300 px-3 py-2 text-xs font-black text-orange-800 dark:border-orange-300/30 dark:text-orange-200"><Plus className="h-3.5 w-3.5" /> Add fact</button>
      </Section>
      <Section eyebrow="Teacher-only">
        <TextArea label="Private read-back / mismatch cue" value={block.teacher?.private_cue} onChange={(value) => patchTeacher({ private_cue: value })} rows={4} hint="This is never included in the learner runtime payload." />
        <TextArea label="Final confirmation" value={block.teacher?.final_confirmation} onChange={(value) => patchTeacher({ final_confirmation: value })} rows={2} />
      </Section>
    </>
  );
}

function PictureDetectiveEditor({ block, patchMaterial, patchTeacher }) {
  const options = Array.isArray(block.material?.options) ? block.material.options : [];
  return (
    <>
      <Section eyebrow="Image choices">
        <label className="flex items-center gap-2 text-xs font-black text-ink/65 dark:text-white/65">
          <input type="checkbox" checked={Boolean(block.material?.show_labels)} onChange={(event) => patchMaterial({ show_labels: event.target.checked })} />
          Show vocabulary labels under images
        </label>
        {options.map((option, index) => (
          <div key={option.key || index} className="grid gap-2 rounded-xl border border-ink/10 bg-linen/30 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="grid gap-2 sm:grid-cols-[5rem_1fr]">
              <TextField label="Key" value={option.key} onChange={(value) => patchMaterial({ options: options.map((item, current) => current === index ? { ...item, key: value } : item) })} placeholder="A" />
              <TextField label="Object label" value={option.label} onChange={(value) => patchMaterial({ options: options.map((item, current) => current === index ? { ...item, label: value } : item) })} placeholder="Camera" />
            </div>
            <TextField label="Image URL / asset path" value={option.image_url} onChange={(value) => patchMaterial({ options: options.map((item, current) => current === index ? { ...item, image_url: value } : item) })} placeholder="/assets/..." />
            <TextField label="Accessible image description" value={option.image_alt} onChange={(value) => patchMaterial({ options: options.map((item, current) => current === index ? { ...item, image_alt: value } : item) })} placeholder="A compact black camera" />
            <button type="button" onClick={() => patchMaterial({ options: options.filter((_, current) => current !== index) })} className="focus-ring w-fit text-xs font-black text-red-700 dark:text-red-200">Remove option</button>
          </div>
        ))}
        <button type="button" onClick={() => patchMaterial({ options: [...options, { key: String.fromCharCode(65 + options.length), label: '', image_url: '', image_alt: '' }] })} className="focus-ring inline-flex w-fit items-center gap-2 rounded-full border border-orange-300 px-3 py-2 text-xs font-black text-orange-800 dark:border-orange-300/30 dark:text-orange-200"><Plus className="h-3.5 w-3.5" /> Add image</button>
      </Section>
      <Section eyebrow="Teacher-only">
        <TextField label="Secret option key" value={block.teacher?.secret_option_key} onChange={(value) => patchTeacher({ secret_option_key: value })} placeholder="C" hint="Must match one authored option. It is removed from the learner payload." />
      </Section>
    </>
  );
}

function ExplainEditor({ block, patchMaterial, patchTeacher }) {
  return (
    <>
      <Section eyebrow="Target">
        <TextField label="Target expression" value={block.material?.target} onChange={(value) => patchMaterial({ target: value })} placeholder="A refund" />
        <StringList label="Forbidden words" items={block.material?.forbidden_words || []} onChange={(forbidden_words) => patchMaterial({ forbidden_words })} placeholder="money" />
      </Section>
      <Section eyebrow="Teacher-only">
        <TextArea label="Possible explanation" value={block.teacher?.model_response} onChange={(value) => patchTeacher({ model_response: value })} rows={4} hint="Example only. It is never treated as the one exact answer." />
      </Section>
    </>
  );
}

function ConversationEditor({ block, patchMaterial, patchTeacher }) {
  const turns = Array.isArray(block.material?.turns) ? block.material.turns : [];
  return (
    <>
      <Section eyebrow="Dialogue">
        {turns.map((turn, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[8rem_1fr_auto]">
            <input className={inputClass} value={turn.speaker || ''} onChange={(event) => patchMaterial({ turns: turns.map((item, current) => current === index ? { ...item, speaker: event.target.value } : item) })} placeholder="Speaker" />
            <input className={inputClass} value={turn.text || ''} onChange={(event) => patchMaterial({ turns: turns.map((item, current) => current === index ? { ...item, text: event.target.value } : item) })} placeholder="Line" />
            <button type="button" onClick={() => patchMaterial({ turns: turns.filter((_, current) => current !== index) })} className="focus-ring grid h-10 w-10 place-items-center rounded-xl border border-ink/10 text-ink/45 dark:border-white/10 dark:text-white/45" aria-label="Remove turn"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <button type="button" onClick={() => patchMaterial({ turns: [...turns, { speaker: '', text: '' }] })} className="focus-ring inline-flex w-fit items-center gap-2 rounded-full border border-orange-300 px-3 py-2 text-xs font-black text-orange-800 dark:border-orange-300/30 dark:text-orange-200"><Plus className="h-3.5 w-3.5" /> Add turn</button>
        <TextArea label="Inference question" value={block.material?.question} onChange={(value) => patchMaterial({ question: value })} rows={2} />
        <TextArea label="Follow-up" value={block.material?.follow_up} onChange={(value) => patchMaterial({ follow_up: value })} rows={2} />
      </Section>
      <Section eyebrow="Teacher-only">
        <TextArea label="Hidden clue" value={block.teacher?.hidden_clue} onChange={(value) => patchTeacher({ hidden_clue: value })} rows={3} />
        <TextArea label="Interpretation / acceptable reading" value={block.teacher?.interpretation} onChange={(value) => patchTeacher({ interpretation: value })} rows={4} />
      </Section>
    </>
  );
}

function ChoiceEditor({ block, patchMaterial, patchTeacher }) {
  const options = Array.isArray(block.material?.options) ? block.material.options : [];
  return (
    <>
      <Section eyebrow="Decision">
        <TextArea label="Situation" value={block.material?.situation} onChange={(value) => patchMaterial({ situation: value })} rows={3} />
        <TextArea label="Task" value={block.material?.task} onChange={(value) => patchMaterial({ task: value })} rows={2} />
      </Section>
      <Section eyebrow="Comparable options">
        {options.map((option, optionIndex) => {
          const details = Array.isArray(option.details) ? option.details : [];
          return (
            <div key={option.key || optionIndex} className="grid gap-3 rounded-xl border border-ink/10 bg-linen/30 p-3 dark:border-white/10 dark:bg-white/[0.03]">
              <TextField label="Option title" value={option.title} onChange={(value) => patchMaterial({ options: options.map((item, current) => current === optionIndex ? { ...item, title: value } : item) })} />
              {details.map((detail, detailIndex) => (
                <div key={detailIndex} className="grid gap-2 sm:grid-cols-[0.4fr_1fr_auto]">
                  <input className={inputClass} value={detail.label || ''} onChange={(event) => patchMaterial({ options: options.map((item, current) => current === optionIndex ? { ...item, details: details.map((entry, inner) => inner === detailIndex ? { ...entry, label: event.target.value } : entry) } : item) })} placeholder="Label" />
                  <input className={inputClass} value={detail.value || ''} onChange={(event) => patchMaterial({ options: options.map((item, current) => current === optionIndex ? { ...item, details: details.map((entry, inner) => inner === detailIndex ? { ...entry, value: event.target.value } : entry) } : item) })} placeholder="Value" />
                  <button type="button" onClick={() => patchMaterial({ options: options.map((item, current) => current === optionIndex ? { ...item, details: details.filter((_, inner) => inner !== detailIndex) } : item) })} className="focus-ring grid h-10 w-10 place-items-center rounded-xl border border-ink/10 text-ink/45 dark:border-white/10 dark:text-white/45" aria-label="Remove detail"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <button type="button" onClick={() => patchMaterial({ options: options.map((item, current) => current === optionIndex ? { ...item, details: [...details, { label: '', value: '' }] } : item) })} className="focus-ring w-fit text-xs font-black text-orange-700 dark:text-orange-200">+ Add detail</button>
              <button type="button" onClick={() => patchMaterial({ options: options.filter((_, current) => current !== optionIndex) })} className="focus-ring w-fit text-xs font-black text-red-700 dark:text-red-200">Remove option</button>
            </div>
          );
        })}
        <button type="button" onClick={() => patchMaterial({ options: [...options, { key: 'option_' + (options.length + 1), title: '', details: [{ label: '', value: '' }, { label: '', value: '' }] }] })} className="focus-ring inline-flex w-fit items-center gap-2 rounded-full border border-orange-300 px-3 py-2 text-xs font-black text-orange-800 dark:border-orange-300/30 dark:text-orange-200"><Plus className="h-3.5 w-3.5" /> Add option</button>
      </Section>
      <Section eyebrow="Teacher-only">
        <TextArea label="Hidden complication" value={block.teacher?.complication} onChange={(value) => patchTeacher({ complication: value })} rows={3} />
        <TextArea label="Teacher role note" value={block.teacher?.role_note} onChange={(value) => patchTeacher({ role_note: value })} rows={3} />
      </Section>
    </>
  );
}

export default function StudioSpeakingRoundEditor({ block, onChange }) {
  function patch(value) {
    onChange(value);
  }
  function patchMaterial(value) {
    patch({ material: { ...(block.material || {}), ...value } });
  }
  function patchTeacher(value) {
    patch({ teacher: { ...(block.teacher || {}), ...value } });
  }

  return (
    <div className="grid min-w-0 gap-4">
      <Section eyebrow="Speaking format">
        <Field label="Format" hint="The format controls structure, validation and learner rendering.">
          <StudioSelect
            value={block.format || 'number_mission'}
            onChange={(format) => patch({ format })}
            options={SPEAKING_ROUND_FORMATS.map((item) => [item.id, item.label])}
            ariaLabel="Speaking round format"
          />
        </Field>
        <TextField label="Learner-facing title" value={block.title} onChange={(value) => patch({ title: value })} placeholder="Fix my booking" />
        <TextArea label="Instruction" value={block.instructions} onChange={(value) => patch({ instructions: value })} rows={3} />
        <TextArea label="Situation / setup" value={block.situation} onChange={(value) => patch({ situation: value })} rows={3} />
        <TextArea label="Outcome" value={block.outcome} onChange={(value) => patch({ outcome: value })} rows={2} hint="What should the interaction achieve? This is not an automatic speaking grade." />
      </Section>

      {block.format === 'number_mission' ? <NumberMissionEditor block={block} patchMaterial={patchMaterial} patchTeacher={patchTeacher} /> : null}
      {block.format === 'picture_detective' ? <PictureDetectiveEditor block={block} patchMaterial={patchMaterial} patchTeacher={patchTeacher} /> : null}
      {block.format === 'explain_without_saying' ? <ExplainEditor block={block} patchMaterial={patchMaterial} patchTeacher={patchTeacher} /> : null}
      {block.format === 'conversation_detective' ? <ConversationEditor block={block} patchMaterial={patchMaterial} patchTeacher={patchTeacher} /> : null}
      {block.format === 'make_the_choice' ? <ChoiceEditor block={block} patchMaterial={patchMaterial} patchTeacher={patchTeacher} /> : null}

      <Section eyebrow="Support and second stage">
        <StringList label="Optional support" items={block.support || []} onChange={(support) => patch({ support })} placeholder="Can you repeat that?" />
        <TextArea label="Challenge / second stage" value={block.challenge?.text} onChange={(value) => patch({ challenge: { ...(block.challenge || {}), text: value, reveal: 'teacher-controlled' } })} rows={3} hint="Stored for teacher-controlled reveal; it is not included in the initial learner payload." />
        <label className="flex items-center gap-2 text-xs font-black text-ink/65 dark:text-white/65">
          <input type="checkbox" checked={block.role_swap?.enabled !== false} onChange={(event) => patch({ role_swap: { ...(block.role_swap || {}), enabled: event.target.checked } })} />
          Include role swap
        </label>
        {block.role_swap?.enabled !== false ? <TextArea label="Role-swap instruction" value={block.role_swap?.instruction} onChange={(value) => patch({ role_swap: { ...(block.role_swap || {}), instruction: value } })} rows={2} /> : null}
      </Section>

      <Section eyebrow="Facilitation">
        <TextArea label="Teacher note" value={block.teacher_note} onChange={(value) => patch({ teacher_note: value })} rows={4} hint="Teacher-only facilitation. Never compiled into the learner runtime payload." />
      </Section>
    </div>
  );
}
