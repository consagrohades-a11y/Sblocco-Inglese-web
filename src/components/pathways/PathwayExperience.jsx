import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  MessagesSquare,
  Route,
  Send,
  Sparkles,
  Target,
  UserRound,
  Wrench,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import SEO from '../SEO.jsx';
import FAQAccordion from '../FAQAccordion.jsx';
import { authPath } from '../../lib/safeReturnTo.js';
import { createCheckout, loadPathwayOffers } from '../../lib/pathwayCommerce.js';
import { createPathwayIntake } from '../../lib/pathwayIntakeApi.js';
import '../../styles/pathways.css';

const stageIcons = [Compass, UserRound, BriefcaseBusiness, MessagesSquare, Wrench, CheckCircle2];
const methodIcons = [Target, BookOpen, MessageCircle, Route];

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function PathwayHero({ pathway }) {
  return (
    <header className="pathway-hero">
      <div className="pathway-shell pathway-hero__layout">
        <div className="pathway-hero__copy">
          <p className="pathway-kicker">{pathway.eyebrow}</p>
          <h1>{pathway.title.split('\n').map((line) => <React.Fragment key={line}>{line}<br /></React.Fragment>)}</h1>
          <p className="pathway-hero__support">{pathway.support}</p>
          <div className="pathway-actions">
            <button type="button" className="pathway-button pathway-button--primary" onClick={() => scrollToId('supporto')}>
              {pathway.primaryCta}
              <ArrowDown aria-hidden="true" />
            </button>
            <button type="button" className="pathway-text-link" onClick={() => scrollToId('cosa-allenerai')}>
              {pathway.secondaryCta}
              <ArrowDown aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="pathway-hero__visual" aria-hidden="true">
          <span className="pathway-hero__orbit pathway-hero__orbit--one" />
          <span className="pathway-hero__orbit pathway-hero__orbit--two" />
          <div className="pathway-hero__statement">
            <span>01</span>
            <strong>Situazione</strong>
            <small>Che cosa devi gestire?</small>
          </div>
          <div className="pathway-hero__statement pathway-hero__statement--middle">
            <span>02</span>
            <strong>Lingua</strong>
            <small>Che cosa ti serve per farlo?</small>
          </div>
          <div className="pathway-hero__statement pathway-hero__statement--last">
            <span>03</span>
            <strong>Pratica</strong>
            <small>Come lo rendi più disponibile?</small>
          </div>
        </div>
      </div>
    </header>
  );
}

