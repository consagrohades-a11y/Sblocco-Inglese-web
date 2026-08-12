import React from 'react';
import {
  ArrowRightLeft,
  BookOpen,
  CircleAlert,
  Languages,
  Lightbulb,
  ListChecks,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { normalizeEducationalContentBlock } from '../../lib/educationalContentBlock.js';
import SafeTeachingContent from './SafeTeachingContent.jsx';
import '../../styles/educationalContentBlock.css';

const sectionMeta = {
  rule: { label: 'Regola', icon: BookOpen },
  example: { label: 'Esempio', icon: Sparkles },
  mistake: { label: 'Attenzione', icon: CircleAlert },
  comparison: { label: 'Confronta', icon: ArrowRightLeft },
  tip: { label: 'Suggerimento', icon: Lightbulb },
  pattern: { label: 'Schema', icon: Languages },
  dialogue: { label: 'Nel contesto', icon: MessageCircle },
  vocabulary: { label: 'Parole utili', icon: Languages },
  recap: { label: 'Da ricordare', icon: ListChecks },
};

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function HighlightedText({ text, highlight = [] }) {
  const phrases = [...new Set((highlight || []).map((item) => String(item || '').trim()).filter(Boolean))]
    .sort((a, b) => b.length - a.length);
  if (!phrases.length) return <>{text}</>;

  const regex = new RegExp(`(${phrases.map(escapeRegExp).join('|')})`, 'gi');
  const lookup = new Set(phrases.map((phrase) => phrase.toLocaleLowerCase()));
  return <>{String(text || '').split(regex).map((part, index) => lookup.has(part.toLocaleLowerCase())
    ? <mark key={`${part}-${index}`} className="educational-content__highlight">{part}</mark>
    : <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>)}</>;
}

function ExampleLine({ example, status = null }) {
  if (!example?.text) return null;
  return (
    <div className={`educational-content__example ${status ? `is-${status}` : ''}`}>
      {status ? <span className="educational-content__example-status">{status === 'correct' ? 'Corretto' : 'Da evitare'}</span> : null}
      {example.label ? <span className="educational-content__example-label">{example.label}</span> : null}
      <p><HighlightedText text={example.text} highlight={example.highlight} /></p>
      {example.translation ? <p className="educational-content__translation">{example.translation}</p> : null}
    </div>
  );
}

function SectionHeading({ section }) {
  const meta = sectionMeta[section.type] || sectionMeta.rule;
  const Icon = meta.icon;
  return (
    <div className="educational-content__section-heading">
      <span className="educational-content__section-icon" aria-hidden="true"><Icon /></span>
      <div>
        <p className="educational-content__eyebrow">{meta.label}</p>
        {section.title ? <h3>{section.title}</h3> : null}
      </div>
    </div>
  );
}

function RuleLikeSection({ section }) {
  return (
    <section className={`educational-content__section is-${section.type}`}>
      <SectionHeading section={section} />
      {section.body ? <div className="educational-content__body"><SafeTeachingContent>{section.body}</SafeTeachingContent></div> : null}
      {section.pattern ? <div className="educational-content__pattern"><code>{section.pattern}</code></div> : null}
      {section.examples.length ? <div className="educational-content__examples">{section.examples.map((example, index) => <ExampleLine key={`${section.key}-example-${index}`} example={example} />)}</div> : null}
    </section>
  );
}

function ComparisonSection({ section }) {
  return (
    <section className={`educational-content__section is-${section.type}`}>
      <SectionHeading section={section} />
      {section.body ? <div className="educational-content__body"><SafeTeachingContent>{section.body}</SafeTeachingContent></div> : null}
      <div className="educational-content__comparison">
        <ExampleLine example={section.correct} status="correct" />
        <ExampleLine example={section.incorrect} status="incorrect" />
      </div>
      {section.examples.length ? <div className="educational-content__examples">{section.examples.map((example, index) => <ExampleLine key={`${section.key}-example-${index}`} example={example} />)}</div> : null}
    </section>
  );
}

function DialogueSection({ section }) {
  return (
    <section className="educational-content__section is-dialogue">
      <SectionHeading section={section} />
      {section.body ? <div className="educational-content__body"><SafeTeachingContent>{section.body}</SafeTeachingContent></div> : null}
      <div className="educational-content__dialogue">{section.turns.map((turn, index) => (
        <div key={`${section.key}-turn-${index}`} className="educational-content__turn">
          <span>{turn.speaker}</span>
          <p><HighlightedText text={turn.text} highlight={turn.highlight} /></p>
        </div>
      ))}</div>
    </section>
  );
}

function VocabularySection({ section }) {
  return (
    <section className="educational-content__section is-vocabulary">
      <SectionHeading section={section} />
      {section.body ? <div className="educational-content__body"><SafeTeachingContent>{section.body}</SafeTeachingContent></div> : null}
      <div className="educational-content__vocabulary">{section.items.map((item, index) => (
        <article key={`${section.key}-item-${index}`}>
          <h4>{item.term}</h4>
          {item.meaning ? <p>{item.meaning}</p> : null}
          {item.translation ? <p className="educational-content__translation">{item.translation}</p> : null}
          {item.example ? <div className="educational-content__vocab-example"><HighlightedText text={item.example} highlight={item.highlight} /></div> : null}
        </article>
      ))}</div>
    </section>
  );
}

function RecapSection({ section }) {
  return (
    <section className="educational-content__section is-recap">
      <SectionHeading section={section} />
      {section.body ? <div className="educational-content__body"><SafeTeachingContent>{section.body}</SafeTeachingContent></div> : null}
      {section.points.length ? <ul className="educational-content__recap-list">{section.points.map((point) => <li key={point}>{point}</li>)}</ul> : null}
    </section>
  );
}

function StructuredSection({ section }) {
  if (['mistake', 'comparison'].includes(section.type)) return <ComparisonSection section={section} />;
  if (section.type === 'dialogue') return <DialogueSection section={section} />;
  if (section.type === 'vocabulary') return <VocabularySection section={section} />;
  if (section.type === 'recap') return <RecapSection section={section} />;
  return <RuleLikeSection section={section} />;
}

export default function EducationalContentBlock({ content, fallback = '' }) {
  const normalized = normalizeEducationalContentBlock(content, fallback);

  if (!normalized.structured) {
    return (
      <article className="exercise-reading">
        <div className="exercise-reading__passage"><SafeTeachingContent>{normalized.body || fallback}</SafeTeachingContent></div>
      </article>
    );
  }

  return (
    <article className={`educational-content educational-content--${normalized.variant}`}>
      {normalized.intro ? <div className="educational-content__intro"><SafeTeachingContent>{normalized.intro}</SafeTeachingContent></div> : null}
      <div className="educational-content__sections">{normalized.sections.map((section) => <StructuredSection key={section.key} section={section} />)}</div>
    </article>
  );
}
