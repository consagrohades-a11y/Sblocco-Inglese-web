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
import { stableShuffleWordOrderTokenInstances } from '../../lib/wordOrderShuffle.js';
import { stableShuffleChoiceOptions } from '../../lib/choiceOptionShuffle.js';
import EducationalContentBlock from './EducationalContentBlock.jsx';
import SbloccoSelect from './SbloccoSelect.jsx';
import WritingCorrectionDisplay from './WritingCorrectionDisplay.jsx';
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

function TextAnswer({ value, onChange, disabled, multiline = false, placeholder = 'Scrivi la risposta...', rows = 7 }) {
  const shared = 'focus-ring exercise-text-field w-full px-4 py-3 text-base font-semibold';
  if (multiline) return <textarea rows={rows} value={value || ''} onChange={(event) => onChange(event.target.value)} disabled={disabled} placeholder={placeholder} className={shared} />;
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

function PracticeSelection({ question, answer, onChange, disabled }) {
  const multiple = question.content?.selection_mode !== 'single';
  return (
    <div className="grid gap-3">
      <p className="text-xs font-semibold leading-5 text-ink/60 dark:text-white/60">
        Non c’è una risposta giusta o sbagliata: la selezione viene semplicemente salvata.
      </p>
      <MultipleChoice
        question={question}
        answer={answer}
        onChange={onChange}
        disabled={disabled}
        multiple={multiple}
      />
    </div>
  );
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

function WordOrder({ question, answer, onChange, disabled, shuffleSeed }) {
  const tokenInstances = (question.content?.tokens || []).map((token, index) => {
    const text = typeof token === 'string' ? token : token.text;
    return { ...(typeof token === 'object' ? token : {}), text, instanceKey: `${token.key || text}-${index}` };
  });
  const bankTokenInstances = stableShuffleWordOrderTokenInstances(
    tokenInstances,
    question.content?.shuffle_strategy,
    shuffleSeed,
  );
  const selectedValues = Array.isArray(answer) ? answer.map((token) => typeof token === 'string' ? token : token?.text).filter(Boolean) : [];
  const usedKeys = new Set();
  const selected = selectedValues.map((value, index) => {
    const match = bankTokenInstances.find((token) => token.text === value && !usedKeys.has(token.instanceKey));
    if (match) { usedKeys.add(match.instanceKey); return match; }
    return { text: value, instanceKey: `saved-${index}-${value}` };
  });
  const remaining = bankTokenInstances.filter((token) => !usedKeys.has(token.instanceKey));
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
  const contextSections = content.context_sections && typeof content.context_sections === 'object'
    ? content.context_sections
    : {};
  const situation = contextSections.situation || content.context || '';
  const compactContext = [
    ['Il tuo ruolo', contextSections.role],
    ['Destinatario', contextSections.audience],
    ['Obiettivo', contextSections.goal],
  ].filter(([, value]) => value);
  const count = wordCount(answer);
  const min = Number(content.min_words || 0);
  const max = Number(content.max_words || 0);
  const validRange = (!min || count >= min) && (!max || count <= max);

  return (
    <div className="grid gap-6">
      {(situation || compactContext.length) ? (
        <section className="border-l-2 border-orange-400 pl-4">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">Context</p>
          {situation ? (
            <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm font-semibold leading-7 text-ink/80 dark:text-white/80">{situation}</p>
          ) : null}
          {compactContext.length ? (
            <dl className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-x-6 gap-y-3 border-t border-ink/10 pt-4 dark:border-white/10">
              {compactContext.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[0.62rem] font-black uppercase tracking-[0.08em] text-ink/40 dark:text-white/40">{label}</dt>
                  <dd className="mt-1 text-sm font-bold leading-5 text-ink/75 dark:text-white/75">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
      ) : null}

      {content.required_points?.length ? (
        <section>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.1em] text-ink/55 dark:text-white/55">Include</p>
            <span className="text-[0.66rem] font-bold text-ink/35 dark:text-white/35">{content.required_points.length} required</span>
          </div>
          <ol className="mt-3 grid gap-2.5">
            {content.required_points.map((point, index) => (
              <li key={point + index} className="flex items-start gap-3 text-sm font-semibold leading-6 text-ink/80 dark:text-white/80">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-orange-300/50 text-[0.65rem] font-black text-orange-700 dark:border-orange-300/25 dark:text-orange-300">
                  {index + 1}
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="border-t border-ink/10 pt-5 dark:border-white/10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.1em] text-orange-700 dark:text-orange-300">Your response</p>
            <p className="mt-1 text-xs font-semibold text-ink/45 dark:text-white/45">Write naturally. You can edit before submitting.</p>
          </div>
          {(min || max) ? (
            <span className="text-[0.68rem] font-black text-ink/45 dark:text-white/45">
              {min || 0}{max ? `–${max}` : '+'} words
            </span>
          ) : null}
        </div>
        <div className="mt-3">
          <TextAnswer
            multiline
            rows={10}
            value={answer || ''}
            onChange={onChange}
            disabled={disabled}
            placeholder="Scrivi qui la tua produzione..."
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-black">
            <span className={validRange ? 'text-ink/50 dark:text-white/50' : 'text-orange-700 dark:text-orange-300'}>
              {count} {count === 1 ? 'parola' : 'parole'}
            </span>
            {!validRange ? <span className="text-orange-700 dark:text-orange-300">Raggiungi il range richiesto prima di consegnare.</span> : null}
          </div>
        </div>
      </section>
    </div>
  );
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

function ReadingComprehension({
  question,
  answer,
  onChange,
  disabled,
  result = null,
  showCorrectAnswers = false,
  showExplanations = false,
  shuffleSeed = 'preview',
}) {
  const content = question.content || {};
  const values = answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {};
  const itemResults = Array.isArray(result?.correct_answer)
    ? Object.fromEntries(result.correct_answer.map((item) => [item?.key, item]))
    : {};

  function update(key, value) { onChange({ ...values, [key]: value }); }

  if (['b2_uoe_part1', 'b2_uoe_part2', 'b2_uoe_part3'].includes(content.presentation)) {
    const parts = Array.isArray(content.text_parts) ? content.text_parts : [];
    const items = Array.isArray(content.items) ? content.items : [];
    const prompts = Object.fromEntries(
      (Array.isArray(content.word_prompts) ? content.word_prompts : []).map((item) => [item.key, item.word]),
    );
    const partNumber = content.presentation.replace('b2_uoe_part', '');
    const partLabel = partNumber === '1'
      ? 'Multiple-choice cloze'
      : partNumber === '2'
        ? 'Open cloze'
        : 'Word formation';

    return (
      <div className="grid gap-6">
        <article className="exercise-reading">
          <div className="exercise-reading__label"><BookOpen /><span>B2 Use of English · Part {partNumber} · {partLabel}</span></div>
          {content.title ? <h3>{content.title}</h3> : null}
          <div className="mt-5 whitespace-pre-wrap text-base font-semibold leading-10 text-ink/85 dark:text-white/85">
            {parts.map((part, index) => {
              if (part.type !== 'gap') return <React.Fragment key={index}>{part.text} </React.Fragment>;

              const item = items.find((candidate) => candidate.key === part.key) || null;
              const itemResult = itemResults[part.key] || null;
              const selected = values[part.key] || '';
              const accepted = Array.isArray(itemResult?.correct_answer)
                ? itemResult.correct_answer
                : itemResult?.correct_answer
                  ? [itemResult.correct_answer]
                  : [];
              const gapNumber = Number(String(part.key || '').replace(/\D/g, '')) || index + 1;

              if (content.presentation === 'b2_uoe_part1') {
                return (
                  <span key={part.key || index} className="mx-1 inline-flex max-w-full items-center gap-1 align-middle">
                    <span className="text-xs font-black text-orange-700 dark:text-orange-300">{gapNumber}</span>
                    <select
                      value={selected}
                      disabled={disabled}
                      onChange={(event) => update(part.key, event.target.value)}
                      className="focus-ring max-w-[18rem] rounded-lg border border-orange-200 bg-orange-50 px-2 py-1.5 text-sm font-black text-ink dark:border-orange-300/20 dark:bg-orange-300/[0.06] dark:text-white"
                      aria-label={`Gap ${gapNumber}`}
                    >
                      <option value="">Choose…</option>
                      {(item?.options || []).map((option, optionIndex) => (
                        <option key={option.key} value={option.key}>
                          {String.fromCharCode(65 + optionIndex)} · {option.text}
                        </option>
                      ))}
                    </select>
                  </span>
                );
              }

              return (
                <span key={part.key || index} className="mx-1 inline-flex max-w-full items-center gap-1 align-middle">
                  <span className="text-xs font-black text-orange-700 dark:text-orange-300">{gapNumber}</span>
                  <input
                    value={selected}
                    disabled={disabled}
                    onChange={(event) => update(part.key, event.target.value)}
                    className="focus-ring w-32 rounded-lg border border-orange-200 bg-orange-50 px-2 py-1.5 text-sm font-black text-ink dark:border-orange-300/20 dark:bg-orange-300/[0.06] dark:text-white"
                    aria-label={`Gap ${gapNumber}`}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {content.presentation === 'b2_uoe_part3' && prompts[part.key] ? (
                    <span className="rounded-md bg-ink/5 px-1.5 py-0.5 text-[0.65rem] font-black uppercase tracking-wide text-ink/55 dark:bg-white/10 dark:text-white/55">
                      {prompts[part.key]}
                    </span>
                  ) : null}
                  {disabled && showCorrectAnswers && accepted.length && !accepted.some((candidate) => String(candidate).toLocaleLowerCase() === String(selected).trim().toLocaleLowerCase()) ? (
                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[0.68rem] font-black text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-100">
                      {accepted[0]}
                    </span>
                  ) : null}
                </span>
              );
            })}
          </div>
        </article>

        {disabled ? (
          <section className="grid gap-2 sm:grid-cols-2">
            {items.map((item, index) => {
              const itemResult = itemResults[item.key] || null;
              const status = itemResult?.status;
              const correctAnswer = Array.isArray(itemResult?.correct_answer)
                ? itemResult.correct_answer.join(' / ')
                : itemResult?.correct_answer;
              return (
                <article key={item.key} className="rounded-xl border border-ink/10 bg-white/65 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-ink/55 dark:text-white/55">Gap {index + 1}</span>
                    {status ? <span className={`rounded-full px-2 py-1 text-[0.62rem] font-black ${status === 'correct' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-100' : status === 'nearly_correct' ? 'bg-amber-100 text-amber-800 dark:bg-amber-300/10 dark:text-amber-100' : 'bg-red-100 text-red-800 dark:bg-red-300/10 dark:text-red-100'}`}>{resultLabels[status] || status}</span> : null}
                  </div>
                  {showCorrectAnswers && correctAnswer ? (
                    <p className="mt-2 text-xs font-semibold leading-5 text-ink/65 dark:text-white/65"><span className="font-black">Answer:</span> {correctAnswer}</p>
                  ) : null}
                  {showExplanations && itemResult?.explanation ? (
                    <p className="mt-2 text-xs font-semibold italic leading-5 text-ink/55 dark:text-white/55">{itemResult.explanation}</p>
                  ) : null}
                </article>
              );
            })}
          </section>
        ) : null}
      </div>
    );
  }

  if (content.presentation === 'b2_uoe_part4') {
    const transformations = Array.isArray(content.transformations) ? content.transformations : [];
    return (
      <div className="grid gap-4">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-orange-600 dark:text-orange-300">
          <BookOpen className="h-4 w-4" /> B2 Use of English · Part 4 · Key word transformations
        </div>

        {transformations.map((transformation, index) => {
          const itemResult = itemResults[transformation.key] || null;
          const value = values[transformation.key] || '';
          const wordCount = String(value).trim() ? String(value).trim().split(/\s+/).length : 0;
          const accepted = Array.isArray(itemResult?.correct_answer) ? itemResult.correct_answer : [];
          return (
            <article key={transformation.key} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[0.68rem] font-black text-orange-900 dark:bg-orange-300/10 dark:text-orange-100">Transformation {index + 1}</span>
                {itemResult ? (
                  <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-black ${itemResult.status === 'correct' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-100' : itemResult.status === 'nearly_correct' ? 'bg-amber-100 text-amber-800 dark:bg-amber-300/10 dark:text-amber-100' : 'bg-red-100 text-red-800 dark:bg-red-300/10 dark:text-red-100'}`}>
                    {Number(itemResult.earned_points || 0).toFixed(0)} / {Number(itemResult.max_points || 2).toFixed(0)} pt
                  </span>
                ) : null}
              </div>

              <p className="mt-4 text-sm font-bold leading-7 text-ink/80 dark:text-white/80">{transformation.lead_sentence}</p>
              <div className="mt-3">
                <span className="rounded-lg bg-ink px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-white dark:bg-clay">
                  {transformation.keyword}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold leading-7 text-ink/80 dark:text-white/80">
                <span>{transformation.before_gap}</span>
                <input
                  value={value}
                  disabled={disabled}
                  onChange={(event) => update(transformation.key, event.target.value)}
                  className="focus-ring min-w-[12rem] flex-1 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 font-black text-ink dark:border-orange-300/20 dark:bg-orange-300/[0.06] dark:text-white"
                  placeholder="2–5 words"
                  autoComplete="off"
                  spellCheck={false}
                />
                <span>{transformation.after_gap}</span>
              </div>
              {!disabled ? (
                <p className={`mt-2 text-[0.68rem] font-bold ${wordCount && (wordCount < 2 || wordCount > 5) ? 'text-red-700 dark:text-red-200' : 'text-ink/40 dark:text-white/40'}`}>
                  {wordCount || 0} words · use 2–5 words including {transformation.keyword}
                </p>
              ) : null}

              {disabled && showCorrectAnswers && accepted.length ? (
                <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold leading-5 text-emerald-900 dark:bg-emerald-300/[0.08] dark:text-emerald-100">
                  <span className="font-black">Accepted answer:</span> {accepted.join(' / ')}
                </div>
              ) : null}
              {showExplanations && itemResult?.explanation ? (
                <p className="mt-3 rounded-xl bg-linen/70 px-3 py-2 text-xs font-semibold italic leading-5 text-ink/70 dark:bg-white/[0.05] dark:text-white/70">
                  {itemResult.explanation}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    );
  }

  if (content.presentation === 'b2_part5') {
    return (
      <div className="grid gap-6">
        <article className="exercise-reading">
          <div className="exercise-reading__label"><BookOpen /><span>B2 reading · Multiple choice</span></div>
          {content.title ? <h3>{content.title}</h3> : null}
          <div className="exercise-reading__passage">{content.passage}</div>
          {content.source_note ? <p className="exercise-reading__source">{content.source_note}</p> : null}
        </article>

        <section className="grid gap-4">
          {(content.items || []).map((choiceItem, index) => {
            const itemResult = itemResults[choiceItem.key] || null;
            const selectedKey = values[choiceItem.key] || '';
            const correctKey = typeof itemResult?.correct_answer === 'string' ? itemResult.correct_answer : null;

            return (
              <article key={choiceItem.key} className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035] sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[0.68rem] font-black text-orange-900 dark:bg-orange-300/10 dark:text-orange-100">Question {index + 1}</span>
                  {itemResult?.status ? (
                    <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-black ${itemResult.status === 'correct' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-100' : 'bg-red-100 text-red-800 dark:bg-red-300/10 dark:text-red-100'}`}>
                      {resultLabels[itemResult.status] || itemResult.status}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-base font-black leading-7 text-ink dark:text-white">{choiceItem.prompt}</p>
                <div className="mt-3 grid gap-2">
                  {displayOptions.map((option, optionIndex) => {
                    const selected = selectedKey === option.key;
                    const correct = disabled && showCorrectAnswers && correctKey === option.key;
                    const wrongSelected = disabled && selected && correctKey && correctKey !== option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        disabled={disabled}
                        onClick={() => update(choiceItem.key, option.key)}
                        className={`focus-ring flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold leading-6 transition ${correct ? 'border-emerald-400 bg-emerald-50 text-emerald-950 dark:border-emerald-300/40 dark:bg-emerald-300/10 dark:text-emerald-100' : wrongSelected ? 'border-red-300 bg-red-50 text-red-950 dark:border-red-300/30 dark:bg-red-300/10 dark:text-red-100' : selected ? 'border-orange-400 bg-orange-50 text-ink dark:border-orange-300/40 dark:bg-orange-300/10 dark:text-white' : 'border-ink/10 bg-white text-ink/80 hover:border-orange-300 dark:border-white/10 dark:bg-white/[0.035] dark:text-white/80'}`}
                      >
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current/20 text-xs font-black">{String.fromCharCode(65 + optionIndex)}</span>
                        <span className="min-w-0 flex-1">{option.text}</span>
                        {correct ? <span className="shrink-0 font-black text-emerald-600 dark:text-emerald-300">✓</span> : null}
                      </button>
                    );
                  })}
                </div>
                {showExplanations && itemResult?.explanation ? (
                  <p className="mt-3 rounded-xl bg-linen/70 px-3 py-2 text-xs font-semibold leading-5 text-ink/70 dark:bg-white/[0.05] dark:text-white/70">{itemResult.explanation}</p>
                ) : null}
              </article>
            );
          })}
        </section>
      </div>
    );
  }

  if (content.presentation === 'b2_part6') {
    const paragraphs = Array.isArray(content.paragraph_options) ? content.paragraph_options : [];
    const parts = Array.isArray(content.passage_parts) ? content.passage_parts : [];
    const usedKeys = new Set(Object.values(values).filter(Boolean));
    let gapNumber = 0;

    return (
      <div className="grid gap-6">
        <article className="exercise-reading">
          <div className="exercise-reading__label"><BookOpen /><span>B2 reading · Gapped text</span></div>
          {content.title ? <h3>{content.title}</h3> : null}
          <div className="mt-5 grid gap-4">
            {parts.map((part, index) => {
              if (part.type !== 'gap') {
                return <p key={index} className="whitespace-pre-wrap text-base font-semibold leading-8 text-ink/85 dark:text-white/85">{part.text}</p>;
              }

              gapNumber += 1;
              const currentGap = gapNumber;
              const itemKey = part.key || `gap_${currentGap}`;
              const selectedKey = values[itemKey] || '';
              const selectedParagraph = paragraphs.find((paragraph) => paragraph.key === selectedKey) || null;
              const itemResult = itemResults[itemKey] || null;
              const correctKey = typeof itemResult?.correct_answer === 'string' ? itemResult.correct_answer : null;
              const correctParagraph = paragraphs.find((paragraph) => paragraph.key === correctKey) || null;

              return (
                <section key={itemKey} className="rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50/55 p-4 dark:border-orange-300/30 dark:bg-orange-300/[0.055]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-orange-500 px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-wide text-white">Gap {currentGap}</span>
                    {itemResult?.status ? (
                      <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-black ${itemResult.status === 'correct' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-100' : 'bg-red-100 text-red-800 dark:bg-red-300/10 dark:text-red-100'}`}>
                        {resultLabels[itemResult.status] || itemResult.status}
                      </span>
                    ) : null}
                  </div>

                  {selectedParagraph ? (
                    <div className="mt-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold leading-7 text-ink shadow-sm dark:bg-white/[0.06] dark:text-white">
                      <span className="mr-2 font-black text-orange-700 dark:text-orange-300">{selectedParagraph.label}</span>
                      {selectedParagraph.text}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm font-bold text-ink/45 dark:text-white/45">Choose the paragraph that fits here.</p>
                  )}

                  {!disabled ? (
                    <select
                      value={selectedKey}
                      onChange={(event) => update(itemKey, event.target.value)}
                      className="focus-ring mt-3 w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm font-black text-ink dark:border-white/15 dark:bg-surface-900 dark:text-white"
                    >
                      <option value="">Choose paragraph…</option>
                      {paragraphs.map((paragraph) => (
                        <option
                          key={paragraph.key}
                          value={paragraph.key}
                          disabled={usedKeys.has(paragraph.key) && paragraph.key !== selectedKey}
                        >
                          {paragraph.label}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  {disabled && showCorrectAnswers && correctParagraph && selectedKey !== correctKey ? (
                    <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold leading-5 text-emerald-900 dark:bg-emerald-300/[0.08] dark:text-emerald-100">
                      <span className="font-black">Correct paragraph {correctParagraph.label}:</span> {correctParagraph.text}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
          {content.source_note ? <p className="exercise-reading__source">{content.source_note}</p> : null}
        </article>

        <section className="rounded-2xl border border-ink/10 bg-white/65 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-xs font-black uppercase tracking-[0.1em] text-ink/45 dark:text-white/45">Paragraph bank</p>
          <div className="mt-3 grid gap-3">
            {paragraphs.map((paragraph) => (
              <article key={paragraph.key} className={`grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-xl border p-3 ${usedKeys.has(paragraph.key) ? 'border-orange-200 bg-orange-50/70 dark:border-orange-300/20 dark:bg-orange-300/[0.04]' : 'border-ink/10 bg-white dark:border-white/10 dark:bg-white/[0.035]'}`}>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-xs font-black text-white dark:bg-clay">{paragraph.label}</span>
                <p className="text-sm font-semibold leading-6 text-ink/75 dark:text-white/75">{paragraph.text}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (content.presentation === 'b2_part7') {
    const sections = Array.isArray(content.sections) ? content.sections : [];

    return (
      <div className="grid gap-6">
        <section className="grid gap-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-orange-600 dark:text-orange-300">
            <BookOpen className="h-4 w-4" /> B2 reading · Multiple matching
          </div>
          {sections.map((section) => (
            <article key={section.key} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-sm font-black text-white dark:bg-clay">{section.label}</span>
                <div className="min-w-0">
                  {section.title ? <h3 className="text-base font-black text-ink dark:text-white">{section.title}</h3> : null}
                  <p className={`${section.title ? 'mt-2' : ''} whitespace-pre-wrap text-sm font-semibold leading-7 text-ink/75 dark:text-white/75`}>{section.text}</p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-3">
          {(content.items || []).map((matchingItem, index) => {
            const selectedKey = values[matchingItem.key] || '';
            const itemResult = itemResults[matchingItem.key] || null;
            const correctKey = typeof itemResult?.correct_answer === 'string' ? itemResult.correct_answer : null;

            return (
              <article key={matchingItem.key} className="rounded-2xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.035]">
                <div className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-orange-100 text-xs font-black text-orange-800 dark:bg-orange-300/10 dark:text-orange-100">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black leading-6 text-ink dark:text-white">{matchingItem.prompt}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {sections.map((section) => {
                        const selected = selectedKey === section.key;
                        const correct = disabled && showCorrectAnswers && correctKey === section.key;
                        const wrongSelected = disabled && selected && correctKey && correctKey !== section.key;
                        return (
                          <button
                            key={section.key}
                            type="button"
                            disabled={disabled}
                            onClick={() => update(matchingItem.key, section.key)}
                            className={`focus-ring grid h-10 w-10 place-items-center rounded-full border text-xs font-black transition ${correct ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-300/40 dark:bg-emerald-300/10 dark:text-emerald-100' : wrongSelected ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-300/30 dark:bg-red-300/10 dark:text-red-100' : selected ? 'border-orange-500 bg-orange-500 text-white' : 'border-ink/15 bg-white text-ink/55 hover:border-orange-300 dark:border-white/15 dark:bg-white/[0.04] dark:text-white/55'}`}
                          >
                            {section.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    );
  }

  if (content.presentation === 'open_answer_set') {
    return (
      <div className="grid gap-5">
        {(content.items || []).map((openItem, index) => {
          const itemResult = itemResults[openItem.key] || null;
          const accepted = Array.isArray(itemResult?.correct_answer) ? itemResult.correct_answer : [];
          const status = itemResult?.status || null;

          return (
            <section key={openItem.key} className="border-t border-ink/10 pt-5 first:border-t-0 first:pt-0 dark:border-white/10">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.7rem] font-black uppercase tracking-[0.1em] text-orange-500">Item {index + 1}</p>
                {status ? (
                  <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-black ${
                    status === 'correct'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200'
                      : status === 'nearly_correct'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-300/10 dark:text-amber-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-300/10 dark:text-red-200'
                  }`}>
                    {resultLabels[status] || status}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-base font-black leading-7 text-ink dark:text-white">{openItem.prompt}</p>
              <div className="mt-3">
                <TextAnswer
                  value={values[openItem.key] || ''}
                  onChange={(value) => update(openItem.key, value)}
                  disabled={disabled}
                  placeholder="Scrivi una risposta..."
                />
              </div>
              {disabled && showCorrectAnswers && accepted.length ? (
                <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold leading-5 text-emerald-900 dark:bg-emerald-300/[0.08] dark:text-emerald-100">
                  <span className="font-black">Risposta accettata:</span> {accepted.join(' / ')}
                </div>
              ) : null}
              {showExplanations && itemResult?.explanation ? (
                <p className="mt-2 rounded-xl bg-linen/70 px-3 py-2 text-xs font-semibold leading-5 text-ink/70 dark:bg-white/[0.05] dark:text-white/70">
                  {itemResult.explanation}
                </p>
              ) : null}
            </section>
          );
        })}
      </div>
    );
  }

  if (content.presentation === 'choice_set') {
    return (
      <div className="grid gap-5">
        {(content.items || []).map((choiceItem, index) => {
          const itemResult = itemResults[choiceItem.key] || null;
          const selectedKey = values[choiceItem.key];
          const correctKey = typeof itemResult?.correct_answer === 'string' ? itemResult.correct_answer : null;
          const displayOptions = stableShuffleChoiceOptions(
            choiceItem.options || [],
            content.shuffle_options,
            shuffleSeed + ':' + choiceItem.key,
          );

          return (
            <section key={choiceItem.key} className="border-t border-ink/10 pt-5 first:border-t-0 first:pt-0 dark:border-white/10">
              <p className="text-[0.7rem] font-black uppercase tracking-[0.1em] text-orange-500">Example {index + 1}</p>
              <p className="mt-2 text-base font-black leading-7 text-ink dark:text-white">{choiceItem.prompt}</p>
              <div className="mt-3 grid gap-2">
                {displayOptions.map((option, optionIndex) => {
                  const selected = selectedKey === option.key;
                  const correct = disabled && showCorrectAnswers && correctKey === option.key;
                  const incorrectSelection = disabled && itemResult && selected && correctKey && correctKey !== option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      disabled={disabled}
                      onClick={() => update(choiceItem.key, option.key)}
                      className={`focus-ring flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold leading-6 transition ${
                        correct
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-950 dark:border-emerald-300/40 dark:bg-emerald-300/10 dark:text-emerald-100'
                          : incorrectSelection
                            ? 'border-red-300 bg-red-50 text-red-950 dark:border-red-300/30 dark:bg-red-300/10 dark:text-red-100'
                            : selected
                              ? 'border-orange-400 bg-orange-50 text-ink dark:border-orange-300/40 dark:bg-orange-300/10 dark:text-white'
                              : 'border-ink/10 bg-white text-ink/80 hover:border-orange-300 dark:border-white/10 dark:bg-white/[0.035] dark:text-white/80'
                      }`}
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current/20 text-xs font-black">
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      <span className="min-w-0 flex-1">{option.text}</span>
                      {correct ? <span className="shrink-0 font-black text-emerald-600 dark:text-emerald-300">✓</span> : null}
                    </button>
                  );
                })}
              </div>
              {showExplanations && itemResult?.explanation ? (
                <p className="mt-3 rounded-xl bg-linen/70 px-3 py-2 text-xs font-semibold leading-5 text-ink/70 dark:bg-white/[0.05] dark:text-white/70">
                  {itemResult.explanation}
                </p>
              ) : null}
            </section>
          );
        })}
      </div>
    );
  }

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
  if (result.ungraded) {
    return (
      <div className="mt-4 rounded-xl border border-orange-200/70 bg-orange-50/55 p-4 text-sm font-semibold text-orange-950 dark:border-orange-300/15 dark:bg-orange-300/[0.05] dark:text-orange-100">
        <strong>Scelta salvata.</strong> Questa attività non ha una risposta giusta o sbagliata e non influisce sul punteggio.
      </div>
    );
  }
  const status = result.status || 'unanswered';
  const isCompositeSet = ['choice_set', 'open_answer_set'].includes(question.content?.presentation);
  const correctAnswer = isCompositeSet ? '' : formatExerciseCorrectAnswer(question, result.correct_answer);
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
    if (type === 'practice_selection') return <PracticeSelection question={question} answer={answer} onChange={onChange} disabled={disabled} />;
    if (type === 'dialogue_choice') return <DialogueChoice question={question} answer={answer} onChange={onChange} disabled={disabled} />;
    if (type === 'multiple_select') return <MultipleChoice question={question} answer={answer} onChange={onChange} disabled={disabled} multiple />;
    if (type === 'gap_fill') return <GapFill question={question} answer={answer} onChange={onChange} disabled={disabled} />;
    if (type === 'select_gap') return <GapFill question={question} answer={answer} onChange={onChange} disabled={disabled} select />;
    if (type === 'translation' || type === 'error_correction') return <TextAnswer multiline={type === 'error_correction'} value={answer || ''} onChange={onChange} disabled={disabled} />;
    if (type === 'word_order') return <WordOrder question={question} answer={answer} onChange={onChange} disabled={disabled} shuffleSeed={`${attemptId || 'preview'}:${item?.question_version_id || item?.id || question.client_key || 'word_order'}`} />;
    if (type === 'content_block') return <EducationalContentBlock content={question.content} fallback={question.prompt} />;
    if (type === 'written_response') return <div className="grid gap-4"><WrittenResponse question={question} answer={answer} onChange={onChange} disabled={disabled} /><RubricPreview rubric={question.content?.rubric} /></div>;
    if (type === 'dialogue_roleplay') return <DialogueRoleplay question={question} answer={answer} onChange={onChange} disabled={disabled} attemptId={attemptId} attemptQuestionId={item?.id} teacherTurnReviews={item?.teacher_turn_reviews} />;
    if (type === 'audio_response') return <AudioRecorder question={question} answer={answer} onChange={onChange} disabled={disabled} attemptId={attemptId} attemptQuestionId={item?.id} />;
    if (type === 'reading_comprehension') return <ReadingComprehension question={question} answer={answer} onChange={onChange} disabled={disabled} result={result} showCorrectAnswers={showCorrectAnswers} showExplanations={showExplanations} shuffleSeed={`${attemptId || 'preview'}:${item?.question_version_id || item?.id || question.client_key || 'reading'}`} />;
    return <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100">Tipologia non supportata: {type || 'sconosciuta'}.</p>;
  }, [type, question, answer, onChange, disabled, attemptId, item?.id, item?.teacher_turn_reviews, result, showCorrectAnswers, showExplanations]);

  const displayType = question.content?.presentation === 'choice_set'
    ? 'multiple_choice_set'
    : question.content?.presentation === 'open_answer_set'
      ? 'open_answer_set'
      : type;
  return (
    <div>
      <ExercisePrompt type={displayType} prompt={question.prompt} instructions={question.instructions} />
      {input}
      <ResultPanel
        question={question}
        result={result}
        teacherComment={item?.teacher_comment}
        showScore={showScore}
        showCorrectAnswers={showCorrectAnswers}
        showExplanations={showExplanations}
      />
      {type === 'written_response' ? (
        <WritingCorrectionDisplay
          originalText={typeof answer === 'string' ? answer : ''}
          correction={item?.teacher_correction || {}}
        />
      ) : null}
    </div>
  );
}
