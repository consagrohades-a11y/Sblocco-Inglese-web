import React, { useMemo } from 'react';
import {
  BriefcaseBusiness,
  Check,
  ClipboardList,
  FileText,
  Layers3,
  MessageCircleQuestion,
  Mic2,
  ShieldAlert,
  Target,
} from 'lucide-react';
import SEO from '../components/SEO.jsx';
import { CompleteWorkspacePreview } from '../components/interview/InterviewCatalogPreviews.jsx';
import {
  InterviewProductFAQ,
  InterviewProductHero,
  InterviewProductNav,
  InterviewPurchasePanel,
} from '../components/interview/InterviewProductShared.jsx';
import useInterviewPurchase from '../components/interview/useInterviewPurchase.js';
import { getInterviewProductBySlug } from '../config/interviewProducts.js';
import '../styles/interview.css';
import '../styles/interview-product.css';

const completeInventory = [
  'Sblocco Colloquio con 8 moduli guidati',
  'Interview File e Story Bank',
  'sezione per colloqui tecnici e pratici',
  'recovery language e domande difficili',
  '3 mock interview self-guided',
  'Kit Colloquio con builder, espressioni e checklist',
  { label: 'preparazione specialistica, in preparazione', pending: true },
  { label: 'pratica aggiuntiva, in preparazione', pending: true },
];

const bundleParts = [
  {
    icon: Layers3,
    label: 'PERCORSO INTERATTIVO',
    title: 'Sblocco Colloquio',
    price: '49 €',
    status: 'Il cuore di Complete',
    items: ['self-guided training', 'Interview File e Story Bank', 'colloqui tecnici e pratici', 'recovery', '3 mock interview'],
  },
  {
    icon: FileText,
    label: 'RISORSE DI PREPARAZIONE',
    title: 'Kit Colloquio',
    price: '19 €',
    status: 'In preparazione',
    items: ['Question Bank', 'answer e story builder', 'espressioni utili', 'checklist', 'workbook digitale'],
  },
  {
    icon: BriefcaseBusiness,
    label: 'PREPARAZIONE PER RUOLO',
    title: 'Preparazione specialistica',
    price: null,
    status: 'In preparazione',
    items: ['scenari e lingua collegati a un tipo di ruolo', 'contenuti esatti confermati prima del lancio'],
  },
  {
    icon: MessageCircleQuestion,
    label: 'PRATICA AGGIUNTIVA',
    title: 'Scenari e simulazioni aggiuntive',
    price: null,
    status: 'In preparazione',
    items: ['nuovi scenari per variare domande e follow-up', 'quantità e formato confermati prima del lancio'],
  },
];

const useCases = [
  'Hai un colloquio specifico in arrivo e vuoi organizzare tutto in un unico posto.',
  'Vuoi sia risorse di preparazione sia pratica attiva di speaking.',
  'Prevedi più fasi, incluse domande HR e prove tecniche o pratiche.',
  'Non vuoi assemblare documenti, esercizi e simulazioni da fonti diverse.',
  'Vuoi una preparazione più vicina al linguaggio e alle situazioni del tuo ruolo.',
];

const journey = [
  ['01', 'PREPARA', ClipboardList, 'Usa il Kit.', 'Note sull’azienda, domande, framework e storie da sviluppare.'],
  ['02', 'ALLENATI', Mic2, 'Usa Sblocco Colloquio.', 'Speaking, follow-up, domande tecniche, difficili e recovery.'],
  ['03', 'SPECIALIZZA', BriefcaseBusiness, 'Aggiungi gli scenari del tuo ruolo.', 'Lavora con situazioni e lingua più vicine al tipo di ruolo che stai cercando.'],
  ['04', 'SIMULA', Target, 'Completa le simulazioni.', 'Tre simulazioni guidate nel percorso, con pratica aggiuntiva in preparazione.'],
];

const comparisonRows = [
  ['Risorse di preparazione', 'Incluse', 'Essenziali', 'Kit incluso'],
  ['Allenamento speaking attivo', '—', 'Incluso', 'Incluso'],
  ['Interview File', '—', 'Incluso', 'Incluso'],
  ['Story Bank', 'Story Builder', 'Incluso', 'Incluso'],
  ['Colloquio tecnico', 'Framework', 'Pratica inclusa', 'Pratica inclusa'],
  ['Simulazioni guidate', '—', '3', '3 incluse; extra in preparazione'],
  ['Pratica specifica per ruolo', '—', '—', 'In preparazione'],
  ['Prezzo', '19 €', '49 €', '79 € al lancio'],
];

const completeFaqs = [
  { question: 'Complete è già acquistabile?', answer: 'No. La pagina mostra il bundle previsto, ma il checkout resta chiuso finché Kit, preparazione specialistica e pratica aggiuntiva non saranno realmente pronti.' },
  { question: 'Perché costa 79 € invece di 49 €?', answer: 'Complete è pensato per riunire il training di Sblocco Colloquio, il Kit e materiali specialistici o aggiuntivi verificati. Non verrà attivato finché questa differenza non sarà concreta.' },
  { question: 'I Role Pack sono già inclusi?', answer: 'No. Nessun Role Pack è attualmente incluso né venduto in anticipo. La preparazione specifica per ruolo verrà indicata soltanto quando disponibile.' },
  { question: 'Posso acquistare Sblocco Colloquio adesso e passare a Complete dopo?', answer: 'Al momento non è previsto un upgrade automatico. Quando Complete sarà pronto, la modalità più corretta per chi possiede già il percorso verrà comunicata chiaramente.' },
  { question: 'Complete include lezioni individuali?', answer: 'No. Complete è progettato come bundle digitale self-guided. Le simulazioni private con un insegnante restano un servizio separato.' },
  { question: 'Quando sarà disponibile?', answer: 'Non c’è ancora una data pubblica. La vendita aprirà solo quando ogni componente dichiarato sarà pronto e verificato.' },
];

