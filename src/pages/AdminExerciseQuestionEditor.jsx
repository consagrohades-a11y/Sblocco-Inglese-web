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

const TYPES = [
  ['multiple_choice', 'Scelta multipla'],
  ['multiple_select', 'Scelta multipla, più risposte'],
  ['gap_fill', 'Completamento libero'],
  ['select_gap', 'Completamento con opzioni'],
  ['translation', 'Traduzione'],
  ['error_correction', 'Correzione errore'],
  ['word_order', 'Riordino parole'],
  ['content_block', 'Blocco informativo'],
];
const statusLabels = { draft: 'Bozza', in_review: 'Da revisionare', approved: 'Approvata', published: 'Pubblicata', archived: 'Archiviata' };
const fieldClass = 'mt-2 w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:border-moss focus:ring-4 focus:ring-mint/30 dark:border-white/20 dark:bg-[#101a17] dark:text-white dark:focus:border-emerald-300 dark:focus:ring-emerald-400/15';

function uid(prefix) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function defaultContent(type) {
  if (type === 'multiple_choice' || type === 'multiple_select') return {
    options: [
      { key: uid('opt'), text: '', is_correct: true, error_code: null },
      { key: uid('opt'), text: '', is_correct: false, error_code: null },
    ],
  };
  if (type === 'gap_fill') return { blanks: [{ key: 'blank_1', accepted_answers: [''], points: 1 }] };
  if (type === 'select_gap') return { blanks: [{ key: 'blank_1', accepted_answers: [''], options: ['', ''], points: 1 }] };
  if (type === 'translation' || type === 'error_correction') return { accepted_answers: [''] };
  if (type === 'word_order') return {
    tokens: [{ key: uid('token'), text: '' }, { key: uid('token'), text: '' }],
    correct_order: ['', ''],
  };
  if (type === 'content_block') return { body: '' };
  return {};
}

function emptyQuestion() {
  return {
    id: null,
    publicId: '',
    status: 'draft',
    versionNumber: null,
    questionType: 'multiple_choice',
    title: '',
    prompt: '',
    instructions: '',
    instructionLanguage: 'it',
    level: 'A1',
    topic: '',
    subtopic: '',
    primarySkill: 'grammar',
    learningObjective: '',
    difficulty: 'standard',
    tagsText: '',
    content: defaultContent('multiple_choice'),
    grading: { weight: 1, nearly_correct_multiplier: 0.5 },
    feedback: { correct: '', incorrect: '', explanation: '' },
    diagnostics: { tested_codes: [], fallback_error_code: null, answer_error_mappings: [] },
    media: [],
  };
}

function fromDetail(detail) {
  return {
    id: detail.id,
    publicId: detail.public_id,
    status: detail.status,
    versionNumber: detail.version_number,
    questionType: detail.question_type,
    title: detail.title || '',
    prompt: detail.prompt || '',
    instructions: detail.instructions || '',
    instructionLanguage: detail.instruction_language || 'it',
    level: detail.level || 'A1',
    topic: detail.topic || '',
    subtopic: detail.subtopic || '',
    primarySkill: detail.primary_skill || 'grammar',
    learningObjective: detail.learning_objective || '',
    difficulty: detail.difficulty || 'standard',
    tagsText: (detail.tags || []).join(', '),
    content: detail.content || defaultContent(detail.question_type),
    grading: { weight: 1, nearly_correct_multiplier: 0.5, ...(detail.grading || {}) },
    feedback: { correct: '', incorrect: '', explanation: '', ...(detail.feedback || {}) },
    diagnostics: { tested_codes: [], fallback_error_code: null, answer_error_mappings: [], ...(detail.diagnostics || {}) },
    media: detail.media || [],
  };
}

function statusClass(status) {
  if (status === 'published') return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200';
  if (status === 'approved') return 'bg-cyan-100 text-cyan-900 dark:bg-cyan-400/15 dark:text-cyan-200';
  if (status === 'archived') return 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/60';
  if (status === 'in_review') return 'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200';
  return 'bg-violet-100 text-violet-900 dark:bg-violet-400/15 dark:text-violet-200';
}

