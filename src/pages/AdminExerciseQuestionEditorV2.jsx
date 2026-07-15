import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
import ExerciseQuestionRenderer from '../components/exercises/ExerciseQuestionRenderer.jsx';
import { loadExerciseQuestionBank } from '../lib/exerciseBankApi.js';
import {
  loadActiveDiagnosticCodes,
  loadExerciseQuestionEditorDetail,
  saveExerciseQuestionVersion,
  setExerciseQuestionStatus,
} from '../lib/exerciseQuestionEditorApi.js';

const TYPE_GROUPS = [
  ['Risposte automatiche', [
    ['multiple_choice', 'Scelta singola'],
    ['multiple_select', 'Scelta multipla'],
    ['gap_fill', 'Completamento libero'],
    ['select_gap', 'Completamento con opzioni'],
    ['translation', 'Traduzione'],
    ['error_correction', 'Correzione errore'],
    ['word_order', 'Riordino parole'],
  ]],
  ['Comprensione', [
    ['content_block', 'Blocco informativo'],
    ['reading_comprehension', 'Lettura e comprensione'],
  ]],
  ['Produzione', [
    ['written_response', 'Produzione scritta'],
    ['dialogue_roleplay', 'Dialogo con scelta del ruolo'],
    ['audio_response', 'Produzione orale registrata'],
  ]],
];
const TYPES = TYPE_GROUPS.flatMap(([, values]) => values);
const SKILLS = ['grammar', 'vocabulary', 'reading', 'writing', 'functional_language', 'spelling', 'word_order', 'speaking', 'listening', 'interaction'];
const statusLabels = { draft: 'Bozza', in_review: 'Da revisionare', approved: 'Approvata', published: 'Pubblicata', archived: 'Archiviata' };
const fieldClass = 'mt-2 w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:border-moss focus:ring-4 focus:ring-mint/30 dark:border-white/20 dark:bg-[#101a17] dark:text-white dark:focus:border-emerald-300 dark:focus:ring-emerald-400/15';
const compactFieldClass = 'w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-xs font-bold text-ink outline-none focus:border-moss dark:border-white/20 dark:bg-[#101a17] dark:text-white';

function uid(prefix) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function rubricTotal(rubric) {
  return (rubric || []).reduce((sum, item) => sum + Number(item.max_points || 0), 0) || 1;
}

function defaultRubric(kind = 'writing') {
  if (kind === 'speaking') return [
    { key: 'task', label: 'Contenuto', description: '', max_points: 3 },
    { key: 'fluency', label: 'Fluidità', description: '', max_points: 3 },
    { key: 'accuracy', label: 'Accuratezza', description: '', max_points: 2 },
    { key: 'pronunciation', label: 'Pronuncia', description: '', max_points: 2 },
  ];
  if (kind === 'interaction') return [
    { key: 'interaction', label: 'Gestione del dialogo', description: '', max_points: 4 },
    { key: 'functional_language', label: 'Funzioni comunicative', description: '', max_points: 3 },
    { key: 'accuracy', label: 'Accuratezza', description: '', max_points: 3 },
  ];
  return [
    { key: 'task', label: 'Consegna', description: '', max_points: 4 },
    { key: 'accuracy', label: 'Accuratezza', description: '', max_points: 3 },
    { key: 'range', label: 'Lessico e registro', description: '', max_points: 3 },
  ];
}

function defaultContent(type) {
  if (type === 'multiple_choice' || type === 'multiple_select') return { options: [{ key: uid('opt'), text: '', is_correct: true, error_code: null }, { key: uid('opt'), text: '', is_correct: false, error_code: null }] };
  if (type === 'gap_fill') return { blanks: [{ key: 'blank_1', accepted_answers: [''], points: 1 }] };
  if (type === 'select_gap') return { blanks: [{ key: 'blank_1', accepted_answers: [''], options: ['', ''], points: 1 }] };
  if (type === 'translation' || type === 'error_correction') return { accepted_answers: [''] };
  if (type === 'word_order') return { tokens: [{ key: uid('token'), text: '' }, { key: uid('token'), text: '' }], correct_order: ['', ''] };
  if (type === 'content_block') return { body: '' };
  if (type === 'written_response') return { context: '', min_words: 60, max_words: 120, required_points: [], rubric: defaultRubric('writing'), model_answer: '' };
  if (type === 'dialogue_roleplay') return {
    scenario: '',
    response_mode: 'written',
    characters: [
      { key: 'character_1', name: 'Personaggio 1', description: '', selectable: true },
      { key: 'character_2', name: 'Personaggio 2', description: '', selectable: true },
    ],
    turns: [
      { key: 'turn_1', speaker: 'character_1', text: '', prompt: 'Scrivi la prima battuta.', learner_response: true },
      { key: 'turn_2', speaker: 'character_2', text: '', prompt: 'Rispondi in modo appropriato.', learner_response: true },
    ],
    rubric: defaultRubric('interaction'),
    model_responses: {},
  };
  if (type === 'audio_response') return { context: '', min_seconds: 20, max_seconds: 90, allow_rerecord: true, rubric: defaultRubric('speaking'), model_transcript: '' };
  if (type === 'reading_comprehension') return {
    title: '', passage: '', source_note: '',
    items: [{ key: 'item_1', type: 'multiple_choice', prompt: '', points: 1, options: [{ key: 'a', text: '', is_correct: true }, { key: 'b', text: '', is_correct: false }] }],
  };
  return {};
}

function defaultSkill(type) {
  if (type === 'written_response') return 'writing';
  if (type === 'dialogue_roleplay') return 'interaction';
  if (type === 'audio_response') return 'speaking';
  if (type === 'reading_comprehension' || type === 'content_block') return 'reading';
  return 'grammar';
}

