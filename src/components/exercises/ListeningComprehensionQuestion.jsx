import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CircleAlert, FileText, Headphones } from 'lucide-react';
import { createExerciseListeningSignedUrl } from '../../lib/exerciseListeningApi.js';
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

function ListeningChoice({ item, value, onChange, disabled }) {
  const selected = new Set(item.type === 'multiple_select'
    ? (Array.isArray(value) ? value : [])
    : (value ? [value] : []));

  function choose(key) {
    if (item.type !== 'multiple_select') {
      onChange(key);
      return;
    }
    onChange(selected.has(key)
      ? [...selected].filter((current) => current !== key)
      : [...selected, key]);
  }

  return (
    <div className="exercise-choice-grid is-two-column">
      {(item.options || []).map((option) => (
        <ExerciseChoice
          key={option.key}
          disabled={disabled}
          selected={selected.has(option.key)}
          multiple={item.type === 'multiple_select'}
          onClick={() => choose(option.key)}
        >
          {option.text}
        </ExerciseChoice>
      ))}
    </div>
  );
}

function correctAnswerText(itemResult) {
  const value = itemResult?.correct_answer;
  if (value == null) return '';
  if (Array.isArray(value)) return value.join(' / ');
  return String(value);
}

function ListeningResult({ result, showScore, showCorrectAnswers, showExplanations, explanation }) {
  if (!result) return null;
  const status = result.status || 'unanswered';
  const perItem = Array.isArray(result.correct_answer) ? result.correct_answer : [];
  return (
    <ExerciseFeedbackPanel status={status} title={resultLabels[status] || status}>
      {showScore && result.max_points !== undefined ? (
        <p>Punti: <strong>{Number(result.earned_points || 0).toFixed(1)} / {Number(result.max_points || 0).toFixed(1)}</strong></p>
      ) : null}
      {showCorrectAnswers && perItem.length ? (
        <div className="mt-3 grid gap-2">
          {perItem.map((itemResult, index) => (
            <p key={itemResult.key || index} className="text-sm">
              <strong>Domanda {index + 1}:</strong>{' '}
              {itemResult.status === 'correct' ? 'corretta' : `risposta attesa: ${correctAnswerText(itemResult) || '—'}`}
            </p>
          ))}
        </div>
      ) : null}
      {showExplanations && explanation ? <p>{explanation}</p> : null}
    </ExerciseFeedbackPanel>
  );
}

function ListeningAudio({ audio, revealTranscript }) {
  const ref = useRef(null);
  const [signedUrl, setSignedUrl] = useState(null);
  const [error, setError] = useState('');
  const [playCount, setPlayCount] = useState(0);
  const cycleRef = useRef(false);
  const directUrl = String(audio?.url || '').trim();
  const maxPlays = Number.isInteger(Number(audio?.max_plays)) && Number(audio.max_plays) > 0
    ? Number(audio.max_plays)
    : null;

  useEffect(() => {
    let active = true;
    setError('');
    setSignedUrl(null);
    if (!audio?.storage_path) return undefined;
    createExerciseListeningSignedUrl(audio)
      .then((url) => { if (active) setSignedUrl(url); })
      .catch(() => { if (active) setError('Non è stato possibile caricare il file audio.'); });
    return () => { active = false; };
  }, [audio?.storage_bucket, audio?.storage_path]);

  const source = signedUrl || directUrl;
  const remaining = maxPlays == null ? null : Math.max(0, maxPlays - playCount);

  function handlePlay(event) {
    const element = event.currentTarget;
    const starting = element.currentTime < 0.75;
    if (!starting || cycleRef.current) return;
    if (maxPlays != null && playCount >= maxPlays) {
      element.pause();
      element.currentTime = 0;
      setError('Hai già usato tutti gli ascolti disponibili per questa attività.');
      return;
    }
    cycleRef.current = true;
    setPlayCount((current) => current + 1);
  }

  function handleEnded() {
    cycleRef.current = false;
  }

  return (
    <section className="exercise-reading">
      <div className="exercise-reading__label"><Headphones /><span>Audio</span></div>
      {audio?.title ? <h3>{audio.title}</h3> : null}
      {source ? (
        <audio
          ref={ref}
          controls
          preload="metadata"
          src={source}
          onPlay={handlePlay}
          onEnded={handleEnded}
          className="mt-4 w-full"
        />
      ) : (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-900 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />Audio non disponibile.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-ink/60 dark:text-white/60">
        {Number(audio?.duration_seconds) > 0 ? <span>Durata: ~{Math.round(Number(audio.duration_seconds))} s</span> : null}
        {remaining != null ? <span>Ascolti rimasti: {remaining}</span> : <span>Riascolto libero</span>}
      </div>
      {error ? <p className="mt-3 text-xs font-bold text-red-700 dark:text-red-300">{error}</p> : null}
      {revealTranscript && audio?.transcript ? (
        <details className="mt-5 border-t border-ink/10 pt-4 dark:border-white/10">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-black text-ink dark:text-white"><FileText className="h-4 w-4" />Trascrizione</summary>
          <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-ink/75 dark:text-white/75">{audio.transcript}</p>
        </details>
      ) : null}
    </section>
  );
}

export default function ListeningComprehensionQuestion({
  item,
  answer,
  onChange,
  disabled = false,
  showScore = false,
  showCorrectAnswers = false,
  showExplanations = false,
}) {
  const question = item?.question || {};
  const content = question.content || {};
  const audio = content.audio || {};
  const values = answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {};
  const result = item?.result || null;
  const visibility = audio.transcript_visibility || 'after_submit';
  const revealTranscript = visibility === 'always' || (visibility === 'after_submit' && (disabled || Boolean(result)));

  const items = useMemo(() => Array.isArray(content.items) ? content.items : [], [content.items]);
  function update(key, value) { onChange({ ...values, [key]: value }); }

  return (
    <div>
      <ExercisePrompt type="listening" prompt={question.prompt} instructions={question.instructions} />
      <div className="grid gap-6">
        <ListeningAudio audio={audio} revealTranscript={revealTranscript} />
        <div className="exercise-reading-questions">
          {items.map((listeningItem, index) => (
            <section key={listeningItem.key} className="exercise-reading-question">
              <p className="exercise-reading-question__meta">Domanda {index + 1} · {listeningItem.points || 1} pt</p>
              <p className="exercise-reading-question__prompt">{listeningItem.prompt}</p>
              {['multiple_choice', 'multiple_select', 'true_false'].includes(listeningItem.type) ? (
                <ListeningChoice
                  item={listeningItem}
                  value={values[listeningItem.key]}
                  onChange={(value) => update(listeningItem.key, value)}
                  disabled={disabled}
                />
              ) : (
                <input
                  value={values[listeningItem.key] || ''}
                  onChange={(event) => update(listeningItem.key, event.target.value)}
                  disabled={disabled}
                  placeholder="Scrivi una risposta breve..."
                  className="focus-ring exercise-text-field w-full px-4 py-3 text-base font-semibold"
                />
              )}
            </section>
          ))}
        </div>
      </div>
      <ListeningResult
        result={result}
        showScore={showScore}
        showCorrectAnswers={showCorrectAnswers}
        showExplanations={showExplanations}
        explanation={result?.explanation || question.feedback?.explanation}
      />
    </div>
  );
}
