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
import { captureCommerceAttribution, readCommerceAttribution } from '../lib/commerceAttribution.js';
import { RECOVERY_OFFER_ID, RECOVERY_PATHWAY } from '../config/recovery.js';
import '../styles/learnerEditorial.css';

const CONSENT_VERSION = 'recovery-checkout-2026-08-14-v1';

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
    copy: 'Selezioni gli argomenti indicati per la prova: il programma della scuola resta il riferimento.',
    Icon: CalendarDays,
  },
  {
    number: '03',
    title: 'Piano',
    copy: 'La data dell’esame, il programma e i risultati decidono quali argomenti vengono prima.',
    Icon: Route,
  },
  {
    number: '04',
    title: 'Verifica per argomento',
    copy: 'Le mini-verifiche fanno emergere gli errori da recuperare con pratica mirata.',
    Icon: ShieldCheck,
  },
];

const benefits = [
  'Diagnostica iniziale per individuare priorità reali',
  'Piano personalizzato sul programma della scuola e sulla data dell’esame',
  'Sessioni con Recupera → Allenati → Modalità scuola → Mini-verifica',
  'Pratica guidata sugli argomenti assegnati dalla scuola',
  'Mini-verifiche per argomento e recupero mirato degli errori',
  'Priorità aggiornate in base al lavoro svolto, senza promesse sul voto',
];

export default function RecoveryLandingPage() {
  const { session, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [offer, setOffer] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState({
    terms: false,
    privacy: false,
    immediateAccess: false,
  });
  const consentReady = consent.terms && consent.privacy && consent.immediateAccess;

  useEffect(() => {
    captureCommerceAttribution(location.search);
  }, [location.search]);

  useEffect(() => {
    const controller = new AbortController();
    loadPathwayOffers({ pathway: RECOVERY_PATHWAY, accessToken: session?.access_token, signal: controller.signal })
      .then((payload) => setOffer((payload.offers || []).find((item) => item.id === RECOVERY_OFFER_ID) || null))
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') setOffer(null);
      });
    return () => controller.abort();
  }, [session?.access_token]);

  function updateConsent(key) {
    setConsent((current) => ({ ...current, [key]: !current[key] }));
  }

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
    if (!consentReady) {
      setError('Prima di continuare, conferma i tre punti richiesti per l’acquisto digitale.');
      return;
    }
    setCheckoutLoading(true);
    try {
      const payload = await createCheckout({
        offerId: RECOVERY_OFFER_ID,
        accessToken: session.access_token,
        consent: { ...consent, version: CONSENT_VERSION },
        attribution: readCommerceAttribution(),
      });
      if (!payload.url) throw new Error('Checkout non disponibile.');
      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(
        checkoutError.code === 'already_owned'
          ? 'Hai già accesso a Recupero Debito Inglese.'
          : checkoutError.code === 'consent_required'
            ? 'Prima di continuare, conferma i tre punti richiesti per l’acquisto digitale.'
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
              Inserisci la data dell’esame e il programma dato dalla scuola. Sblocco mette prima gli argomenti più importanti, riprende gli errori che si ripetono e aggiorna le priorità mentre procedi.
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
            <p>La piattaforma non ti consegna una lista infinita. Trasforma il programma della scuola in una sequenza concreta e usa le verifiche per argomento per indirizzare il recupero.</p>
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
                <div className="rounded-2xl border border-ink/10 bg-white/70 p-4 text-left dark:border-white/10 dark:bg-white/[0.05]">
                  <p className="text-lg font-black text-ink dark:text-white">€39 — pagamento unico</p>
                  <p className="mt-1 text-sm font-bold text-ink/65 dark:text-white/65">Nessun abbonamento</p>
                </div>
                <Link to="/test-recupero-inglese" className="learner-primary-button focus-ring">Fai il test gratuito <ArrowRight aria-hidden="true" size={16} /></Link>
                {!offer?.owned ? (
                  <fieldset className="grid gap-3 rounded-2xl border border-ink/10 bg-white/60 p-4 text-left text-sm leading-6 dark:border-white/10 dark:bg-white/[0.04]">
                    <legend className="px-1 font-black text-ink dark:text-white">Conferme prima del pagamento</legend>
                    <label className="flex items-start gap-3">
                      <input type="checkbox" checked={consent.terms} onChange={() => updateConsent('terms')} className="mt-1 h-4 w-4" />
                      <span>Ho letto e accetto i <Link className="font-bold underline" to="/termini-e-condizioni" target="_blank" rel="noreferrer">Termini e Condizioni</Link>.</span>
                    </label>
                    <label className="flex items-start gap-3">
                      <input type="checkbox" checked={consent.privacy} onChange={() => updateConsent('privacy')} className="mt-1 h-4 w-4" />
                      <span>Confermo di aver letto la <Link className="font-bold underline" to="/privacy-policy" target="_blank" rel="noreferrer">Privacy Policy</Link>.</span>
                    </label>
                    <label className="flex items-start gap-3">
                      <input type="checkbox" checked={consent.immediateAccess} onChange={() => updateConsent('immediateAccess')} className="mt-1 h-4 w-4" />
                      <span>Chiedo che l’accesso digitale inizi subito dopo il pagamento, prima della scadenza dell’eventuale periodo di recesso, e dichiaro di aver compreso che l’avvio immediato può incidere sul diritto di recesso nei casi e nei limiti previsti dalla legge.</span>
                    </label>
                  </fieldset>
                ) : null}
                {offer?.owned || offer?.configured ? (
                  <button
                    type="button"
                    className="learner-secondary-button focus-ring"
                    onClick={handleCheckout}
                    disabled={checkoutLoading || (!offer?.owned && !consentReady)}
                  >
                    {checkoutLoading ? <><LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> Apertura Checkout...</> : offer?.owned ? 'Continua il percorso' : 'Acquista a €39'}
                    {!checkoutLoading ? <ArrowRight aria-hidden="true" size={16} /> : null}
                  </button>
                ) : (
                  <span className="recovery-offer-band__payment-status">Pagamento in configurazione</span>
                )}
                <p>Pagamento unico tramite Stripe Checkout. L’accesso viene assegnato dopo la conferma del pagamento.</p>
              </div>
              {error ? <p className="learner-error" role="alert">{error}</p> : null}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