function OptionEditor({ question, setQuestion, codes }) {
  const options = question.content.options || [];
  function update(index, patch) {
    let next = options.map((option, current) => current === index ? { ...option, ...patch } : option);
    if (patch.is_correct && question.questionType === 'multiple_choice') {
      next = next.map((option, current) => ({ ...option, is_correct: current === index }));
    }
    setQuestion({ ...question, content: { ...question.content, options: next } });
  }
  function remove(index) {
    if (options.length <= 2) return;
    setQuestion({ ...question, content: { ...question.content, options: options.filter((_, current) => current !== index) } });
  }
  return <div className="grid gap-3">{options.map((option, index) => <div key={option.key} className="grid gap-3 rounded-xl border border-ink/10 p-4 dark:border-white/10 sm:grid-cols-[auto_minmax(0,1fr)_13rem_auto] sm:items-end"><label className="flex items-center gap-2 pb-3 text-xs font-black"><input type={question.questionType === 'multiple_choice' ? 'radio' : 'checkbox'} checked={Boolean(option.is_correct)} onChange={(event) => update(index, { is_correct: event.target.checked })} />Corretta</label><label className="text-xs font-black text-ink/60 dark:text-white/60">Testo<input value={option.text || ''} onChange={(event) => update(index, { text: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black text-ink/60 dark:text-white/60">Errore se scelta<select value={option.error_code || ''} onChange={(event) => update(index, { error_code: event.target.value || null })} className={fieldClass}><option value="">Nessun codice</option>{codes.map((code) => <option key={code.code} value={code.code}>{code.code}</option>)}</select></label><button type="button" disabled={options.length <= 2} onClick={() => remove(index)} className="pb-3 text-xs font-black text-red-700 underline disabled:opacity-30 dark:text-red-300">Rimuovi</button></div>)}<button type="button" onClick={() => setQuestion({ ...question, content: { ...question.content, options: [...options, { key: uid('opt'), text: '', is_correct: false, error_code: null }] } })} className="justify-self-start rounded-full border border-ink/15 px-4 py-2 text-xs font-black dark:border-white/20">Aggiungi opzione</button></div>;
}

function BlankEditor({ question, setQuestion }) {
  const blanks = question.content.blanks || [];
  function update(index, patch) {
    setQuestion({ ...question, content: { ...question.content, blanks: blanks.map((blank, current) => current === index ? { ...blank, ...patch } : blank) } });
  }
  function add() {
    const index = blanks.length + 1;
    setQuestion({ ...question, content: { ...question.content, blanks: [...blanks, { key: `blank_${index}`, accepted_answers: [''], ...(question.questionType === 'select_gap' ? { options: ['', ''] } : {}), points: 1 }] } });
  }
  return <div className="grid gap-3">{blanks.map((blank, index) => <div key={`${blank.key}-${index}`} className="rounded-xl border border-ink/10 p-4 dark:border-white/10"><div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_7rem_auto] sm:items-end"><label className="text-xs font-black text-ink/60 dark:text-white/60">Chiave<input value={blank.key || ''} onChange={(event) => update(index, { key: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black text-ink/60 dark:text-white/60">Risposte accettate, separate da |<input value={(blank.accepted_answers || []).join(' | ')} onChange={(event) => update(index, { accepted_answers: event.target.value.split('|').map((item) => item.trim()) })} className={fieldClass} /></label><label className="text-xs font-black text-ink/60 dark:text-white/60">Punti<input type="number" min="0.1" step="0.1" value={blank.points || 1} onChange={(event) => update(index, { points: Number(event.target.value) || 1 })} className={fieldClass} /></label><button type="button" disabled={blanks.length <= 1} onClick={() => setQuestion({ ...question, content: { ...question.content, blanks: blanks.filter((_, current) => current !== index) } })} className="pb-3 text-xs font-black text-red-700 underline disabled:opacity-30 dark:text-red-300">Rimuovi</button></div>{question.questionType === 'select_gap' ? <label className="mt-3 block text-xs font-black text-ink/60 dark:text-white/60">Opzioni, separate da |<input value={(blank.options || []).join(' | ')} onChange={(event) => update(index, { options: event.target.value.split('|').map((item) => item.trim()) })} className={fieldClass} /></label> : null}</div>)}<button type="button" onClick={add} className="justify-self-start rounded-full border border-ink/15 px-4 py-2 text-xs font-black dark:border-white/20">Aggiungi spazio</button></div>;
}

function AcceptedAnswersEditor({ question, setQuestion }) {
  return <label className="text-xs font-black text-ink/60 dark:text-white/60">Risposte accettate, una per riga<textarea rows={5} value={(question.content.accepted_answers || []).join('\n')} onChange={(event) => setQuestion({ ...question, content: { ...question.content, accepted_answers: event.target.value.split('\n') } })} className={fieldClass} /></label>;
}

function WordOrderEditor({ question, setQuestion }) {
  const order = question.content.correct_order || [];
  function setOrder(text) {
    const words = text.split('\n');
    setQuestion({ ...question, content: { ...question.content, correct_order: words, tokens: words.map((word, index) => ({ key: question.content.tokens?.[index]?.key || uid('token'), text: word })) } });
  }
  return <label className="text-xs font-black text-ink/60 dark:text-white/60">Ordine corretto, un token per riga<textarea rows={7} value={order.join('\n')} onChange={(event) => setOrder(event.target.value)} className={fieldClass} /><span className="mt-2 block font-semibold text-ink/45 dark:text-white/45">Le parole duplicate ricevono automaticamente identificatori diversi.</span></label>;
}

function DiagnosticPatterns({ question, setQuestion, codes }) {
  const mappings = question.diagnostics.answer_error_mappings || [];
  function update(index, patch) {
    setQuestion({ ...question, diagnostics: { ...question.diagnostics, answer_error_mappings: mappings.map((mapping, current) => current === index ? { ...mapping, ...patch } : mapping) } });
  }
  return <div className="grid gap-3">{mappings.map((mapping, index) => <div key={index} className="grid gap-3 rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-300/20 dark:bg-violet-400/[0.06] sm:grid-cols-[minmax(0,1fr)_15rem_auto] sm:items-end"><label className="text-xs font-black text-ink/60 dark:text-white/60">Risposte che indicano questo errore, separate da |<input value={(mapping.matches || []).join(' | ')} onChange={(event) => update(index, { matches: event.target.value.split('|').map((item) => item.trim()) })} className={fieldClass} /></label><label className="text-xs font-black text-ink/60 dark:text-white/60">Error code<select value={mapping.error_code || ''} onChange={(event) => update(index, { error_code: event.target.value })} className={fieldClass}><option value="">Scegli...</option>{codes.map((code) => <option key={code.code} value={code.code}>{code.code}</option>)}</select></label><button type="button" onClick={() => setQuestion({ ...question, diagnostics: { ...question.diagnostics, answer_error_mappings: mappings.filter((_, current) => current !== index) } })} className="pb-3 text-xs font-black text-red-700 underline dark:text-red-300">Rimuovi</button></div>)}<button type="button" onClick={() => setQuestion({ ...question, diagnostics: { ...question.diagnostics, answer_error_mappings: [...mappings, { matches: [''], error_code: '' }] } })} className="justify-self-start rounded-full border border-violet-300 px-4 py-2 text-xs font-black text-violet-800 dark:border-violet-300/30 dark:text-violet-200">Aggiungi pattern</button></div>;
}

export default function AdminExerciseQuestionEditor() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalog, setCatalog] = useState([]);
  const [codes, setCodes] = useState([]);
  const [question, setQuestion] = useState(emptyQuestion());
  const [previewAnswer, setPreviewAnswer] = useState(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadBase() {
    setLoading(true); setError('');
    try {
      const [questionData, codeData] = await Promise.all([loadExerciseQuestionBank(), loadActiveDiagnosticCodes()]);
      setCatalog(questionData);
      setCodes(codeData);
      return questionData;
    } catch (loadError) { setError(loadError.message || 'Non è stato possibile caricare l’editor.'); return []; }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    async function initialise() {
      const questionData = await loadBase();
      if (!active) return;
      const requestedId = searchParams.get('questionId');
      if (searchParams.get('new') === '1' || (!requestedId && !questionData.length)) createNew();
      else if (requestedId || questionData[0]?.id) await openQuestion(requestedId || questionData[0].id);
    }
    initialise();
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openQuestion(questionId) {
    setLoading(true); setError(''); setSuccess('');
    try {
      const detail = await loadExerciseQuestionEditorDetail(questionId);
      if (!detail) throw new Error('Domanda non trovata.');
      setQuestion(fromDetail(detail));
      setPreviewAnswer(null);
      setSearchParams({ questionId });
    } catch (loadError) { setError(loadError.message || 'Non è stato possibile aprire la domanda.'); }
    finally { setLoading(false); }
  }
  function createNew() {
    setQuestion(emptyQuestion());
    setPreviewAnswer(null);
    setSearchParams({ new: '1' });
    setSuccess('Nuova domanda pronta.');
    setError('');
  }

  const filteredCatalog = useMemo(() => {
    const term = catalogSearch.trim().toLowerCase();
    if (!term) return catalog;
    return catalog.filter((item) => [item.publicId, item.title, item.prompt, item.topic, item.subtopic].filter(Boolean).some((value) => String(value).toLowerCase().includes(term)));
  }, [catalog, catalogSearch]);
  const testedSet = new Set(question.diagnostics.tested_codes || []);
  const previewItem = {
    id: 'preview',
    question: {
      type: question.questionType,
      prompt: question.prompt,
      instructions: question.instructions,
      content: question.content,
    },
    result: null,
  };

  function switchType(type) {
    if (type === question.questionType) return;
    setQuestion({ ...question, questionType: type, content: defaultContent(type) });
    setPreviewAnswer(null);
  }
  function toggleTestedCode(code) {
    const next = testedSet.has(code) ? [...testedSet].filter((item) => item !== code) : [...testedSet, code];
    setQuestion({ ...question, diagnostics: { ...question.diagnostics, tested_codes: next, fallback_error_code: next.includes(question.diagnostics.fallback_error_code) ? question.diagnostics.fallback_error_code : next[0] || null } });
  }

  async function save() {
    setSaving(true); setError(''); setSuccess('');
    try {
      const result = await saveExerciseQuestionVersion({
        questionId: question.id,
        question: {
          ...question,
          tags: question.tagsText.split(',').map((item) => item.trim()).filter(Boolean),
        },
      });
      setSuccess(`${result.public_id}, versione ${result.version_number}, salvata.`);
      await loadBase();
      await openQuestion(result.id);
    } catch (saveError) { setError(saveError.message || 'Non è stato possibile salvare la domanda.'); }
    finally { setSaving(false); }
  }
  async function changeStatus(status) {
    if (!question.id) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await setExerciseQuestionStatus(question.id, status);
      setSuccess(`${question.publicId}: ${statusLabels[status]}.`);
      await loadBase();
      await openQuestion(question.id);
    } catch (statusError) { setError(statusError.message || 'Non è stato possibile aggiornare lo stato.'); }
    finally { setSaving(false); }
  }

  return <><SEO title="Question Editor | Exercise Builder" description="Crea e modifica versioni di domande Exercise Builder." /><section className="section-shell py-8 lg:py-10"><div className="mx-auto max-w-[1600px]">
    <header className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-[#16211e] sm:p-8"><span className="eyebrow">Exercise Builder</span><div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-black text-ink dark:text-white sm:text-4xl">Question Editor</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/65">Ogni salvataggio crea una nuova versione. Pool, esercizi e tentativi precedenti continuano a usare la versione originaria.</p></div><div className="flex flex-wrap gap-2"><Link to="/admin/content/exercises/questions" className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-black text-ink dark:border-white/20 dark:bg-white/10 dark:text-white">Question Bank</Link><Link to="/admin/content/exercises/diagnostics" className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-black text-ink dark:border-white/20 dark:bg-white/10 dark:text-white">Legenda diagnostica</Link><button type="button" onClick={createNew} className="rounded-full bg-ink px-4 py-2.5 text-sm font-black text-white dark:bg-emerald-300 dark:text-[#102019]">Nuova domanda</button></div></div></header>
    {error ? <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-950">{error}</div> : null}{success ? <div className="mt-5 border-l-4 border-moss bg-mint/30 p-4 text-sm font-bold text-ink dark:bg-emerald-400/10 dark:text-emerald-100">{success}</div> : null}

    <div className="mt-6 grid gap-6 xl:grid-cols-[17rem_minmax(0,1fr)_26rem]">
      <aside className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#16211e] xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto"><p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Domande</p><input value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} className={fieldClass} placeholder="Cerca" /><div className="mt-3 grid gap-2">{filteredCatalog.map((item) => <button key={item.id} type="button" onClick={() => openQuestion(item.id)} className={`rounded-xl border p-3 text-left ${question.id === item.id ? 'border-moss bg-mint/25 dark:border-emerald-300/35 dark:bg-emerald-400/10' : 'border-ink/10 dark:border-white/10'}`}><div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-moss dark:text-emerald-300">{item.publicId}</span><span className={`rounded-full px-2 py-1 text-[0.6rem] font-black ${statusClass(item.status)}`}>{statusLabels[item.status]}</span></div><p className="mt-2 line-clamp-2 text-sm font-black text-ink dark:text-white">{item.title || item.prompt}</p><p className="mt-1 text-xs font-bold text-ink/45 dark:text-white/45">v{item.version_number} · {item.question_type}</p></button>)}</div></aside>

      <main className="grid min-w-0 gap-6">
        <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">{question.publicId || 'Nuova domanda'}</p><h2 className="mt-1 text-2xl font-black text-ink dark:text-white">Contenuto</h2></div>{question.id ? <span className={`rounded-full px-3 py-1.5 text-xs font-black ${statusClass(question.status)}`}>{statusLabels[question.status]} · v{question.versionNumber}</span> : null}</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-black text-ink/60 dark:text-white/60">Tipologia<select value={question.questionType} onChange={(event) => switchType(event.target.value)} className={fieldClass}>{TYPES.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-black text-ink/60 dark:text-white/60">Titolo interno<input value={question.title} onChange={(event) => setQuestion({ ...question, title: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black text-ink/60 dark:text-white/60 sm:col-span-2">Prompt o testo principale<textarea rows={3} value={question.prompt} onChange={(event) => setQuestion({ ...question, prompt: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black text-ink/60 dark:text-white/60 sm:col-span-2">Consegna aggiuntiva<input value={question.instructions} onChange={(event) => setQuestion({ ...question, instructions: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black text-ink/60 dark:text-white/60">Livello<select value={question.level} onChange={(event) => setQuestion({ ...question, level: event.target.value })} className={fieldClass}>{['A0','A1','A1+','A2','B1','B1+','B2','C1','C2','Mixed'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs font-black text-ink/60 dark:text-white/60">Difficoltà<select value={question.difficulty} onChange={(event) => setQuestion({ ...question, difficulty: event.target.value })} className={fieldClass}><option value="easy">Facile</option><option value="standard">Standard</option><option value="challenge">Sfida</option></select></label><label className="text-xs font-black text-ink/60 dark:text-white/60">Topic<input value={question.topic} onChange={(event) => setQuestion({ ...question, topic: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black text-ink/60 dark:text-white/60">Sottotema<input value={question.subtopic} onChange={(event) => setQuestion({ ...question, subtopic: event.target.value })} className={fieldClass} /></label><label className="text-xs font-black text-ink/60 dark:text-white/60">Competenza<select value={question.primarySkill} onChange={(event) => setQuestion({ ...question, primarySkill: event.target.value })} className={fieldClass}>{['grammar','vocabulary','reading','writing','functional_language','spelling','word_order'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs font-black text-ink/60 dark:text-white/60">Tag<input value={question.tagsText} onChange={(event) => setQuestion({ ...question, tagsText: event.target.value })} className={fieldClass} placeholder="present-simple, negative" /></label><label className="text-xs font-black text-ink/60 dark:text-white/60 sm:col-span-2">Obiettivo didattico<input value={question.learningObjective} onChange={(event) => setQuestion({ ...question, learningObjective: event.target.value })} className={fieldClass} /></label></div></section>

        <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7"><p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">Risposta e correzione</p><div className="mt-5">{['multiple_choice','multiple_select'].includes(question.questionType) ? <OptionEditor question={question} setQuestion={setQuestion} codes={codes} /> : null}{['gap_fill','select_gap'].includes(question.questionType) ? <BlankEditor question={question} setQuestion={setQuestion} /> : null}{['translation','error_correction'].includes(question.questionType) ? <AcceptedAnswersEditor question={question} setQuestion={setQuestion} /> : null}{question.questionType === 'word_order' ? <WordOrderEditor question={question} setQuestion={setQuestion} /> : null}{question.questionType === 'content_block' ? <label className="text-xs font-black text-ink/60 dark:text-white/60">Contenuto informativo<textarea rows={8} value={question.content.body || ''} onChange={(event) => setQuestion({ ...question, content: { ...question.content, body: event.target.value } })} className={fieldClass} /></label> : null}</div>{question.questionType !== 'content_block' ? <div className="mt-6 grid gap-4 sm:grid-cols-3"><label className="text-xs font-black text-ink/60 dark:text-white/60">Peso<input type="number" min="0.1" step="0.1" value={question.grading.weight || 1} onChange={(event) => setQuestion({ ...question, grading: { ...question.grading, weight: Number(event.target.value) || 1 } })} className={fieldClass} /></label><label className="text-xs font-black text-ink/60 dark:text-white/60">Quasi corretto<input type="number" min="0" max="1" step="0.1" value={question.grading.nearly_correct_multiplier ?? 0.5} onChange={(event) => setQuestion({ ...question, grading: { ...question.grading, nearly_correct_multiplier: Number(event.target.value) } })} className={fieldClass} /><span className="mt-1 block font-semibold text-ink/45 dark:text-white/45">0,5 = 50%</span></label></div> : null}</section>

        <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7"><p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Feedback</p><div className="mt-4 grid gap-4"><label className="text-xs font-black text-ink/60 dark:text-white/60">Quando è corretto<textarea rows={2} value={question.feedback.correct || ''} onChange={(event) => setQuestion({ ...question, feedback: { ...question.feedback, correct: event.target.value } })} className={fieldClass} /></label><label className="text-xs font-black text-ink/60 dark:text-white/60">Quando è sbagliato<textarea rows={2} value={question.feedback.incorrect || ''} onChange={(event) => setQuestion({ ...question, feedback: { ...question.feedback, incorrect: event.target.value } })} className={fieldClass} /></label><label className="text-xs font-black text-ink/60 dark:text-white/60">Spiegazione<textarea rows={3} value={question.feedback.explanation || ''} onChange={(event) => setQuestion({ ...question, feedback: { ...question.feedback, explanation: event.target.value } })} className={fieldClass} /></label></div></section>

        {question.questionType !== 'content_block' ? <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7"><p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">Diagnostica</p><h2 className="mt-1 text-xl font-black text-ink dark:text-white">Cosa misura questa domanda?</h2><div className="mt-4 grid max-h-64 gap-2 overflow-y-auto rounded-xl border border-ink/10 p-3 dark:border-white/10">{codes.map((code) => <label key={code.code} className="flex items-start gap-3 rounded-lg p-2 hover:bg-linen/40 dark:hover:bg-white/[0.04]"><input type="checkbox" checked={testedSet.has(code.code)} onChange={() => toggleTestedCode(code.code)} className="mt-1" /><span><span className="block text-xs font-black text-ink dark:text-white">{code.code}</span><span className="mt-0.5 block text-xs font-semibold text-ink/45 dark:text-white/45">{code.label} · {code.topic}</span></span></label>)}</div><label className="mt-4 block text-xs font-black text-ink/60 dark:text-white/60">Fallback error code<select value={question.diagnostics.fallback_error_code || ''} onChange={(event) => setQuestion({ ...question, diagnostics: { ...question.diagnostics, fallback_error_code: event.target.value || null } })} className={fieldClass}><option value="">Nessuno</option>{(question.diagnostics.tested_codes || []).map((code) => <option key={code}>{code}</option>)}</select></label><div className="mt-6"><p className="mb-3 text-xs font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Pattern per risposte libere</p><DiagnosticPatterns question={question} setQuestion={setQuestion} codes={codes} /></div></section> : null}
      </main>

      <aside className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto"><p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Preview studente</p><div className="mt-4"><ExerciseQuestionRenderer item={previewItem} answer={previewAnswer} onChange={setPreviewAnswer} /></div><div className="mt-5 grid gap-2"><button type="button" disabled={saving} onClick={save} className="rounded-full bg-ink px-5 py-3 text-sm font-black text-white disabled:opacity-40 dark:bg-emerald-300 dark:text-[#102019]">{saving ? 'Salvataggio...' : question.id ? 'Salva nuova versione' : 'Crea domanda'}</button>{question.id && !['approved','published'].includes(question.status) ? <button type="button" disabled={saving} onClick={() => changeStatus('approved')} className="rounded-full border border-ink/15 px-5 py-2.5 text-sm font-black dark:border-white/20">Approva</button> : null}{question.id && question.status !== 'published' ? <button type="button" disabled={saving} onClick={() => changeStatus('published')} className="rounded-full bg-violet-700 px-5 py-2.5 text-sm font-black text-white">Pubblica</button> : null}{question.id && question.status !== 'archived' ? <button type="button" disabled={saving} onClick={() => changeStatus('archived')} className="mt-1 text-xs font-black text-red-700 underline dark:text-red-300">Archivia</button> : null}</div></aside>
    </div>
  </div></section></>;
}
