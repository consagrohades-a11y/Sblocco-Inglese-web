import React, { useState } from 'react';
import { ArrowDown, Check, ChevronRight, Lightbulb, Mic2, RotateCcw } from 'lucide-react';
import { scrollInterviewTo } from './InterviewEditorialSections.jsx';

const answerElements = [
  'contesto',
  'cosa dovevi fare',
  'cosa hai fatto personalmente',
  'risultato',
  'perché è rilevante per il nuovo ruolo',
];

const usefulLanguage = [
  'One project I’m particularly proud of is…',
  'My main responsibility was…',
  'The biggest challenge was…',
  'What I learned from that experience was…',
];

export default function InterviewSample() {
  const [step, setStep] = useState(1);

  return (
    <section id="prova-colloquio" className="interview-section interview-sample" aria-labelledby="interview-sample-title">
      <div className="interview-shell interview-sample__layout">
        <div className="interview-heading">
          <p className="interview-eyebrow">UNA DOMANDA, DUE TENTATIVI</p>
          <h2 id="interview-sample-title">Prima prova a rispondere.</h2>
          <blockquote>Tell me about a project you’re proud of.</blockquote>
          <p>Non scrivere la risposta perfetta. Prova a dirla come se fossi già al colloquio.</p>
          <div className="interview-sample__timer"><Mic2 aria-hidden="true" /><span><strong>45–60 secondi</strong>Parla ad alta voce, senza leggere.</span></div>
        </div>

        <div className="interview-sample__workbench">
          <div className="interview-sample__progress" aria-label={`Passaggio ${step} di 3`}>
            {[1, 2, 3].map((item) => <span key={item} className={item <= step ? 'is-active' : ''}>{item}</span>)}
          </div>

          <div className="interview-sample__stage" aria-live="polite">
            {step === 1 ? (
              <div className="interview-sample__stage-inner">
                <p className="interview-sample__label">PASSAGGIO 1</p>
                <h3>Fai il primo tentativo.</h3>
                <p>Non fermarti per cercare ogni parola. Se ti blocchi, prova a spiegare la stessa idea in un altro modo.</p>
                <button type="button" className="interview-button interview-button--navy" onClick={() => setStep(2)}>Ho provato a rispondere <ChevronRight aria-hidden="true" /></button>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="interview-sample__stage-inner">
                <p className="interview-sample__label">PASSAGGIO 2</p>
                <h3>Controlla la struttura.</h3>
                <p>Hai incluso:</p>
                <ul className="interview-sample__checklist">
                  {answerElements.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}
                </ul>
                <button type="button" className="interview-button interview-button--navy" onClick={() => setStep(3)}>Vedi la lingua utile <ChevronRight aria-hidden="true" /></button>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="interview-sample__stage-inner">
                <p className="interview-sample__label">PASSAGGIO 3</p>
                <h3>Riprova con più controllo.</h3>
                <ul className="interview-sample__language">
                  {usefulLanguage.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <p className="interview-sample__principle"><Lightbulb aria-hidden="true" /><span><strong>Il principio Sblocco</strong>tentativo → struttura → lingua utile → nuovo tentativo</span></p>
                <div className="interview-sample__actions">
                  <button type="button" className="interview-button interview-button--primary" onClick={() => scrollInterviewTo('offerte-colloquio')}>Voglio allenarmi così <ArrowDown aria-hidden="true" /></button>
                  <button type="button" className="interview-reset" onClick={() => setStep(1)}><RotateCcw aria-hidden="true" />Ricomincia</button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