function emptyQuestion() {
  return {
    id: null, publicId: '', status: 'draft', versionNumber: null,
    questionType: 'multiple_choice', title: '', prompt: '', instructions: '', instructionLanguage: 'it',
    level: 'A1', topic: '', subtopic: '', primarySkill: 'grammar', learningObjective: '', difficulty: 'standard',
    tagsText: '', content: defaultContent('multiple_choice'),
    grading: { mode: 'automatic', weight: 1, nearly_correct_multiplier: 0.5 },
    feedback: { correct: '', incorrect: '', explanation: '' },
    diagnostics: { tested_codes: [], fallback_error_code: null, answer_error_mappings: [] }, media: [],
  };
}

function fromDetail(detail) {
  return {
    id: detail.id, publicId: detail.public_id, status: detail.status, versionNumber: detail.version_number,
    questionType: detail.question_type, title: detail.title || '', prompt: detail.prompt || '', instructions: detail.instructions || '', instructionLanguage: detail.instruction_language || 'it',
    level: detail.level || 'A1', topic: detail.topic || '', subtopic: detail.subtopic || '', primarySkill: detail.primary_skill || defaultSkill(detail.question_type),
    learningObjective: detail.learning_objective || '', difficulty: detail.difficulty || 'standard', tagsText: (detail.tags || []).join(', '),
    content: detail.content || defaultContent(detail.question_type),
    grading: { mode: ['written_response', 'dialogue_roleplay', 'audio_response'].includes(detail.question_type) ? 'manual_review' : 'automatic', weight: 1, nearly_correct_multiplier: 0.5, ...(detail.grading || {}) },
    feedback: { correct: '', incorrect: '', explanation: '', ...(detail.feedback || {}) },
    diagnostics: { tested_codes: [], fallback_error_code: null, answer_error_mappings: [], ...(detail.diagnostics || {}) }, media: detail.media || [],
  };
}

function statusClass(status) {
  if (status === 'published') return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200';
  if (status === 'approved') return 'bg-cyan-100 text-cyan-900 dark:bg-cyan-400/15 dark:text-cyan-200';
  if (status === 'archived') return 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/60';
  if (status === 'in_review') return 'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200';
  return 'bg-violet-100 text-violet-900 dark:bg-violet-400/15 dark:text-violet-200';
}

function canApprove(item) {
  return item && !['approved', 'published', 'archived'].includes(item.status);
}

