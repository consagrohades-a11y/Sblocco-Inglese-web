import React from 'react';
import {
  ArrowDown,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CircleHelp,
  GitCompareArrows,
  Lightbulb,
  MessageCircleQuestion,
  Mic2,
  RefreshCcw,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
  Wrench,
} from 'lucide-react';
import { interviewOffers, interviewPrivateSimulation, formatInterviewPrice } from '../../config/interviewProducts.js';

export function scrollInterviewTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function InterviewHero() {
  return (
    <header className="interview-hero">
      <div className="interview-shell interview-hero__layout">
        <div className="interview-hero__copy">
          <p className="interview-eyebrow">SBLOCCO COLLOQUIO</p>
          <h1>Preparati al colloquio in inglese prima che inizi davvero.</h1>
          <p className="interview-hero__lead">Costruisci risposte che sai adattare, allenati sulle domande impreviste e impara a continuare anche quando ti manca una parola.</p>
          <div className="interview-hero__product-strip" aria-label="Opzioni di preparazione">
            {interviewOffers.map((product, index) => (
              <button key={product.id} type="button" className={product.recommended ? 'is-recommended' : ''} onClick={() => scrollInterviewTo('offerte-colloquio')}>
                <span>{String(index + 1).padStart(2, '0')} · {product.badge}</span>
                <strong>{product.name}</strong>
                <em>{formatInterviewPrice(product)}</em>
              </button>
            ))}
          </div>
          <div className="interview-actions">
            <button type="button" className="interview-button interview-button--primary" onClick={() => scrollInterviewTo('offerte-colloquio')}>
              Confronta le opzioni <ArrowDown aria-hidden="true" />
            </button>
            <button type="button" className="interview-text-button" onClick={() => scrollInterviewTo('prova-colloquio')}>
              Prova una domanda <ArrowDown aria-hidden="true" />
            </button>
          </div>
          <p className="interview-hero__trust"><ShieldCheck aria-hidden="true" />Tre livelli di preparazione, pagamento unico e nessun rinnovo automatico.</p>
        </div>

        <div className="interview-hero__prompts" aria-label="Esempi di domande e strategie da colloquio">
          <p className="interview-prompt interview-prompt--one"><span>01</span>Tell me about yourself.</p>
          <p className="interview-prompt interview-prompt--two"><span>02</span>What would you do if…?</p>
          <p className="interview-prompt interview-prompt--three"><span>03</span>Can you walk me through your reasoning?</p>
          <p className="interview-prompt interview-prompt--answer"><span>↳</span>Give me a moment to think.</p>
          <div className="interview-hero__annotation" aria-hidden="true">
            <span />
            <strong>Non uno script.</strong>
            <small>Una risposta che sai costruire, adattare e sostenere.</small>
          </div>
        </div>
      </div>
    </header>
  );
}

const painPoints = [
  ['Sai cosa vuoi dire. Non riesci a dirlo abbastanza velocemente.', 'Inizi a tradurre nella testa e la risposta diventa più lenta e meno convincente.'],
  ['Hai preparato le domande classiche. Poi arriva quella che non avevi previsto.', 'Lo script imparato a memoria smette improvvisamente di aiutarti.'],
  ['Il tuo lavoro è tecnico.', 'Potresti dover analizzare un caso, risolvere un problema o difendere una decisione in inglese.'],
  ['Ti manca una parola e perdi il filo.', 'Una sola espressione mancante non dovrebbe distruggere tutta la risposta.'],
];

