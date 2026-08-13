import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ListChecks,
  Sparkles,
  Target,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandLogo from '../BrandLogo.jsx';
import ThemeToggle from '../ThemeToggle.jsx';
import { RECOVERY_TOPICS } from '../../config/recovery.js';
import {
  formatRecoveryDuration,
  RECOVERY_PROGRAMME_CATEGORIES,
  RECOVERY_PROGRAMME_CONFIDENCE,
  recoveryExamWindowFeedback,
  summarizeRecoveryDiagnostic,
  SUPPORTED_RECOVERY_CLASS_YEARS,
  TYPICAL_RECOVERY_TOPICS_BY_YEAR,
} from '../../lib/recoveryOnboarding.js';
import { recoverySessionDisplayTitle, recoverySessionKind } from '../../lib/recoveryPresentation.js';

const TOTAL_SETUP_STEPS = 6;

const PROGRAMME_CONFIDENCE_OPTIONS = [
  {
    value: RECOVERY_PROGRAMME_CONFIDENCE.FOLLOWING,
    label: 'Sì, lo sto seguendo',
    description: 'Le selezioni corrispondono al programma consegnato dalla scuola.',
  },
  {
    value: RECOVERY_PROGRAMME_CONFIDENCE.PARTIAL,
    label: 'Più o meno',
    description: 'Hai alcune indicazioni, ma il programma potrebbe non essere completo.',
  },
  {
    value: RECOVERY_PROGRAMME_CONFIDENCE.MISSING,
    label: 'No, non ce l’ho',
    description: 'Partiremo dal programma tipico della classe e potrai modificarlo dopo.',
  },
];

