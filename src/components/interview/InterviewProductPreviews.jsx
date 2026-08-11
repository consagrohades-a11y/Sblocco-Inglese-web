import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  FileText,
  Lightbulb,
  MessageSquareText,
  RefreshCcw,
  Sparkles,
} from 'lucide-react';

const previewTabs = [
  {
    id: 'question',
    label: 'Domanda',
    title: 'Tell me about a project you are proud of.',
    copy: 'Prima prova a rispondere. Non cercare la frase perfetta: scegli un esempio concreto e portalo a conclusione.',
  },
  {
    id: 'structure',
    label: 'Struttura',
    title: 'NOW · BEFORE · VALUE · NEXT',
    copy: 'Dove sei ora, da dove sei partito, quale valore hai creato e come questa esperienza si collega al ruolo.',
  },
  {
    id: 'language',
    label: 'Lingua utile',
    title: 'The main challenge was…',
    copy: 'Espressioni brevi da inserire nella tua risposta, con alternative per chiarire impatto, decisioni e risultati.',
  },
  {
    id: 'followup',
    label: 'Follow-up',
    title: 'What would you do differently now?',
    copy: 'La stessa storia cambia prospettiva. Ti alleni a riutilizzarla senza ripetere lo stesso copione.',
  },
];

export function InterviewWorkspacePreview() {
  const [activeId, setActiveId] = useState(previewTabs[0].id);
  const active = previewTabs.find((tab) => tab.id === activeId) || previewTabs[0];

  return (
    <div className="interview-product-preview" aria-label="Anteprima interattiva di Sblocco Colloquio">
      <div className="interview-product-preview__bar">
        <span>ANTEPRIMA DEL PRODOTTO</span>
        <p>Modulo 02 di 08</p>
      </div>
      <div className="interview-product-preview__progress" aria-hidden="true"><span /></div>
      <div className="interview-product-preview__body">
        <div className="interview-product-preview__workspace">
          <nav aria-label="Fasi dell’attività">
            {previewTabs.map((tab, index) => (
              <button key={tab.id} type="button" className={activeId === tab.id ? 'is-active' : ''} onClick={() => setActiveId(tab.id)}>
                <span>{String(index + 1).padStart(2, '0')}</span>{tab.label}
              </button>
            ))}
          </nav>
          <div className="interview-product-preview__task" key={active.id} aria-live="polite">
            <p>{active.label}</p>
            <h2>{active.title}</h2>
            <span>{active.copy}</span>
          </div>
          <div className="interview-answer-builder">
            {['NOW', 'BEFORE', 'VALUE', 'NEXT'].map((label, index) => (
              <div key={label} className={active.id === 'structure' && index === 2 ? 'is-highlighted' : ''}>
                <strong>{label}</strong><span>{['Ruolo e contesto', 'Situazione di partenza', 'Azione e risultato', 'Collegamento al ruolo'][index]}</span>
              </div>
            ))}
          </div>
        </div>
        <aside className="interview-file-preview">
          <div><FileText aria-hidden="true" /><span>INTERVIEW FILE</span></div>
          <h3>Project Atlas</h3>
          <dl>
            <div><dt>Situazione</dt><dd>Lancio con tempi ridotti</dd></div>
            <div><dt>Decisione</dt><dd>Nuove priorità e check settimanali</dd></div>
            <div><dt>Risultato</dt><dd>Consegna nei tempi, meno revisioni</dd></div>
          </dl>
          <p><Check aria-hidden="true" />Pronta da adattare a 4 domande</p>
        </aside>
      </div>
    </div>
  );
}

