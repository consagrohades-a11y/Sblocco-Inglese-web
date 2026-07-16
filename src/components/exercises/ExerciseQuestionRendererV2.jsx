import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  CircleAlert,
  FileText,
  Loader2,
  MessageCircleMore,
  Mic,
  RotateCcw,
  Square,
  Upload,
} from 'lucide-react';
import {
  createExerciseAudioSignedUrl,
  uploadExerciseAudioSubmission,
} from '../../lib/exerciseSubmissionApi.js';

const resultStyles = {
  correct: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-300/25 dark:bg-emerald-400/10 dark:text-emerald-100',
  nearly_correct: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100',
  incorrect: 'border-red-200 bg-red-50 text-red-950 dark:border-red-300/25 dark:bg-red-300/10 dark:text-red-100',
  unanswered: 'border-slate-200 bg-slate-50 text-slate-800 dark:border-white/15 dark:bg-white/[0.06] dark:text-white/70',
  pending_review: 'border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-300/25 dark:bg-violet-400/10 dark:text-violet-100',
};

const resultLabels = {
  correct: 'Corretta',
  nearly_correct: 'Quasi corretta',
  incorrect: 'Da rivedere',
  unanswered: 'Non risposta',
  pending_review: 'In attesa di valutazione',
};

function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function TextAnswer({ value, onChange, disabled, multiline = false, placeholder = 'Scrivi la risposta...' }) {
  const shared = 'focus-ring w-full rounded-xl border-2 border-ink/10 bg-white px-4 py-3 text-base font-semibold text-ink outline-none transition focus:border-moss dark:border-white/15 dark:bg-[#101a17] dark:text-white';
  if (multiline) return <textarea rows={7} value={value || ''} onChange={(event) => onChange(event.target.value)} disabled={disabled} placeholder={placeholder} className={shared} />;
  return <input value={value || ''} onChange={(event) => onChange(event.target.value)} disabled={disabled} placeholder={placeholder} className={shared} />;
}

function MultipleChoice({ question, answer, onChange, disabled, multiple = false }) {
  const options = question.content?.options || [];
  const selected = multiple ? new Set(Array.isArray(answer) ? answer : []) : new Set(answer ? [answer] : []);
  function choose(key) {
    if (!multiple) onChange(key);
    else onChange(selected.has(key) ? [...selected].filter((item) => item !== key) : [...selected, key]);
  }
  return <div className="grid gap-3 sm:grid-cols-2">{options.map((option) => <button key={option.key} type="button" disabled={disabled} onClick={() => choose(option.key)} className={`focus-ring rounded-xl border px-4 py-4 text-left text-sm font-black transition ${selected.has(option.key) ? 'border-moss bg-mint/60 text-ink dark:border-emerald-300 dark:bg-emerald-400/15 dark:text-white' : 'border-ink/10 bg-white text-ink hover:border-moss/40 dark:border-white/15 dark:bg-white/[0.05] dark:text-white'}`}>{option.text}</button>)}</div>;
}

