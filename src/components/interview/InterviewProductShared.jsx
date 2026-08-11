import React from 'react';
import { ArrowLeft, ArrowRight, Check, CircleDashed, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import FAQAccordion from '../FAQAccordion.jsx';
import { formatInterviewPrice, interviewOffers, isInterviewProductPurchasable } from '../../config/interviewProducts.js';
import { scrollInterviewTo } from './InterviewEditorialSections.jsx';

const statusLabels = {
  preview: 'Anteprima',
  comingSoon: 'In arrivo',
  active: 'Disponibile',
};

export function InterviewProductStatus({ product, checkout }) {
  const unavailableActiveProduct = product.status === 'active' && checkout && !checkout.offersLoading && !checkout.available && !checkout.owned;
  const visualStatus = unavailableActiveProduct ? 'comingSoon' : product.status;
  const label = checkout?.owned ? 'Acquistato' : unavailableActiveProduct ? 'Disponibile a breve' : statusLabels[product.status] || product.status;
  return <span className={`interview-product-status is-${visualStatus}`}>{label}</span>;
}

export function InterviewPurchaseButton({ checkout, product, label }) {
  if (checkout.owned) {
    return <Link className="interview-button interview-button--primary" to={checkout.accessUrl}>Vai al prodotto <ArrowRight aria-hidden="true" /></Link>;
  }
  if (!isInterviewProductPurchasable(product)) {
    return <button type="button" className="interview-button interview-button--primary" disabled aria-disabled="true">Disponibile a breve</button>;
  }
  if (checkout.offersLoading) {
    return <button type="button" className="interview-button interview-button--primary" disabled><LoaderCircle className="animate-spin" aria-hidden="true" />Controllo disponibilità…</button>;
  }
  if (!checkout.available) {
    return <button type="button" className="interview-button interview-button--primary" disabled aria-disabled="true">Disponibile a breve</button>;
  }
  return (
    <button type="button" className="interview-button interview-button--primary" disabled={checkout.loading} onClick={checkout.purchase}>
      {checkout.loading ? <><LoaderCircle className="animate-spin" aria-hidden="true" />Apertura checkout…</> : <>{label || product.cta} <ArrowRight aria-hidden="true" /></>}
    </button>
  );
}

export function InterviewProductHero({ product, checkout, eyebrow, title, description, preview, previewId = 'product-preview' }) {
  const checkoutReady = checkout.owned || checkout.available || checkout.offersLoading;
  return (
    <header className={`interview-product-hero interview-product-hero--${product.type}`}>
      <div className="interview-shell">
        <Link className="interview-product-back" to="/percorsi/colloquio"><ArrowLeft aria-hidden="true" />Torna alle opzioni</Link>
        <div className="interview-product-hero__layout">
          <div className="interview-product-hero__copy">
            <div className="interview-product-hero__eyebrow-row"><p className="interview-eyebrow">{eyebrow}</p><InterviewProductStatus product={product} checkout={checkout} /></div>
            <h1>{title}</h1>
            <p>{description}</p>
            <div className="interview-product-hero__price"><strong>{formatInterviewPrice(product)}</strong><span>{product.status === 'active' ? 'pagamento unico' : 'prezzo previsto'}</span></div>
            <div className="interview-actions">
              <InterviewPurchaseButton checkout={checkout} product={product} />
              <button type="button" className="interview-text-button" onClick={() => scrollInterviewTo(previewId)}>Guarda cosa include</button>
            </div>
            {checkout.error ? <p className="interview-purchase-error" role="alert">{checkout.error}</p> : null}
            <p className="interview-product-hero__trust"><ShieldCheck aria-hidden="true" />{product.status !== 'active' ? 'Anteprima del prodotto · Vendite non ancora aperte' : checkoutReady ? 'Account richiesto · Checkout Stripe · Nessun rinnovo automatico' : 'Configurazione del checkout in corso · Nessun rinnovo automatico'}</p>
          </div>
          {preview}
        </div>
        <ul className="interview-product-format-strip" aria-label="Formato del prodotto">
          {product.formatItems.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, '0')}</span>{item}</li>)}
        </ul>
      </div>
    </header>
  );
}

export function InterviewPurchasePanel({ product, checkout, eyebrow = 'COSA RICEVI', title, description, inventory }) {
  const checkoutReady = checkout.owned || checkout.available || checkout.offersLoading;
  return (
    <section id={`acquista-${product.slug}`} className="interview-product-section interview-purchase" aria-labelledby={`purchase-${product.slug}-title`}>
      <div className="interview-shell interview-purchase__layout">
        <div className="interview-product-heading">
          <p className="interview-eyebrow">{eyebrow}</p>
          <h2 id={`purchase-${product.slug}-title`}>{title || product.name}</h2>
          <p>{description || product.shortDescription}</p>
        </div>
        <div className="interview-purchase__card">
          <div><span>{product.commercialRole}</span><strong>{formatInterviewPrice(product)}</strong><small>{product.status === 'active' ? 'pagamento unico' : 'prezzo previsto'}</small></div>
          <ul>{inventory.map((item) => {
            const entry = typeof item === 'string' ? { label: item, pending: false } : item;
            const Icon = entry.pending ? CircleDashed : Check;
            return <li key={entry.label} className={entry.pending ? 'is-pending' : ''}><Icon aria-hidden="true" />{entry.label}</li>;
          })}</ul>
          <InterviewPurchaseButton checkout={checkout} product={product} />
          {checkout.error ? <p className="interview-purchase-error" role="alert">{checkout.error}</p> : null}
          <p><LockKeyhole aria-hidden="true" />{product.status !== 'active' ? 'Il checkout resterà chiuso finché il prodotto non sarà pronto.' : checkoutReady ? 'Accesso tramite account. Pagamento sicuro con Stripe.' : 'Il checkout sarà attivato appena la configurazione sarà completa.'}</p>
        </div>
      </div>
    </section>
  );
}

export function InterviewProductNav({ currentId }) {
  return (
    <nav className="interview-product-nav" aria-label="Confronta i prodotti per il colloquio">
      <div className="interview-shell">
        <p className="interview-eyebrow">STAI GUARDANDO</p>
        <div>
          {interviewOffers.map((product) => (
            <Link key={product.id} to={product.detailPath} className={currentId === product.id ? 'is-current' : ''} aria-current={currentId === product.id ? 'page' : undefined}>
              <span>{product.name} · {formatInterviewPrice(product)}</span>
              <strong>{product.commercialRole.toLowerCase()}</strong>
              {product.status !== 'active' ? <small>{statusLabels[product.status]}</small> : null}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

export function InterviewProductFAQ({ id, title, description, items }) {
  return (
    <section className="interview-product-section interview-product-faq" aria-labelledby={`${id}-title`}>
      <div className="interview-shell interview-product-faq__layout">
        <div className="interview-product-heading"><p className="interview-eyebrow">PRIMA DI SCEGLIERE</p><h2 id={`${id}-title`}>{title}</h2>{description ? <p>{description}</p> : null}</div>
        <FAQAccordion items={items} defaultOpen={-1} />
      </div>
    </section>
  );
}
