import React from 'react';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import { pathwaySlugs } from '../data/pathways.js';

export default function CheckoutCancel() {
  const [searchParams] = useSearchParams();
  const requestedPathway = searchParams.get('pathway') || '';
  const destination = pathwaySlugs.includes(requestedPathway) ? `/percorsi/${requestedPathway}#supporto` : '/percorsi';

  return (
    <>
      <SEO title="Pagamento non completato | Sblocco Inglese" description="Il pagamento non è stato completato e non è stato effettuato alcun acquisto." />
      <section className="section-shell py-16 sm:py-24">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-ink/10 bg-white p-8 text-center shadow-soft dark:border-white/10 dark:bg-surface-900 sm:p-12">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-linen text-clay dark:bg-white/10 dark:text-[#ffb89a]"><CreditCard aria-hidden="true" className="h-6 w-6" /></span>
          <h1 className="mt-6 text-4xl font-black text-ink dark:text-white sm:text-5xl">Pagamento non completato.</h1>
          <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-ink/65 dark:text-white/65">Non è stato effettuato alcun acquisto. Puoi tornare al percorso quando vuoi.</p>
          <Link to={destination} className="focus-ring mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-black text-white transition hover:bg-moss"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Torna al percorso</Link>
        </div>
      </section>
    </>
  );
}