export default function InterviewCompletePage() {
  const product = useMemo(() => getInterviewProductBySlug('complete'), []);
  const checkout = useInterviewPurchase(product, 'acquista-complete');

  return (
    <div className="interview-page interview-product-page interview-complete-page">
      <SEO
        title="Sblocco Colloquio Complete | Preparazione completa"
        description="Il percorso completo per preparare e allenare il colloquio in inglese con risorse, pratica e materiali specialistici."
      />
      <InterviewProductHero
        product={product}
        checkout={checkout}
        eyebrow="SBLOCCO COLLOQUIO COMPLETE"
        title="La preparazione completa, dal primo appunto all’ultima simulazione."
        description="Il percorso Sblocco Colloquio, il Kit e una preparazione più vicina al tuo tipo di ruolo, riuniti in un solo sistema."
        preview={<CompleteWorkspacePreview />}
        previewId="complete-bundle"
      />

      <section id="complete-bundle" className="interview-product-section complete-bundle" aria-labelledby="complete-bundle-title">
        <div className="interview-shell">
          <div className="interview-product-heading">
            <p className="interview-eyebrow">COSA INCLUDE COMPLETE</p>
            <h2 id="complete-bundle-title">Preparazione, allenamento e pratica più specifica, in un unico sistema.</h2>
            <p>Parti dai materiali, trasformali in risposte che sai usare e aggiungi pratica specifica per il tuo colloquio.</p>
          </div>
          <div className="complete-bundle__grid">
            {bundleParts.map(({ icon: Icon, label, title, price, status, items }) => (
              <article key={title} className={!price ? 'is-pending' : ''}>
                <div className="complete-bundle__top"><Icon aria-hidden="true" /><span>{label}</span>{price ? <strong>{price}</strong> : null}</div>
                <h3>{title}</h3>
                <p className="complete-bundle__status">{status}</p>
                <ul>{items.map((item) => <li key={item}>{!price ? <ShieldAlert aria-hidden="true" /> : <Check aria-hidden="true" />}{item}</li>)}</ul>
              </article>
            ))}
          </div>
          <div className="complete-bundle__result"><span>COMPLETE</span><strong>79 €</strong><p>PREPARA + ALLENATI + SPECIALIZZA</p><small>Disponibile a breve. Le vendite apriranno quando ogni elemento sarà pronto.</small></div>
        </div>
      </section>

      <section className="interview-product-section complete-use-cases" aria-labelledby="complete-use-cases-title">
        <div className="interview-shell complete-use-cases__layout">
          <div className="interview-product-heading"><p className="interview-eyebrow">PERCHÉ ESISTE</p><h2 id="complete-use-cases-title">Per chi vuole preparare tutto in un unico posto.</h2></div>
          <ul>{useCases.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, '0')}</span>{item}</li>)}</ul>
        </div>
      </section>

      <section className="interview-product-section complete-journey" aria-labelledby="complete-journey-title">
        <div className="interview-shell">
          <div className="interview-product-heading interview-product-heading--center"><p className="interview-eyebrow">UN SOLO FLUSSO</p><h2 id="complete-journey-title">Dal materiale alla prova completa.</h2><p>Quattro fasi collegate, così ogni appunto diventa qualcosa che sai dire e riutilizzare.</p></div>
          <ol>{journey.map(([number, label, Icon, title, copy], index) => <li key={number} className={index > 1 ? 'is-pending' : ''}><span>{number}</span><Icon aria-hidden="true" /><small>{label}{index > 1 ? ' · IN ARRIVO' : ''}</small><h3>{title}</h3><p>{copy}</p></li>)}</ol>
        </div>
      </section>

      <section className="interview-product-section complete-comparison" aria-labelledby="complete-comparison-title">
        <div className="interview-shell">
          <div className="interview-product-heading"><p className="interview-eyebrow">CONFRONTA LE OPZIONI</p><h2 id="complete-comparison-title">Scegli in base a come vuoi prepararti.</h2><p>Il Kit organizza il materiale. Sblocco ti fa allenare. Complete unirà entrambe le cose alla preparazione specialistica.</p></div>
          <div className="complete-comparison__scroll" tabIndex="0" aria-label="Confronto tra Kit, Sblocco Colloquio e Complete">
            <table>
              <thead><tr><th>Include</th><th>Kit</th><th>Sblocco</th><th>Complete <small>in preparazione</small></th></tr></thead>
              <tbody>{comparisonRows.map(([feature, kit, core, complete]) => <tr key={feature}><th>{feature}</th><td>{kit}</td><td>{core}</td><td>{complete}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </section>

      <InterviewPurchasePanel
        product={product}
        checkout={checkout}
        eyebrow="STATO DEL PRODOTTO"
        title="Complete è in preparazione."
        description="Puoi già esplorare il sistema e vedere quali componenti sono pronti o ancora in sviluppo."
        inventory={completeInventory}
      />
      <InterviewProductFAQ id="complete-faq" title="Domande su Complete." items={completeFaqs} />
      <InterviewProductNav currentId={product.id} />
    </div>
  );
}
