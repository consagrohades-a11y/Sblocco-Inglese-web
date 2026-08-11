import React from 'react';
import { ArrowRight, BookOpen, Check, Clock3, Lightbulb, X } from 'lucide-react';

export const EDITORIAL_BLOCK_TYPES = Object.freeze([
  ['explanation', 'Spiegazione'],
  ['rule', 'Regola'],
  ['examples', 'Esempi'],
  ['contrast', 'Confronto'],
  ['common_error', 'Errore comune'],
  ['recap', 'In breve'],
  ['note', 'Nota'],
  ['lesson_hero', 'Apertura lezione'],
]);

function cleanList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  return String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);
}

export function EditorialLearningShell({ children, className = '' }) {
  return <div className={`sblocco-learning-surface ${className}`.trim()}>{children}</div>;
}

export function EditorialLessonHero({
  eyebrow = 'Impara',
  title,
  intro,
  meta = [],
  illustrationSrc = '/assets/brand/sblocco-editorial-conversation-v2.png',
  illustrationAlt = '',
  compact = false,
  actions = null,
}) {
  return (
    <header className={`sblocco-lesson-hero${compact ? ' sblocco-lesson-hero--compact' : ''}`}>
      <div className="sblocco-lesson-hero__copy">
        {eyebrow ? <p className="sblocco-learning-eyebrow">{eyebrow}</p> : null}
        <h1 className="sblocco-learning-display">{title}</h1>
        {intro ? <p className="sblocco-lesson-hero__intro">{intro}</p> : null}
        {meta.length ? (
          <div className="sblocco-lesson-meta" aria-label="Informazioni sulla lezione">
            {meta.map((item, index) => (
              <span key={`${item.label || item}-${index}`}>
                {item.icon === 'time' ? <Clock3 aria-hidden="true" /> : item.icon === 'topic' ? <BookOpen aria-hidden="true" /> : null}
                {item.label || item}
              </span>
            ))}
          </div>
        ) : null}
        {actions ? <div className="sblocco-lesson-hero__actions">{actions}</div> : null}
      </div>
      {illustrationSrc ? (
        <div className="sblocco-lesson-hero__art" aria-hidden={illustrationAlt ? undefined : 'true'}>
          <span className="sblocco-lesson-hero__shape" aria-hidden="true" />
          <img src={illustrationSrc} alt={illustrationAlt} />
        </div>
      ) : null}
    </header>
  );
}

export function EditorialContinuation({ eyebrow = 'Prossimo passo', title, body, children }) {
  return (
    <section className="sblocco-learning-continuation">
      <div>
        <p className="sblocco-learning-eyebrow">{eyebrow}</p>
        <h2 className="sblocco-learning-display">{title}</h2>
        {body ? <p>{body}</p> : null}
      </div>
      {children ? <div className="sblocco-learning-continuation__actions">{children}</div> : null}
    </section>
  );
}

export function EditorialAction({ as: Component = 'button', children, className = '', ...props }) {
  return (
    <Component className={`sblocco-learning-action focus-ring ${className}`.trim()} {...props}>
      {children}
      <ArrowRight aria-hidden="true" />
    </Component>
  );
}

export function EditorialTeachingBlock({ content = {}, prompt = '', instructions = '', body = null }) {
  const type = content.presentation || 'explanation';
  const heading = content.heading || prompt;
  const eyebrow = content.eyebrow || (
    type === 'rule' ? 'La regola' :
      type === 'examples' ? 'Guarda gli esempi' :
        type === 'contrast' ? 'Confronta' :
          type === 'common_error' ? 'Errore comune' :
            type === 'recap' ? 'In breve' :
              type === 'note' ? 'Da ricordare' :
                'Capire prima di esercitarsi'
  );
  const examples = cleanList(content.examples);
  const items = cleanList(content.items);

  if (type === 'lesson_hero') {
    return (
      <EditorialLessonHero
        eyebrow={content.eyebrow || 'Lezione'}
        title={heading || 'Prima di iniziare'}
        intro={content.body || instructions || ''}
        meta={cleanList(content.meta).map((label, index) => ({ label, icon: index === 0 ? 'time' : null }))}
        compact
      />
    );
  }

  return (
    <article className={`sblocco-teaching-block sblocco-teaching-block--${type}`}>
      <div className="sblocco-teaching-block__header">
        <span className="sblocco-teaching-block__icon" aria-hidden="true">
          {type === 'common_error' ? <X /> : type === 'recap' ? <Check /> : type === 'note' ? <Lightbulb /> : <BookOpen />}
        </span>
        <div>
          <p className="sblocco-learning-eyebrow">{eyebrow}</p>
          {heading ? <h2 className="sblocco-learning-display">{heading}</h2> : null}
          {instructions ? <p className="sblocco-teaching-block__instructions">{instructions}</p> : null}
        </div>
      </div>

      {body || content.body ? <div className="sblocco-teaching-block__body">{body || content.body}</div> : null}

      {type === 'examples' && examples.length ? (
        <div className="sblocco-teaching-examples">
          {examples.map((example, index) => <p key={`${example}-${index}`}>{example}</p>)}
        </div>
      ) : null}

      {type === 'contrast' ? (
        <div className="sblocco-teaching-contrast">
          <div>
            <span>{content.left_label || 'Prima'}</span>
            <p>{content.left_body || ''}</p>
          </div>
          <div>
            <span>{content.right_label || 'Poi'}</span>
            <p>{content.right_body || ''}</p>
          </div>
        </div>
      ) : null}

      {type === 'common_error' ? (
        <div className="sblocco-teaching-error-pair">
          {content.wrong ? <p className="sblocco-teaching-error-pair__wrong"><X aria-hidden="true" />{content.wrong}</p> : null}
          {content.correct ? <p className="sblocco-teaching-error-pair__correct"><Check aria-hidden="true" />{content.correct}</p> : null}
        </div>
      ) : null}

      {type === 'recap' && items.length ? (
        <ul className="sblocco-teaching-recap">
          {items.map((item, index) => <li key={`${item}-${index}`}><Check aria-hidden="true" />{item}</li>)}
        </ul>
      ) : null}
    </article>
  );
}