const showcaseBlocks = [
  {
    icon: MessageSquareText,
    eyebrow: '01 · PARTI DALLA DOMANDA',
    title: 'Una domanda reale, non una risposta da copiare.',
    copy: 'Capisci cosa sta cercando l’intervistatore e scegli il materiale giusto dalla tua esperienza.',
    preview: <blockquote>“Tell me about a time you had to change your approach.”<small>Che cosa vuole capire? Adattabilità, decisione e risultato.</small></blockquote>,
  },
  {
    icon: Sparkles,
    eyebrow: '02 · COSTRUISCI',
    title: 'Usa quattro punti di appoggio, non un copione.',
    copy: 'Parti da dove sei, scegli il passato rilevante, mostra il valore che hai creato e collega tutto al ruolo che vuoi.',
    preview: <div className="interview-showcase__framework">{[
      ['NOW', 'Dove sei oggi'],
      ['BEFORE', 'Il passato che conta'],
      ['VALUE', 'Azione e risultato'],
      ['NEXT', 'Il legame con il ruolo'],
    ].map(([label, description]) => <span key={label}><strong>{label}</strong><small>{description}</small></span>)}</div>,
  },
  {
    icon: Lightbulb,
    eyebrow: '03 · MIGLIORA LA LINGUA',
    title: 'Aggiungi espressioni utili nel punto in cui servono.',
    copy: 'Non studi liste isolate. Scegli modi più precisi per introdurre una sfida, motivare una scelta e mostrare impatto.',
    preview: <ul><li>The main constraint was…</li><li>I decided to prioritise…</li><li>That led to…</li></ul>,
  },
  {
    icon: RefreshCcw,
    eyebrow: '04 · VARIA E SALVA',
    title: 'Affronta il follow-up e conserva ciò che funziona.',
    copy: 'La domanda cambia, tu adatti la risposta e salvi la storia nel tuo Interview File per riutilizzarla.',
    preview: <div className="interview-showcase__followup"><span>FOLLOW-UP</span><p>What was the hardest decision you made?</p><small>Salva: Project Atlas → Decisione</small></div>,
  },
];

export function InterviewProductShowcase() {
  return (
    <section id="come-funziona-il-prodotto" className="interview-product-section interview-product-showcase" aria-labelledby="product-showcase-title">
      <div className="interview-shell">
        <div className="interview-product-heading">
          <p className="interview-eyebrow">DAL PRIMO TENTATIVO ALLA RISPOSTA CHE REGGE</p>
          <h2 id="product-showcase-title">Vedi come si costruisce una risposta.</h2>
        </div>
        <div className="interview-product-showcase__list">
          {showcaseBlocks.map(({ icon: Icon, eyebrow, title, copy, preview }, index) => (
            <article key={title} className={index % 2 ? 'is-reversed' : ''}>
              <div className="interview-product-showcase__copy"><Icon aria-hidden="true" /><p>{eyebrow}</p><h3>{title}</h3><span>{copy}</span></div>
              <div className="interview-product-showcase__preview">{preview}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const miniSteps = [
  { label: 'Domanda', title: 'Tell me about a difficult decision.', copy: 'Scegli un esempio con conseguenze reali.' },
  { label: 'Struttura', title: 'Contesto → scelta → motivo → risultato', copy: 'Quattro passaggi bastano per non perdere il filo.' },
  { label: 'Lingua', title: 'I had to weigh… against…', copy: 'Usa la struttura per confrontare due priorità.' },
  { label: 'Follow-up', title: 'How did you know it was the right decision?', copy: 'Ora sostieni la scelta con un criterio concreto.' },
];

export function InteractiveMiniPreview() {
  const [step, setStep] = useState(0);
  const current = miniSteps[step];

  return (
    <section className="interview-product-section interview-mini" aria-labelledby="interview-mini-title">
      <div className="interview-shell interview-mini__layout">
        <div className="interview-product-heading">
          <p className="interview-eyebrow">PROVA IL MECCANISMO</p>
          <h2 id="interview-mini-title">Una domanda, quattro passaggi.</h2>
          <p>Clicca per vedere come la stessa risposta prende forma e affronta un follow-up.</p>
        </div>
        <div className="interview-mini__player">
          <div className="interview-mini__topline"><span>{step + 1} / {miniSteps.length}</span><strong>{current.label}</strong></div>
          <div key={current.label} className="interview-mini__content" aria-live="polite"><h3>{current.title}</h3><p>{current.copy}</p></div>
          <div className="interview-mini__controls">
            <button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}><ChevronLeft aria-hidden="true" />Indietro</button>
            <button type="button" onClick={() => setStep((value) => (value + 1) % miniSteps.length)}>{step === miniSteps.length - 1 ? 'Ricomincia' : 'Passo successivo'}<ArrowRight aria-hidden="true" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
