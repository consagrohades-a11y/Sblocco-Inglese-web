import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  ClipboardCheck,
  FileText,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  MessageCircleQuestion,
  Mic2,
  Presentation,
  RefreshCcw,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import FAQAccordion from '../components/FAQAccordion.jsx';
import {
  InteractiveMiniPreview,
  InterviewProductShowcase,
  InterviewWorkspacePreview,
} from '../components/interview/InterviewProductPreviews.jsx';
import useInterviewPurchase from '../components/interview/useInterviewPurchase.js';
import { formatInterviewPrice, interviewOffers } from '../config/interviewProducts.js';
import { scrollInterviewTo } from '../components/interview/InterviewEditorialSections.jsx';
import '../styles/interview.css';
import '../styles/interview-product.css';

const inventory = [
  '8 moduli guidati',
  'question bank HR, behavioral e motivazionale',
  'strutture per risposte brevi e approfondite',
  'lingua utile per decisioni, risultati e problemi',
  'variazioni e follow-up',
  '3 mock interview self-guided',
  'Interview File personale',
  'checklist finale di preparazione',
];

const outcomes = [
  [Mic2, 'Risposte più chiare', 'Parti dal punto giusto e arrivi a una conclusione.'],
  [RefreshCcw, 'Meno dipendenza dallo script', 'Adatti la stessa esperienza a domande diverse.'],
  [BrainCircuit, 'Più controllo sotto pressione', 'Chiedi tempo, chiarisci e recuperi il filo.'],
  [FileText, 'Materiale davvero tuo', 'Crei un archivio di storie, risultati e frasi utili.'],
];

const fileOutputs = [
  ['Le tue storie forti', 'Progetti, decisioni, difficoltà e risultati da richiamare rapidamente.'],
  ['Le prove del tuo valore', 'Numeri, miglioramenti, feedback e impatto resi facili da spiegare.'],
  ['La lingua che ti serve', 'Espressioni scelte mentre costruisci le tue risposte.'],
  ['Le domande da fare', 'Domande finali collegate al ruolo, al team e alle priorità.'],
];

const curriculum = [
  ['01', 'Presentarti', 'Una presentazione breve e una versione più completa.'],
  ['02', 'Esperienza e risultati', 'Tre storie professionali costruite e riutilizzabili.'],
  ['03', 'Behavioral questions', 'Esempi per collaborazione, conflitto, errore e leadership.'],
  ['04', 'Motivazione', 'Risposte personali su ruolo, azienda e prossimi passi.'],
  ['05', 'Domande difficili', 'Strategie per weakness, gap, salary e poca esperienza.'],
  ['06', 'Tecnico e pratico', 'Lingua per ragionare, chiarire e confrontare soluzioni.'],
  ['07', 'Recupero', 'Frasi e tecniche quando non capisci o ti manca una parola.'],
  ['08', 'Mock interview', 'Tre sequenze complete con follow-up e revisione.'],
];

const coverage = [
  ['Il tuo profilo', ['Tell me about yourself', 'Walk me through your CV', 'What are your strengths?']],
  ['Esperienza', ['A project you are proud of', 'A difficult decision', 'A mistake and what you learned']],
  ['Motivazione', ['Why this role?', 'Why this company?', 'Why are you leaving?']],
  ['Pressione', ['An unexpected follow-up', 'A question you cannot answer', 'A request for more detail']],
];

const technicalScenarios = [
  ['Tech / Product', 'Spiega un trade-off, chiarisci i vincoli e difendi una priorità.'],
  ['Marketing / Business', 'Commenta dati, collega una scelta all’obiettivo e descrivi l’impatto.'],
  ['Problem solving', 'Fai domande, dichiara le assunzioni e ragiona ad alta voce.'],
];

const mockInterviews = [
  ['Mock 01', 'Fondamenta', 'Profilo, esperienza, motivazione e domande finali.'],
  ['Mock 02', 'Imprevisti', 'Domande difficili, follow-up e recupero quando perdi il filo.'],
  ['Mock 03', 'Ruolo e ragionamento', 'Situazione pratica, decisione, alternative e conclusione.'],
];

const method = ['PROVA', 'COSTRUISCI', 'MIGLIORA', 'VARIA', 'RIPROVA'];