export function InterviewPainPoints() {
  return (
    <section className="interview-section interview-pain" aria-labelledby="interview-pain-title">
      <div className="interview-shell">
        <div className="interview-heading interview-heading--wide">
          <p className="interview-eyebrow">QUANDO L’INGLESE NON BASTA</p>
          <h2 id="interview-pain-title">Il problema spesso non è il tuo inglese.</h2>
          <p>È riuscire a usarlo mentre devi pensare, scegliere cosa dire e reagire a una persona reale.</p>
        </div>
        <ol className="interview-pain__list">
          {painPoints.map(([title, copy], index) => (
            <li key={title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const technicalSituations = [
  'spiegare come affronteresti un problema',
  'commentare dati o risultati',
  'giustificare una scelta',
  'confrontare due possibili soluzioni',
  'chiedere chiarimenti prima di rispondere',
  'pensare ad alta voce',
  'dire professionalmente che non conosci una risposta',
  'correggerti senza perdere sicurezza',
];

export function TechnicalInterviewSection() {
  return (
    <section className="interview-section interview-technical" aria-labelledby="interview-technical-title">
      <div className="interview-shell interview-technical__layout">
        <div className="interview-technical__intro">
          <p className="interview-eyebrow">OLTRE LE DOMANDE HR</p>
          <h2 id="interview-technical-title">Un colloquio non è sempre <em>“Tell me about yourself”.</em></h2>
          <p>Per molti ruoli può includere casi pratici, domande tecniche, esercizi, presentazioni, problem solving o richieste di spiegare il proprio ragionamento.</p>
        </div>
        <ul className="interview-technical__list">
          {technicalSituations.map((item) => <li key={item}><ArrowRight aria-hidden="true" />{item}</li>)}
        </ul>
        <div className="interview-technical__statement">
          <Wrench aria-hidden="true" />
          <p><strong>Sblocco Colloquio non ti insegna il contenuto tecnico del tuo lavoro.</strong><span>Ti insegna a gestirlo in inglese.</span></p>
        </div>
      </div>
    </section>
  );
}

const modules = [
  { number: '01', title: 'Presentarti', icon: Mic2, items: ['Tell me about yourself', 'percorso e ruolo attuale', 'versioni brevi e lunghe'] },
  { number: '02', title: 'Parlare della tua esperienza', icon: BriefcaseBusiness, items: ['responsabilità e progetti', 'risultati e numeri', 'decisioni e impatto'] },
  { number: '03', title: 'Behavioral questions', icon: UsersRound, items: ['conflitti e collaborazione', 'errori e leadership', 'STAR senza sembrare robotici'] },
  { number: '04', title: 'Motivazione', icon: Target, items: ['Why this role?', 'Why this company?', 'cambiamento e career goals'] },
  { number: '05', title: 'Domande difficili', icon: CircleHelp, items: ['weaknesses e gaps', 'salary e poca esperienza', 'failures, criticism, pressure'] },
  { number: '06', title: 'Colloquio tecnico o pratico', icon: Wrench, items: ['ragionare e chiedere chiarimenti', 'assunzioni e alternative', 'vantaggi, limiti e processi'] },
  { number: '07', title: 'Quando qualcosa va storto', icon: RefreshCcw, items: ['non hai capito', 'ti manca una parola', 'devi pensare o riformulare'] },
  { number: '08', title: 'Mock interview', icon: MessageCircleQuestion, items: ['sequenze realistiche', 'follow-up e pressione', 'risposte non prevedibili'] },
];

export function InterviewModules() {
  return (
    <section className="interview-section interview-modules" aria-labelledby="interview-modules-title">
      <div className="interview-shell interview-modules__layout">
        <div className="interview-heading interview-modules__heading">
          <p className="interview-eyebrow">IL PERCORSO</p>
          <h2 id="interview-modules-title">Non solo domande. Le situazioni che devi saper gestire.</h2>
          <p>Otto aree che si collegano tra loro, dalla prima presentazione al momento in cui la conversazione smette di essere prevedibile.</p>
        </div>
        <ol className="interview-modules__list">
          {modules.map(({ number, title, icon: Icon, items }) => (
            <li key={number}>
              <div className="interview-modules__marker"><span>{number}</span><Icon aria-hidden="true" /></div>
              <div>
                <h3>{title}</h3>
                <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const methodSteps = [
  ['01', Search, 'Capisci dove ti blocchi', 'Non parti da cento pagine di teoria.'],
  ['02', Mic2, 'Prova a rispondere', 'Produci prima la tua risposta.'],
  ['03', Lightbulb, 'Migliora struttura e lingua', 'Confronti, sistemi e aggiungi espressioni utili.'],
  ['04', RefreshCcw, 'Ripeti sotto pressione', 'Finché la risposta non dipende più da uno script.'],
];

export function InterviewMethod() {
  return (
    <section className="interview-section interview-method" aria-labelledby="interview-method-title">
      <div className="interview-shell">
        <div className="interview-heading interview-heading--center">
          <p className="interview-eyebrow">IL METODO SBLOCCO</p>
          <h2 id="interview-method-title">Come funziona</h2>
        </div>
        <ol className="interview-method__steps">
          {methodSteps.map(([number, Icon, title, copy]) => (
            <li key={number}>
              <div><span>{number}</span><Icon aria-hidden="true" /></div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const traditional = ['lista di domande', 'risposta modello', 'memorizzazione', '“frasi perfette”'];
const sblocco = ['domanda e primo tentativo', 'struttura e lingua utile', 'nuovo tentativo e variazioni', 'follow-up e recupero'];

export function InterviewDifference() {
  return (
    <section className="interview-section interview-difference" aria-labelledby="interview-difference-title">
      <div className="interview-shell">
        <div className="interview-heading interview-heading--center">
          <p className="interview-eyebrow">LA DIFFERENZA</p>
          <h2 id="interview-difference-title">Non prepariamo una risposta perfetta. <em>Prepariamo te.</em></h2>
        </div>
        <div className="interview-difference__comparison">
          <div>
            <p>PREPARAZIONE TRADIZIONALE</p>
            <ul>{traditional.map((item) => <li key={item}><span>×</span>{item}</li>)}</ul>
          </div>
          <GitCompareArrows aria-hidden="true" />
          <div>
            <p>APPROCCIO SBLOCCO</p>
            <ul>{sblocco.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul>
          </div>
        </div>
        <p className="interview-difference__close">Perché l’intervistatore non seguirà il tuo copione.</p>
      </div>
    </section>
  );
}

export function InterviewPrivateUpsell() {
  const product = interviewPrivateSimulation;
  return (
    <section className="interview-section interview-private" aria-labelledby="interview-private-title">
      <div className="interview-shell interview-private__layout">
        <div>
          <p className="interview-eyebrow">SUPPORTO PREMIUM, SE TI SERVE</p>
          <h2 id="interview-private-title">Vuoi testarti con una persona reale?</h2>
          <p>Se vuoi una simulazione privata con feedback personalizzato, puoi aggiungerla alla preparazione.</p>
        </div>
        <div className="interview-private__details">
          <div><span>{product.name}</span><strong>{formatInterviewPrice(product)}</strong></div>
          <ul>{product.includes.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul>
          <button type="button" className="interview-button interview-button--outline" onClick={() => scrollInterviewTo('richiesta-colloquio')}>
            {product.cta} <ArrowDown aria-hidden="true" />
          </button>
          <small>Disponibilità limitata. La richiesta non comporta pagamento o prenotazione automatica.</small>
        </div>
      </div>
    </section>
  );
}

export function InterviewFinalCTA() {
  return (
    <section className="interview-final" aria-labelledby="interview-final-title">
      <div className="interview-shell interview-final__inner">
        <Sparkles aria-hidden="true" />
        <p className="interview-eyebrow">PRIMA CHE CONTI DAVVERO</p>
        <h2 id="interview-final-title">Il giorno del colloquio non puoi premere <em>“riprova”.</em></h2>
        <p>Fallo qui, prima.</p>
        <div className="interview-actions interview-actions--center">
          <button type="button" className="interview-button interview-button--primary" onClick={() => scrollInterviewTo('offerte-colloquio')}>Inizia ad allenarti <ArrowDown aria-hidden="true" /></button>
          <button type="button" className="interview-text-button interview-text-button--light" onClick={() => scrollInterviewTo('offerte-colloquio')}>Confronta le opzioni <Route aria-hidden="true" /></button>
        </div>
      </div>
    </section>
  );
}
