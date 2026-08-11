import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import {
  classifyRecoveryDiagnosticScores,
  recoveryDiagnosticQuestions,
} from '../data/recoveryDiagnostic.js';
import { submitRecoveryDiagnostic } from '../lib/recoveryApi.js';
import '../styles/learnerEditorial.css';

function ResultGroup({ title, items }) {
  return (
    <section className="learner-result-column">
      <h3>{title}</h3>
      {items.length ? (
        <ul>{items.slice(0, 5).map((item) => <li key={item.key}>{item.label} — {Math.round(item.score)}%</li>)}</ul>
      ) : <p className="learner-empty">Nessun dato in questa fascia.</p>}
    </section>
  );
}

export default function RecoveryDiagnostic() {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const question = recoveryDiagnosticQuestions[index];
  const selected = question ? answers[question.id] : null;
  const progress = result ? 100 : (index / recoveryDiagnosticQuestions.length) * 100;

  const groups = useMemo(() => classifyRecoveryDiagnosticScores(result?.topic_scores || {}), [result]);
  const recommended = useMemo(() => [
    ...groups.priority,
    ...groups.review,
    ...groups.strong,
  ].slice(0, 5), [groups]);

  async function nextQuestion() {
    if (!selected) return;
    if (index < recoveryDiagnosticQuestions.length - 1) {
      setIndex((value) => value + 1);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const saved = await submitRecoveryDiagnostic(answers);
      setResult(saved);
    } catch (submitError) {
      setError(submitError.message || 'Non è stato possibile salvare il test. Riprova.');
    } finally {
      setSubmitting(false);
    }
  }

  function previousQuestion() {
    if (index > 0) setIndex((value) => value - 1);
  }

  return (
    <div className="learner-editorial learner-diagnostic-page">
      <SEO
        title="Test Recupero Inglese | Sblocco Inglese"
        description="Un test gratuito per individuare le aree da ripassare prima della prova di recupero di inglese."
      />
      <div className="learner-shell">
        <div className="learner-diagnostic-card">
          {!started ? (
            <>
              <p className="learner-kicker">Test recupero inglese</p>
              <h1 className="learner-display">Da dove conviene <em style={{ color: 'var(--learner-orange)', fontStyle: 'normal' }}>ripartire?</em></h1>
              <p className="learner-diagnostic-card__intro">
                24 domande brevi su strutture che ricorrono spesso nei programmi delle superiori. Alla fine vedrai cosa è già abbastanza solido, cosa va ripassato e quali aree hanno la priorità.
              </p>
              <div className="learner-plan-update">
                <strong>Non è una previsione del voto.</strong> È un primo quadro di preparazione che, se poi attivi Recupero Debito Inglese, viene conservato e usato per costruire il piano.
              </div>
              <div className="learner-form-actions">
                <button type="button" className="learner-primary-button focus-ring" onClick={() => setStarted(true)}>
                  Inizia il test <ArrowRight aria-hidden="true" size={16} />
                </button>
                <Link to="/percorsi/recupero-debito" className="learner-secondary-button focus-ring">Come funziona il percorso</Link>
              </div>
            </>
          ) : result ? (
            <>
              <p className="learner-kicker">Preparazione attuale</p>
              <h1 className="learner-display">Ecco il tuo <em style={{ color: 'var(--learner-orange)', fontStyle: 'normal' }}>punto di partenza.</em></h1>
              <div className="learner-result-score"><strong>{Math.round(Number(result.overall_score || 0))}%</strong><span>nel test diagnostico</span></div>
              <div className="learner-result-columns">
                <ResultGroup title="Bene" items={groups.strong} />
                <ResultGroup title="Da ripassare" items={groups.review} />
                <ResultGroup title="Priorità" items={groups.priority} />
              </div>
              <section className="learner-form-section">
                <p className="learner-kicker">Il tuo percorso consigliato</p>
                <ol className="learner-list">
                  {recommended.map((item, itemIndex) => (
                    <li className="learner-list__row" key={item.key}>
                      <span className="learner-list__index">{itemIndex + 1}</span>
                      <div><strong>{item.label}</strong><p>{item.score < 55 ? 'Da affrontare con priorità.' : item.score < 80 ? 'Da consolidare.' : 'Ripasso rapido e verifica.'}</p></div>
                      <span className={`learner-list__status ${item.score < 55 ? 'learner-list__status--high' : ''}`}>{Math.round(item.score)}%</span>
                    </li>
                  ))}
                </ol>
              </section>
              <div className="learner-plan-update">
                <CheckCircle2 aria-hidden="true" size={16} /> Il risultato è stato salvato. Se acquisti il percorso su questo dispositivo, non dovrai rifare il test.
              </div>
              <div className="learner-form-actions">
                <Link to="/percorsi/recupero-debito#sblocca" className="learner-primary-button focus-ring">Sblocca il percorso <ArrowRight aria-hidden="true" size={16} /></Link>
                <Link to="/" className="learner-secondary-button focus-ring">Torna a Sblocco</Link>
              </div>
            </>
          ) : (
            <>
              <p className="learner-kicker">Test recupero inglese</p>
              <h1 className="learner-display">Vediamo cosa sai <em style={{ color: 'var(--learner-orange)', fontStyle: 'normal' }}>già usare.</em></h1>
              <div className="learner-diagnostic-progress" aria-label={`Domanda ${index + 1} di ${recoveryDiagnosticQuestions.length}`}>
                <span style={{ width: `${progress}%` }} />
              </div>
              <section className="learner-question" aria-live="polite">
                <p className="learner-question__count">Domanda {index + 1} di {recoveryDiagnosticQuestions.length}</p>
                <h2>{question.prompt}</h2>
                <div className="learner-question__options" role="radiogroup" aria-label="Scegli una risposta">
                  {question.options.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      role="radio"
                      aria-checked={selected === option.key}
                      className={`learner-question__option focus-ring ${selected === option.key ? 'is-selected' : ''}`}
                      onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.key }))}
                    >
                      <span>{option.key}</span><span>{option.text}</span>
                    </button>
                  ))}
                </div>
              </section>
              {error ? <p className="learner-error" role="alert">{error}</p> : null}
              <div className="learner-form-actions">
                {index > 0 ? <button type="button" className="learner-secondary-button focus-ring" onClick={previousQuestion}><ArrowLeft aria-hidden="true" size={16} /> Indietro</button> : null}
                <button type="button" className="learner-primary-button focus-ring" disabled={!selected || submitting} onClick={nextQuestion}>
                  {submitting ? 'Salvataggio...' : index === recoveryDiagnosticQuestions.length - 1 ? 'Vedi il risultato' : 'Continua'}
                  {!submitting ? <ArrowRight aria-hidden="true" size={16} /> : null}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
