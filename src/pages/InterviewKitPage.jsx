import React, { useMemo } from 'react';
import { ArrowRight, FileText, Mic2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import { KitDocumentPreview, KitResourcesShowcase } from '../components/interview/InterviewCatalogPreviews.jsx';
import {
  InterviewProductFAQ,
  InterviewProductHero,
  InterviewProductNav,
  InterviewPurchasePanel,
} from '../components/interview/InterviewProductShared.jsx';
import useInterviewPurchase from '../components/interview/useInterviewPurchase.js';
import { formatInterviewPrice, getInterviewProductBySlug } from '../config/interviewProducts.js';
import '../styles/interview.css';
import '../styles/interview-product.css';

const kitInventory = [
  'Interview Question Bank',
  'Tell Me About Yourself Builder',
  'STAR / Story Builder',
  'framework per le domande difficili',
  'espressioni utili per il colloquio',
  'Emergency English sheet',
  'domande da fare all’intervistatore',
  'pre-interview checklist',
  'workbook digitale e stampabile',
];

const kitFaqs = [
  { question: 'In che formato ricevo il Kit?', answer: 'Il Kit è progettato come una raccolta di risorse digitali e un workbook utilizzabile anche in stampa. Il formato finale verrà confermato prima dell’apertura delle vendite.' },
  { question: 'È adatto se ho il colloquio tra pochi giorni?', answer: 'Sì. Il Kit nasce per organizzare rapidamente domande, esempi, strutture e lingua utile. Non sostituisce l’allenamento attivo, ma evita di iniziare da una pagina bianca.' },
  { question: 'Include lezioni?', answer: 'No. Il Kit è un prodotto basato su documenti, worksheet, esempi e checklist. Non include lezioni registrate o individuali.' },
  { question: 'Include mock interview?', answer: 'No. Le mock interview self-guided appartengono a Sblocco Colloquio. Una simulazione privata può essere richiesta separatamente.' },
  { question: 'È incluso in Sblocco Colloquio Complete?', answer: 'È previsto nella composizione di Complete, ma Complete non sarà venduto finché Kit e materiali aggiuntivi non saranno realmente pronti.' },
  { question: 'Va bene anche per colloqui tecnici?', answer: 'Aiuta a preparare esempi, domande, lingua di recupero e strutture. Non contiene formazione tecnica specifica per la tua professione.' },
  { question: 'Serve un account?', answer: 'Sì, quando il prodotto sarà attivo servirà un account per completare l’acquisto e accedere alle risorse.' },
];

export default function InterviewKitPage() {
  const product = useMemo(() => getInterviewProductBySlug('kit'), []);
  const checkout = useInterviewPurchase(product, 'acquista-kit');

  return (
    <div className="interview-page interview-product-page interview-kit-page">
      <SEO
        title="Kit Colloquio in inglese | Sblocco Inglese"
        description="Domande, strutture, espressioni e strumenti pratici per preparare un colloquio in inglese."
      />
      <InterviewProductHero
        product={product}
        checkout={checkout}
        eyebrow="KIT COLLOQUIO"
        title="Prepara le risposte prima del colloquio."
        description="Domande, strutture, espressioni, checklist e workbook per organizzare la preparazione senza partire da una pagina bianca."
        preview={<KitDocumentPreview />}
        previewId="kit-resources"
      />

      <KitResourcesShowcase />

      <InterviewPurchasePanel
        product={product}
        checkout={checkout}
        eyebrow="COSA RICEVI"
        title="Il materiale per preparare il colloquio in autonomia."
        description="Domande, builder, espressioni e checklist raccolti in un unico kit digitale da usare al tuo ritmo."
        inventory={kitInventory}
      />

      <section className="interview-product-section kit-positioning" aria-labelledby="kit-positioning-title">
        <div className="interview-shell">
          <div className="interview-product-heading interview-product-heading--center">
            <p className="interview-eyebrow">KIT O ALLENAMENTO?</p>
            <h2 id="kit-positioning-title">Ti serve anche allenarti?</h2>
            <p>Il Kit ti aiuta a preparare materiale e risposte. Sblocco Colloquio aggiunge speaking, esercizi attivi, variazioni, Interview File e mock interview.</p>
          </div>
          <div className="kit-positioning__comparison">
            <article><FileText aria-hidden="true" /><span>KIT</span><h3>Prepara</h3><strong>{formatInterviewPrice(product)}</strong><p>Documenti, builder, espressioni e checklist.</p></article>
            <span aria-hidden="true">VS</span>
            <article><Mic2 aria-hidden="true" /><span>SBLOCCO COLLOQUIO</span><h3>Allenati</h3><strong>49 €</strong><p>Speaking, variazioni, Interview File e mock interview.</p><Link to="/percorsi/colloquio/sblocco-colloquio">Scopri Sblocco Colloquio <ArrowRight aria-hidden="true" /></Link></article>
          </div>
        </div>
      </section>

      <InterviewProductFAQ id="kit-faq" title="Domande sul Kit Colloquio." items={kitFaqs} />
      <InterviewProductNav currentId={product.id} />
    </div>
  );
}