function OptionEditor({ question, setQuestion, codes }) {
  const options = question.content.options || [];
  function update(index, patch) {
    let next = options.map((option, current) => current === index ? { ...option, ...patch } : option);
    if (patch.is_correct && question.questionType === 'multiple_choice') next = next.map((option, current) => ({ ...option, is_correct: current === index }));
    setQuestion({ ...question, content: { ...question.content, options: next } });
  }
  return <div className="grid gap-3">{options.map((option, index) => <div key={option.key} className="grid gap-3 rounded-xl border border-ink/10 p-4 dark:border-white/10 sm:grid-cols-[auto_minmax(0,1fr)_13rem_auto] sm:items-end"><label className="flex items-center gap-2 pb-3 text-xs font-black"><input type={question.questionType === 'multiple_choice' ? 'radio' : 'checkbox'} checked={Boolean(option.is_correct)} onChange={(event) => update(index, { is_correct: event.target.checked })} />Corretta</label><label className="text-xs font-black text-ink/60 dark:text-white/60">Testo<input value={option.text || ''} onChange={(event) => update(index, { text: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black text-ink/60 dark:text-white/60">Errore se scelta<select value={option.error_code || ''} onChange={(event) => update(index, { error_code: event.target.value || null })} className={fieldClass}><option value="">Nessun codice</option>{codes.map((code) => <option key={code.code} value={code.code}>{code.code}</option>)}</select></label><button type="button" disabled={options.length <= 2} onClick={() => setQuestion({ ...question, content: { ...question.content, options: options.filter((_, current) => current !== index) } })} className="pb-3 text-xs font-black text-red-700 underline disabled:opacity-30 dark:text-red-300">Rimuovi</button></div>)}<button type="button" onClick={() => setQuestion({ ...question, content: { ...question.content, options: [...options, { key: uid('opt'), text: '', is_correct: false, error_code: null }] } })} className="justify-self-start rounded-full border border-ink/15 px-4 py-2 text-xs font-black dark:border-white/20">Aggiungi opzione</button></div>;
}

function BlankEditor({ question, setQuestion }) {
  const blanks = question.content.blanks || [];
  const update = (index, patch) => setQuestion({ ...question, content: { ...question.content, blanks: blanks.map((blank, current) => current === index ? { ...blank, ...patch } : blank) } });
  return <div className="grid gap-3">{blanks.map((blank, index) => <div key={`${blank.key}-${index}`} className="rounded-xl border border-ink/10 p-4 dark:border-white/10"><div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_7rem_auto] sm:items-end"><label className="text-xs font-black">Chiave<input value={blank.key || ''} onChange={(event) => update(index, { key: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black">Risposte accettate, separate da |<input value={(blank.accepted_answers || []).join(' | ')} onChange={(event) => update(index, { accepted_answers: event.target.value.split('|').map((item) => item.trim()) })} className={fieldClass} /></label><label className="text-xs font-black">Punti<input type="number" min="0.1" step="0.1" value={blank.points || 1} onChange={(event) => update(index, { points: Number(event.target.value) || 1 })} className={fieldClass} /></label><button type="button" disabled={blanks.length <= 1} onClick={() => setQuestion({ ...question, content: { ...question.content, blanks: blanks.filter((_, current) => current !== index) } })} className="pb-3 text-xs font-black text-red-700 underline disabled:opacity-30">Rimuovi</button></div>{question.questionType === 'select_gap' ? <label className="mt-3 block text-xs font-black">Opzioni, separate da |<input value={(blank.options || []).join(' | ')} onChange={(event) => update(index, { options: event.target.value.split('|').map((item) => item.trim()) })} className={fieldClass} /></label> : null}</div>)}<button type="button" onClick={() => setQuestion({ ...question, content: { ...question.content, blanks: [...blanks, { key: `blank_${blanks.length + 1}`, accepted_answers: [''], ...(question.questionType === 'select_gap' ? { options: ['', ''] } : {}), points: 1 }] } })} className="justify-self-start rounded-full border border-ink/15 px-4 py-2 text-xs font-black">Aggiungi spazio</button></div>;
}

function RubricEditor({ rubric = [], onChange }) {
  const total = rubricTotal(rubric);
  function update(index, patch) { onChange(rubric.map((item, current) => current === index ? { ...item, ...patch } : item)); }
  return <div className="grid gap-3"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">Rubric di valutazione</p><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-800 dark:bg-violet-300/10 dark:text-violet-200">Totale {total} punti</span></div>{rubric.map((criterion, index) => <div key={criterion.key} className="grid gap-3 rounded-xl border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-300/20 dark:bg-violet-400/[0.05] sm:grid-cols-[10rem_minmax(0,1fr)_7rem_auto] sm:items-end"><label className="text-xs font-black">Etichetta<input value={criterion.label || ''} onChange={(event) => update(index, { label: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black">Descrizione<input value={criterion.description || ''} onChange={(event) => update(index, { description: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black">Punti<input type="number" min="0.5" step="0.5" value={criterion.max_points || 1} onChange={(event) => update(index, { max_points: Number(event.target.value) || 1 })} className={fieldClass} /></label><button type="button" disabled={rubric.length <= 1} onClick={() => onChange(rubric.filter((_, current) => current !== index))} className="pb-3 text-xs font-black text-red-700 underline disabled:opacity-30">Rimuovi</button></div>)}<button type="button" onClick={() => onChange([...rubric, { key: uid('criterion'), label: '', description: '', max_points: 1 }])} className="justify-self-start rounded-full border border-violet-300 px-4 py-2 text-xs font-black text-violet-800 dark:text-violet-200">Aggiungi criterio</button></div>;
}

function WrittenEditor({ question, setQuestion }) {
  const content = question.content;
  const update = (patch) => setQuestion({ ...question, content: { ...content, ...patch } });
  return <div className="grid gap-4"><label className="text-xs font-black">Contesto<textarea rows={3} value={content.context || ''} onChange={(event) => update({ context: event.target.value })} className={fieldClass} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-black">Minimo parole<input type="number" min="1" value={content.min_words || 1} onChange={(event) => update({ min_words: Number(event.target.value) || 1 })} className={fieldClass} /></label><label className="text-xs font-black">Massimo parole<input type="number" min="1" value={content.max_words || 1} onChange={(event) => update({ max_words: Number(event.target.value) || 1 })} className={fieldClass} /></label></div><label className="text-xs font-black">Punti obbligatori, uno per riga<textarea rows={4} value={(content.required_points || []).join('\n')} onChange={(event) => update({ required_points: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} className={fieldClass} /></label><RubricEditor rubric={content.rubric || []} onChange={(rubric) => update({ rubric })} /><label className="text-xs font-black">Risposta modello, visibile soltanto all’admin<textarea rows={5} value={content.model_answer || ''} onChange={(event) => update({ model_answer: event.target.value })} className={fieldClass} /></label></div>;
}

function DialogueEditor({ question, setQuestion }) {
  const content = question.content;
  const characters = content.characters || [];
  const turns = content.turns || [];
  const updateContent = (patch) => setQuestion({ ...question, content: { ...content, ...patch } });
  const updateCharacter = (index, patch) => updateContent({ characters: characters.map((item, current) => current === index ? { ...item, ...patch } : item) });
  const updateTurn = (index, patch) => updateContent({ turns: turns.map((item, current) => current === index ? { ...item, ...patch } : item) });
  return <div className="grid gap-5"><label className="text-xs font-black">Scenario<textarea rows={3} value={content.scenario || ''} onChange={(event) => updateContent({ scenario: event.target.value })} className={fieldClass} /></label><section><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-wide text-violet-700">Personaggi</p><button type="button" onClick={() => updateContent({ characters: [...characters, { key: `character_${characters.length + 1}`, name: `Personaggio ${characters.length + 1}`, description: '', selectable: true }] })} className="text-xs font-black text-violet-700 underline">Aggiungi</button></div><div className="mt-3 grid gap-3">{characters.map((character, index) => <div key={`${character.key}-${index}`} className="grid gap-3 rounded-xl border border-ink/10 p-4 sm:grid-cols-[10rem_12rem_minmax(0,1fr)_auto_auto] sm:items-end"><label className="text-xs font-black">Chiave<input value={character.key || ''} onChange={(event) => updateCharacter(index, { key: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black">Nome<input value={character.name || ''} onChange={(event) => updateCharacter(index, { name: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black">Descrizione<input value={character.description || ''} onChange={(event) => updateCharacter(index, { description: event.target.value })} className={fieldClass} /></label><label className="flex items-center gap-2 pb-3 text-xs font-black"><input type="checkbox" checked={character.selectable !== false} onChange={(event) => updateCharacter(index, { selectable: event.target.checked })} />Selezionabile</label><button type="button" disabled={characters.length <= 2} onClick={() => updateContent({ characters: characters.filter((_, current) => current !== index) })} className="pb-3 text-xs font-black text-red-700 underline disabled:opacity-30">Rimuovi</button></div>)}</div></section><section><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-wide text-violet-700">Turni</p><button type="button" onClick={() => updateContent({ turns: [...turns, { key: `turn_${turns.length + 1}`, speaker: characters[0]?.key || '', text: '', prompt: '', learner_response: true }] })} className="text-xs font-black text-violet-700 underline">Aggiungi</button></div><div className="mt-3 grid gap-3">{turns.map((turn, index) => <div key={`${turn.key}-${index}`} className="rounded-xl border border-ink/10 p-4"><div className="grid gap-3 sm:grid-cols-[10rem_12rem_auto_auto] sm:items-end"><label className="text-xs font-black">Chiave<input value={turn.key || ''} onChange={(event) => updateTurn(index, { key: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black">Parla<select value={turn.speaker || ''} onChange={(event) => updateTurn(index, { speaker: event.target.value })} className={fieldClass}>{characters.map((character) => <option key={character.key} value={character.key}>{character.name || character.key}</option>)}</select></label><label className="flex items-center gap-2 pb-3 text-xs font-black"><input type="checkbox" checked={Boolean(turn.learner_response)} onChange={(event) => updateTurn(index, { learner_response: event.target.checked })} />Risposta studente</label><button type="button" disabled={turns.length <= 2} onClick={() => updateContent({ turns: turns.filter((_, current) => current !== index) })} className="pb-3 text-xs font-black text-red-700 underline disabled:opacity-30">Rimuovi</button></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-black">Battuta fissa dell’altro personaggio<textarea rows={2} value={turn.text || ''} onChange={(event) => updateTurn(index, { text: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black">Indicazione per la battuta dello studente<textarea rows={2} value={turn.prompt || ''} onChange={(event) => updateTurn(index, { prompt: event.target.value })} className={fieldClass} /></label></div></div>)}</div></section><RubricEditor rubric={content.rubric || []} onChange={(rubric) => updateContent({ rubric })} /></div>;
}

function AudioEditor({ question, setQuestion }) {
  const content = question.content;
  const update = (patch) => setQuestion({ ...question, content: { ...content, ...patch } });
  return <div className="grid gap-4"><label className="text-xs font-black">Contesto o punti da sviluppare<textarea rows={3} value={content.context || ''} onChange={(event) => update({ context: event.target.value })} className={fieldClass} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-black">Durata minima, secondi<input type="number" min="0" value={content.min_seconds || 0} onChange={(event) => update({ min_seconds: Number(event.target.value) || 0 })} className={fieldClass} /></label><label className="text-xs font-black">Durata massima, secondi<input type="number" min="5" value={content.max_seconds || 90} onChange={(event) => update({ max_seconds: Number(event.target.value) || 90 })} className={fieldClass} /></label></div><label className="flex items-center gap-3 rounded-xl border border-ink/10 p-4 text-sm font-black"><input type="checkbox" checked={content.allow_rerecord !== false} onChange={(event) => update({ allow_rerecord: event.target.checked })} />Permetti di registrare nuovamente prima della consegna</label><RubricEditor rubric={content.rubric || []} onChange={(rubric) => update({ rubric })} /><label className="text-xs font-black">Trascrizione modello, solo admin<textarea rows={4} value={content.model_transcript || ''} onChange={(event) => update({ model_transcript: event.target.value })} className={fieldClass} /></label></div>;
}

function ReadingItemEditor({ item, index, onChange, onRemove, removable }) {
  const options = item.options || [];
  const updateOption = (optionIndex, patch) => onChange({ ...item, options: options.map((option, current) => current === optionIndex ? { ...option, ...patch } : option) });
  return <div className="rounded-xl border border-cyan-200 bg-cyan-50/35 p-4 dark:border-cyan-300/20 dark:bg-cyan-300/[0.04]"><div className="grid gap-3 sm:grid-cols-[9rem_12rem_7rem_auto] sm:items-end"><label className="text-xs font-black">Chiave<input value={item.key || ''} onChange={(event) => onChange({ ...item, key: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black">Tipo<select value={item.type || 'short_answer'} onChange={(event) => onChange({ ...item, type: event.target.value, ...(event.target.value === 'short_answer' ? { accepted_answers: [''], options: undefined } : { options: [{ key: 'a', text: '', is_correct: true }, { key: 'b', text: '', is_correct: false }], accepted_answers: undefined }) })} className={fieldClass}><option value="multiple_choice">Scelta singola</option><option value="multiple_select">Scelta multipla</option><option value="true_false">Vero o falso</option><option value="short_answer">Risposta breve</option></select></label><label className="text-xs font-black">Punti<input type="number" min="0.5" step="0.5" value={item.points || 1} onChange={(event) => onChange({ ...item, points: Number(event.target.value) || 1 })} className={fieldClass} /></label><button type="button" disabled={!removable} onClick={onRemove} className="pb-3 text-xs font-black text-red-700 underline disabled:opacity-30">Rimuovi</button></div><label className="mt-3 block text-xs font-black">Domanda<textarea rows={2} value={item.prompt || ''} onChange={(event) => onChange({ ...item, prompt: event.target.value })} className={fieldClass} /></label>{item.type === 'short_answer' ? <label className="mt-3 block text-xs font-black">Risposte accettate, separate da |<input value={(item.accepted_answers || []).join(' | ')} onChange={(event) => onChange({ ...item, accepted_answers: event.target.value.split('|').map((value) => value.trim()) })} className={fieldClass} /></label> : <div className="mt-3 grid gap-2">{options.map((option, optionIndex) => <div key={`${option.key}-${optionIndex}`} className="grid gap-2 sm:grid-cols-[auto_8rem_minmax(0,1fr)_auto] sm:items-end"><label className="flex items-center gap-2 pb-3 text-xs font-black"><input type={item.type === 'multiple_select' ? 'checkbox' : 'radio'} checked={Boolean(option.is_correct)} onChange={(event) => onChange({ ...item, options: options.map((currentOption, current) => ({ ...currentOption, is_correct: item.type === 'multiple_select' ? current === optionIndex ? event.target.checked : currentOption.is_correct : current === optionIndex })) })} />Corretta</label><label className="text-xs font-black">Chiave<input value={option.key || ''} onChange={(event) => updateOption(optionIndex, { key: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black">Testo<input value={option.text || ''} onChange={(event) => updateOption(optionIndex, { text: event.target.value })} className={fieldClass} /></label><button type="button" disabled={options.length <= 2} onClick={() => onChange({ ...item, options: options.filter((_, current) => current !== optionIndex) })} className="pb-3 text-xs font-black text-red-700 underline disabled:opacity-30">Rimuovi</button></div>)}<button type="button" onClick={() => onChange({ ...item, options: [...options, { key: String.fromCharCode(97 + options.length), text: '', is_correct: false }] })} className="justify-self-start text-xs font-black text-cyan-800 underline">Aggiungi opzione</button></div>}</div>;
}

function ReadingEditor({ question, setQuestion }) {
  const content = question.content;
  const items = content.items || [];
  const update = (patch) => setQuestion({ ...question, content: { ...content, ...patch } });
  return <div className="grid gap-5"><label className="text-xs font-black">Titolo del testo<input value={content.title || ''} onChange={(event) => update({ title: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black">Testo di lettura<textarea rows={12} value={content.passage || ''} onChange={(event) => update({ passage: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black">Fonte o nota opzionale<input value={content.source_note || ''} onChange={(event) => update({ source_note: event.target.value })} className={fieldClass} /></label><section><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-wide text-cyan-800 dark:text-cyan-200">Domande di comprensione</p><button type="button" onClick={() => update({ items: [...items, { key: `item_${items.length + 1}`, type: 'multiple_choice', prompt: '', points: 1, options: [{ key: 'a', text: '', is_correct: true }, { key: 'b', text: '', is_correct: false }] }] })} className="text-xs font-black text-cyan-800 underline dark:text-cyan-200">Aggiungi</button></div><div className="mt-3 grid gap-4">{items.map((item, index) => <ReadingItemEditor key={`${item.key}-${index}`} item={item} index={index} onChange={(next) => update({ items: items.map((current, position) => position === index ? next : current) })} onRemove={() => update({ items: items.filter((_, position) => position !== index) })} removable={items.length > 1} />)}</div></section></div>;
}

function DiagnosticPatterns({ question, setQuestion, codes }) {
  const mappings = question.diagnostics.answer_error_mappings || [];
  return <div className="grid gap-3">{mappings.map((mapping, index) => <div key={index} className="grid gap-3 rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-300/20 dark:bg-violet-400/[0.06] sm:grid-cols-[minmax(0,1fr)_15rem_auto] sm:items-end"><label className="text-xs font-black">Risposte, separate da |<input value={(mapping.matches || []).join(' | ')} onChange={(event) => setQuestion({ ...question, diagnostics: { ...question.diagnostics, answer_error_mappings: mappings.map((item, current) => current === index ? { ...item, matches: event.target.value.split('|').map((value) => value.trim()) } : item) } })} className={fieldClass} /></label><label className="text-xs font-black">Codice<select value={mapping.error_code || ''} onChange={(event) => setQuestion({ ...question, diagnostics: { ...question.diagnostics, answer_error_mappings: mappings.map((item, current) => current === index ? { ...item, error_code: event.target.value } : item) } })} className={fieldClass}><option value="">Scegli...</option>{codes.map((code) => <option key={code.code} value={code.code}>{code.code}</option>)}</select></label><button type="button" onClick={() => setQuestion({ ...question, diagnostics: { ...question.diagnostics, answer_error_mappings: mappings.filter((_, current) => current !== index) } })} className="pb-3 text-xs font-black text-red-700 underline">Rimuovi</button></div>)}<button type="button" onClick={() => setQuestion({ ...question, diagnostics: { ...question.diagnostics, answer_error_mappings: [...mappings, { matches: [''], error_code: '' }] } })} className="justify-self-start rounded-full border border-violet-300 px-4 py-2 text-xs font-black text-violet-800">Aggiungi pattern</button></div>;
}

export default function AdminExerciseQuestionEditorV2() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalog, setCatalog] = useState([]);
  const [codes, setCodes] = useState([]);
  const [question, setQuestion] = useState(emptyQuestion());
  const [previewAnswer, setPreviewAnswer] = useState(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogStatus, setCatalogStatus] = useState('all');
  const [catalogLevel, setCatalogLevel] = useState('all');
  const [catalogType, setCatalogType] = useState('all');
  const [catalogTopic, setCatalogTopic] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function applyFilters(list) {
    const term = catalogSearch.trim().toLowerCase();
    return list.filter((item) => {
      if (catalogStatus === 'pending' && !canApprove(item)) return false;
      if (!['all', 'pending'].includes(catalogStatus) && item.status !== catalogStatus) return false;
      if (catalogLevel !== 'all' && item.level !== catalogLevel) return false;
      if (catalogType !== 'all' && item.question_type !== catalogType) return false;
      if (catalogTopic !== 'all' && item.topic !== catalogTopic) return false;
      return !term || [item.publicId, item.title, item.prompt, item.topic, item.subtopic, item.learning_objective, ...(item.tags || [])].filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
    });
  }

  async function loadBase() {
    setLoading(true); setError('');
    try {
      const [questionData, codeData] = await Promise.all([loadExerciseQuestionBank(), loadActiveDiagnosticCodes()]);
      setCatalog(questionData); setCodes(codeData); return questionData;
    } catch (loadError) { setError(loadError.message || 'Non è stato possibile caricare l’editor.'); return []; }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const questionData = await loadBase();
      if (!active) return;
      const requestedId = searchParams.get('questionId');
      if (searchParams.get('new') === '1' || (!requestedId && !questionData.length)) createNew();
      else if (requestedId || questionData[0]?.id) await openQuestion(requestedId || questionData[0].id);
    })();
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openQuestion(questionId, options = {}) {
    setLoading(true); setError(''); if (!options.preserveSuccess) setSuccess('');
    try { const detail = await loadExerciseQuestionEditorDetail(questionId); if (!detail) throw new Error('Domanda non trovata.'); setQuestion(fromDetail(detail)); setPreviewAnswer(null); setSearchParams({ questionId }); return detail; }
    catch (loadError) { setError(loadError.message || 'Non è stato possibile aprire la domanda.'); return null; }
    finally { setLoading(false); }
  }

  function createNew() { setQuestion(emptyQuestion()); setPreviewAnswer(null); setSearchParams({ new: '1' }); setSuccess('Nuova domanda pronta.'); setError(''); }
  const filteredCatalog = useMemo(() => applyFilters(catalog), [catalog, catalogSearch, catalogStatus, catalogLevel, catalogType, catalogTopic]);
  const catalogLevels = useMemo(() => [...new Set(catalog.map((item) => item.level).filter(Boolean))].sort(), [catalog]);
  const catalogTypes = useMemo(() => [...new Set(catalog.map((item) => item.question_type).filter(Boolean))].sort(), [catalog]);
  const catalogTopics = useMemo(() => [...new Set(catalog.map((item) => item.topic).filter(Boolean))].sort(), [catalog]);
  const currentIndex = filteredCatalog.findIndex((item) => item.id === question.id);
  const testedSet = new Set(question.diagnostics.tested_codes || []);

  function switchType(type) {
    if (type === question.questionType) return;
    const manual = ['written_response', 'dialogue_roleplay', 'audio_response'].includes(type);
    const content = defaultContent(type);
    setQuestion({ ...question, questionType: type, primarySkill: defaultSkill(type), content, grading: { ...question.grading, mode: manual ? 'manual_review' : type === 'reading_comprehension' ? 'per_item' : 'automatic', weight: manual ? rubricTotal(content.rubric) : 1 } });
    setPreviewAnswer(null);
  }

  function toggleCode(code) {
    const next = testedSet.has(code) ? [...testedSet].filter((item) => item !== code) : [...testedSet, code];
    setQuestion({ ...question, diagnostics: { ...question.diagnostics, tested_codes: next, fallback_error_code: next.includes(question.diagnostics.fallback_error_code) ? question.diagnostics.fallback_error_code : next[0] || null } });
  }

  async function save() {
    setSaving(true); setError(''); setSuccess('');
    try {
      const manual = ['written_response', 'dialogue_roleplay', 'audio_response'].includes(question.questionType);
      const normalized = manual ? { ...question, grading: { ...question.grading, mode: 'manual_review', weight: rubricTotal(question.content.rubric) } } : question;
      const result = await saveExerciseQuestionVersion({ questionId: question.id, question: { ...normalized, tags: normalized.tagsText.split(',').map((item) => item.trim()).filter(Boolean) } });
      await loadBase(); await openQuestion(result.id, { preserveSuccess: true }); setSuccess(`${result.public_id}, versione ${result.version_number}, salvata.`);
    } catch (saveError) { setError(saveError.message || 'Non è stato possibile salvare la domanda.'); }
    finally { setSaving(false); }
  }

  async function changeStatus(status, advance = false) {
    if (!question.id) return;
    const currentId = question.id; const currentPublicId = question.publicId;
    setSaving(true); setError(''); setSuccess('');
    try {
      await setExerciseQuestionStatus(currentId, status);
      const refreshed = await loadBase();
      const filtered = applyFilters(refreshed);
      const currentPosition = Math.max(0, filtered.findIndex((item) => item.id === currentId));
      const next = advance ? [...filtered.slice(currentPosition + 1), ...filtered.slice(0, currentPosition + 1)].find(canApprove) : null;
      if (next) { await openQuestion(next.id, { preserveSuccess: true }); setSuccess(`${currentPublicId}: ${statusLabels[status]}. Aperta ${next.publicId}.`); }
      else { await openQuestion(currentId, { preserveSuccess: true }); setSuccess(`${currentPublicId}: ${statusLabels[status]}.`); }
    } catch (statusError) { setError(statusError.message || 'Non è stato possibile aggiornare lo stato.'); }
    finally { setSaving(false); }
  }

  const previewItem = { id: 'preview', question: { type: question.questionType, prompt: question.prompt, instructions: question.instructions, content: question.content }, result: null };
  const manual = ['written_response', 'dialogue_roleplay', 'audio_response'].includes(question.questionType);

  return <><SEO title="Question Editor v2 | Exercise Builder" description="Crea domande automatiche, letture e produzioni revisionate." /><section className="section-shell py-8 lg:py-10"><div className="mx-auto max-w-[1700px]"><header className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-[#16211e] sm:p-8"><span className="eyebrow">Exercise Builder v2</span><div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-black text-ink dark:text-white sm:text-4xl">Editor domande</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/65">Domande automatiche, lettura, scrittura, dialoghi e registrazioni nello stesso sistema versionato.</p></div><div className="flex flex-wrap gap-2"><Link to="/admin/content/exercises/questions" className="rounded-full border border-ink/15 px-4 py-2.5 text-sm font-black">Banca domande</Link><Link to="/admin/content/exercises/diagnostics" className="rounded-full border border-ink/15 px-4 py-2.5 text-sm font-black">Diagnostica</Link><button type="button" onClick={createNew} className="rounded-full bg-ink px-4 py-2.5 text-sm font-black text-white dark:bg-emerald-300 dark:text-[#102019]">Nuova domanda</button></div></div></header>{error ? <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-950">{error}</div> : null}{success ? <div className="mt-5 border-l-4 border-moss bg-mint/30 p-4 text-sm font-bold text-ink">{success}</div> : null}<div className="mt-6 grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)] 2xl:grid-cols-[20rem_minmax(0,1fr)_28rem]"><aside className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#16211e] xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-wide text-moss">Coda</p><span className="text-xs font-black text-ink/40">{filteredCatalog.length}</span></div><input value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} className={fieldClass} placeholder="ID, prompt, topic o tag" /><div className="mt-3 grid grid-cols-2 gap-2"><select value={catalogStatus} onChange={(event) => setCatalogStatus(event.target.value)} className={compactFieldClass}><option value="all">Tutti gli stati</option><option value="pending">Solo da approvare</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select value={catalogLevel} onChange={(event) => setCatalogLevel(event.target.value)} className={compactFieldClass}><option value="all">Tutti i livelli</option>{catalogLevels.map((item) => <option key={item}>{item}</option>)}</select><select value={catalogType} onChange={(event) => setCatalogType(event.target.value)} className={compactFieldClass}><option value="all">Tutti i tipi</option>{catalogTypes.map((item) => <option key={item}>{item}</option>)}</select><select value={catalogTopic} onChange={(event) => setCatalogTopic(event.target.value)} className={compactFieldClass}><option value="all">Tutti i topic</option>{catalogTopics.map((item) => <option key={item}>{item}</option>)}</select></div><button type="button" onClick={() => { setCatalogSearch(''); setCatalogStatus('all'); setCatalogLevel('all'); setCatalogType('all'); setCatalogTopic('all'); }} className="mt-3 text-xs font-black text-ink/45 underline">Azzera filtri</button><div className="mt-4 grid gap-2">{filteredCatalog.map((item) => <button key={item.id} type="button" onClick={() => openQuestion(item.id)} className={`rounded-xl border p-3 text-left ${question.id === item.id ? 'border-moss bg-mint/25' : 'border-ink/10'}`}><div className="flex justify-between gap-2"><span className="text-xs font-black text-moss">{item.publicId}</span><span className={`rounded-full px-2 py-1 text-[0.6rem] font-black ${statusClass(item.status)}`}>{statusLabels[item.status]}</span></div><p className="mt-2 line-clamp-2 text-sm font-black">{item.title || item.prompt}</p><p className="mt-1 text-xs font-bold text-ink/45">{item.level} · {item.question_type}</p></button>)}</div></aside><main className="grid min-w-0 gap-6"><section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7"><div className="flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-moss">{question.publicId || 'Nuova domanda'}</p><h2 className="mt-1 text-2xl font-black">Identità e consegna</h2></div>{question.id ? <span className={`rounded-full px-3 py-1.5 text-xs font-black ${statusClass(question.status)}`}>{statusLabels[question.status]} · v{question.versionNumber}</span> : null}</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-black">Tipologia<select value={question.questionType} onChange={(event) => switchType(event.target.value)} className={fieldClass}>{TYPE_GROUPS.map(([label, values]) => <optgroup key={label} label={label}>{values.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}</optgroup>)}</select></label><label className="text-xs font-black">Titolo interno<input value={question.title} onChange={(event) => setQuestion({ ...question, title: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black sm:col-span-2">Prompt<textarea rows={3} value={question.prompt} onChange={(event) => setQuestion({ ...question, prompt: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black sm:col-span-2">Consegna aggiuntiva<input value={question.instructions} onChange={(event) => setQuestion({ ...question, instructions: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black">Livello<select value={question.level} onChange={(event) => setQuestion({ ...question, level: event.target.value })} className={fieldClass}>{['A0', 'A1', 'A1+', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C2', 'Mixed'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs font-black">Competenza<select value={question.primarySkill} onChange={(event) => setQuestion({ ...question, primarySkill: event.target.value })} className={fieldClass}>{SKILLS.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs font-black">Topic<input value={question.topic} onChange={(event) => setQuestion({ ...question, topic: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black">Sottotema<input value={question.subtopic} onChange={(event) => setQuestion({ ...question, subtopic: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black sm:col-span-2">Obiettivo didattico<input value={question.learningObjective} onChange={(event) => setQuestion({ ...question, learningObjective: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black">Difficoltà<select value={question.difficulty} onChange={(event) => setQuestion({ ...question, difficulty: event.target.value })} className={fieldClass}><option value="support">Supporto</option><option value="standard">Standard</option><option value="challenge">Sfida</option></select></label><label className="text-xs font-black">Tag<input value={question.tagsText} onChange={(event) => setQuestion({ ...question, tagsText: event.target.value })} className={fieldClass} /></label></div></section><section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7"><p className="text-xs font-black uppercase tracking-wide text-violet-700">Contenuto e risposta</p><div className="mt-5">{['multiple_choice', 'multiple_select'].includes(question.questionType) ? <OptionEditor question={question} setQuestion={setQuestion} codes={codes} /> : null}{['gap_fill', 'select_gap'].includes(question.questionType) ? <BlankEditor question={question} setQuestion={setQuestion} /> : null}{['translation', 'error_correction'].includes(question.questionType) ? <label className="text-xs font-black">Risposte accettate, una per riga<textarea rows={5} value={(question.content.accepted_answers || []).join('\n')} onChange={(event) => setQuestion({ ...question, content: { ...question.content, accepted_answers: event.target.value.split('\n') } })} className={fieldClass} /></label> : null}{question.questionType === 'word_order' ? <label className="text-xs font-black">Ordine corretto, un token per riga<textarea rows={7} value={(question.content.correct_order || []).join('\n')} onChange={(event) => { const words = event.target.value.split('\n'); setQuestion({ ...question, content: { ...question.content, correct_order: words, tokens: words.map((word, index) => ({ key: question.content.tokens?.[index]?.key || uid('token'), text: word })) } }); }} className={fieldClass} /></label> : null}{question.questionType === 'content_block' ? <label className="text-xs font-black">Contenuto informativo<textarea rows={8} value={question.content.body || ''} onChange={(event) => setQuestion({ ...question, content: { ...question.content, body: event.target.value } })} className={fieldClass} /></label> : null}{question.questionType === 'written_response' ? <WrittenEditor question={question} setQuestion={setQuestion} /> : null}{question.questionType === 'dialogue_roleplay' ? <DialogueEditor question={question} setQuestion={setQuestion} /> : null}{question.questionType === 'audio_response' ? <AudioEditor question={question} setQuestion={setQuestion} /> : null}{question.questionType === 'reading_comprehension' ? <ReadingEditor question={question} setQuestion={setQuestion} /> : null}</div>{question.questionType !== 'content_block' ? <div className="mt-6 grid gap-4 sm:grid-cols-3"><label className="text-xs font-black">Punti massimi<input type="number" min="0.1" step="0.1" disabled={manual} value={manual ? rubricTotal(question.content.rubric) : question.grading.weight || 1} onChange={(event) => setQuestion({ ...question, grading: { ...question.grading, weight: Number(event.target.value) || 1 } })} className={fieldClass} /></label>{!manual ? <label className="text-xs font-black">Moltiplicatore quasi corretto<input type="number" min="0" max="1" step="0.1" value={question.grading.nearly_correct_multiplier ?? 0.5} onChange={(event) => setQuestion({ ...question, grading: { ...question.grading, nearly_correct_multiplier: Number(event.target.value) } })} className={fieldClass} /></label> : <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-xs font-bold text-violet-800">Correzione manuale dopo la consegna.</div>}</div> : null}</section>{question.questionType !== 'content_block' ? <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7"><p className="text-xs font-black uppercase tracking-wide text-violet-700">Diagnostica</p><p className="mt-2 text-sm font-semibold text-ink/55">Seleziona ciò che la domanda misura. Per le produzioni, questi codici verranno registrati dopo la valutazione docente.</p><div className="mt-4 grid max-h-72 gap-2 overflow-y-auto rounded-xl border border-ink/10 p-3">{codes.map((code) => <label key={code.code} className="flex items-start gap-3 rounded-lg p-2 hover:bg-linen/40"><input type="checkbox" checked={testedSet.has(code.code)} onChange={() => toggleCode(code.code)} className="mt-1" /><span><span className="block text-xs font-black">{code.code}</span><span className="text-xs font-semibold text-ink/45">{code.label} · {code.topic}</span></span></label>)}</div><label className="mt-4 block text-xs font-black">Fallback<select value={question.diagnostics.fallback_error_code || ''} onChange={(event) => setQuestion({ ...question, diagnostics: { ...question.diagnostics, fallback_error_code: event.target.value || null } })} className={fieldClass}><option value="">Nessuno</option>{(question.diagnostics.tested_codes || []).map((code) => <option key={code}>{code}</option>)}</select></label>{!manual && !['reading_comprehension'].includes(question.questionType) ? <div className="mt-5"><DiagnosticPatterns question={question} setQuestion={setQuestion} codes={codes} /></div> : null}</section> : null}</main><aside className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] xl:col-start-2 2xl:col-start-3 2xl:row-start-1 2xl:sticky 2xl:top-24 2xl:max-h-[calc(100vh-7rem)] 2xl:overflow-y-auto"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-wide text-moss">Anteprima studente</p>{currentIndex >= 0 ? <span className="text-xs font-black text-ink/40">{currentIndex + 1}/{filteredCatalog.length}</span> : null}</div><div className="mt-4"><ExerciseQuestionRenderer item={previewItem} answer={previewAnswer} onChange={setPreviewAnswer} /></div><div className="mt-5 grid gap-2"><button type="button" disabled={saving} onClick={save} className="rounded-full bg-ink px-5 py-3 text-sm font-black text-white dark:bg-emerald-300 dark:text-[#102019]">{saving ? 'Salvataggio...' : question.id ? 'Salva nuova versione' : 'Crea domanda'}</button>{question.id && canApprove(question) ? <button type="button" disabled={saving} onClick={() => changeStatus('approved', true)} className="rounded-full bg-moss px-5 py-3 text-sm font-black text-white">Approva e prossima</button> : null}{question.id && question.status !== 'published' ? <button type="button" disabled={saving} onClick={() => changeStatus('published')} className="rounded-full bg-violet-700 px-5 py-2.5 text-sm font-black text-white">Pubblica</button> : null}{question.id && question.status !== 'archived' ? <button type="button" disabled={saving} onClick={() => changeStatus('archived')} className="text-xs font-black text-red-700 underline">Archivia</button> : null}</div></aside></div></div></section></>;
}