function DialogueChoice({ question, answer, onChange, disabled }) {
  const content = question.content || {};
  return (
    <div className="grid gap-5">
      {content.scenario ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-950 dark:border-amber-300/20 dark:bg-amber-300/[0.07] dark:text-amber-100">{content.scenario}</div> : null}
      <div className="grid gap-3">
        {(content.turns || []).map((turn, index) => (
          <div key={turn.key || index} className={`flex ${index % 2 ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] rounded-2xl border p-4 ${index % 2 ? 'border-violet-200 bg-violet-50 dark:border-violet-300/20 dark:bg-violet-400/[0.07]' : 'border-cyan-200 bg-cyan-50 dark:border-cyan-300/20 dark:bg-cyan-400/[0.07]'}`}>
              <p className="text-[0.68rem] font-black uppercase tracking-wide text-ink/40 dark:text-white/40">{turn.speaker}</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-ink/80 dark:text-white/80">{turn.text}</p>
            </div>
          </div>
        ))}
      </div>
      {content.response_prompt ? <p className="text-base font-black leading-7 text-ink dark:text-white">{content.response_prompt}</p> : null}
      <MultipleChoice question={question} answer={answer} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function GapFill({ question, answer, onChange, disabled, select = false }) {
  const values = answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {};
  return <div className="grid gap-4">{(question.content?.blanks || []).map((blank, index) => <label key={blank.key} className="grid gap-2"><span className="text-xs font-black uppercase tracking-wide text-ink/50 dark:text-white/50">Spazio {index + 1}</span>{select ? <select value={values[blank.key] || ''} onChange={(event) => onChange({ ...values, [blank.key]: event.target.value })} disabled={disabled} className="focus-ring rounded-xl border-2 border-ink/10 bg-white px-4 py-3 text-base font-bold text-ink dark:border-white/15 dark:bg-[#101a17] dark:text-white"><option value="">Scegli...</option>{(blank.options || []).map((option) => <option key={option}>{option}</option>)}</select> : <TextAnswer value={values[blank.key] || ''} onChange={(value) => onChange({ ...values, [blank.key]: value })} disabled={disabled} />}</label>)}</div>;
}

function WordOrder({ question, answer, onChange, disabled }) {
  const tokens = question.content?.tokens || [];
  const selected = Array.isArray(answer) ? answer : [];
  const remaining = tokens.map((token, index) => ({ ...token, instanceKey: `${token.key || token.text}-${index}` })).filter((token) => !selected.some((selectedToken) => selectedToken.instanceKey === token.instanceKey));
  function append(token) { onChange([...selected, token]); }
  function remove(index) { onChange(selected.filter((_, current) => current !== index)); }
  return <div className="grid gap-4"><div className="min-h-20 rounded-xl border border-dashed border-moss/35 bg-mint/20 p-3 dark:border-emerald-300/25 dark:bg-emerald-400/[0.06]"><div className="flex flex-wrap gap-2">{selected.map((token, index) => <button key={`${token.instanceKey}-${index}`} type="button" disabled={disabled} onClick={() => remove(index)} className="rounded-lg bg-ink px-3 py-2 text-sm font-black text-white dark:bg-emerald-300 dark:text-[#102019]">{token.text}</button>)}</div></div><div className="flex flex-wrap gap-2">{remaining.map((token) => <button key={token.instanceKey} type="button" disabled={disabled} onClick={() => append(token)} className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-black text-ink dark:border-white/20 dark:bg-white/[0.06] dark:text-white">{token.text}</button>)}</div></div>;
}

function WrittenResponse({ question, answer, onChange, disabled }) {
  const content = question.content || {};
  const count = wordCount(answer);
  const min = Number(content.min_words || 0);
  const max = Number(content.max_words || 0);
  const validRange = (!min || count >= min) && (!max || count <= max);
  return <div className="grid gap-4">{content.context ? <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-semibold leading-6 text-cyan-950 dark:border-cyan-300/20 dark:bg-cyan-300/[0.07] dark:text-cyan-100">{content.context}</div> : null}{content.required_points?.length ? <div className="rounded-xl border border-ink/10 bg-linen/35 p-4 dark:border-white/10 dark:bg-white/[0.04]"><p className="text-xs font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Punti da includere</p><ul className="mt-2 grid gap-1 text-sm font-semibold text-ink/70 dark:text-white/70">{content.required_points.map((point) => <li key={point}>• {point}</li>)}</ul></div> : null}<TextAnswer multiline value={answer || ''} onChange={onChange} disabled={disabled} placeholder="Scrivi qui la tua produzione..." /><div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black"><span className={validRange ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-200'}>{count} parole</span><span className="text-ink/45 dark:text-white/45">Richieste: {min || 0}{max ? `–${max}` : '+'}</span></div></div>;
}

function RubricPreview({ rubric }) {
  if (!Array.isArray(rubric) || !rubric.length) return null;
  return <details className="rounded-xl border border-violet-200 bg-violet-50/45 p-4 dark:border-violet-300/20 dark:bg-violet-400/[0.06]"><summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-violet-800 dark:text-violet-200">Come verrà valutato</summary><div className="mt-3 grid gap-2">{rubric.map((criterion) => <div key={criterion.key} className="flex items-start justify-between gap-4 text-sm"><div><p className="font-black text-ink dark:text-white">{criterion.label}</p>{criterion.description ? <p className="mt-1 text-xs font-semibold text-ink/50 dark:text-white/50">{criterion.description}</p> : null}</div><span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-black text-violet-800 dark:bg-white/10 dark:text-violet-200">{criterion.max_points} pt</span></div>)}</div></details>;
}

function TurnGuidance({ turn, recorded }) {
  const constraints = turn.constraints || {};
  const groups = [
    ['Devi includere', constraints.required_points],
    ['Prova a usare', constraints.recommended_language],
    ['Espressioni obbligatorie', constraints.required_language],
    ['Evita', constraints.avoid_language],
  ].filter(([, values]) => Array.isArray(values) && values.length);
  return <div className="grid gap-3">
    {turn.objective ? <div><p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-200">Il tuo obiettivo</p><p className="mt-1 text-sm font-semibold leading-6 text-ink/75 dark:text-white/75">{turn.objective}</p></div> : null}
    {turn.direction ? <p className="rounded-lg bg-violet-50 p-3 text-sm font-bold text-violet-900 dark:bg-violet-400/10 dark:text-violet-100">{turn.direction}</p> : null}
    {turn.context ? <p className="text-sm font-semibold leading-6 text-ink/60 dark:text-white/60">{turn.context}</p> : null}
    {groups.length ? <div className="grid gap-3 sm:grid-cols-2">{groups.map(([label, values]) => <div key={label} className="rounded-lg border border-ink/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.04]"><p className="text-[0.68rem] font-black uppercase tracking-wide text-ink/45 dark:text-white/45">{label}</p><ul className="mt-2 grid gap-1 text-sm font-semibold text-ink/70 dark:text-white/70">{values.map((value) => <li key={value}>• {value}</li>)}</ul></div>)}</div> : null}
    {turn.hint ? <p className="text-xs font-bold text-amber-800 dark:text-amber-200">Suggerimento: {turn.hint}</p> : null}
    {recorded && turn.retry_hint ? <p className="text-xs font-bold text-cyan-800 dark:text-cyan-200">Dopo il primo tentativo: {turn.retry_hint}</p> : null}
  </div>;
}

function DialogueRoleplay({ question, answer, onChange, disabled, attemptId, attemptQuestionId, teacherTurnReviews = {} }) {
  const content = question.content || {};
  const characters = content.characters || [];
  const selectedRole = answer?.role_key || '';
  const turns = answer?.turns && typeof answer.turns === 'object' ? answer.turns : {};
  const selectedCharacter = characters.find((character) => character.key === selectedRole);
  const audioPerTurn = content.response_mode === 'audio_per_turn';
  const [conversationView, setConversationView] = useState(false);

  function selectRole(role) {
    if (role !== selectedRole) onChange({ role_key: role, response_mode: audioPerTurn ? 'audio_per_turn' : 'written', turns: {} });
  }
  function changeTurn(key, value) {
    onChange({ role_key: selectedRole, response_mode: audioPerTurn ? 'audio_per_turn' : 'written', turns: { ...turns, [key]: value } });
  }

  return <div className="grid gap-5">
    {content.scenario ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-950 dark:border-amber-300/20 dark:bg-amber-300/[0.07] dark:text-amber-100">{content.scenario}</div> : null}
    <div><p className="text-xs font-black uppercase tracking-wide text-ink/45 dark:text-white/45">Scegli il tuo personaggio</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{characters.filter((character) => character.selectable !== false).map((character) => <button key={character.key} type="button" disabled={disabled} onClick={() => selectRole(character.key)} className={`rounded-xl border p-4 text-left transition ${selectedRole === character.key ? 'border-violet-400 bg-violet-50 dark:border-violet-300/40 dark:bg-violet-400/10' : 'border-ink/10 bg-white dark:border-white/10 dark:bg-white/[0.04]'}`}><p className="font-black text-ink dark:text-white">{character.name}</p>{character.description ? <p className="mt-1 text-xs font-semibold leading-5 text-ink/50 dark:text-white/50">{character.description}</p> : null}</button>)}</div></div>
    {audioPerTurn && disabled && selectedCharacter ? <button type="button" onClick={() => setConversationView((value) => !value)} className="justify-self-start rounded-full border border-violet-300 px-4 py-2 text-xs font-black text-violet-800 dark:text-violet-200">{conversationView ? 'Mostra revisione turno per turno' : 'Riproduci conversazione'}</button> : null}
    {selectedCharacter ? <div className="grid gap-3">{(content.turns || []).map((turn, index) => {
      const speaker = characters.find((character) => character.key === turn.speaker);
      const learnerTurn = turn.speaker === selectedRole && (!audioPerTurn || turn.learner_response !== false);
      const turnAnswer = turns[turn.key];
      const review = teacherTurnReviews?.[turn.key];
      return <div key={turn.key} className={`flex ${learnerTurn ? 'justify-end' : 'justify-start'}`}><div className={`w-full max-w-[92%] rounded-2xl border p-4 ${learnerTurn ? 'border-violet-300 bg-violet-50 dark:border-violet-300/30 dark:bg-violet-400/10' : 'border-ink/10 bg-linen/55 dark:border-white/10 dark:bg-white/[0.05]'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[0.68rem] font-black uppercase tracking-wide text-ink/40 dark:text-white/40">{speaker?.name || turn.speaker} · {index + 1}</p>{learnerTurn && audioPerTurn ? <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-black ${turnAnswer?.file_id ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200'}`}>{turnAnswer?.file_id ? 'Completato' : turn.required === false ? 'Opzionale' : 'Da registrare'}</span> : null}</div>
        {learnerTurn ? audioPerTurn ? <div className="mt-3 grid gap-4">{!conversationView ? <TurnGuidance turn={turn} recorded={Boolean(turnAnswer?.file_id)} /> : null}<AudioRecorder question={question} answer={turnAnswer} onChange={(value) => changeTurn(turn.key, value)} disabled={disabled} attemptId={attemptId} attemptQuestionId={attemptQuestionId} turnKey={turn.key} contentOverride={turn.constraints || {}} />{review ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-300/20 dark:bg-emerald-400/[0.07]"><p className="text-xs font-black uppercase tracking-wide text-emerald-800 dark:text-emerald-200">{review.status === 'correct' ? 'Efficace' : review.status === 'nearly_correct' ? 'Quasi efficace' : 'Da rivedere'}{review.score !== undefined && review.max_score !== undefined ? ` · ${review.score}/${review.max_score}` : ''}</p>{review.comment ? <p className="mt-1 font-semibold leading-6 text-emerald-950 dark:text-emerald-100">{review.comment}</p> : null}</div> : null}</div> : <textarea rows={3} value={turnAnswer || ''} onChange={(event) => changeTurn(turn.key, event.target.value)} disabled={disabled} placeholder={turn.prompt || 'Scrivi la battuta...'} className="focus-ring mt-2 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-ink dark:border-violet-300/20 dark:bg-[#101a17] dark:text-white" /> : <p className="mt-2 text-sm font-semibold leading-6 text-ink/75 dark:text-white/75">{turn.text || turn.prompt || 'Turno dell’altro personaggio.'}</p>}
      </div></div>;
    })}</div> : <p className="rounded-xl border border-dashed border-ink/15 p-4 text-sm font-semibold text-ink/50 dark:border-white/15 dark:text-white/50">Scegli un personaggio per iniziare il dialogo.</p>}
    <RubricPreview rubric={content.rubric} />
  </div>;
}

function ReadingComprehension({ question, answer, onChange, disabled }) {
  const content = question.content || {};
  const values = answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {};
  function update(key, value) { onChange({ ...values, [key]: value }); }
  return <div className="grid gap-6"><article className="rounded-2xl border border-cyan-200 bg-[#fbfeff] p-5 shadow-sm dark:border-cyan-300/20 dark:bg-cyan-300/[0.05] sm:p-7"><div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-200"><BookOpen className="h-5 w-5" /><p className="text-xs font-black uppercase tracking-wide">Testo di lettura</p></div>{content.title ? <h3 className="mt-3 text-xl font-black text-ink dark:text-white">{content.title}</h3> : null}<div className="mt-4 whitespace-pre-wrap text-base font-medium leading-8 text-ink/80 dark:text-white/80">{content.passage}</div>{content.source_note ? <p className="mt-4 text-xs font-semibold text-ink/40 dark:text-white/40">{content.source_note}</p> : null}</article><div className="grid gap-5">{(content.items || []).map((readingItem, index) => <section key={readingItem.key} className="rounded-xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]"><p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Domanda {index + 1} · {readingItem.points || 1} pt</p><p className="mt-2 font-black leading-6 text-ink dark:text-white">{readingItem.prompt}</p><div className="mt-3">{['multiple_choice', 'true_false'].includes(readingItem.type) ? <div className="grid gap-2 sm:grid-cols-2">{(readingItem.options || []).map((option) => <button key={option.key} type="button" disabled={disabled} onClick={() => update(readingItem.key, option.key)} className={`rounded-lg border px-3 py-3 text-left text-sm font-bold ${values[readingItem.key] === option.key ? 'border-moss bg-mint/55 dark:border-emerald-300 dark:bg-emerald-400/10' : 'border-ink/10 dark:border-white/10'}`}>{option.text}</button>)}</div> : readingItem.type === 'multiple_select' ? <MultipleChoice question={{ content: { options: readingItem.options } }} answer={values[readingItem.key]} onChange={(value) => update(readingItem.key, value)} disabled={disabled} multiple /> : <TextAnswer value={values[readingItem.key] || ''} onChange={(value) => update(readingItem.key, value)} disabled={disabled} />}</div></section>)}</div></div>;
}

function AudioRecorder({ question, answer, onChange, disabled, attemptId, attemptQuestionId, turnKey = null, contentOverride = null }) {
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [savedUrl, setSavedUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const recordingContent = contentOverride || question.content || {};
  const maxSeconds = Number(recordingContent.max_seconds || 90);
  const minSeconds = Number(recordingContent.min_seconds || 0);

  useEffect(() => {
    let active = true;
    if (!answer?.storage_path) { setSavedUrl(null); return undefined; }
    createExerciseAudioSignedUrl(answer).then((url) => { if (active) setSavedUrl(url); }).catch(() => { if (active) setError('Non è stato possibile caricare il riascolto.'); });
    return () => { active = false; };
  }, [answer?.storage_path]);

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function startRecording() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Questo browser non supporta la registrazione audio.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find((type) => MediaRecorder.isTypeSupported?.(type));
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      setElapsed(0);
      setBlob(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      recorder.ondataavailable = (event) => { if (event.data?.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const nextBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setBlob(nextBlob);
        setPreviewUrl(URL.createObjectURL(nextBlob));
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };
      recorder.start(250);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setElapsed((current) => {
          const next = current + 1;
          if (next >= maxSeconds) window.setTimeout(stopRecording, 0);
          return next;
        });
      }, 1000);
    } catch (recordError) {
      setError(recordError.message || 'Permesso microfono non disponibile.');
    }
  }

  function stopRecording() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    setRecording(false);
  }

  function discardRecording() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setBlob(null);
    setElapsed(0);
  }

  async function saveRecording() {
    if (!blob || !attemptId || !attemptQuestionId) return;
    if (minSeconds && elapsed < minSeconds) {
      setError(`La registrazione deve durare almeno ${minSeconds} secondi.`);
      return;
    }
    setUploading(true);
    setError('');
    try {
      const registered = await uploadExerciseAudioSubmission({ attemptId, attemptQuestionId, turnKey, blob, durationSeconds: elapsed, previousAnswer: answer });
      onChange(registered);
      setSavedUrl(previewUrl);
      setBlob(null);
      setPreviewUrl(null);
    } catch (uploadError) {
      setError(uploadError.message || 'Caricamento della registrazione non riuscito.');
    } finally {
      setUploading(false);
    }
  }

  if (disabled) return <div className="grid gap-3">{savedUrl ? <audio controls src={savedUrl} className="w-full" /> : <p className="rounded-xl border border-dashed border-ink/15 p-4 text-sm font-semibold text-ink/50 dark:border-white/15 dark:text-white/50">Nessuna registrazione disponibile.</p>}{answer?.duration_seconds ? <p className="text-xs font-bold text-ink/45 dark:text-white/45">Durata: {Math.round(Number(answer.duration_seconds))} secondi</p> : null}</div>;

  return <div className="grid gap-4">
    {recordingContent.context ? <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-semibold leading-6 text-cyan-950 dark:border-cyan-300/20 dark:bg-cyan-300/[0.07] dark:text-cyan-100">{recordingContent.context}</div> : null}
    {savedUrl ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-300/20 dark:bg-emerald-300/[0.07]"><p className="mb-3 flex items-center gap-2 text-sm font-black text-emerald-900 dark:text-emerald-100"><CheckCircle2 className="h-4 w-4" />Registrazione salvata</p><audio controls src={savedUrl} className="w-full" /></div> : null}
    {previewUrl ? <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-300/20 dark:bg-violet-300/[0.07]"><p className="mb-3 text-sm font-black text-violet-900 dark:text-violet-100">Riascolta prima di salvare</p><audio controls src={previewUrl} className="w-full" /><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={uploading || !attemptId} onClick={saveRecording} className="inline-flex items-center gap-2 rounded-full bg-violet-700 px-4 py-2 text-sm font-black text-white disabled:opacity-40"><Upload className="h-4 w-4" />{uploading ? 'Caricamento...' : 'Usa questa registrazione'}</button><button type="button" disabled={uploading} onClick={discardRecording} className="inline-flex items-center gap-2 rounded-full border border-violet-300 px-4 py-2 text-sm font-black text-violet-800 dark:text-violet-200"><RotateCcw className="h-4 w-4" />Registra di nuovo</button></div></div> : null}
    <div className="flex flex-wrap items-center gap-3">{recording ? <button type="button" onClick={stopRecording} className="inline-flex items-center gap-2 rounded-full bg-red-700 px-5 py-3 text-sm font-black text-white"><Square className="h-4 w-4 fill-current" />Ferma · {elapsed}s</button> : <button type="button" disabled={uploading} onClick={startRecording} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-black text-white dark:bg-emerald-300 dark:text-[#102019]"><Mic className="h-4 w-4" />{savedUrl ? 'Registra di nuovo' : 'Inizia registrazione'}</button>}<span className="text-xs font-bold text-ink/45 dark:text-white/45">{minSeconds ? `${minSeconds}–${maxSeconds}` : `Massimo ${maxSeconds}`} secondi</span></div>
    {!attemptId ? <p className="text-xs font-bold text-amber-700 dark:text-amber-200">La registrazione reale è disponibile soltanto durante un tentativo assegnato.</p> : null}
    {error ? <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-900 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</p> : null}
    <RubricPreview rubric={recordingContent.rubric} />
  </div>;
}

function ResultPanel({ result, teacherComment, showScore, showCorrectAnswers, showExplanations }) {
  if (!result) return null;
  const status = result.status || 'unanswered';
  return <div className={`mt-5 rounded-xl border p-4 ${resultStyles[status] || resultStyles.unanswered}`}><p className="text-lg font-black">{resultLabels[status] || status}</p>{status === 'pending_review' ? <p className="mt-1 text-sm font-semibold">La risposta è stata consegnata. Riceverai la valutazione dell’insegnante nella tua area studente.</p> : null}{showScore && result.max_points !== undefined && status !== 'pending_review' ? <p className="mt-1 text-sm font-semibold">Punti: <strong>{Number(result.earned_points || 0).toFixed(1)} / {Number(result.max_points || 0).toFixed(1)}</strong></p> : null}{showCorrectAnswers && result.correct_answer ? <p className="mt-2 text-sm font-semibold">Risposta giusta: <strong>{Array.isArray(result.correct_answer) ? result.correct_answer.join(' · ') : String(result.correct_answer)}</strong></p> : null}{showExplanations && result.explanation ? <p className="mt-2 text-sm leading-6">{typeof result.explanation === 'string' ? result.explanation : JSON.stringify(result.explanation)}</p> : null}{teacherComment ? <div className="mt-4 rounded-lg border border-current/15 bg-white/55 p-3 dark:bg-white/[0.06]"><p className="text-xs font-black uppercase tracking-wide opacity-60">Commento dell’insegnante</p><p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-6">{teacherComment}</p></div> : null}</div>;
}

export default function ExerciseQuestionRendererV2({
  item,
  answer,
  onChange,
  disabled = false,
  showScore = false,
  showCorrectAnswers = false,
  showExplanations = false,
  attemptId = null,
}) {
  const question = item?.question || {};
  const type = question.type;
  const result = item?.result || null;
  const input = useMemo(() => {
    if (type === 'multiple_choice') return <MultipleChoice question={question} answer={answer} onChange={onChange} disabled={disabled} />;
    if (type === 'dialogue_choice') return <DialogueChoice question={question} answer={answer} onChange={onChange} disabled={disabled} />;
    if (type === 'multiple_select') return <MultipleChoice question={question} answer={answer} onChange={onChange} disabled={disabled} multiple />;
    if (type === 'gap_fill') return <GapFill question={question} answer={answer} onChange={onChange} disabled={disabled} />;
    if (type === 'select_gap') return <GapFill question={question} answer={answer} onChange={onChange} disabled={disabled} select />;
    if (type === 'translation' || type === 'error_correction') return <TextAnswer multiline={type === 'error_correction'} value={answer || ''} onChange={onChange} disabled={disabled} />;
    if (type === 'word_order') return <WordOrder question={question} answer={answer} onChange={onChange} disabled={disabled} />;
    if (type === 'content_block') return <article className="rounded-xl border border-cyan-200 bg-cyan-50 p-5 dark:border-cyan-300/20 dark:bg-cyan-300/[0.07]"><FileText className="h-5 w-5 text-cyan-800 dark:text-cyan-200" /><div className="mt-3 whitespace-pre-wrap text-base font-medium leading-8 text-ink/80 dark:text-white/80">{question.content?.body || question.prompt}</div></article>;
    if (type === 'written_response') return <div className="grid gap-4"><WrittenResponse question={question} answer={answer} onChange={onChange} disabled={disabled} /><RubricPreview rubric={question.content?.rubric} /></div>;
    if (type === 'dialogue_roleplay') return <DialogueRoleplay question={question} answer={answer} onChange={onChange} disabled={disabled} attemptId={attemptId} attemptQuestionId={item?.id} teacherTurnReviews={item?.teacher_turn_reviews} />;
    if (type === 'audio_response') return <AudioRecorder question={question} answer={answer} onChange={onChange} disabled={disabled} attemptId={attemptId} attemptQuestionId={item?.id} />;
    if (type === 'reading_comprehension') return <ReadingComprehension question={question} answer={answer} onChange={onChange} disabled={disabled} />;
    return <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100">Tipologia non supportata: {type || 'sconosciuta'}.</p>;
  }, [type, question, answer, onChange, disabled, attemptId, item?.id, item?.teacher_turn_reviews]);

  return <div><div className="mb-4 flex items-start gap-3">{['dialogue_choice', 'dialogue_roleplay'].includes(type) ? <MessageCircleMore className="mt-0.5 h-5 w-5 shrink-0 text-violet-700 dark:text-violet-200" /> : type === 'audio_response' ? <Mic className="mt-0.5 h-5 w-5 shrink-0 text-violet-700 dark:text-violet-200" /> : type === 'reading_comprehension' ? <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700 dark:text-cyan-200" /> : null}<div>{question.prompt ? <p className="text-lg font-black leading-7 text-ink dark:text-white">{question.prompt}</p> : null}{question.instructions ? <p className="mt-1 text-sm font-semibold leading-6 text-ink/55 dark:text-white/55">{question.instructions}</p> : null}</div></div>{input}<ResultPanel result={result} teacherComment={item?.teacher_comment} showScore={showScore} showCorrectAnswers={showCorrectAnswers} showExplanations={showExplanations} /></div>;
}
