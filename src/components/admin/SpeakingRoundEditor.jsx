import React from 'react';
import {
  SPEAKING_ROUND_FORMATS,
  createSpeakingMaterial,
  normalizeSpeakingMaterial,
} from '../../lib/speakingRoundContract.js';

const fieldClass = 'focus-ring mt-1.5 w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-xs font-semibold dark:border-white/10 dark:bg-surface-900';

function RowButton({ onClick, children }) {
  return <button type="button" onClick={onClick} className="focus-ring rounded-full border border-ink/15 px-3 py-1.5 text-[0.68rem] font-black dark:border-white/15">{children}</button>;
}

export default function SpeakingRoundEditor({ material: rawMaterial, onChange }) {
  const material = normalizeSpeakingMaterial(rawMaterial);

  function changeFormat(format) {
    onChange(format ? createSpeakingMaterial(format) : null);
  }

  function patch(patchValue) {
    onChange({ ...(material || {}), ...patchValue });
  }

  const format = material?.format || '';

  return (
    <section className="mt-4 rounded-2xl border border-clay/20 bg-white p-4 dark:border-coral/20 dark:bg-surface-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-clay dark:text-coral">Formato strutturato</p>
          <p className="mt-1 text-xs font-semibold text-ink/55 dark:text-white/55">Il layout studente viene generato automaticamente. Non devi scrivere codici o HTML.</p>
        </div>
        <select value={format} onChange={(event) => changeFormat(event.target.value)} className="focus-ring rounded-xl border border-ink/15 bg-paper px-3 py-2 text-xs font-black dark:border-white/15 dark:bg-white/[0.05]">
          <option value="">Prompt standard</option>
          {SPEAKING_ROUND_FORMATS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </div>

      {!material ? null : material.format === 'number_mission' ? (
        <div className="mt-4 grid gap-3">
          <label><span className="text-[0.68rem] font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Missione</span><textarea rows={2} value={material.mission} onChange={(e) => patch({ mission: e.target.value })} className={fieldClass} /></label>
          <div className="grid gap-2">
            {material.facts.map((fact, index) => <div key={index} className="grid gap-2 sm:grid-cols-2"><input value={fact.label} placeholder="Etichetta, es. Time" onChange={(e) => patch({ facts: material.facts.map((row, i) => i === index ? { ...row, label: e.target.value } : row) })} className={fieldClass} /><input value={fact.value} placeholder="Valore, es. 7:00 pm" onChange={(e) => patch({ facts: material.facts.map((row, i) => i === index ? { ...row, value: e.target.value } : row) })} className={fieldClass} /></div>)}
            <RowButton onClick={() => patch({ facts: [...material.facts, { label: '', value: '' }] })}>+ Aggiungi dato</RowButton>
          </div>
        </div>
      ) : material.format === 'picture_detective' ? (
        <div className="mt-4 grid gap-3">
          <label><span className="text-[0.68rem] font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Immagine / asset path</span><input value={material.image_src} onChange={(e) => patch({ image_src: e.target.value })} placeholder="/assets/speaking/..." className={fieldClass} /></label>
          <label><span className="text-[0.68rem] font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Alt text</span><input value={material.image_alt} onChange={(e) => patch({ image_alt: e.target.value })} className={fieldClass} /></label>
          <label><span className="text-[0.68rem] font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Domanda detective</span><textarea rows={2} value={material.question} onChange={(e) => patch({ question: e.target.value })} className={fieldClass} /></label>
          <label><span className="text-[0.68rem] font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Clues opzionali, uno per riga</span><textarea rows={3} value={material.clues.join('\n')} onChange={(e) => patch({ clues: e.target.value.split('\n') })} className={fieldClass} /></label>
        </div>
      ) : material.format === 'explain_without_saying' ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label><span className="text-[0.68rem] font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Target</span><input value={material.target} onChange={(e) => patch({ target: e.target.value })} className={fieldClass} /></label>
          <label><span className="text-[0.68rem] font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Parole vietate, separate da virgola</span><input value={material.forbidden_words.join(', ')} onChange={(e) => patch({ forbidden_words: e.target.value.split(',') })} className={fieldClass} /></label>
        </div>
      ) : material.format === 'conversation_detective' ? (
        <div className="mt-4 grid gap-3">
          {material.turns.map((turn, index) => <div key={index} className="grid gap-2 sm:grid-cols-[7rem_minmax(0,1fr)]"><input value={turn.speaker} placeholder="Speaker" onChange={(e) => patch({ turns: material.turns.map((row, i) => i === index ? { ...row, speaker: e.target.value } : row) })} className={fieldClass} /><input value={turn.line} placeholder="Battuta" onChange={(e) => patch({ turns: material.turns.map((row, i) => i === index ? { ...row, line: e.target.value } : row) })} className={fieldClass} /></div>)}
          <RowButton onClick={() => patch({ turns: [...material.turns, { speaker: String.fromCharCode(65 + material.turns.length), line: '' }] })}>+ Aggiungi battuta</RowButton>
          <label><span className="text-[0.68rem] font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Domanda detective</span><textarea rows={2} value={material.question} onChange={(e) => patch({ question: e.target.value })} className={fieldClass} /></label>
        </div>
      ) : material.format === 'make_the_choice' ? (
        <div className="mt-4 grid gap-3">
          <label><span className="text-[0.68rem] font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Decisione</span><textarea rows={2} value={material.question} onChange={(e) => patch({ question: e.target.value })} className={fieldClass} /></label>
          <div className="grid gap-2 sm:grid-cols-2">
            {material.options.map((option, index) => <div key={index} className="rounded-xl border border-ink/10 p-3 dark:border-white/10"><input value={option.title} placeholder={`Opzione ${index + 1}`} onChange={(e) => patch({ options: material.options.map((row, i) => i === index ? { ...row, title: e.target.value } : row) })} className={fieldClass} /><textarea rows={2} value={option.detail} placeholder="Dettagli / trade-off" onChange={(e) => patch({ options: material.options.map((row, i) => i === index ? { ...row, detail: e.target.value } : row) })} className={fieldClass} /></div>)}
          </div>
          <RowButton onClick={() => patch({ options: [...material.options, { title: '', detail: '' }] })}>+ Aggiungi opzione</RowButton>
          <label><span className="text-[0.68rem] font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Criteri opzionali, uno per riga</span><textarea rows={3} value={material.criteria.join('\n')} onChange={(e) => patch({ criteria: e.target.value.split('\n') })} className={fieldClass} /></label>
        </div>
      ) : null}
    </section>
  );
}
