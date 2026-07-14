import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CheckSquare,
  CircleHelp,
  Languages,
  ListOrdered,
  PencilLine,
} from 'lucide-react';

const inputClass = 'w-full rounded-xl border border-clay/20 bg-white px-4 py-3 text-base font-semibold text-ink outline-none transition focus:border-coral focus:ring-4 focus:ring-blush/70 dark:border-white/20 dark:bg-[#211b18] dark:text-white dark:focus:border-[#ff9678] dark:focus:ring-coral/15';

function resultClasses(status) {
  if (status === 'correct') return 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-300/30 dark:bg-emerald-400/10 dark:text-emerald-100';
  if (status === 'nearly_correct') return 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-amber-100';
  if (status === 'unanswered') return 'border-slate-300 bg-slate-50 text-slate-800 dark:border-white/15 dark:bg-white/[0.06] dark:text-white/70';
  return 'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-300/30 dark:bg-rose-400/10 dark:text-rose-100';
}

const preferredAnswerKeys = [
  'correct_answer',
  'correct_answers',
  'accepted_answer',
  'accepted_answers',
  'answer',
  'answers',
  'value',
  'text',
];

const technicalAnswerKeys = new Set([
  'key',
  'status',
  'max_points',
  'earned_points',
  'points',
  'score',
  'is_correct',
  'explanation',
]);

function collectCorrectAnswers(value) {
  if (value === null || value === undefined || value === '') return [];
  if (typeof value === 'string' || typeof value === 'number') return [String(value)];
  if (typeof value === 'boolean') return value ? ['Sì'] : ['No'];
  if (Array.isArray(value)) return value.flatMap(collectCorrectAnswers);

  if (typeof value === 'object') {
    const preferred = preferredAnswerKeys
      .filter((key) => Object.prototype.hasOwnProperty.call(value, key))
      .flatMap((key) => collectCorrectAnswers(value[key]));
    if (preferred.length) return preferred;

    return Object.entries(value)
      .filter(([key]) => !technicalAnswerKeys.has(key))
      .flatMap(([, nestedValue]) => collectCorrectAnswers(nestedValue));
  }

  return [];
}

function cleanCorrectAnswers(value) {
  return [...new Set(collectCorrectAnswers(value).map((item) => item.trim()).filter(Boolean))];
}

function QuestionTypeIcon({ type }) {
  const className = 'h-4 w-4';
  if (type === 'translation') return <Languages className={className} />;
  if (type === 'error_correction') return <PencilLine className={className} />;
  if (type === 'word_order') return <ListOrdered className={className} />;
  if (type === 'content_block') return <BookOpen className={className} />;
  if (type === 'multiple_select') return <CheckSquare className={className} />;
  return <CircleHelp className={className} />;
}

