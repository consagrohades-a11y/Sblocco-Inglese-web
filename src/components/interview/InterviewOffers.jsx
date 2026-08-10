import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import {
  formatInterviewPrice,
  interviewLab,
  interviewOffers,
  interviewRolePacks,
} from '../../config/interviewProducts.js';
import { authPath } from '../../lib/safeReturnTo.js';
import { createCheckout, loadPathwayOffers } from '../../lib/pathwayCommerce.js';
import { createPathwayIntake } from '../../lib/pathwayIntakeApi.js';

function paymentLinkForUser(paymentUrl, user) {
  if (!paymentUrl) return null;
  const url = new URL(paymentUrl);
  if (user?.id) url.searchParams.set('client_reference_id', user.id);
  if (user?.email) url.searchParams.set('prefilled_email', user.email);
  return url.toString();
}

function purchaseReturnTo(location, productId) {
  const params = new URLSearchParams(location.search);
  params.set('checkout', productId);
  return `${location.pathname}?${params.toString()}#offerte-colloquio`;
}

function OfferAction({ product, state, loading, offersLoading, onPurchase }) {
  if (state?.owned) {
    return <Link className="interview-offer__cta interview-offer__cta--owned" to={state.accessUrl || '/account'}>Vai al percorso <ArrowRight aria-hidden="true" /></Link>;
  }

  const externallyConfigured = Boolean(product.paymentUrl);
  const internallyConfigured = Boolean(state?.configured);
  const checking = offersLoading && product.offerId && !externallyConfigured;
  const available = product.active && (externallyConfigured || internallyConfigured);

  if (checking) {
    return <button type="button" className="interview-offer__cta" disabled><LoaderCircle className="animate-spin" aria-hidden="true" />Controllo disponibilità…</button>;
  }

  if (!available) {
    return <button type="button" className="interview-offer__cta" disabled aria-disabled="true">Disponibile a breve</button>;
  }

  return (
    <button type="button" className="interview-offer__cta interview-offer__cta--buy" disabled={loading} onClick={() => onPurchase(product)}>
      {loading ? <><LoaderCircle className="animate-spin" aria-hidden="true" />Apertura checkout…</> : <>{product.cta} <ArrowRight aria-hidden="true" /></>}
    </button>
  );
}

