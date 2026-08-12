import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Mic,
  RotateCcw,
  Square,
  Upload,
} from 'lucide-react';
import {
  createExerciseAudioSignedUrl,
  uploadExerciseAudioSubmission,
} from '../../lib/exerciseSubmissionApi.js';
import { formatExerciseCorrectAnswer } from '../../lib/exerciseAnswerDisplay.js';
import {
  wordOrderDisplayToken,
  wordOrderTerminalPunctuation,
} from '../../lib/wordOrderPresentation.js';
import EducationalContentBlock from './EducationalContentBlock.jsx';
import SbloccoSelect from './SbloccoSelect.jsx';
import {
  ExerciseChoice,
  ExerciseFeedbackPanel,
  ExercisePrompt,
} from './ExerciseExperience.jsx';

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
  const shared = 'focus-ring exercise-text-field w-full px-4 py-3 text-base font-semibold';
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
  return <div className="exercise-choice-grid is-two-column">{options.map((option) => <ExerciseChoice key={option.key} disabled={disabled} selected={selected.has(option.key)} multiple={multiple} onClick={() => choose(option.key)}>{option.text}</ExerciseChoice>)}</div>;
}

function DialogueChoice({ question, answer, onChange, disabled }) {
  const content = question.content || {};
  return (
    <div className="grid gap-5">
      {content.scenario ? <div className="exercise-scenario">{content.scenario}</div> : null}
      <div className="exercise-dialogue">
        {(content.turns || []).map((turn, index) => (
          <div key={turn.key || index} className={`exercise-dialogue-turn ${index % 2 ? 'is-learner' : ''}`}>
            <p className="exercise-dialogue-turn__speaker">{turn.speaker}</p>
            <p className="exercise-dialogue-turn__body">{turn.text}</p>
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
  const blanks = question.content?.blanks || [];
  const template = question.content?.text_template || '';
  const blankByKey = new Map(blanks.map((blank, index) => [blank.key, { blank, index }]));

  function control(blank, index) {
    const value = values[blank.key] || '';
    const shared = 'focus-ring exercise-inline-gap mx-1 my-1 inline-block max-w-full px-3 py-2 text-base font-bold align-baseline';
    return <span key={`${blank.key}-${index}`} className="inline max-w-full"><span className="sr-only">Spazio {index + 1}</span>{select
      ? <SbloccoSelect compact value={value} options={blank.options || []} onChange={(nextValue) => onChange({ ...values, [blank.key]: nextValue })} disabled={disabled} ariaLabel={`Spazio ${index + 1}`} />
      : <input value={value} onChange={(event) => onChange({ ...values, [blank.key]: event.target.value })} disabled={disabled} aria-label={`Spazio ${index + 1}`} className={shared} />}</span>;
  }

  if (template) {
    const parts = template.split(/(\[\[[A-Za-z0-9_-]+\]\])/g);
    return <div className="whitespace-pre-wrap border-y border-ink/10 bg-linen/20 px-3 py-4 text-base font-semibold leading-10 text-ink/85 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/85">{parts.map((part, index) => {
      const match = part.match(/^\[\[([A-Za-z0-9_-]+)\]\]$/);
      if (!match) return <span key={`text-${index}`}>{part}</span>;
      const entry = blankByKey.get(match[1]);
      return entry ? control(entry.blank, entry.index) : <span key={`unknown-${index}`}>{part}</span>;
    })}</div>;
  }

  return <div className="grid gap-4">{blanks.map((blank, index) => <div key={blank.key} className="grid gap-2"><span className="text-xs font-bold uppercase tracking-wide text-ink/65 dark:text-white/65">Spazio {index + 1}</span>{select ? <SbloccoSelect value={values[blank.key] || ''} options={blank.options || []} onChange={(nextValue) => onChange({ ...values, [blank.key]: nextValue })} disabled={disabled} ariaLabel={`Spazio ${index + 1}`} /> : <TextAnswer value={values[blank.key] || ''} onChange={(value) => onChange({ ...values, [blank.key]: value })} disabled={disabled} />}</div>)}</div>;
}

function WordOrder({ question, answer, onChange, disabled }) {
  const tokenInstances = (question.content?.tokens || []).map((token, index) => {
    const text = typeof token === 'string' ? token : token.text;
    return { ...(typeof token === 'object' ? token : {}), text, instanceKey: `${token.key || text}-${index}` };
  });
  const selectedValues = Array.isArray(answer) ? answer.map((token) => typeof token === 'string' ? token : token?.text).filter(Boolean) : [];
  const usedKeys = new Set();
  const selected = selectedValues.map((value, index) => {
    const match = tokenInstances.find((token) => token.text === value && !usedKeys.has(token.instanceKey));
    if (match) { usedKeys.add(match.instanceKey); return match; }
    return { text: value, instanceKey: `saved-${index}-${value}` };
  });
  const remaining = tokenInstances.filter((token) => !usedKeys.has(token.instanceKey));
  const dragRef = useRef(null);
  const [draggingKey, setDraggingKey] = useState(null);
  const terminalPunctuation = wordOrderTerminalPunctuation(question.content);
  function emit(next) { onChange(next.map((token) => token.text)); }
  function append(token) { emit([...selected, token]); }
  function remove(index) { emit(selected.filter((_, current) => current !== index)); }
  function move(index, direction) {
    const target = index + direction;
    if (disabled || target < 0 || target >= selected.length) return;
    const next = [...selected];
    [next[index], next[target]] = [next[target], next[index]];
    emit(next);
  }
  function startDrag(event, payload) {
    if (disabled) return;
    dragRef.current = payload;
    setDraggingKey(payload.token.instanceKey);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', payload.token.instanceKey);
  }
  function endDrag() {
    dragRef.current = null;
    setDraggingKey(null);
  }
  function dropInAnswer(event, targetIndex = selected.length) {
    event.preventDefault();
    const dragged = dragRef.current;
    if (!dragged || disabled) return;
    const next = dragged.source === 'selected'
      ? selected.filter((_, index) => index !== dragged.index)
      : [...selected];
    const adjustedIndex = dragged.source === 'selected' && dragged.index < targetIndex ? targetIndex - 1 : targetIndex;
    next.splice(Math.max(0, Math.min(adjustedIndex, next.length)), 0, dragged.token);
    emit(next);
    endDrag();
  }
  function dropInBank(event) {
    event.preventDefault();
    const dragged = dragRef.current;
    if (dragged?.source === 'selected' && !disabled) remove(dragged.index);
    endDrag();
  }
  return <div className="grid gap-4">
    <p className="text-xs font-semibold text-ink/65 dark:text-white/65">Fai clic sulle parole oppure trascinale. Puoi anche trascinare le parole già scelte per riordinarle.</p>
    <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropInAnswer(event)} className="min-h-20 rounded-xl border border-dashed border-moss/35 bg-mint/20 p-3 dark:border-emerald-300/25 dark:bg-emerald-400/[0.06]" aria-label="Frase costruita">
      <div className="flex min-h-12 flex-wrap items-center gap-2">{selected.map((token, index) => <span key={`${token.instanceKey}-${index}`} className={`inline-flex min-h-11 overflow-hidden rounded-lg bg-ink text-white shadow-sm transition dark:bg-emerald-300 dark:text-surface-950 ${draggingKey === token.instanceKey ? 'opacity-45' : ''}`}><button type="button" disabled={disabled || index === 0} onClick={() => move(index, -1)} className="min-w-8 px-2 text-base font-black disabled:opacity-20" aria-label={`Sposta ${wordOrderDisplayToken(token.text, terminalPunctuation)} a sinistra`}>&larr;</button><button type="button" disabled={disabled} draggable={!disabled} onDragStart={(event) => startDrag(event, { source: 'selected', token, index })} onDragEnd={endDrag} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.stopPropagation(); dropInAnswer(event, index); }} onClick={() => remove(index)} title="Trascina per riordinare o fai clic per rimuovere" className="cursor-grab border-x border-white/20 px-3 py-2 text-sm font-black active:cursor-grabbing dark:border-surface-950/15">{wordOrderDisplayToken(token.text, terminalPunctuation)}</button><button type="button" disabled={disabled || index === selected.length - 1} onClick={() => move(index, 1)} className="min-w-8 px-2 text-base font-black disabled:opacity-20" aria-label={`Sposta ${wordOrderDisplayToken(token.text, terminalPunctuation)} a destra`}>&rarr;</button></span>)}{selected.length && terminalPunctuation ? <span className="px-1 text-xl font-black text-ink dark:text-white" aria-label={`Punteggiatura finale ${terminalPunctuation}`}>{terminalPunctuation}</span> : null}</div>
    </div>
    <div onDragOver={(event) => event.preventDefault()} onDrop={dropInBank} className="flex min-h-14 flex-wrap items-center gap-2 rounded-xl border border-transparent p-2" aria-label="Parole disponibili">{remaining.map((token) => <button key={token.instanceKey} type="button" disabled={disabled} draggable={!disabled} onDragStart={(event) => startDrag(event, { source: 'remaining', token })} onDragEnd={endDrag} onClick={() => append(token)} title="Trascina nella frase o fai clic per aggiungere" className={`min-h-11 cursor-grab rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-black text-ink transition active:cursor-grabbing dark:border-white/20 dark:bg-white/[0.06] dark:text-white ${draggingKey === token.instanceKey ? 'opacity-45' : ''}`}>{wordOrderDisplayToken(token.text, terminalPunctuation)}</button>)}</div>
  </div>;
}

function WrittenResponse({ question, answer, onChange, disabled }) {
  const content = question.content || {};
  const count = wordCount(answer);
  const min = Number(content.min_words || 0);
  const max = Number(content.max_words || 0);
  const validRange = (!min || count >= min) && (!max || count <= max);
  return <div className="grid gap-4">{content.context ? <div className="exercise-scenario">{content.context}</div> : null}{content.required_points?.length ? <div className="exercise-guidance"><p className="text-xs font-bold uppercase tracking-wide">Punti da includere</p><ul className="mt-2 grid gap-1 text-sm font-semibold">{content.required_points.map((point) => <li key={point}>• {point}</li>)}</ul></div> : null}<TextAnswer multiline value={answer || ''} onChange={onChange} disabled={disabled} placeholder="Scrivi qui la tua produzione..." /><div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black"><span className={validRange ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-200'}>{count} parole</span><span className="text-ink/60 dark:text-white/60">Richieste: {min || 0}{max ? `–${max}` : '+'}</span></div></div>;
}

function RubricPreview({ rubric }) {
  if (!Array.isArray(rubric) || !rubric.length) return null;
  return <details className="border-y border-sky-200 bg-sky-50/60 p-4 dark:border-sky-300/20 dark:bg-sky-300/[0.06]"><summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-sky-800 dark:text-sky-200">Come verrà valutato</summary><div className="mt-3 grid gap-2">{rubric.map((criterion) => <div key={criterion.key} className="flex items-start justify-between gap-4 border-t border-current/10 pt-2 text-sm"><div><p className="font-black text-ink dark:text-white">{criterion.label}</p>{criterion.description ? <p className="mt-1 text-xs font-semibold text-ink/65 dark:text-white/65">{criterion.description}</p> : null}</div><span className="shrink-0 text-xs font-black text-sky-800 dark:text-sky-200">{criterion.max_points} pt</span></div>)}</div></details>;
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
    {turn.objective ? <div><p className="text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-200">Il tuo obiettivo</p><p className="mt-1 text-sm font-semibold leading-6 text-ink/75 dark:text-white/75">{turn.objective}</p></div> : null}
    {turn.direction ? <p className="exercise-guidance text-sm font-bold">{turn.direction}</p> : null}
    {turn.context ? <p className="text-sm font-semibold leading-6 text-ink/60 dark:text-white/60">{turn.context}</p> : null}
    {groups.length ? <div className="grid gap-3 sm:grid-cols-2">{groups.map(([label, values]) => <div key={label} className="rounded-lg border border-ink/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.04]"><p className="text-[0.68rem] font-bold uppercase tracking-wide text-ink/60 dark:text-white/60">{label}</p><ul className="mt-2 grid gap-1 text-sm font-semibold text-ink/70 dark:text-white/70">{values.map((value) => <li key={value}>• {value}</li>)}</ul></div>)}</div> : null}
    {turn.hint ? <p className="text-xs font-bold text-amber-800 dark:text-amber-200">Suggerimento: {turn.hint}</p> : null}
    {recorded && turn.retry_hint ? <p className="text-xs font-bold text-sky-800 dark:text-sky-200">Dopo il primo tentativo: {turn.retry_hint}</p> : null}
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
    {content.scenario ? <div className="exercise-scenario">{content.scenario}</div> : null}
    <div><p className="text-xs font-bold uppercase tracking-wide text-ink/60 dark:text-white/60">Scegli il tuo personaggio</p><div className="exercise-choice-grid is-two-column mt-3">{characters.filter((character) => character.selectable !== false).map((character) => <ExerciseChoice key={character.key} disabled={disabled} selected={selectedRole === character.key} onClick={() => selectRole(character.key)}><span className="block font-black">{character.name}</span>{character.description ? <span className="mt-1 block text-xs font-semibold leading-5 opacity-70">{character.description}</span> : null}</ExerciseChoice>)}</div></div>
    {audioPerTurn && disabled && selectedCharacter ? <button type="button" onClick={() => setConversationView((value) => !value)} className="exercise-secondary-action justify-self-start">{conversationView ? 'Mostra revisione turno per turno' : 'Riproduci conversazione'}</button> : null}
    {selectedCharacter ? <div className="grid gap-3">{(content.turns || []).map((turn, index) => {
      const speaker = characters.find((character) => character.key === turn.speaker);
      const learnerTurn = turn.speaker === selectedRole && (!audioPerTurn || turn.learner_response !== false);
      const turnAnswer = turns[turn.key];
      const review = teacherTurnReviews?.[turn.key];
      return <div key={turn.key} className={`exercise-dialogue-turn ${learnerTurn ? 'is-learner' : ''}`}><div className="exercise-dialogue-turn__speaker">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[0.68rem] font-bold uppercase tracking-wide text-ink/60 dark:text-white/60">{speaker?.name || turn.speaker} · {index + 1}</p>{learnerTurn && audioPerTurn ? <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-black ${turnAnswer?.file_id ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200'}`}>{turnAnswer?.file_id ? 'Completato' : turn.required === false ? 'Opzionale' : 'Da registrare'}</span> : null}</div>
      </div><div className="exercise-dialogue-turn__body">{learnerTurn ? audioPerTurn ? <div className="grid gap-4">{!conversationView ? <TurnGuidance turn={turn} recorded={Boolean(turnAnswer?.file_id)} /> : null}<AudioRecorder question={question} answer={turnAnswer} onChange={(value) => changeTurn(turn.key, value)} disabled={disabled} attemptId={attemptId} attemptQuestionId={attemptQuestionId} turnKey={turn.key} contentOverride={turn.constraints || {}} />{review ? <ExerciseFeedbackPanel status={review.status || 'pending_review'} title={review.status === 'correct' ? 'Efficace' : review.status === 'nearly_correct' ? 'Quasi efficace' : 'Da rivedere'}>{review.score !== undefined && review.max_score !== undefined ? <p>{review.score}/{review.max_score} punti</p> : null}{review.comment ? <p>{review.comment}</p> : null}</ExerciseFeedbackPanel> : null}</div> : <textarea rows={3} value={turnAnswer || ''} onChange={(event) => changeTurn(turn.key, event.target.value)} disabled={disabled} placeholder={turn.prompt || 'Scrivi la battuta...'} className="focus-ring exercise-text-area w-full px-3 py-2 text-sm font-semibold" /> : <p>{turn.text || turn.prompt || 'Turno dell’altro personaggio.'}</p>}</div>
      </div>;
    })}</div> : <p className="border-y border-dashed border-ink/15 p-4 text-sm font-semibold text-ink/65 dark:border-white/15 dark:text-white/65">Scegli un personaggio per iniziare il dialogo.</p>}
    <RubricPreview rubric={content.rubric} />
  </div>;
}

function ReadingComprehension({ question, answer, onChange, disabled }) {
  const content = question.content || {};
  const values = answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {};
  function update(key, value) { onChange({ ...values, [key]: value }); }
  return <div className="grid gap-6">
    <article className="exercise-reading">
      <div className="exercise-reading__label"><BookOpen /><span>Testo di lettura</span></div>
      {content.title ? <h3>{content.title}</h3> : null}
      <div className="exercise-reading__passage">{content.passage}</div>
      {content.source_note ? <p className="exercise-reading__source">{content.source_note}</p> : null}
    </article>
    <div className="exercise-reading-questions">{(content.items || []).map((readingItem, index) => <section key={readingItem.key} className="exercise-reading-question">
      <p className="exercise-reading-question__meta">Domanda {index + 1} · {readingItem.points || 1} pt</p>
      <p className="exercise-reading-question__prompt">{readingItem.prompt}</p>
      {['multiple_choice', 'true_false'].includes(readingItem.type) ? <div className="exercise-choice-grid is-two-column">{(readingItem.options || []).map((option) => <ExerciseChoice key={option.key} disabled={disabled} selected={values[readingItem.key] === option.key} onClick={() => update(readingItem.key, option.key)}>{option.text}</ExerciseChoice>)}</div> : readingItem.type === 'multiple_select' ? <MultipleChoice question={{ content: { options: readingItem.options } }} answer={values[readingItem.key]} onChange={(value) => update(readingItem.key, value)} disabled={disabled} multiple /> : <TextAnswer value={values[readingItem.key] || ''} onChange={(value) => update(readingItem.key, value)} disabled={disabled} />}
    </section>)}</div>
  </div>;
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

  if (disabled) return <div className="exercise-speaking">{savedUrl ? <audio controls src={savedUrl} className="w-full" /> : <p className="border-y border-dashed border-ink/15 p-4 text-sm font-semibold text-ink/65 dark:border-white/15 dark:text-white/65">Nessuna registrazione disponibile.</p>}{answer?.duration_seconds ? <p className="text-xs font-bold text-ink/60 dark:text-white/60">Durata: {Math.round(Number(answer.duration_seconds))} secondi</p> : null}</div>;

  return <div className="exercise-speaking">
    {recordingContent.context ? <div className="exercise-scenario">{recordingContent.context}</div> : null}
    {savedUrl ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-300/20 dark:bg-emerald-300/[0.07]"><p className="mb-3 flex items-center gap-2 text-sm font-black text-emerald-900 dark:text-emerald-100"><CheckCircle2 className="h-4 w-4" />Registrazione salvata</p><audio controls src={savedUrl} className="w-full" /></div> : null}
    {previewUrl ? <div className="border-y border-sky-200 bg-sky-50 p-4 dark:border-sky-300/20 dark:bg-sky-300/[0.07]"><p className="mb-3 text-sm font-black text-sky-900 dark:text-sky-100">Riascolta prima di salvare</p><audio controls src={previewUrl} className="w-full" /><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={uploading || !attemptId} onClick={saveRecording} className="exercise-primary-action disabled:opacity-40"><Upload className="h-4 w-4" />{uploading ? 'Caricamento...' : 'Usa questa registrazione'}</button><button type="button" disabled={uploading} onClick={discardRecording} className="exercise-secondary-action"><RotateCcw className="h-4 w-4" />Registra di nuovo</button></div></div> : null}
    <div className="flex flex-wrap items-center gap-3">{recording ? <button type="button" onClick={stopRecording} className="inline-flex items-center gap-2 rounded-full bg-red-700 px-5 py-3 text-sm font-black text-white"><Square className="h-4 w-4 fill-current" />Ferma · {elapsed}s</button> : <button type="button" disabled={uploading} onClick={startRecording} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-black text-white dark:bg-emerald-300 dark:text-surface-950"><Mic className="h-4 w-4" />{savedUrl ? 'Registra di nuovo' : 'Inizia registrazione'}</button>}<span className="text-xs font-bold text-ink/60 dark:text-white/60">{minSeconds ? `${minSeconds}–${maxSeconds}` : `Massimo ${maxSeconds}`} secondi</span></div>
    {!attemptId ? <p className="text-xs font-bold text-amber-700 dark:text-amber-200">La registrazione reale è disponibile soltanto durante un tentativo assegnato.</p> : null}
    {error ? <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-900 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</p> : null}
    <RubricPreview rubric={recordingContent.rubric} />
  </div>;
}

function ResultPanel({ question, result, teacherComment, showScore, showCorrectAnswers, showExplanations }) {
  if (!result) return null;
  const status = result.status || 'unanswered';
  const correctAnswer = formatExerciseCorrectAnswer(question, result.correct_answer);
  return <ExerciseFeedbackPanel status={status} title={resultLabels[status] || status}>{status === 'pending_review' ? <p>La risposta è stata consegnata. Riceverai la valutazione dell’insegnante nella tua area studente.</p> : null}{showScore && result.max_points !== undefined && status !== 'pending_review' ? <p>Punti: <strong>{Number(result.earned_points || 0).toFixed(1)} / {Number(result.max_points || 0).toFixed(1)}</strong></p> : null}{showCorrectAnswers && correctAnswer ? <p>Risposta giusta: <strong>{correctAnswer}</strong></p> : null}{showExplanations && result.explanation ? <p>{typeof result.explanation === 'string' ? result.explanation : JSON.stringify(result.explanation)}</p> : null}{teacherComment ? <div className="mt-3 border-t border-current/15 pt-3"><p className="text-xs font-bold uppercase tracking-wide opacity-60">Commento dell’insegnante</p><p className="mt-1 whitespace-pre-wrap font-semibold">{teacherComment}</p></div> : null}</ExerciseFeedbackPanel>;
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
    if (type === 'content_block') return <EducationalContentBlock content={question.content} fallback={question.prompt} />;
    if (type === 'written_response') return <div className="grid gap-4"><WrittenResponse question={question} answer={answer} onChange={onChange} disabled={disabled} /><RubricPreview rubric={question.content?.rubric} /></div>;
    if (type === 'dialogue_roleplay') return <DialogueRoleplay question={question} answer={answer} onChange={onChange} disabled={disabled} attemptId={attemptId} attemptQuestionId={item?.id} teacherTurnReviews={item?.teacher_turn_reviews} />;
    if (type === 'audio_response') return <AudioRecorder question={question} answer={answer} onChange={onChange} disabled={disabled} attemptId={attemptId} attemptQuestionId={item?.id} />;
    if (type === 'reading_comprehension') return <ReadingComprehension question={question} answer={answer} onChange={onChange} disabled={disabled} />;
    return <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100">Tipologia non supportata: {type || 'sconosciuta'}.</p>;
  }, [type, question, answer, onChange, disabled, attemptId, item?.id, item?.teacher_turn_reviews]);

  return <div><ExercisePrompt type={type} prompt={question.prompt} instructions={question.instructions} />{input}<ResultPanel question={question} result={result} teacherComment={item?.teacher_comment} showScore={showScore} showCorrectAnswers={showCorrectAnswers} showExplanations={showExplanations} /></div>;
}