function ResultPanel({ result, showScore = true, showCorrectAnswers = true, showExplanations = true }) {
  if (!result) return null;
  const label = result.status === 'correct'
    ? 'Corretto'
    : result.status === 'nearly_correct'
      ? 'Quasi corretto'
      : result.status === 'unanswered'
        ? 'Non risposto'
        : 'Da rivedere';
  const correctAnswers = cleanCorrectAnswers(result.correct_answer);

  return (
    <div className={`mt-5 rounded-xl border p-4 ${resultClasses(result.status)}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-black">{label}</p>
        {showScore ? <p className="text-xs font-black">{Number(result.earned_points || 0).toFixed(1)} / {Number(result.max_points || 0).toFixed(1)} punti</p> : null}
      </div>
      {showCorrectAnswers && correctAnswers.length ? (
        <div className="mt-3 text-sm leading-6">
          <span className="font-black">{correctAnswers.length === 1 ? 'Risposta giusta' : 'Risposte giuste'}: </span>
          <span>{correctAnswers.join(' · ')}</span>
        </div>
      ) : null}
      {showExplanations && result.explanation ? (
        <p className="mt-3 text-sm leading-6">{typeof result.explanation === 'string' ? result.explanation : JSON.stringify(result.explanation)}</p>
      ) : null}
    </div>
  );
}

function MultipleChoice({ question, answer, onChange, multiple = false, disabled }) {
  const selected = multiple ? (Array.isArray(answer) ? answer : []) : answer;
  return (
    <div className="grid gap-3">
      {(question.content?.options || []).map((option, index) => {
        const checked = multiple ? selected.includes(option.key) : selected === option.key;
        return (
          <label key={option.key} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${checked ? 'border-coral bg-blush/75 shadow-sm dark:border-[#ff9678]/55 dark:bg-coral/10' : 'border-clay/15 bg-white hover:border-coral/35 hover:bg-blush/30 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-coral/30 dark:hover:bg-coral/[0.06]'} ${disabled ? 'cursor-default opacity-80' : ''}`}>
            <input
              type={multiple ? 'checkbox' : 'radio'}
              checked={checked}
              disabled={disabled}
              onChange={() => {
                if (multiple) {
                  const next = checked ? selected.filter((key) => key !== option.key) : [...selected, option.key];
                  onChange(next);
                } else {
                  onChange(option.key);
                }
              }}
              className="h-4 w-4 shrink-0 accent-coral"
            />
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${checked ? 'bg-coral text-white dark:bg-[#ff9678] dark:text-[#21140f]' : 'bg-linen text-clay dark:bg-white/10 dark:text-white/65'}`}>{String.fromCharCode(65 + index)}</span>
            <span className="text-sm font-bold leading-6 text-ink dark:text-white">{option.text}</span>
          </label>
        );
      })}
    </div>
  );
}

function BlankInput({ blank, value, onChange, select, disabled }) {
  if (select) {
    return (
      <select value={value || ''} onChange={(event) => onChange(event.target.value)} disabled={disabled} className={`${inputClass} min-w-36 py-2`}>
        <option value="">Scegli...</option>
        {(blank.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }
  return <input value={value || ''} onChange={(event) => onChange(event.target.value)} disabled={disabled} className={`${inputClass} min-w-36 py-2`} autoComplete="off" />;
}

function GapFill({ question, answer, onChange, select = false, disabled }) {
  const values = answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {};
  const blanks = question.content?.blanks || [];
  const parts = question.prompt.split(/(\{\{[^}]+\}\}|_{3,})/g);
  let blankIndex = 0;
  const hasMarkers = parts.some((part) => /^\{\{[^}]+\}\}$/.test(part) || /^_{3,}$/.test(part));
  const setBlank = (key, value) => onChange({ ...values, [key]: value });

  if (hasMarkers) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3 text-base font-semibold leading-8 text-ink dark:text-white">
        {parts.map((part, index) => {
          const isMarker = /^\{\{[^}]+\}\}$/.test(part) || /^_{3,}$/.test(part);
          if (!isMarker) return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
          const blank = blanks[blankIndex++];
          if (!blank) return <span key={index}>{part}</span>;
          return (
            <span key={blank.key} className="inline-flex min-w-40 max-w-full align-middle">
              <BlankInput blank={blank} value={values[blank.key]} onChange={(value) => setBlank(blank.key, value)} select={select} disabled={disabled} />
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {blanks.map((blank, index) => (
        <label key={blank.key} className="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center">
          <span className="text-sm font-black text-clay dark:text-[#f7a98d]">Spazio {index + 1}</span>
          <BlankInput blank={blank} value={values[blank.key]} onChange={(value) => setBlank(blank.key, value)} select={select} disabled={disabled} />
        </label>
      ))}
    </div>
  );
}

function TextAnswer({ question, answer, onChange, disabled }) {
  return (
    <div>
      {question.type === 'error_correction' ? <p className="mb-2 text-xs font-black text-clay dark:text-[#f7a98d]">Riscrivi tutta la frase correttamente.</p> : null}
      <textarea
        rows={question.type === 'translation' ? 3 : 2}
        value={typeof answer === 'string' ? answer : ''}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={inputClass}
        placeholder="Scrivi qui la tua risposta..."
      />
    </div>
  );
}

function reconstructTokenKeys(tokens, answer) {
  if (!Array.isArray(answer)) return [];
  const used = new Set();
  return answer.map((text) => {
    const match = tokens.find((token) => token.text === text && !used.has(token.key));
    if (!match) return null;
    used.add(match.key);
    return match.key;
  }).filter(Boolean);
}

function WordOrder({ question, answer, onChange, disabled }) {
  const tokens = question.content?.tokens || [];
  const [draggedKey, setDraggedKey] = useState(null);
  const placedKeys = useMemo(() => reconstructTokenKeys(tokens, answer), [tokens, answer]);
  const placedSet = new Set(placedKeys);
  const available = tokens.filter((token) => !placedSet.has(token.key));
  const tokenByKey = new Map(tokens.map((token) => [token.key, token]));

  const emit = (keys) => onChange(keys.map((key) => tokenByKey.get(key)?.text).filter(Boolean));
  const add = (key) => { if (!disabled && !placedSet.has(key)) emit([...placedKeys, key]); };
  const remove = (key) => { if (!disabled) emit(placedKeys.filter((item) => item !== key)); };
  const move = (key, targetIndex) => {
    if (disabled) return;
    const current = placedKeys.filter((item) => item !== key);
    current.splice(Math.max(0, Math.min(targetIndex, current.length)), 0, key);
    emit(current);
  };

  return (
    <div className="grid gap-5">
      <p className="text-xs font-bold text-ink/55 dark:text-white/55">Trascina le parole oppure toccale nell’ordine corretto.</p>
      <div className="flex min-h-14 flex-wrap gap-2 rounded-xl border border-dashed border-clay/25 bg-linen/40 p-3 dark:border-white/20 dark:bg-white/[0.04]">
        {available.map((token) => (
          <button key={token.key} type="button" draggable={!disabled} disabled={disabled}
            onDragStart={() => setDraggedKey(token.key)} onClick={() => add(token.key)}
            className="rounded-lg border border-clay/20 bg-white px-3 py-2 text-sm font-black text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-coral dark:border-white/15 dark:bg-white/10 dark:text-white">
            {token.text}
          </button>
        ))}
        {available.length === 0 ? <span className="text-sm font-semibold text-ink/45 dark:text-white/45">Tutte le parole sono nella frase.</span> : null}
      </div>
      <div className="min-h-20 rounded-xl border border-coral/25 bg-blush/55 p-3 dark:border-coral/25 dark:bg-coral/[0.08]"
        onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedKey) add(draggedKey); setDraggedKey(null); }}>
        <div className="flex flex-wrap gap-2">
          {placedKeys.map((key, index) => {
            const token = tokenByKey.get(key);
            return (
              <button key={key} type="button" draggable={!disabled} disabled={disabled}
                onDragStart={() => setDraggedKey(key)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { event.preventDefault(); if (draggedKey) move(draggedKey, index); setDraggedKey(null); }}
                onClick={() => remove(key)}
                className="rounded-lg bg-coral px-3 py-2 text-sm font-black text-white shadow-sm dark:bg-[#ff9678] dark:text-[#21140f]">
                {token?.text}
              </button>
            );
          })}
          {placedKeys.length === 0 ? <span className="text-sm font-semibold text-ink/45 dark:text-white/45">Costruisci qui la frase.</span> : null}
        </div>
      </div>
      {placedKeys.length ? <button type="button" disabled={disabled} onClick={() => emit([])} className="justify-self-start text-xs font-black text-clay underline dark:text-[#f7a98d]">Azzera frase</button> : null}
    </div>
  );
}

export default function ExerciseQuestionRenderer({
  item,
  answer,
  onChange,
  disabled = false,
  showScore = true,
  showCorrectAnswers = true,
  showExplanations = true,
}) {
  const question = item.question;
  const type = question.type;

  return (
    <article className="rounded-2xl border border-clay/15 bg-[#fffdf9] p-5 shadow-sm dark:border-white/10 dark:bg-[#211b18] sm:p-7">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blush text-coral dark:bg-coral/10 dark:text-[#ff9678]"><QuestionTypeIcon type={type} /></span>
        <div className="min-w-0 flex-1">
          {question.instructions ? <p className="mb-2 text-xs font-black uppercase tracking-wide text-clay dark:text-[#f7a98d]">{question.instructions}</p> : null}
          {type === 'content_block' ? (
            <div className="prose max-w-none text-base leading-8 text-ink dark:text-white"><p>{question.content?.body || question.prompt}</p></div>
          ) : (
            <h3 className="text-lg font-black leading-8 text-ink dark:text-white">{question.prompt}</h3>
          )}
        </div>
      </div>

      <div className="mt-5">
        {type === 'multiple_choice' ? <MultipleChoice question={question} answer={answer} onChange={onChange} disabled={disabled} /> : null}
        {type === 'multiple_select' ? <MultipleChoice question={question} answer={answer} onChange={onChange} multiple disabled={disabled} /> : null}
        {type === 'gap_fill' ? <GapFill question={question} answer={answer} onChange={onChange} disabled={disabled} /> : null}
        {type === 'select_gap' ? <GapFill question={question} answer={answer} onChange={onChange} select disabled={disabled} /> : null}
        {(type === 'translation' || type === 'error_correction') ? <TextAnswer question={question} answer={answer} onChange={onChange} disabled={disabled} /> : null}
        {type === 'word_order' ? <WordOrder question={question} answer={answer} onChange={onChange} disabled={disabled} /> : null}
        {type === 'content_block' && !disabled ? (
          <button type="button" onClick={() => onChange(true)} className={`rounded-full px-5 py-2.5 text-sm font-black ${answer ? 'bg-butter text-clay' : 'bg-coral text-white dark:bg-[#ff9678] dark:text-[#21140f]'}`}>{answer ? 'Letto' : 'Ho capito, continua'}</button>
        ) : null}
      </div>

      <ResultPanel result={item.result} showScore={showScore} showCorrectAnswers={showCorrectAnswers} showExplanations={showExplanations} />
    </article>
  );
}