function RecoveryOnboardingProgress({ step }) {
  const displayStep = Math.min(TOTAL_SETUP_STEPS, Math.max(1, step + 1));
  const percent = step <= 0 ? 8 : Math.round((displayStep / TOTAL_SETUP_STEPS) * 100);
  return (
    <div className="recovery-onboarding-progress-wrap">
      <div className="recovery-onboarding-progress-copy">
        <span>Costruzione del piano</span>
        <span>{step === 0 ? 'Inizio' : `${displayStep} di ${TOTAL_SETUP_STEPS}`}</span>
      </div>
      <div
        className="recovery-onboarding-progress"
        role="progressbar"
        aria-label="Avanzamento della configurazione"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={percent}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function RecoveryOnboardingShell({ step, children }) {
  return (
    <div className="learner-editorial recovery-onboarding-page">
      <header className="recovery-onboarding-header">
        <div className="recovery-onboarding-header__inner">
          <BrandLogo to="/dashboard" compact />
          <ThemeToggle />
        </div>
      </header>
      <main className="recovery-onboarding-shell">
        <RecoveryOnboardingProgress step={step} />
        {children}
      </main>
    </div>
  );
}

export function OnboardingStepCard({ eyebrow, title, support, children, actions, liveMessage }) {
  return (
    <section className="recovery-onboarding-step" aria-labelledby="recovery-onboarding-title">
      <div className="recovery-onboarding-step__heading">
        {eyebrow ? <p className="learner-kicker">{eyebrow}</p> : null}
        <h1 id="recovery-onboarding-title" className="learner-display">{title}</h1>
        {support ? <p>{support}</p> : null}
      </div>
      <div className="recovery-onboarding-step__body">{children}</div>
      {liveMessage ? <p className="recovery-onboarding-live" role="status" aria-live="polite">{liveMessage}</p> : null}
      {actions ? <div className="recovery-onboarding-actions">{actions}</div> : null}
    </section>
  );
}

export function RecoveryStepActions({ onBack, onNext, nextLabel = 'Continua', nextDisabled = false, nextType = 'button' }) {
  return (
    <>
      {onBack ? (
        <button type="button" className="recovery-onboarding-back focus-ring" onClick={onBack}>
          <ArrowLeft aria-hidden="true" /> Indietro
        </button>
      ) : <span />}
      <button type={nextType} className="learner-primary-button focus-ring" onClick={onNext} disabled={nextDisabled}>
        {nextLabel} <ArrowRight aria-hidden="true" />
      </button>
    </>
  );
}

export function WelcomeStep({ onNext }) {
  return (
    <OnboardingStepCard
      eyebrow="Recupero Debito Inglese"
      title="Costruiamo il tuo piano per il debito."
      support="Ti facciamo poche domande per capire cosa devi preparare e distribuire bene il lavoro."
      actions={<RecoveryStepActions onNext={onNext} nextLabel="Inizia" />}
    >
      <div className="recovery-onboarding-note"><Clock3 aria-hidden="true" /><span>Ci vogliono circa 3 minuti.</span></div>
    </OnboardingStepCard>
  );
}

export function ClassYearStep({ value, onChange, onBack, onNext }) {
  return (
    <OnboardingStepCard
      eyebrow="La tua situazione"
      title="Che classe fai?"
      support="Mostriamo soltanto gli anni per cui il percorso è già completo."
      actions={<RecoveryStepActions onBack={onBack} onNext={onNext} nextDisabled={!value} />}
      liveMessage={value ? `${value}ª superiore selezionata.` : ''}
    >
      <div className="recovery-year-options" role="radiogroup" aria-label="Classe frequentata">
        {SUPPORTED_RECOVERY_CLASS_YEARS.map((year) => {
          const selected = value === String(year);
          return (
            <button
              key={year}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`recovery-year-option focus-ring ${selected ? 'is-selected' : ''}`}
              onClick={() => onChange(String(year))}
            >
              <span>{year}ª</span>
              <small>superiore</small>
              <CheckCircle2 aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </OnboardingStepCard>
  );
}

export function ExamDateStep({ value, onChange, onBack, onNext, now }) {
  const feedback = recoveryExamWindowFeedback(value, now);
  return (
    <OnboardingStepCard
      eyebrow="Il tempo disponibile"
      title="Quando hai la prova?"
      support="La data ci serve per distribuire le sessioni, non per metterti fretta."
      actions={<RecoveryStepActions onBack={onBack} onNext={onNext} nextDisabled={!value || (feedback?.days ?? -1) < 0} />}
    >
      <label className="recovery-date-field" htmlFor="recovery-onboarding-exam-date">
        <span>Data della prova</span>
        <span className="recovery-date-field__control"><CalendarDays aria-hidden="true" /><input id="recovery-onboarding-exam-date" type="date" min={new Date().toISOString().slice(0, 10)} value={value} onChange={(event) => onChange(event.target.value)} /></span>
      </label>
      {feedback ? (
        <div className="recovery-date-feedback" role="status">
          <strong>{feedback.countCopy}</strong>
          <p>{feedback.supportCopy}</p>
        </div>
      ) : null}
    </OnboardingStepCard>
  );
}

function ProgrammeCategory({ category, selectedKeys, classYear, onToggle, onToggleAll }) {
  const [open, setOpen] = useState(false);
  const topics = category.topicKeys
    .map((topicKey) => RECOVERY_TOPICS.find((topic) => topic.key === topicKey))
    .filter(Boolean);
  const selectedCount = topics.filter((topic) => selectedKeys.includes(topic.key)).length;
  const allSelected = topics.length > 0 && selectedCount === topics.length;
  const typicalKeys = TYPICAL_RECOVERY_TOPICS_BY_YEAR[Number(classYear)] || [];
  return (
    <article className={`recovery-programme-category ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="recovery-programme-category__toggle focus-ring"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span><strong>{category.label}</strong><small>{category.description}</small></span>
        <span className="recovery-programme-category__count">{selectedCount}/{topics.length}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open ? (
        <div className="recovery-programme-category__topics">
          <div className="recovery-programme-category__bulk">
            <span>{allSelected ? 'Categoria completa' : `${topics.length - selectedCount} ancora da selezionare`}</span>
            <button
              type="button"
              className="focus-ring"
              onClick={() => onToggleAll(topics.map((topic) => topic.key), !allSelected)}
            >
              {allSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
            </button>
          </div>
          {topics.map((topic) => {
            const selected = selectedKeys.includes(topic.key);
            const typical = typicalKeys.includes(topic.key);
            return (
              <label key={topic.key} className={`recovery-topic-option ${selected ? 'is-selected' : ''}`}>
                <input type="checkbox" checked={selected} onChange={() => onToggle(topic.key)} />
                <span><strong>{topic.label}</strong>{typical ? <small>Tipico di {classYear}ª</small> : null}</span>
                <Check aria-hidden="true" />
              </label>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}

export function ProgrammeSelectionStep({ classYear, topicKeys, onChange, onBack, onNext }) {
  function toggleTopic(topicKey) {
    onChange(topicKeys.includes(topicKey) ? topicKeys.filter((key) => key !== topicKey) : [...topicKeys, topicKey]);
  }
  function toggleCategory(categoryKeys, shouldSelect) {
    const nextKeys = new Set(topicKeys);
    categoryKeys.forEach((key) => {
      if (shouldSelect) nextKeys.add(key);
      else nextKeys.delete(key);
    });
    onChange([...nextKeys]);
  }
  return (
    <OnboardingStepCard
      eyebrow="Il programma della scuola"
      title="Che cosa devi preparare?"
      support="Apri le categorie e seleziona ciò che compare davvero nel programma di recupero."
      actions={<RecoveryStepActions onBack={onBack} onNext={onNext} nextDisabled={!topicKeys.length} />}
      liveMessage={`${topicKeys.length} ${topicKeys.length === 1 ? 'argomento selezionato' : 'argomenti selezionati'}.`}
    >
      <div className="recovery-programme-selection-summary"><BookOpenCheck aria-hidden="true" /><strong>{topicKeys.length} {topicKeys.length === 1 ? 'argomento selezionato' : 'argomenti selezionati'}</strong><span>Il programma reale resta la guida.</span></div>
      <div className="recovery-programme-categories">
        {RECOVERY_PROGRAMME_CATEGORIES.map((category) => (
          <ProgrammeCategory
            key={category.key}
            category={category}
            selectedKeys={topicKeys}
            classYear={classYear}
            onToggle={toggleTopic}
            onToggleAll={toggleCategory}
          />
        ))}
      </div>
    </OnboardingStepCard>
  );
}

export function ProgrammeConfidenceStep({ value, onChange, onUseTypical, onBack, onNext }) {
  function selectConfidence(nextValue) {
    onChange(nextValue);
    if (nextValue === RECOVERY_PROGRAMME_CONFIDENCE.MISSING) onUseTypical();
  }
  return (
    <OnboardingStepCard
      eyebrow="Un’ultima verifica"
      title="Hai davanti il programma dato dalla scuola?"
      support="Qualunque risposta va bene. Ci serve solo per capire quanto prendere le selezioni alla lettera."
      actions={<RecoveryStepActions onBack={onBack} onNext={onNext} nextDisabled={!value} />}
    >
      <div className="recovery-confidence-options" role="radiogroup" aria-label="Disponibilità del programma scolastico">
        {PROGRAMME_CONFIDENCE_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button key={option.value} type="button" role="radio" aria-checked={selected} className={`recovery-confidence-option focus-ring ${selected ? 'is-selected' : ''}`} onClick={() => selectConfidence(option.value)}>
              <span className="recovery-confidence-option__mark">{selected ? <Check aria-hidden="true" /> : null}</span>
              <span><strong>{option.label}</strong><small>{option.description}</small></span>
            </button>
          );
        })}
      </div>
      {value === RECOVERY_PROGRAMME_CONFIDENCE.MISSING ? <p className="recovery-onboarding-reassurance">Va bene. Useremo il programma tipico della tua classe come base e potrai modificarlo dopo.</p> : null}
    </OnboardingStepCard>
  );
}

export function DiagnosticSummaryStep({ diagnostic, diagnosticAction, onBack, onSubmit, submitting, error, editMode = false }) {
  const summary = summarizeRecoveryDiagnostic(diagnostic?.topic_scores || {});
  return (
    <OnboardingStepCard
      eyebrow="Il test diagnostico"
      title={diagnostic ? (editMode ? 'Aggiorniamo il tuo piano.' : 'Ho già il risultato del tuo test.') : 'Ci serve un primo punto di partenza.'}
      support={diagnostic ? 'Lo incroceremo con il programma della scuola per decidere che cosa viene prima.' : 'Completa il test gratuito. Quando torni, riprenderemo da questo punto.'}
      actions={diagnostic ? <RecoveryStepActions onBack={onBack} onNext={onSubmit} nextLabel={submitting ? 'Costruzione in corso...' : 'Costruisci il mio piano'} nextDisabled={submitting} /> : (
        <><button type="button" className="recovery-onboarding-back focus-ring" onClick={onBack}><ArrowLeft aria-hidden="true" /> Indietro</button>{diagnosticAction || <Link to="/test-recupero-inglese" className="learner-primary-button focus-ring">Fai il test diagnostico <ArrowRight aria-hidden="true" /></Link>}</>
      )}
    >
      {diagnostic ? (
        <>
          <div className="recovery-diagnostic-summary-grid">
            <div><strong>{summary.priorities}</strong><span>priorità</span></div>
            <div><strong>{summary.consolidating}</strong><span>da consolidare</span></div>
            <div><strong>{summary.solid}</strong><span>già abbastanza solidi</span></div>
          </div>
          <p className="recovery-onboarding-reassurance"><CheckCircle2 aria-hidden="true" /> Non ti faremo rifare tutto da zero.</p>
        </>
      ) : <div className="recovery-onboarding-note"><Target aria-hidden="true" /><span>Il test resta separato: qui non duplicheremo le domande.</span></div>}
      {error ? <p className="learner-error" role="alert">{error}</p> : null}
    </OnboardingStepCard>
  );
}

export function PlanBuildingStep({ stage }) {
  const items = ['Leggo il programma', 'Incrocio il test', 'Ordino le priorità', 'Distribuisco il lavoro', 'Inserisco verifiche e simulazioni'];
  return (
    <OnboardingStepCard eyebrow="Il piano prende forma" title="Sto costruendo il tuo percorso." support="Uso il programma, il test e i giorni disponibili per ordinare il lavoro.">
      <ol className="recovery-building-list" aria-live="polite">
        {items.map((item, index) => <li key={item} className={index <= stage ? 'is-complete' : ''}><span>{index <= stage ? <Check aria-hidden="true" /> : index + 1}</span>{item}</li>)}
      </ol>
    </OnboardingStepCard>
  );
}

export function PlanRevealStep({ reveal, onStart, onViewPlan, onViewGuide }) {
  const today = reveal.today;
  const rawSessionTitle = today?.title || 'La prima sessione del tuo piano';
  const sessionTitle = recoverySessionDisplayTitle(rawSessionTitle, 'La prima sessione del tuo piano');
  const sessionKind = recoverySessionKind(rawSessionTitle, today?.session_type || today?.sessionType);
  const minutes = Number(today?.estimated_minutes || today?.estimatedMinutes || 0);
  const stages = today?.stages || [];
  return (
    <OnboardingStepCard eyebrow="Piano pronto" title="Il tuo piano è pronto." support="Da qui in poi ti mostreremo cosa fare ogni giorno.">
      <div className="recovery-plan-summary-grid">
        <div><CalendarDays aria-hidden="true" /><strong>{reveal.days}</strong><span>giorni disponibili</span></div>
        <div><ListChecks aria-hidden="true" /><strong>{reveal.sessionCount}</strong><span>sessioni</span></div>
        <div><Clock3 aria-hidden="true" /><strong>{formatRecoveryDuration(reveal.totalMinutes)}</strong><span>tempo stimato</span></div>
        <div><Target aria-hidden="true" /><strong>{reveal.priorities}</strong><span>priorità</span></div>
        <div><Sparkles aria-hidden="true" /><strong>{reveal.assessments}</strong><span>verifiche e simulazioni</span></div>
      </div>
      <article className="recovery-plan-today">
        <div className="recovery-plan-today__copy"><span>Oggi · {sessionKind}</span><h2>{sessionTitle}</h2><p>{stages[0] ? `${String(stages[0]).replaceAll('_', ' ')} · ` : ''}{minutes ? `~${minutes} min` : 'Prima attività'}</p></div>
        <button type="button" className="learner-primary-button focus-ring" onClick={onStart}>Inizia il giorno 1 <ArrowRight aria-hidden="true" /></button>
      </article>
      <div className="recovery-plan-links">
        <button type="button" className="recovery-view-plan focus-ring" onClick={onViewPlan}>Vedi il piano completo</button>
        {onViewGuide ? <button type="button" className="recovery-view-guide focus-ring" onClick={onViewGuide}>Come usare il percorso</button> : null}
      </div>
    </OnboardingStepCard>
  );
}

export function useTypicalProgramme(classYear) {
  return useMemo(() => TYPICAL_RECOVERY_TOPICS_BY_YEAR[Number(classYear)] || [], [classYear]);
}