function OfferCard({ product, state, loading, offersLoading, onPurchase }) {
  return (
    <article className={`interview-offer ${product.featured ? 'is-featured' : ''} ${product.bestValue ? 'is-best-value' : ''}`}>
      <div className="interview-offer__topline"><span>{product.badge}</span>{product.bestValue ? <strong>CONSIGLIATO</strong> : null}</div>
      <h3>{product.name}</h3>
      <p className="interview-offer__price">{formatInterviewPrice(product)} <small>pagamento unico</small></p>
      <p className="interview-offer__positioning">{product.positioning}</p>
      <ul>{product.includes.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul>
      <div className="interview-offer__footer">
        <OfferAction product={product} state={state} loading={loading} offersLoading={offersLoading} onPurchase={onPurchase} />
      </div>
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
      const level = String(data.get('level') || '').trim();
      const role = String(data.get('role') || '').trim();
      await createPathwayIntake({
        name,
        email,
        pathway: 'colloquio',
        interviewDate: data.get('interviewDate'),
        role: role || 'Da definire',
        interviewType: 'Interview Lab waitlist',
        practicalTest: 'unknown',
        note: `Interesse per Interview Lab.${level ? ` Livello dichiarato: ${level}.` : ''}`,
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
      <label>Livello <span>opzionale</span><select name="level" defaultValue=""><option value="">Non lo so</option><option>A2</option><option>B1</option><option>B2</option><option>C1+</option></select></label>
      <label>Ruolo o area <span>opzionale</span><input name="role" type="text" maxLength="180" placeholder="Es. Marketing" /></label>
      <label>Data colloquio <span>opzionale</span><input name="interviewDate" type="date" /></label>
      <button type="submit" className="interview-button interview-button--cream" disabled={submitting}>{submitting ? <><LoaderCircle className="animate-spin" aria-hidden="true" />Invio…</> : <><Bell aria-hidden="true" />{interviewLab.cta}</>}</button>
      {status ? <p className="interview-form-status interview-form-status--error" role="alert">{status.text}</p> : null}
    </form>
  );
}

export default function InterviewOffers() {
  const { session, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [offerStates, setOfferStates] = useState({});
  const [offersLoading, setOffersLoading] = useState(true);
  const [activeCheckout, setActiveCheckout] = useState('');
  const [error, setError] = useState('');
  const handledCheckout = useRef(new Set());

  const pendingProduct = useMemo(() => {
    const id = new URLSearchParams(location.search).get('checkout');
    return [...interviewOffers, interviewLab, ...interviewRolePacks].find((item) => item.id === id) || null;
  }, [location.search]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setOffersLoading(true);
    loadPathwayOffers({ pathway: 'colloquio', accessToken: session?.access_token, signal: controller.signal })
      .then((payload) => {
        if (active) setOfferStates(Object.fromEntries((payload.offers || []).map((offer) => [offer.id, offer])));
      })
      .catch((loadError) => {
        if (active && loadError.name !== 'AbortError') setOfferStates({});
      })
      .finally(() => {
        if (active) setOffersLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [session?.access_token]);

  async function handlePurchase(product) {
    setError('');
    if (!user || !session?.access_token) {
      const returnTo = purchaseReturnTo(location, product.id);
      navigate(authPath('/login', returnTo), { state: { from: returnTo, message: 'Accedi o crea un account per continuare verso il pagamento.' } });
      return;
    }

    setActiveCheckout(product.id);
    try {
      if (product.paymentUrl) {
        window.location.assign(paymentLinkForUser(product.paymentUrl, user));
        return;
      }
      if (!product.offerId) throw Object.assign(new Error('Offer not configured'), { code: 'offer_not_configured' });
      const payload = await createCheckout({ offerId: product.offerId, accessToken: session.access_token });
      if (!payload.url) throw new Error('Stripe Checkout non ha restituito un indirizzo valido.');
      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(
        checkoutError.code === 'already_owned'
          ? 'Possiedi già questo prodotto.'
          : checkoutError.code === 'offer_not_configured' || checkoutError.code === 'configuration_required'
            ? 'Questo prodotto sarà disponibile a breve.'
            : 'Non è stato possibile aprire il pagamento. Riprova tra poco.',
      );
      setActiveCheckout('');
    }
  }

  useEffect(() => {
    if (!pendingProduct || !user || !session?.access_token || offersLoading || handledCheckout.current.has(pendingProduct.id)) return;
    handledCheckout.current.add(pendingProduct.id);
    const params = new URLSearchParams(location.search);
    params.delete('checkout');
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params}` : '', hash: '#offerte-colloquio' }, { replace: true });
    handlePurchase(pendingProduct);
  }, [pendingProduct, user, session?.access_token, offersLoading]);

  return (
    <>
      <section id="offerte-colloquio" className="interview-section interview-offers" aria-labelledby="interview-offers-title">
        <div className="interview-shell">
          <div className="interview-heading interview-heading--center">
            <p className="interview-eyebrow">SCEGLI IL TUO PUNTO DI PARTENZA</p>
            <h2 id="interview-offers-title">Scegli quanto vuoi prepararti.</h2>
            <p>Puoi iniziare dal kit essenziale oppure allenarti con il percorso completo.</p>
          </div>
          <div className="interview-offers__grid">
            {interviewOffers.map((product) => (
              <OfferCard
                key={product.id}
                product={product}
                state={offerStates[product.offerId]}
                loading={activeCheckout === product.id}
                offersLoading={offersLoading}
                onPurchase={handlePurchase}
              />
            ))}
          </div>
          {error ? <p className="interview-form-status interview-form-status--error" role="alert">{error}</p> : null}
          <p className="interview-offers__security"><LockKeyhole aria-hidden="true" />Gli acquisti digitali richiedono un account e vengono completati tramite Stripe. Nessun rinnovo automatico.</p>
        </div>
      </section>

      <section className="interview-section interview-packs" aria-labelledby="interview-packs-title">
        <div className="interview-shell interview-packs__layout">
          <div className="interview-heading">
            <p className="interview-eyebrow">ROLE PACK</p>
            <h2 id="interview-packs-title">Il colloquio cambia in base al lavoro.</h2>
            <p>Per questo potrai aggiungere preparazione specifica per il tuo settore o tipo di ruolo.</p>
            <p className="interview-packs__price"><PackagePlus aria-hidden="true" />{formatInterviewPrice(interviewRolePacks[0])} per pack</p>
          </div>
          <div className="interview-packs__list">
            {interviewRolePacks.map((pack) => (
              <article key={pack.id}>
                <div><h3>{pack.name}</h3><p>{pack.description}</p></div>
                {pack.active && pack.paymentUrl ? (
                  <button type="button" onClick={() => handlePurchase(pack)}>Scegli il pack <ArrowRight aria-hidden="true" /></button>
                ) : <span aria-label={`${pack.name}, in arrivo`}>In arrivo</span>}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="interview-section interview-lab" aria-labelledby="interview-lab-title">
        <div className="interview-shell interview-lab__layout">
          <div className="interview-lab__copy">
            <p className="interview-eyebrow">ALLENAMENTO LIVE IN PICCOLO GRUPPO</p>
            <UsersRound aria-hidden="true" />
            <h2 id="interview-lab-title">{interviewLab.name}</h2>
            <p className="interview-lab__price">{formatInterviewPrice(interviewLab)}</p>
            <p>Quattro sessioni live per mettere alla prova le risposte, ricevere feedback e allenarti con la pressione di una conversazione reale.</p>
            <ul>{interviewLab.includes.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul>
          </div>
          {interviewLab.active && interviewLab.paymentUrl ? (
            <div className="interview-lab__purchase"><p>La prossima edizione è aperta.</p><button type="button" className="interview-button interview-button--cream" onClick={() => handlePurchase(interviewLab)}>{interviewLab.cta}<ArrowRight aria-hidden="true" /></button></div>
          ) : <InterviewLabWaitlist />}
        </div>
      </section>
    </>
  );
}
