import React, { useMemo, useState } from 'react';

const inputClass = 'w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-base font-semibold text-ink outline-none transition focus:border-moss focus:ring-4 focus:ring-mint/35 dark:border-white/20 dark:bg-[#101a17] dark:text-white dark:focus:border-emerald-300 dark:focus:ring-emerald-400/15';

function resultClasses(status) {
  if (status === 'correct') return 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-300/30 dark:bg-emerald-400/10 dark:text-emerald-100';
  if (status === 'nearly_correct') return 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-amber-100';
  if (status === 'unanswered') return 'border-slate-300 bg-slate-50 text-slate-800 dark:border-white/15 dark:bg-white/[0.06] dark:text-white/70';
  return 'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-300/30 dark:bg-rose-400/10 dark:text-rose-100';
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

  return (
    <div className={`mt-5 rounded-xl border p-4 ${resultClasses(result.status)}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-black">{label}</p>
        {showScore ? <p className="text-xs font-black">{Number(result.earned_points || 0).toFixed(1)} / {Number(result.max_points || 0).toFixed(1)} punti</p> : null}
      </div>
      {showCorrectAnswers && result.correct_answer !== null && result.correct_answer !== undefined ? (
        <div className="mt-3 text-sm leading-6">
          <span className="font-black">Risposta accettata: </span>
          <span>{typeof result.correct_answer === 'string' ? result.correct_answer : JSON.stringify(result.correct_answer)}</span>
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
      {(question.content?.options || []).map((option) => {
        const checked = multiple ? selected.includes(option.key) : selected === option.key;
        return (
          <label key={option.key} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${checked ? 'border-moss bg-mint/35 dark:border-emerald-300/40 dark:bg-emerald-400/15' : 'border-ink/10 bg-white hover:bg-linen/50 dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/10'} ${disabled ? 'cursor-default opacity-80' : ''}`}>
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
              className="h-4 w-4 shrink-0"
            />
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
          <span className="text-sm font-black text-ink/65 dark:text-white/65">Spazio {index + 1}</span>
          <BlankInput blank={blank} value={values[blank.key]} onChange={(value) => setBlank(blank.key, value)} select={select} disabled={disabled} />
        </label>
      ))}
    </div>
  );
}

function TextAnswer({ question, answer, onChange, disabled }) {
  return (
    <div>
      {question.type === 'error_correction' ? <p className="mb-2 text-xs font-black text-moss dark:text-emerald-300">Riscrivi tutta la frase correttamente.</p> : null}
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
      <div className="flex min-h-14 flex-wrap gap-2 rounded-xl border border-dashed border-ink/20 bg-linen/40 p-3 dark:border-white/20 dark:bg-white/[0.04]">
        {available.map((token) => (
          <button key={token.key} type="button" draggable={!disabled} disabled={disabled}
            onDragStart={() => setDraggedKey(token.key)} onClick={() => add(token.key)}
            className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-black text-ink shadow-sm transition hover:-translate-y-0.5 dark:border-white/15 dark:bg-white/10 dark:text-white">
            {token.text}
          </button>
        ))}
        {available.length === 0 ? <span className="text-sm font-semibold text-ink/45 dark:text-white/45">Tutte le parole sono nella frase.</span> : null}
      </div>
      <div className="min-h-20 rounded-xl border border-moss/25 bg-mint/20 p-3 dark:border-emerald-300/25 dark:bg-emerald-400/[0.08]"
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
                className="rounded-lg bg-ink px-3 py-2 text-sm font-black text-white shadow-sm dark:bg-emerald-300 dark:text-[#102019]">
                {token?.text}
              </button>
            );
          })}
          {placedKeys.length === 0 ? <span className="text-sm font-semibold text-ink/45 dark:text-white/45">Costruisci qui la frase.</span> : null}
        </div>
      </div>
      {placedKeys.length ? <button type="button" disabled={disabled} onClick={() => emit([])} className="justify-self-start text-xs font-black text-moss underline dark:text-emerald-300">Azzera frase</button> : null}
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
    <article className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7">
      {question.instructions ? <p className="mb-3 text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">{question.instructions}</p> : null}
      {type === 'content_block' ? (
        <div className="prose max-w-none text-base leading-8 text-ink dark:text-white"><p>{question.content?.body || question.prompt}</p></div>
      ) : (
        <h3 className="text-lg font-black leading-8 text-ink dark:text-white">{question.prompt}</h3>
      )}

      <div className="mt-5">
        {type === 'multiple_choice' ? <MultipleChoice question={question} answer={answer} onChange={onChange} disabled={disabled} /> : null}
        {type === 'multiple_select' ? <MultipleChoice question={question} answer={answer} onChange={onChange} multiple disabled={disabled} /> : null}
        {type === 'gap_fill' ? <GapFill question={question} answer={answer} onChange={onChange} disabled={disabled} /> : null}
        {type === 'select_gap' ? <GapFill question={question} answer={answer} onChange={onChange} select disabled={disabled} /> : null}
        {(type === 'translation' || type === 'error_correction') ? <TextAnswer question={question} answer={answer} onChange={onChange} disabled={disabled} /> : null}
        {type === 'word_order' ? <WordOrder question={question} answer={answer} onChange={onChange} disabled={disabled} /> : null}
        {type === 'content_block' && !disabled ? (
          <button type="button" onClick={() => onChange(true)} className={`rounded-full px-5 py-2.5 text-sm font-black ${answer ? 'bg-mint text-moss' : 'bg-ink text-white'}`}>{answer ? 'Letto' : 'Ho capito, continua'}</button>
        ) : null}
      </div>

      <ResultPanel result={item.result} showScore={showScore} showCorrectAnswers={showCorrectAnswers} showExplanations={showExplanations} />
    </article>
  );
}
