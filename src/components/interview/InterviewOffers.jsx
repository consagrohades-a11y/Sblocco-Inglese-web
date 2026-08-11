import React, { useState } from 'react';
import {
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  PackagePlus,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import {
  formatInterviewPrice,
  interviewLab,
  interviewOffers,
  interviewRolePacks,
} from '../../config/interviewProducts.js';
import { createPathwayIntake } from '../../lib/pathwayIntakeApi.js';

function HubOfferAction({ product }) {
  return (
    <Link className="interview-offer__cta interview-offer__cta--buy" to={product.detailPath}>
      {product.hubCta} <ArrowRight aria-hidden="true" />
    </Link>
  );
}

function OfferCard({ product }) {
  const statusLabel = product.status === 'preview' ? 'ANTEPRIMA' : product.status === 'comingSoon' ? 'IN ARRIVO' : null;
  return (
    <article className={`interview-offer ${product.recommended ? 'is-recommended' : ''} is-${product.status}`}>
      <div className="interview-offer__topline">
        <span>{product.commercialRole}</span>
        {product.recommended ? <strong>CONSIGLIATO</strong> : null}
      </div>
      {statusLabel ? <p className="interview-offer__status">{statusLabel}</p> : null}
      <h3>{product.name}</h3>
      <p className="interview-offer__price">{formatInterviewPrice(product)} <small>{product.status === 'active' ? 'pagamento unico' : 'prezzo previsto'}</small></p>
      <p className="interview-offer__positioning">{product.positioning}</p>
      <ul>{product.includes.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul>
      <div className="interview-offer__footer"><HubOfferAction product={product} /></div>
    </article>
  );
}

function InterviewLabWaitlist() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    if (name.length < 2 || !email) {
      setStatus({ tone: 'error', text: 'Inserisci nome ed email per entrare nella lista.' });
      return;
    }

    setSubmitting(true);
    try {
      const role = String(data.get('role') || '').trim();
      await createPathwayIntake({
        name,
        email,
        pathway: 'colloquio',
        role: role || 'Da definire',
        interviewType: 'Interview Lab waitlist',
        practicalTest: 'unknown',
        note: 'Interesse per Interview Lab.',
        website: data.get('website'),
      });
      setStatus({ tone: 'success', text: 'Perfetto. Ti avviseremo quando aprirà la prossima edizione.' });
      form.reset();
    } catch (error) {
      setStatus({ tone: 'error', text: error.message || 'Non è stato possibile inviare la richiesta.' });
    } finally {
      setSubmitting(false);
    }
  }

  if (status?.tone === 'success') {
    return <div className="interview-lab__success" role="status"><CheckCircle2 aria-hidden="true" /><p>{status.text}</p></div>;
  }

  return (
    <form className="interview-lab__form" onSubmit={handleSubmit}>
      <label className="interview-honeypot" aria-hidden="true">Non compilare<input name="website" tabIndex="-1" autoComplete="off" /></label>
      <label>Nome<input key={`lab-name-${user?.id || 'guest'}`} name="name" type="text" minLength="2" maxLength="120" required defaultValue={user?.user_metadata?.display_name || ''} autoComplete="name" /></label>
      <label>Email<input key={`lab-email-${user?.id || 'guest'}`} name="email" type="email" maxLength="254" required defaultValue={user?.email || ''} autoComplete="email" /></label>
      <label className="interview-lab__wide">Ruolo o area <span>opzionale</span><input name="role" type="text" maxLength="180" placeholder="Es. Marketing" /></label>
      <button type="submit" className="interview-button interview-button--cream" disabled={submitting}>{submitting ? <><LoaderCircle className="animate-spin" aria-hidden="true" />Invio…</> : <><Bell aria-hidden="true" />{interviewLab.cta}</>}</button>
      {status ? <p className="interview-form-status interview-form-status--error" role="alert">{status.text}</p> : null}
    </form>
  );
}

export function InterviewHubOffers() {
  return (
    <section id="offerte-colloquio" className="interview-section interview-offers" aria-labelledby="interview-offers-title">
      <div className="interview-shell">
        <div className="interview-heading interview-heading--center">
          <p className="interview-eyebrow">TRE MODI PER PREPARARTI</p>
          <h2 id="interview-offers-title">Scegli come vuoi prepararti.</h2>
          <p>Parti dalle risorse, allenati in modo attivo oppure aspetta il sistema completo. Ogni opzione risponde a un bisogno diverso.</p>
        </div>
        <div className="interview-offers__grid">
          {interviewOffers.map((product) => <OfferCard key={product.id} product={product} />)}
        </div>
        <p className="interview-offers__security"><LockKeyhole aria-hidden="true" />Nessun rinnovo automatico. L’acquisto avviene solo dalla pagina dettagli del prodotto.</p>
      </div>
    </section>
  );
}

export function InterviewRolePacks() {
  return (
    <section className="interview-section interview-packs" aria-labelledby="interview-packs-title">
      <div className="interview-shell interview-packs__layout">
        <div className="interview-heading">
          <p className="interview-eyebrow">ROLE PACK</p>
          <h2 id="interview-packs-title">Il colloquio cambia in base al lavoro.</h2>
          <p>Preparazione aggiuntiva per il linguaggio e le situazioni tipiche del tuo settore.</p>
          <p className="interview-packs__price"><PackagePlus aria-hidden="true" />{formatInterviewPrice(interviewRolePacks[0])} per pack</p>
        </div>
        <div className="interview-packs__list">
          {interviewRolePacks.map((pack) => (
            <article key={pack.id}>
              <div><h3>{pack.name}</h3><p>{pack.description}</p></div>
              <span aria-label={`${pack.name}, in arrivo`}>In arrivo</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function InterviewLab() {
  return (
    <section className="interview-section interview-lab" aria-labelledby="interview-lab-title">
      <div className="interview-shell interview-lab__layout">
        <div className="interview-lab__copy">
          <p className="interview-eyebrow">LIVE IN PICCOLO GRUPPO</p>
          <UsersRound aria-hidden="true" />
          <h2 id="interview-lab-title">{interviewLab.name}</h2>
          <p className="interview-lab__price">{formatInterviewPrice(interviewLab)}</p>
          <p>Quattro sessioni live con domande, mock interview e feedback mirato.</p>
          <ul>{interviewLab.includes.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul>
        </div>
        <InterviewLabWaitlist />
      </div>
    </section>
  );
}

export default InterviewHubOffers;
