import React from 'react';
import {
  BookOpen,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FilePenLine,
  Headphones,
  Keyboard,
  Languages,
  ListChecks,
  MessageCircleMore,
  Mic,
  MoveHorizontal,
  Puzzle,
  Sparkles,
} from 'lucide-react';

const TYPE_META = {
  multiple_choice: { label: 'Scegli', icon: CheckCircle2 },
  multiple_select: { label: 'Scegli più risposte', icon: ListChecks },
  gap_fill: { label: 'Completa', icon: Keyboard },
  select_gap: { label: 'Completa dal menu', icon: Puzzle },
  translation: { label: 'Traduci', icon: Languages },
  error_correction: { label: 'Correggi', icon: FilePenLine },
  word_order: { label: 'Metti in ordine', icon: MoveHorizontal },
  content_block: { label: 'Impara', icon: BookOpen },
  dialogue_choice: { label: 'Dialogo', icon: MessageCircleMore },
  written_response: { label: 'Scrivi', icon: FilePenLine },
  dialogue_roleplay: { label: 'Simulazione', icon: MessageCircleMore },
  audio_response: { label: 'Parla', icon: Mic },
  reading_comprehension: { label: 'Leggi e rispondi', icon: BookOpen },
  listening: { label: 'Ascolta', icon: Headphones },
  'multiple-choice': { label: 'Scegli', icon: CheckCircle2 },
  'gap-fill': { label: 'Completa', icon: Keyboard },
  'dialogue-gap-fill': { label: 'Dialogo', icon: MessageCircleMore },
};

const STATUS_META = {
  correct: { label: 'Corretta', icon: CheckCircle2 },
  nearly_correct: { label: 'Quasi corretta', icon: Sparkles },
  incorrect: { label: 'Da rivedere', icon: CircleAlert },
  unanswered: { label: 'Non risposta', icon: CircleAlert },
  pending_review: { label: 'In attesa di valutazione', icon: Clock3 },
};

export function getExerciseTypeMeta(type) {
  return TYPE_META[type] || { label: String(type || 'Attività').replaceAll('_', ' '), icon: Puzzle };
}

export function ExerciseCanvas({ children, className = '' }) {
  return <div className={`exercise-experience ${className}`.trim()}>{children}</div>;
}

export function ExerciseActivity({
  type,
  index,
  total,
  children,
  className = '',
  as: Component = 'article',
  ...props
}) {
  return (
    <Component className={`exercise-activity ${className}`.trim()} data-exercise-type={type || undefined} {...props}>
      {(index != null || type) ? (
        <div className="exercise-activity__meta">
          {index != null ? <span>Attività {index}{total ? ` di ${total}` : ''}</span> : <span />}
          {type ? <ExerciseTypeBadge type={type} /> : null}
        </div>
      ) : null}
      {children}
    </Component>
  );
}

export function ExerciseTypeBadge({ type }) {
  const meta = getExerciseTypeMeta(type);
  const Icon = meta.icon;
  return (
    <span className="exercise-type-badge">
      <Icon aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function ExercisePrompt({ type, prompt, instructions }) {
  const meta = getExerciseTypeMeta(type);
  const Icon = meta.icon;
  if (!prompt && !instructions) return null;
  return (
    <header className="exercise-prompt">
      <span className="exercise-prompt__icon" aria-hidden="true"><Icon /></span>
      <div>
        {prompt ? <h2>{prompt}</h2> : null}
        {instructions ? <p>{instructions}</p> : null}
      </div>
    </header>
  );
}

export function ExerciseChoice({
  selected,
  multiple = false,
  disabled,
  onClick,
  children,
  status,
  className = '',
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={`exercise-choice focus-ring ${selected ? 'is-selected' : ''} ${status ? `is-${status}` : ''} ${className}`.trim()}
    >
      <span className={`exercise-choice__control ${multiple ? 'is-multiple' : ''}`} aria-hidden="true">
        {selected ? <Check /> : null}
      </span>
      <span className="exercise-choice__text">{children}</span>
    </button>
  );
}

export function ExerciseFeedbackPanel({
  status = 'unanswered',
  title,
  children,
  className = '',
}) {
  const meta = STATUS_META[status] || STATUS_META.unanswered;
  const Icon = meta.icon;
  return (
    <aside className={`exercise-feedback exercise-feedback--${status} ${className}`.trim()} role="status">
      <div className="exercise-feedback__heading">
        <Icon aria-hidden="true" />
        <strong>{title || meta.label}</strong>
      </div>
      {children ? <div className="exercise-feedback__body">{children}</div> : null}
    </aside>
  );
}

export function ExerciseProgressHeader({
  eyebrow,
  title,
  instructions,
  progress = 0,
  sectionIndex,
  sectionTotal,
}) {
  const boundedProgress = Math.max(0, Math.min(100, progress));
  return (
    <header className="exercise-progress-header">
      <div className="exercise-progress-header__copy">
        <p className="exercise-eyebrow"><Sparkles aria-hidden="true" />{eyebrow || `Sezione ${sectionIndex} di ${sectionTotal}`}</p>
        <h1>{title}</h1>
        {instructions ? <p>{instructions}</p> : null}
      </div>
      <div className="exercise-progress-header__meter" aria-label={`Progresso ${boundedProgress}%`}>
        <small>Progresso</small>
        <span>{boundedProgress}%</span>
        <div><i style={{ width: `${boundedProgress}%` }} /></div>
      </div>
    </header>
  );
}

export function ExerciseMilestone({
  title = 'Sezione completata',
  body,
  children,
  compact = false,
}) {
  return (
    <section className={`exercise-milestone ${compact ? 'exercise-milestone--compact' : ''}`}>
      <span className="exercise-milestone__icon" aria-hidden="true"><CheckCircle2 /></span>
      <div className="exercise-milestone__copy">
        <p className="exercise-eyebrow">Un passo avanti</p>
        <h2>{title}</h2>
        {body ? <p>{body}</p> : null}
        {children ? <div className="exercise-milestone__actions">{children}</div> : null}
      </div>
    </section>
  );
}

export function ExerciseActionBar({ children, hint }) {
  const hasHint = Boolean(hint);
  return (
    <footer className="exercise-action-bar" data-has-hint={hasHint ? 'true' : 'false'}>
      <p className="exercise-action-bar__hint" aria-live="polite">
        {hasHint ? (
          <>
            <CircleAlert aria-hidden="true" />
            <span>{hint}</span>
          </>
        ) : null}
      </p>
      <div className="exercise-action-bar__actions">{children}</div>
    </footer>
  );
}
