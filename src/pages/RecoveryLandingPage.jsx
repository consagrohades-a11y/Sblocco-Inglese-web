import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardCheck,
  LoaderCircle,
  Route,
  ShieldCheck,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { authPath } from '../lib/safeReturnTo.js';
import { createCheckout, loadPathwayOffers } from '../lib/pathwayCommerce.js';
import { RECOVERY_OFFER_ID, RECOVERY_PATHWAY } from '../config/recovery.js';
import '../styles/learnerEditorial.css';

const steps = [
  {
    number: '01',
    title: 'Diagnostica',
    copy: 'Partiamo da ciò che sai già fare e dalle aree che richiedono più attenzione.',
    Icon: ClipboardCheck,
  },
  {
    number: '02',
    title: 'Programma della scuola',
    copy: 'Selezioni gli argomenti indicati per la prova: restano sempre dentro il percorso.',
    Icon: CalendarDays,
  },
  {
    number: '03',
    title: 'Piano',
    copy: 'Il tempo rimasto e i risultati decidono quali sessioni vengono prima.',
    Icon: Route,
  },
  {
    number: '04',
    title: 'Verifica',
    copy: 'Checkpoint e simulazioni aggiornano le priorità senza promettere un voto.',
    Icon: ShieldCheck,
  },
];

const benefits = [
  'Piano personalizzato sul programma della scuola',
  'Sessioni con Recupera → Allenati → Modalità scuola → Mini-verifica',
  'Ripasso degli errori ricorrenti',
  'Checkpoint misti e due simulazioni quando il tempo lo permette',
  'Preparazione attuale per argomento, senza promesse sul voto',
  'Accesso agli altri contenuti Sblocco che già possiedi',
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
    <div className="learner-editorial recovery-sales-page">
      <SEO
        title="Recupero Debito Inglese | Sblocco Inglese"
        description="Un percorso che usa programma scolastico, errori e tempo rimasto per dirti cosa conviene preparare oggi per la prova di recupero."
      />
      <main>
        <header className="learner-shell recovery-sales-hero">
          <div className="recovery-sales-hero__copy">
            <p className="learner-kicker">Recupero Debito Inglese</p>
            <h1 className="learner-display">Non una libreria di lezioni. <em>Un piano per la prova.</em></h1>
            <p className="recovery-sales-hero__lede">
              Inserisci la data dell’esame e il programma dato dalla scuola. Sblocco mette prima gli argomenti più importanti, riprende gli errori che si ripetono e aggiorna il percorso quando il tempo cambia.
            </p>
            <div className="learner-form-actions">
              <Link to="/test-recupero-inglese" className="learner-primary-button focus-ring">Fai il test gratuito <ArrowRight aria-hidden="true" size={16} /></Link>
              <a href="#sblocca" className="learner-secondary-button focus-ring">Vedi cosa include</a>
            </div>
            <p className="recovery-sales-hero__principle"><span>Una priorità chiara, ogni volta che studi.</span> Il percorso si adatta ai risultati e ai giorni che restano.</p>
          </div>
          <figure className="recovery-sales-hero__art" aria-hidden="true">
            <span className="recovery-sales-hero__art-label">Preparazione, non improvvisazione</span>
            <img src="/assets/brand/sblocco-editorial-recupero-v2.png" alt="" />
            <figcaption>Data, priorità, progresso.</figcaption>
          </figure>
        </header>

        <section className="learner-shell recovery-journey" aria-labelledby="recovery-journey-title">
          <div className="recovery-journey__intro">
            <p className="learner-kicker">Dal punto di partenza alla prova</p>
            <h2 id="recovery-journey-title" className="learner-display">Studia ciò che serve, <em>nell’ordine giusto.</em></h2>
            <p>La piattaforma non ti consegna una lista infinita. Trasforma il programma della scuola in una sequenza concreta, poi la corregge mentre procedi.</p>
          </div>
          <div className="recovery-journey__steps" role="list">
            {steps.map(({ number, title, copy, Icon }) => (
              <article key={number} className="recovery-journey__step" role="listitem">
                <div className="recovery-journey__marker"><Icon aria-hidden="true" size={20} /><span>{number}</span></div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="sblocca" className="recovery-offer-band">
          <div className="learner-shell recovery-offer-band__layout">
            <div className="recovery-offer-band__copy">
              <p className="learner-kicker">Il percorso digitale</p>
              <h2 className="learner-display">Cosa trovi dopo l’accesso</h2>
              <p className="recovery-offer-band__intro">Un ambiente di preparazione che mantiene insieme programma, pratica, errori e tempo rimasto. Così sai sempre da dove ripartire.</p>
              <div className="recovery-offer-band__rhythm" aria-label="Le quattro fasi di ogni sessione">
                <p>Dentro ogni sessione</p>
                <div>
                  {['Recupera', 'Allenati', 'Modalità scuola', 'Mini-verifica'].map((phase, index, phases) => (
                    <React.Fragment key={phase}>
                      <span>{phase}</span>
                      {index < phases.length - 1 ? <ArrowRight aria-hidden="true" size={13} /> : null}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
            <div className="recovery-offer-band__benefits" role="list" aria-label="Contenuti inclusi">
              {benefits.map((item) => (
                <div key={item} className="recovery-offer-band__benefit" role="listitem">
                  <Check aria-hidden="true" size={17} />
                  <p>{item}</p>
                </div>
              ))}
            </div>
            <div className="recovery-offer-band__closing">
              <div>
                <p className="learner-kicker">Prima di scegliere</p>
                <h3 className="learner-display">Guarda il punto di partenza.</h3>
                <p>Il test gratuito ti mostra le aree già solide e quelle da mettere in priorità. Nessuna previsione del voto, solo un primo quadro utile.</p>
              </div>
              <div className="recovery-offer-band__closing-actions">
                <Link to="/test-recupero-inglese" className="learner-primary-button focus-ring">Fai il test gratuito <ArrowRight aria-hidden="true" size={16} /></Link>
                {offer?.owned || offer?.configured ? (
                  <button
                    type="button"
                    className="learner-secondary-button focus-ring"
                    onClick={handleCheckout}
                    disabled={checkoutLoading}
                  >
                    {checkoutLoading ? <><LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> Apertura Checkout...</> : offer?.owned ? 'Continua il percorso' : 'Sblocca Recupero Debito'}
                    {!checkoutLoading ? <ArrowRight aria-hidden="true" size={16} /> : null}
                  </button>
                ) : (
                  <span className="recovery-offer-band__payment-status">Pagamento in configurazione</span>
                )}
                <p>Pagamento unico tramite Stripe Checkout. Il prezzo viene mostrato nel Checkout e l’accesso viene assegnato automaticamente.</p>
              </div>
              {error ? <p className="learner-error" role="alert">{error}</p> : null}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
