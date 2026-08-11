import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Globe2,
  Lightbulb,
  ListChecks,
  MessageCircleMore,
  Mic2,
  Quote,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';

export const EDITORIAL_BLOCK_TYPES = Object.freeze([
  ['explanation', 'Spiegazione'],
  ['rule', 'Regola'],
  ['examples', 'Esempi'],
  ['contrast', 'Confronto'],
  ['common_error', 'Errore comune'],
  ['recap', 'In breve'],
  ['note', 'Nota'],
  ['pattern', 'Nota il modello'],
  ['language_bank', 'Lingua utile'],
  ['vocabulary', 'Vocabolario'],
  ['useful_phrases', 'Frasi utili'],
  ['pronunciation', 'Pronuncia'],
  ['teacher_tip', 'Consiglio dell’insegnante'],
  ['warning', 'Attenzione'],
  ['culture', 'Inglese reale e cultura'],
  ['scenario', 'Scenario'],
  ['reading', 'Lettura'],
  ['dialogue', 'Dialogo'],
  ['checklist', 'Checklist'],
  ['reflection', 'Rifletti'],
  ['instructions', 'Istruzioni'],
  ['summary', 'Riepilogo'],
  ['section_intro', 'Apertura sezione'],
  ['section_outro', 'Chiusura sezione'],
  ['lesson_hero', 'Apertura lezione'],
]);

const PRESENTATION_ALIASES = {
  grammar_note: 'rule',
  grammar_rule: 'rule',
  notice: 'pattern',
  expressions: 'language_bank',
  language_support: 'language_bank',
  common_mistake: 'common_error',
  real_english: 'culture',
  teacher_note: 'teacher_tip',
  speaking_tip: 'teacher_tip',
  section_summary: 'summary',
};

const BLOCK_META = {
  rule: ['La regola', BookOpen],
  examples: ['Guarda gli esempi', Quote],
  contrast: ['Confronta', Sparkles],
  common_error: ['Errore comune', X],
  recap: ['In breve', Check],
  summary: ['Riepilogo', Check],
  note: ['Da ricordare', Lightbulb],
  pattern: ['Nota il modello', Sparkles],
  language_bank: ['Lingua utile', MessageCircleMore],
  vocabulary: ['Vocabolario', BookOpen],
  useful_phrases: ['Frasi utili', Quote],
  pronunciation: ['Pronuncia', Volume2],
  teacher_tip: ['Consiglio dell’insegnante', Lightbulb],
  warning: ['Attenzione', AlertTriangle],
  culture: ['Inglese reale', Globe2],
  scenario: ['Scenario', MessageCircleMore],
  reading: ['Leggi', BookOpen],
  dialogue: ['Dialogo', MessageCircleMore],
  checklist: ['Controlla', ListChecks],
  reflection: ['Rifletti', Lightbulb],
  instructions: ['Cosa fare', ListChecks],
  section_intro: ['Nuova sezione', Sparkles],
  section_outro: ['Prima di continuare', Check],
  explanation: ['Capire prima di esercitarsi', BookOpen],
};

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
  const requestedType = content.presentation || 'explanation';
  const type = PRESENTATION_ALIASES[requestedType] || requestedType;
  const heading = content.heading || prompt;
  const [defaultEyebrow, BlockIcon] = BLOCK_META[type] || BLOCK_META.explanation;
  const eyebrow = content.eyebrow || defaultEyebrow;
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
    <article className={`sblocco-teaching-block sblocco-teaching-block--${type}`} data-teaching-block={requestedType}>
      <div className="sblocco-teaching-block__header">
        <span className="sblocco-teaching-block__icon" aria-hidden="true">
          <BlockIcon />
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

      {['summary', 'checklist', 'instructions', 'language_bank', 'vocabulary', 'useful_phrases', 'pronunciation'].includes(type) && items.length ? (
        <ul className={`sblocco-teaching-list sblocco-teaching-list--${type}`}>
          {items.map((item, index) => <li key={`${item}-${index}`}>{type === 'pronunciation' ? <Mic2 aria-hidden="true" /> : <Check aria-hidden="true" />}<span>{item}</span></li>)}
        </ul>
      ) : null}
    </article>
  );
}