const productFaqs = [
  { question: 'Che cosa acquisto esattamente?', answer: 'Un percorso digitale self-guided con otto moduli, domande, strutture, lingua utile, variazioni, mock interview e un Interview File personale. Il prezzo è una tantum e non c’è rinnovo automatico.' },
  { question: 'È già disponibile?', answer: 'Il pulsante di acquisto si attiva quando l’offerta Stripe è configurata. Se vedi “Disponibile a breve”, la pagina è consultabile ma il checkout non è ancora aperto.' },
  { question: 'Quanto tempo ho per completarlo?', answer: 'Puoi procedere al tuo ritmo. Il percorso può essere usato in modo intensivo prima di un colloquio oppure distribuito nel tempo.' },
  { question: 'Devo registrare la mia voce?', answer: 'No. Le attività ti chiedono di parlare e riprovare, ma non richiedono registrazioni o invii audio. Puoi usare le simulazioni con un insegnante separatamente.' },
  { question: 'Va bene per un colloquio tecnico?', answer: 'Sì, per la parte linguistica: impari a chiarire, spiegare processi, confrontare alternative e ragionare ad alta voce. Il prodotto non insegna la materia tecnica del tuo lavoro.' },
  { question: 'Il Kit o Complete potrebbero essere più adatti?', answer: 'Il Kit è pensato come punto di partenza essenziale. Complete aggiunge materiali e role pack quando disponibili. Puoi confrontarli nella pagina principale del colloquio.' },
];

function PurchaseButton({ checkout, label = 'Acquista Sblocco Colloquio' }) {
  if (checkout.owned) {
    return <Link className="interview-button interview-button--primary" to={checkout.accessUrl}>Vai al percorso <ArrowRight aria-hidden="true" /></Link>;
  }
  if (checkout.offersLoading) {
    return <button type="button" className="interview-button interview-button--primary" disabled><LoaderCircle className="animate-spin" aria-hidden="true" />Controllo disponibilità…</button>;
  }
  if (!checkout.available) {
    return <button type="button" className="interview-button interview-button--primary" disabled aria-disabled="true">Disponibile a breve</button>;
  }
  return <button type="button" className="interview-button interview-button--primary" disabled={checkout.loading} onClick={checkout.purchase}>{checkout.loading ? <><LoaderCircle className="animate-spin" aria-hidden="true" />Apertura checkout…</> : <>{label} <ArrowRight aria-hidden="true" /></>}</button>;
}