function GoalBreakdown({ goals }) {
  return (
    <section id="cosa-allenerai" className="pathway-section pathway-section--goals">
      <div className="pathway-shell">
        <div className="pathway-heading pathway-heading--center">
          <p className="pathway-kicker">IL PERCORSO REALE</p>
          <h2>Cosa devi riuscire a fare?</h2>
          <p>Non un elenco di capitoli, ma una sequenza di azioni che devi riuscire a gestire in inglese.</p>
        </div>
        <ol className="pathway-journey">
          {goals.map((goal, index) => {
            const Icon = stageIcons[index % stageIcons.length];
            return (
              <li key={goal.title}>
                <div className="pathway-journey__marker"><span>{String(index + 1).padStart(2, '0')}</span><Icon aria-hidden="true" /></div>
                <div>
                  <h3>{goal.title}</h3>
                  <p>{goal.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function BottleneckSelector({ pathway, selected, onSelect }) {
  return (
    <section className="pathway-section pathway-section--bottlenecks">
      <div className="pathway-shell pathway-split">
        <div className="pathway-heading">
          <p className="pathway-kicker">IL PUNTO DI BLOCCO</p>
          <h2>Dove ti blocchi?</h2>
          <p>{pathway.bottleneckIntro}</p>
          <p className="pathway-note">Questa scelta resta nel browser e serve solo a evidenziare il livello di supporto più pertinente.</p>
        </div>
        <div className="pathway-choice-list" role="list" aria-label="Possibili punti di blocco">
          {pathway.bottlenecks.map((item, index) => {
            const active = selected === index;
            return (
              <button
                key={item.label}
                type="button"
                className={active ? 'is-active' : ''}
                aria-pressed={active}
                onClick={() => onSelect(active ? null : index)}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{item.label}</strong>
                <Check aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AppliedMethod({ pathway }) {
  return (
    <section className="pathway-section pathway-method">
      <div className="pathway-shell">
        <div className="pathway-heading pathway-heading--light pathway-heading--center">
          <p className="pathway-kicker">IL METODO APPLICATO</p>
          <h2>{pathway.methodHeading}</h2>
          <p>Scomponiamo la situazione e alleniamo, passo dopo passo, l’inglese che serve per gestirla.</p>
        </div>
        <ol className="pathway-method__steps">
          {pathway.method.map((item, index) => {
            const Icon = methodIcons[index % methodIcons.length];
            return (
              <li key={item.label}>
                <div className="pathway-method__icon"><Icon aria-hidden="true" /></div>
                <span>{item.label}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </li>
            );
          })}
        </ol>
        {pathway.foundationNote ? (
          <div className="pathway-foundation-link">
            <BookOpen aria-hidden="true" />
            <p><strong>{pathway.foundationNote}</strong><span>Il percorso usa l’architettura English Foundations già presente, senza duplicarla.</span></p>
            <Link to={pathway.foundationLink}>Apri English Foundations <ArrowRight aria-hidden="true" /></Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TryItSection({ tryIt }) {
  const [showExample, setShowExample] = useState(false);
  return (
    <section className="pathway-section pathway-try">
      <div className="pathway-shell pathway-try__layout">
        <div className="pathway-heading">
          <p className="pathway-kicker">UNA PICCOLA PROVA</p>
          <h2>Prova adesso</h2>
          {tryIt.scenario ? <p className="pathway-try__scenario">{tryIt.scenario}</p> : null}
          <blockquote>{tryIt.prompt}</blockquote>
          <p>{tryIt.instruction}</p>
        </div>
        <div className="pathway-try__workbench">
          <ol className="pathway-try__steps">
            {tryIt.steps.map((step, index) => <li key={step}><span>{index + 1}</span><strong>{step}</strong></li>)}
          </ol>
          <button type="button" className="pathway-button pathway-button--navy" aria-expanded={showExample} onClick={() => setShowExample((value) => !value)}>
            {showExample ? 'Nascondi l’esempio' : 'Mostra un esempio'}
            <Sparkles aria-hidden="true" />
          </button>
          <div className={`pathway-try__reveal ${showExample ? 'is-visible' : ''}`} aria-hidden={!showExample}>
            <div>
              <p className="pathway-try__answer">{tryIt.modelAnswer}</p>
              <p className="pathway-try__explanation"><Lightbulb aria-hidden="true" />{tryIt.explanation}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckoutAction({ option, state, loading, onCheckout }) {
  if (state?.owned) {
    return <Link className="pathway-support__cta pathway-support__cta--owned" to={state.accessUrl || '/account'}>Vai al percorso <ArrowRight aria-hidden="true" /></Link>;
  }

  if (!state?.configured) {
    return <button type="button" className="pathway-support__cta" disabled>Prossimamente</button>;
  }

  return (
    <button type="button" className="pathway-support__cta pathway-support__cta--buy" disabled={loading} onClick={() => onCheckout(option.offerId)}>
      {loading ? <><LoaderCircle className="animate-spin" aria-hidden="true" />Apertura Checkout...</> : <>Scegli questo percorso <ArrowRight aria-hidden="true" /></>}
    </button>
  );
}

function SupportOptions({ pathway, recommendation }) {
  const { session, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [offers, setOffers] = useState({});
  const [checkoutOffer, setCheckoutOffer] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    loadPathwayOffers({ pathway: pathway.slug, accessToken: session?.access_token, signal: controller.signal })
      .then((payload) => {
        const indexed = Object.fromEntries((payload.offers || []).map((offer) => [offer.id, offer]));
        setOffers(indexed);
      })
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') setOffers({});
      });
    return () => controller.abort();
  }, [pathway.slug, session?.access_token]);

  async function handleCheckout(offerId) {
    setError('');
    const returnTo = `${location.pathname}#supporto`;
    if (!user || !session?.access_token) {
      navigate(authPath('/login', returnTo), { state: { from: returnTo, message: 'Accedi o crea un account per continuare verso il pagamento.' } });
      return;
    }

    setCheckoutOffer(offerId);
    try {
      const payload = await createCheckout({ offerId, accessToken: session.access_token });
      if (!payload.url) throw new Error('Stripe Checkout non ha restituito un indirizzo valido.');
      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(checkoutError.message || 'Non è stato possibile aprire il pagamento.');
      setCheckoutOffer('');
    }
  }

  return (
    <section id="supporto" className="pathway-section pathway-support">
      <div className="pathway-shell">
        <div className="pathway-heading pathway-heading--center">
          <p className="pathway-kicker">LIVELLO DI SUPPORTO</p>
          <h2>Come vuoi prepararti?</h2>
          <p>Non è un negozio generico. Scegli quanta struttura, pratica e presenza umana ti servono per questo obiettivo.</p>
        </div>
        {recommendation ? <p className="pathway-support__recommendation"><Sparkles aria-hidden="true" />In base al blocco selezionato, abbiamo evidenziato il supporto più pertinente. Non è un risultato diagnostico.</p> : null}
        <div className="pathway-support__grid">
          {pathway.supportOptions.map((option) => {
            const recommended = recommendation === option.key;
            const state = offers[option.offerId];
            const destination = option.kind === 'intake' && pathway.intake ? '#colloquio-intake' : '/contatti#scrivi-domanda';
            return (
              <article key={option.key} className={recommended ? 'is-recommended' : ''}>
                <div className="pathway-support__topline">
                  <span>{option.kind === 'checkout' ? 'DIGITALE' : option.kind === 'intake' ? 'MIRATA' : 'CON SUPPORTO'}</span>
                  {recommended ? <strong>Più pertinente</strong> : null}
                </div>
                <h3>{option.title}</h3>
                <p>{option.purpose}</p>
                <ul>{option.includes.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul>
                <div className="pathway-support__footer">
                  {option.kind === 'checkout' ? (
                    <>
                      <p className="pathway-support__price-note">{state?.configured ? 'Pagamento unico tramite Stripe Checkout. Il prezzo viene mostrato da Stripe.' : 'Nessun prezzo o prodotto è ancora configurato.'}</p>
                      <CheckoutAction option={option} state={state} loading={checkoutOffer === option.offerId} onCheckout={handleCheckout} />
                    </>
                  ) : (
                    <>
                      <p className="pathway-support__price-note">Richiesta di informazioni, senza pagamento immediato.</p>
                      {destination.startsWith('#') ? (
                        <button type="button" className="pathway-support__cta" onClick={() => scrollToId(destination.slice(1))}>{option.cta} <ArrowDown aria-hidden="true" /></button>
                      ) : <Link className="pathway-support__cta" to={destination}>{option.cta} <ArrowRight aria-hidden="true" /></Link>}
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        {error ? <p className="pathway-form-message pathway-form-message--error" role="alert">{error}</p> : null}
        <p className="pathway-support__security"><LockKeyhole aria-hidden="true" />Gli acquisti digitali richiedono un account. Importo, Price ID e accesso vengono sempre determinati dal server, mai dal browser.</p>
      </div>
    </section>
  );
}

function InterviewIntake({ pathway }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage(null);
    if (!user) {
      const returnTo = `${location.pathname}#colloquio-intake`;
      navigate(authPath('/login', returnTo), { state: { from: returnTo, message: 'Accedi o crea un account per inviare i dettagli del colloquio.' } });
      return;
    }

    const data = new FormData(event.currentTarget);
    const role = String(data.get('role') || '').trim();
    if (!role) {
      setMessage({ tone: 'error', text: 'Indica almeno il ruolo per aiutarci a capire la situazione.' });
      return;
    }

    setSubmitting(true);
    try {
      await createPathwayIntake({
        userId: user.id,
        pathway: pathway.slug,
        interviewDate: data.get('interviewDate'),
        role,
        company: data.get('company'),
        interviewType: data.get('interviewType'),
        practicalTest: data.get('practicalTest'),
        note: data.get('note'),
      });
      event.currentTarget.reset();
      setMessage({ tone: 'success', text: 'Richiesta ricevuta. I dettagli sono stati salvati e verranno usati solo per valutare la preparazione più adatta.' });
    } catch (error) {
      setMessage({ tone: 'error', text: error.message || 'Non è stato possibile inviare la richiesta.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="colloquio-intake" className="pathway-section pathway-intake">
      <div className="pathway-shell pathway-intake__layout">
        <div className="pathway-heading">
          <p className="pathway-kicker">PREPARAZIONE MIRATA</p>
          <h2>Hai già un colloquio?</h2>
          <p>Se hai già una data, un ruolo o un’azienda, possiamo partire direttamente dalla situazione che dovrai affrontare.</p>
          <div className="pathway-intake__promise"><ClipboardCheck aria-hidden="true" /><span>Questa è una richiesta di preparazione, non un pagamento e non una prenotazione automatica.</span></div>
        </div>
        <form onSubmit={handleSubmit} className="pathway-intake__form">
          <div className="pathway-form-grid">
            <label>Data del colloquio <span>opzionale</span><input name="interviewDate" type="date" /></label>
            <label>Ruolo<input name="role" type="text" maxLength="180" required placeholder="Es. Product Manager" /></label>
            <label>Azienda <span>opzionale</span><input name="company" type="text" maxLength="180" placeholder="Nome dell’azienda" /></label>
            <label>Tipo di colloquio <span>opzionale</span><input name="interviewType" type="text" maxLength="180" placeholder="Es. primo colloquio, tecnico, panel" /></label>
          </div>
          <fieldset>
            <legend>È prevista una prova tecnica o pratica?</legend>
            <label><input name="practicalTest" type="radio" value="yes" /> Sì</label>
            <label><input name="practicalTest" type="radio" value="no" /> No</label>
            <label><input name="practicalTest" type="radio" value="unknown" defaultChecked /> Non lo so</label>
          </fieldset>
          <label className="pathway-form-note">Nota <span>opzionale</span><textarea name="note" maxLength="1500" rows="4" placeholder="Aggiungi ciò che può aiutarci a capire la situazione." /></label>
          <button type="submit" className="pathway-button pathway-button--primary" disabled={submitting}>
            {submitting ? <><LoaderCircle className="animate-spin" aria-hidden="true" />Invio in corso...</> : <>Prepara il mio colloquio <Send aria-hidden="true" /></>}
          </button>
          {!user ? <p className="pathway-form-login">Per proteggere la richiesta, ti verrà chiesto di accedere o creare un account prima dell’invio.</p> : null}
          {message ? <p className={`pathway-form-message pathway-form-message--${message.tone}`} role="status">{message.text}</p> : null}
        </form>
      </div>
    </section>
  );
}

function PathwayFAQ({ items }) {
  return (
    <section className="pathway-section pathway-faq">
      <div className="pathway-shell pathway-split">
        <div className="pathway-heading">
          <p className="pathway-kicker">DOMANDE FREQUENTI</p>
          <h2>Prima di scegliere<span className="pathway-faq__punctuation">?</span></h2>
          <p>Risposte concrete su livello, obiettivo e modo di lavorare. Nessuna promessa di risultato garantito.</p>
        </div>
        <FAQAccordion items={items} />
      </div>
    </section>
  );
}

function FinalCTA({ pathway }) {
  return (
    <section className="pathway-final">
      <div className="pathway-shell pathway-final__inner">
        <p className="pathway-kicker">IL PROSSIMO PASSO</p>
        <h2>{pathway.finalCta.title}</h2>
        <p>{pathway.finalCta.copy}</p>
        <div className="pathway-actions pathway-actions--center">
          <button type="button" className="pathway-button pathway-button--primary" onClick={() => scrollToId(pathway.intake ? 'colloquio-intake' : 'supporto')}>
            {pathway.finalCta.primary}<ArrowDown aria-hidden="true" />
          </button>
          {pathway.slug === 'basi' ? (
            <Link className="pathway-text-link" to={pathway.foundationLink}>{pathway.finalCta.secondary}<ArrowRight aria-hidden="true" /></Link>
          ) : (
            <button type="button" className="pathway-text-link" onClick={() => scrollToId('supporto')}>{pathway.finalCta.secondary}<ArrowRight aria-hidden="true" /></button>
          )}
        </div>
      </div>
    </section>
  );
}

export default function PathwayExperience({ pathway }) {
  const [selectedBottleneck, setSelectedBottleneck] = useState(null);
  const recommendation = useMemo(
    () => selectedBottleneck === null ? null : pathway.bottlenecks[selectedBottleneck]?.recommendation,
    [pathway.bottlenecks, selectedBottleneck],
  );

  return (
    <div className="pathway-editorial">
      <SEO title={pathway.seo.title} description={pathway.seo.description} />
      <PathwayHero pathway={pathway} />
      <GoalBreakdown goals={pathway.goals} />
      <BottleneckSelector pathway={pathway} selected={selectedBottleneck} onSelect={setSelectedBottleneck} />
      <AppliedMethod pathway={pathway} />
      <TryItSection tryIt={pathway.tryIt} />
      <SupportOptions pathway={pathway} recommendation={recommendation} />
      {pathway.intake ? <InterviewIntake pathway={pathway} /> : null}
      <PathwayFAQ items={pathway.faqs} />
      <FinalCTA pathway={pathway} />
    </div>
  );
}
