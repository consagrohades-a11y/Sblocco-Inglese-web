import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, LoaderCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { authPath } from '../lib/safeReturnTo.js';
import { createCheckout, loadPathwayOffers } from '../lib/pathwayCommerce.js';
import { RECOVERY_OFFER_ID, RECOVERY_PATHWAY } from '../config/recovery.js';
import '../styles/learnerEditorial.css';

const steps = [
  ['01', 'Diagnostico', 'Partiamo da ciò che sai già fare e dalle aree che richiedono più attenzione.'],
  ['02', 'Programma della scuola', 'Selezioni gli argomenti indicati per la prova: restano sempre dentro il percorso.'],
  ['03', 'Piano', 'Il tempo rimasto e i risultati decidono quali sessioni vengono prima.'],
  ['04', 'Verifica', 'Checkpoint e simulazioni aggiornano le priorità senza promettere un voto.'],
];

export default function RecoveryLandingPage() {
  const { session, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [offer, setOffer] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    loadPathwayOffers({ pathway: RECOVERY_PATHWAY, accessToken: session?.access_token, signal: controller.signal })
      .then((payload) => setOffer((payload.offers || []).find((item) => item.id === RECOVERY_OFFER_ID) || null))
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') setOffer(null);
      });
    return () => controller.abort();
  }, [session?.access_token]);

  async function handleCheckout() {
    setError('');
    const returnTo = `${location.pathname}#sblocca`;
    if (!user || !session?.access_token) {
      navigate(authPath('/login', returnTo), { state: { from: returnTo, message: 'Accedi o crea un account per continuare verso il pagamento.' } });
      return;
    }
    if (offer?.owned) {
      navigate('/recupero-debito/onboarding');
      return;
    }
    setCheckoutLoading(true);
    try {
      const payload = await createCheckout({ offerId: RECOVERY_OFFER_ID, accessToken: session.access_token });
      if (!payload.url) throw new Error('Checkout non disponibile.');
      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(
        checkoutError.code === 'already_owned'
          ? 'Hai già accesso a Recupero Debito Inglese.'
          : checkoutError.code === 'offer_not_configured' || checkoutError.code === 'configuration_required'
            ? 'Il pagamento non è ancora configurato.'
            : 'Non è stato possibile aprire il pagamento. Riprova tra poco.',
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <div className="learner-editorial learner-workspace-page">
      <SEO
        title="Recupero Debito Inglese | Sblocco Inglese"
        description="Un percorso che usa programma scolastico, errori e tempo rimasto per dirti cosa conviene preparare oggi per la prova di recupero."
      />
      <div className="learner-shell">
        <header className="learner-sales-hero">
          <div>
            <p className="learner-kicker">Recupero Debito Inglese</p>
            <h1 className="learner-display">Non una libreria di lezioni. <em>Un piano per la prova.</em></h1>
            <p>
              Inserisci la data dell’esame e il programma dato dalla scuola. Sblocco mette prima gli argomenti più importanti, riprende gli errori che si ripetono e aggiorna il percorso quando il tempo cambia.
            </p>
            <div className="learner-form-actions">
              <Link to="/test-recupero-inglese" className="learner-primary-button focus-ring">Fai il test gratuito <ArrowRight aria-hidden="true" size={16} /></Link>
              <a href="#sblocca" className="learner-secondary-button focus-ring">Vedi cosa include</a>
            </div>
          </div>
          <div className="learner-sales-hero__art" aria-hidden="true">
            <img src="/assets/brand/sblocco-editorial-conversation-v2.png" alt="" />
          </div>
        </header>

        <section className="learner-sales-steps" aria-label="Come funziona Recupero Debito Inglese">
          {steps.map(([number, title, copy]) => (
            <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>
          ))}
        </section>

        <section id="sblocca" className="learner-sales-unlock">
          <p className="learner-kicker">Il percorso digitale</p>
          <h2 className="learner-display">Cosa trovi dopo l’accesso</h2>
          <div className="learner-choice-grid" style={{ marginTop: '1rem' }}>
            {[
              'Piano personalizzato sul programma della scuola',
              'Sessioni con Recupera → Allenati → Modalità scuola → Mini-verifica',
              'Ripasso degli errori ricorrenti',
              'Checkpoint misti e due simulazioni quando il tempo lo permette',
              'Preparazione attuale per argomento, senza promesse sul voto',
              'Accesso agli altri contenuti Sblocco che già possiedi',
            ].map((item) => <div key={item} className="learner-choice"><Check aria-hidden="true" size={16} />{item}</div>)}
          </div>
          <p>
            Pagamento unico tramite Stripe Checkout. Il prezzo viene mostrato nel Checkout e non è codificato nella pagina. Dopo il pagamento l’accesso viene assegnato automaticamente al tuo account.
          </p>
          {error ? <p className="learner-error" role="alert">{error}</p> : null}
          <div className="learner-form-actions">
            <button
              type="button"
              className="learner-primary-button focus-ring"
              onClick={handleCheckout}
              disabled={checkoutLoading || (!offer?.owned && !offer?.configured)}
            >
              {checkoutLoading ? <><LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> Apertura Checkout...</> : offer?.owned ? 'Continua il percorso' : offer?.configured ? 'Sblocca Recupero Debito' : 'Pagamento in configurazione'}
              {!checkoutLoading ? <ArrowRight aria-hidden="true" size={16} /> : null}
            </button>
            <Link to="/test-recupero-inglese" className="learner-secondary-button focus-ring">Prima voglio vedere il mio livello</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