export default function InterviewProductPage() {
  const product = useMemo(() => interviewOffers.find((offer) => offer.id === 'interview-core'), []);
  const checkout = useInterviewPurchase(product);
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    function handleScroll() { setShowSticky(window.scrollY > 720); }
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="interview-page interview-product-page">
      <SEO
        title="Sblocco Colloquio | Percorso completo in inglese"
        description="Costruisci, migliora e allena le tue risposte per un colloquio in inglese con otto moduli, mock interview e il tuo Interview File."
      />

      <header className="interview-product-hero">
        <div className="interview-shell">
          <Link className="interview-product-back" to="/percorsi/colloquio"><ArrowLeft aria-hidden="true" />Torna alle opzioni</Link>
          <div className="interview-product-hero__layout">
            <div className="interview-product-hero__copy">
              <p className="interview-eyebrow">SBLOCCO COLLOQUIO · PERCORSO COMPLETO</p>
              <h1>Costruisci risposte che sai usare anche quando la domanda cambia.</h1>
              <p>Un percorso self-guided per trasformare esperienza, esempi e idee in risposte chiare, personali e adattabili.</p>
              <div className="interview-product-hero__price"><strong>{formatInterviewPrice(product)}</strong><span>pagamento unico</span></div>
              <div className="interview-actions">
                <PurchaseButton checkout={checkout} />
                <button type="button" className="interview-text-button" onClick={() => scrollInterviewTo('come-funziona-il-prodotto')}>Guarda cosa c’è dentro</button>
              </div>
              {checkout.error ? <p className="interview-purchase-error" role="alert">{checkout.error}</p> : null}
              <p className="interview-product-hero__trust"><ShieldCheck aria-hidden="true" />Account richiesto · Checkout Stripe · Nessun rinnovo automatico</p>
            </div>
            <InterviewWorkspacePreview />
          </div>
          <ul className="interview-product-inventory-strip" aria-label="Contenuto del percorso">
            <li><Layers3 aria-hidden="true" /><strong>8</strong><span>moduli</span></li>
            <li><MessageCircleQuestion aria-hidden="true" /><strong>3</strong><span>mock interview</span></li>
            <li><FileText aria-hidden="true" /><strong>1</strong><span>Interview File</span></li>
            <li><Route aria-hidden="true" /><strong>1</strong><span>percorso guidato</span></li>
          </ul>
        </div>
      </header>

      <section className="interview-product-section interview-product-outcomes" aria-labelledby="interview-outcomes-title">
        <div className="interview-shell">
          <div className="interview-product-heading interview-product-heading--center"><p className="interview-eyebrow">COSA CAMBIA</p><h2 id="interview-outcomes-title">Non memorizzi più risposte. Impari a costruirle.</h2></div>
          <div className="interview-product-outcomes__grid">{outcomes.map(([Icon, title, copy]) => <article key={title}><Icon aria-hidden="true" /><h3>{title}</h3><p>{copy}</p></article>)}</div>
        </div>
      </section>

      <InterviewProductShowcase />

      <section className="interview-product-section interview-file" aria-labelledby="interview-file-title">
        <div className="interview-shell interview-file__layout">
          <div className="interview-product-heading">
            <p className="interview-eyebrow">IL TUO INTERVIEW FILE</p>
            <h2 id="interview-file-title">Alla fine non hai solo studiato. Hai costruito materiale pronto da usare.</h2>
            <p>Ogni attività alimenta un archivio personale che collega esempi, risultati, lingua utile e domande finali.</p>
          </div>
          <div className="interview-file__sheet">
            <div className="interview-file__sheet-head"><FileText aria-hidden="true" /><span>INTERVIEW FILE · RHEMA</span><small>4 storie pronte</small></div>
            {fileOutputs.map(([title, copy], index) => <article key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{copy}</p></div></article>)}
          </div>
        </div>
      </section>

      <section className="interview-product-section interview-curriculum" aria-labelledby="interview-curriculum-title">
        <div className="interview-shell">
          <div className="interview-product-heading"><p className="interview-eyebrow">CURRICULUM 01–08</p><h2 id="interview-curriculum-title">Ogni modulo produce qualcosa di concreto.</h2></div>
          <ol className="interview-curriculum__grid">{curriculum.map(([number, title, output]) => <li key={number}><span>{number}</span><h3>{title}</h3><p><ClipboardCheck aria-hidden="true" />Output: {output}</p></li>)}</ol>
        </div>
      </section>

      <section className="interview-product-section interview-coverage" aria-labelledby="interview-coverage-title">
        <div className="interview-shell">
          <div className="interview-product-heading interview-product-heading--center"><p className="interview-eyebrow">QUESTION COVERAGE</p><h2 id="interview-coverage-title">Le domande che aprono, approfondiscono e mettono pressione.</h2></div>
          <div className="interview-coverage__grid">{coverage.map(([title, questions]) => <article key={title}><h3>{title}</h3><ul>{questions.map((question) => <li key={question}>{question}</li>)}</ul></article>)}</div>
        </div>
      </section>

      <section className="interview-product-section interview-technical-scenarios" aria-labelledby="interview-scenarios-title">
        <div className="interview-shell">
          <div className="interview-product-heading"><p className="interview-eyebrow">OLTRE LE DOMANDE HR</p><h2 id="interview-scenarios-title">Allena l’inglese con cui spieghi il tuo ragionamento.</h2><p>Il percorso lavora sulla comunicazione. Non sostituisce la preparazione tecnica specifica del tuo ruolo.</p></div>
          <div className="interview-technical-scenarios__grid">{technicalScenarios.map(([title, copy], index) => <article key={title}><span>0{index + 1}</span><Wrench aria-hidden="true" /><h3>{title}</h3><p>{copy}</p></article>)}</div>
        </div>
      </section>

      <section className="interview-product-section interview-mocks" aria-labelledby="interview-mocks-title">
        <div className="interview-shell interview-mocks__layout">
          <div className="interview-product-heading"><p className="interview-eyebrow">TRE MOCK SELF-GUIDED</p><h2 id="interview-mocks-title">Prova la sequenza completa, non solo domande isolate.</h2></div>
          <div className="interview-mocks__list">{mockInterviews.map(([number, title, copy]) => <article key={number}><span>{number}</span><Presentation aria-hidden="true" /><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div>
        </div>
      </section>

      <InteractiveMiniPreview />

      <section className="interview-product-section interview-compact-method" aria-labelledby="interview-method-title">
        <div className="interview-shell">
          <div className="interview-product-heading interview-product-heading--center"><p className="interview-eyebrow">IL METODO IN CINQUE PASSAGGI</p><h2 id="interview-method-title">La risposta migliora perché la rimetti in movimento.</h2></div>
          <ol>{method.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item}</strong></li>)}</ol>
        </div>
      </section>

      <section id="acquista-sblocco-colloquio" className="interview-product-section interview-purchase" aria-labelledby="interview-purchase-title">
        <div className="interview-shell interview-purchase__layout">
          <div className="interview-product-heading">
            <p className="interview-eyebrow">INVENTARIO COMPLETO</p>
            <h2 id="interview-purchase-title">Sblocco Colloquio</h2>
            <p>Tutto ciò che serve per costruire, provare e adattare le tue risposte in autonomia.</p>
          </div>
          <div className="interview-purchase__card">
            <div><span>PERCORSO COMPLETO</span><strong>{formatInterviewPrice(product)}</strong><small>pagamento unico</small></div>
            <ul>{inventory.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul>
            <PurchaseButton checkout={checkout} />
            {checkout.error ? <p className="interview-purchase-error" role="alert">{checkout.error}</p> : null}
            <p><LockKeyhole aria-hidden="true" />Accesso tramite account. Pagamento sicuro con Stripe.</p>
          </div>
        </div>
      </section>

      <section className="interview-product-section interview-alternatives" aria-labelledby="interview-alternatives-title">
        <div className="interview-shell">
          <div className="interview-product-heading interview-product-heading--center"><p className="interview-eyebrow">ALTRE OPZIONI</p><h2 id="interview-alternatives-title">Preferisci partire più leggero o avere più materiali?</h2></div>
          <div className="interview-alternatives__grid">
            <article><BriefcaseBusiness aria-hidden="true" /><span>ESSENZIALE</span><h3>Kit Colloquio · 19 €</h3><p>Strutture e risorse fondamentali per preparare le domande più comuni.</p><Link to="/percorsi/colloquio#offerte-colloquio">Confronta il Kit <ArrowRight aria-hidden="true" /></Link></article>
            <article><Sparkles aria-hidden="true" /><span>PIÙ COMPLETO</span><h3>Complete · 79 €</h3><p>Percorso, Kit e materiali aggiuntivi quando saranno disponibili.</p><Link to="/percorsi/colloquio#offerte-colloquio">Confronta Complete <ArrowRight aria-hidden="true" /></Link></article>
          </div>
        </div>
      </section>

      <section className="interview-product-section interview-product-faq" aria-labelledby="interview-product-faq-title">
        <div className="interview-shell interview-product-faq__layout">
          <div className="interview-product-heading"><p className="interview-eyebrow">PRIMA DELL’ACQUISTO</p><h2 id="interview-product-faq-title">Domande sul percorso da 49 €.</h2></div>
          <FAQAccordion items={productFaqs} defaultOpen={-1} />
        </div>
      </section>

      <section className="interview-product-final" aria-labelledby="interview-product-final-title">
        <div className="interview-shell"><Target aria-hidden="true" /><p className="interview-eyebrow">PRIMA CHE INIZI DAVVERO</p><h2 id="interview-product-final-title">Porta al colloquio risposte che hai già imparato a costruire.</h2><PurchaseButton checkout={checkout} /></div>
      </section>

      {showSticky ? (
        <div className="interview-product-sticky is-visible">
          <div className="interview-shell"><div><span>Sblocco Colloquio</span><strong>{formatInterviewPrice(product)} · una tantum</strong></div><PurchaseButton checkout={checkout} label="Acquista" /></div>
        </div>
      ) : null}
    </div>
  );
}
