import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CalendarDays,
  Check,
  LockKeyhole,
  Mail,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import AuthNotice from '../components/auth/AuthNotice';
import LearnerAvatar from '../components/learner/LearnerAvatar.jsx';
import LearnerAvatarPicker from '../components/learner/LearnerAvatarPicker.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { getAuthErrorMessage } from '../auth/authMessages';
import { DEFAULT_LEARNER_AVATAR_BACKGROUND_KEY } from '../lib/learnerAvatars.js';
import { authPath, safeReturnTo } from '../lib/safeReturnTo.js';
import '../styles/registerJourney.css';

const JOURNEY_STEPS = [
  { label: 'Il tuo nome', short: 'Nome' },
  { label: 'Un po’ di te', short: 'Tu' },
  { label: 'Il tuo avatar', short: 'Avatar' },
  { label: 'Il tuo accesso', short: 'Accesso' },
];

const STAGE_COPY = {
  0: {
    eyebrow: 'Benvenuto in Sblocco',
    title: 'Prima di iniziare, facciamo spazio a te.',
    support: 'Niente moduli infiniti. Ti chiediamo solo ciò che serve per rendere questo spazio davvero tuo.',
  },
  1: {
    eyebrow: '01 | Il tuo nome',
    title: 'Come vuoi che ti chiamiamo?',
    support: 'È il nome che vedrai nel tuo spazio. Niente username strani, niente codici.',
  },
  2: {
    eyebrow: '02 | Un po’ di te',
    title: 'Porta dentro Sblocco un pezzetto della tua vita.',
    support: 'Professione ed età sono facoltative. Ci aiutano semplicemente a capire meglio chi abbiamo davanti.',
  },
  3: {
    eyebrow: '03 | Il tuo avatar',
    title: 'Scegli il volto del tuo spazio.',
    support: 'Non deve assomigliarti. Deve solo sembrarti tuo. Potrai cambiarlo quando vuoi.',
  },
  4: {
    eyebrow: '04 | Il tuo accesso',
    title: 'Ultimo passo. Mettiamo al sicuro il tuo spazio.',
    support: 'Email e password servono per ritrovare il tuo percorso ogni volta che torni.',
  },
};

function firstName(value) {
  return String(value || '').trim().split(/\s+/)[0] || 'tu';
}

function FieldShell({ icon: Icon, label, optional = false, children, hint }) {
  return (
    <label className="register-journey__field">
      <span className="register-journey__field-label">
        {Icon ? <Icon aria-hidden="true" /> : null}
        {label}
        {optional ? <em>facoltativo</em> : null}
      </span>
      {children}
      {hint ? <span className="register-journey__field-hint">{hint}</span> : null}
    </label>
  );
}

export default function Register() {
  const { loading, signUp, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState('forward');
  const [displayName, setDisplayName] = useState('');
  const [profession, setProfession] = useState('');
  const [age, setAge] = useState('');
  const [avatarKey, setAvatarKey] = useState(null);
  const [avatarBackgroundKey, setAvatarBackgroundKey] = useState(DEFAULT_LEARNER_AVATAR_BACKGROUND_KEY);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completionMode, setCompletionMode] = useState('');
  const [error, setError] = useState('');

  const requestedReturnTo = new URLSearchParams(location.search).get('returnTo') || location.state?.from;
  const from = safeReturnTo(requestedReturnTo, '/account');
  const activeCopy = STAGE_COPY[step] || STAGE_COPY[0];
  const name = useMemo(() => firstName(displayName), [displayName]);

  if (!loading && user && !submitting && !completionMode) {
    return <Navigate to={from} replace />;
  }

  function moveTo(nextStep, nextDirection = 'forward') {
    setError('');
    setDirection(nextDirection);
    setStep(nextStep);
  }

  function continueJourney() {
    if (step === 0) {
      moveTo(1);
      return;
    }

    if (step === 1) {
      if (displayName.trim().length < 2) {
        setError('Scrivi il nome che vuoi vedere nel tuo spazio Sblocco.');
        return;
      }
      moveTo(2);
      return;
    }

    if (step === 2) {
      if (age !== '') {
        const parsedAge = Number(age);
        if (!Number.isInteger(parsedAge) || parsedAge < 5 || parsedAge > 120) {
          setError("Inserisci un'età valida oppure lascia il campo vuoto.");
          return;
        }
      }
      moveTo(3);
      return;
    }

    if (step === 3) {
      moveTo(4);
    }
  }

  function goBack() {
    if (step <= 0 || submitting) return;
    moveTo(step - 1, 'back');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Le password non coincidono.');
      return;
    }

    if (password.length < 8) {
      setError('La password deve avere almeno 8 caratteri.');
      return;
    }

    setSubmitting(true);

    const numericAge = age === '' ? null : Number(age);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Rome';

    const { data, error: signUpError } = await signUp({
      displayName,
      profession,
      age: numericAge,
      avatarKey,
      avatarBackgroundKey,
      timezone,
      email: email.trim(),
      password,
      emailRedirectTo: `${window.location.origin}${authPath('/login', from)}`,
    });

    if (signUpError) {
      setSubmitting(false);
      setError(getAuthErrorMessage(signUpError));
      return;
    }

    setDirection('forward');
    setCompletionMode(data.session ? 'ready' : 'confirm-email');
    setSubmitting(false);
  }

  if (completionMode) {
    const sessionReady = completionMode === 'ready';

    return (
      <div className="register-journey">
        <SEO title="Benvenuto | Sblocco Inglese" description="Il tuo spazio Sblocco è pronto." />
        <div className="register-journey__completion">
          <div className="register-journey__completion-mark" aria-hidden="true"><Check /></div>
          <p className="register-journey__kicker">{sessionReady ? 'Sei dentro' : 'Ci siamo quasi'}</p>
          <h1 className="register-journey__completion-title">
            {sessionReady ? `Eccoci, ${name}.` : `Un ultimo gesto, ${name}.`}
          </h1>
          <p className="register-journey__completion-copy">
            {sessionReady
              ? 'Il tuo spazio Sblocco è pronto. Da qui in poi troverai ciò che ti serve per usare davvero l’inglese, senza strada inutile.'
              : `Ti abbiamo mandato un’email a ${email.trim()}. Apri il link di conferma e poi torna qui: il tuo spazio ti aspetta.`}
          </p>

          {sessionReady ? (
            <button type="button" className="register-journey__primary register-journey__primary--wide" onClick={() => navigate(from, { replace: true })}>
              Entra nel mio spazio <ArrowRight />
            </button>
          ) : (
            <Link className="register-journey__primary register-journey__primary--wide" to={authPath('/login', from)}>
              Ho confermato, accedi <ArrowRight />
            </Link>
          )}

          <Link to="/" className="register-journey__quiet-link">Torna al sito</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="register-journey">
      <SEO title="Crea il tuo spazio | Sblocco Inglese" description="Crea il tuo account Sblocco Inglese." />

      <header className="register-journey__topbar">
        <Link to="/" className="register-journey__brand" aria-label="Sblocco Inglese, torna alla home">
          <span>SBLOCCO</span>
          <strong>INGLESE</strong>
        </Link>

        {step > 0 ? (
          <div className="register-journey__mobile-progress" aria-label={`Passaggio ${step} di 4`}>
            <span>{String(step).padStart(2, '0')}</span>
            <div>
              {JOURNEY_STEPS.map((item, index) => (
                <i key={item.short} className={index < step ? 'is-active' : ''} />
              ))}
            </div>
            <span>04</span>
          </div>
        ) : null}

        <Link className="register-journey__login-link" to={authPath('/login', from)}>
          Hai già un account? <strong>Accedi</strong>
        </Link>
      </header>

      <main className="register-journey__layout">
        <aside className="register-journey__story">
          <div className="register-journey__story-copy">
            <p className="register-journey__kicker">{activeCopy.eyebrow}</p>
            <h1>{activeCopy.title}</h1>
            <p>{activeCopy.support}</p>
          </div>

          <div className="register-journey__art" aria-hidden="true">
            <span className="register-journey__art-orbit" />
            <img src="/assets/brand/sblocco-editorial-conversation-v2.png" alt="" />
          </div>

          {step > 0 ? (
            <ol className="register-journey__steps" aria-label="Progressione iscrizione">
              {JOURNEY_STEPS.map((item, index) => {
                const number = index + 1;
                const active = step === number;
                const complete = step > number;
                return (
                  <li key={item.label} className={active ? 'is-active' : complete ? 'is-complete' : ''}>
                    <span>{complete ? <Check /> : String(number).padStart(2, '0')}</span>
                    <p>{item.label}</p>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="register-journey__story-note">
              Quattro passaggi. Meno di due minuti. E puoi cambiare tutto più tardi.
            </p>
          )}
        </aside>

        <section className="register-journey__workspace">
          <div key={step} className={`register-journey__stage is-${direction}`}>
            {error ? <div className="register-journey__notice"><AuthNotice tone="error">{error}</AuthNotice></div> : null}

            {step === 0 ? (
              <div className="register-journey__welcome">
                <span className="register-journey__welcome-icon"><Sparkles /></span>
                <p className="register-journey__stage-eyebrow">Il tuo spazio, dall’inizio.</p>
                <h2>Non stai creando soltanto un account.</h2>
                <p>
                  Stai preparando il posto in cui troverai attività, parole, feedback e progressi. Facciamolo sembrare tuo fin dal primo minuto.
                </p>
                <button type="button" onClick={continueJourney} className="register-journey__primary">
                  Cominciamo <ArrowRight />
                </button>
              </div>
            ) : null}

            {step === 1 ? (
              <form className="register-journey__form" onSubmit={(event) => { event.preventDefault(); continueJourney(); }}>
                <div className="register-journey__stage-heading">
                  <span>Partiamo dalla cosa più semplice.</span>
                  <h2>Come ti chiami?</h2>
                  <p>Puoi usare nome e cognome, solo il nome o il modo in cui preferisci essere chiamato.</p>
                </div>

                <FieldShell icon={UserRound} label="Nome visualizzato">
                  <input
                    autoFocus
                    type="text"
                    autoComplete="name"
                    value={displayName}
                    maxLength={80}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Es. Giulia"
                    className="register-journey__input register-journey__input--large"
                  />
                </FieldShell>

                <div className="register-journey__actions">
                  <button type="button" onClick={goBack} className="register-journey__back"><ArrowLeft /> Indietro</button>
                  <button type="submit" className="register-journey__primary">Continua <ArrowRight /></button>
                </div>
              </form>
            ) : null}

            {step === 2 ? (
              <form className="register-journey__form" onSubmit={(event) => { event.preventDefault(); continueJourney(); }}>
                <div className="register-journey__stage-heading">
                  <span>Non serve un curriculum.</span>
                  <h2>Raccontaci solo due cose.</h2>
                  <p>Entrambe sono facoltative. Servono a dare un po’ più di contesto al tuo profilo.</p>
                </div>

                <div className="register-journey__field-grid">
                  <FieldShell icon={Briefcase} label="Professione" optional>
                    <input
                      type="text"
                      value={profession}
                      maxLength={80}
                      onChange={(event) => setProfession(event.target.value)}
                      placeholder="Es. Software developer"
                      className="register-journey__input"
                    />
                  </FieldShell>

                  <FieldShell icon={CalendarDays} label="Età" optional>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="5"
                      max="120"
                      value={age}
                      onChange={(event) => setAge(event.target.value)}
                      placeholder="Es. 32"
                      className="register-journey__input"
                    />
                  </FieldShell>
                </div>

                <p className="register-journey__reassurance">Non chiediamo la data di nascita. Solo l’età, se vuoi indicarla.</p>

                <div className="register-journey__actions">
                  <button type="button" onClick={goBack} className="register-journey__back"><ArrowLeft /> Indietro</button>
                  <button type="submit" className="register-journey__primary">Continua <ArrowRight /></button>
                </div>
              </form>
            ) : null}

            {step === 3 ? (
              <div className="register-journey__form register-journey__form--avatar">
                <div className="register-journey__stage-heading register-journey__stage-heading--avatar">
                  <div>
                    <span>Questa parte è solo tua.</span>
                    <h2>Scegli il tuo personaggio.</h2>
                    <p>Puoi abbinarlo al colore che preferisci e cambiarlo più avanti dalle impostazioni.</p>
                  </div>
                  <LearnerAvatar
                    avatarKey={avatarKey}
                    backgroundKey={avatarBackgroundKey}
                    displayName={displayName || name}
                    size="2xl"
                    eager
                  />
                </div>

                <div className="register-journey__avatar-scroll">
                  <LearnerAvatarPicker
                    value={avatarKey}
                    backgroundValue={avatarBackgroundKey}
                    onChange={setAvatarKey}
                    onBackgroundChange={setAvatarBackgroundKey}
                  />
                </div>

                <div className="register-journey__actions">
                  <button type="button" onClick={goBack} className="register-journey__back"><ArrowLeft /> Indietro</button>
                  <div className="register-journey__actions-right">
                    {!avatarKey ? <button type="button" onClick={() => moveTo(4)} className="register-journey__skip">Lo scelgo dopo</button> : null}
                    <button type="button" onClick={continueJourney} className="register-journey__primary">
                      {avatarKey ? 'Mi piace' : 'Continua'} <ArrowRight />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <form className="register-journey__form" onSubmit={handleSubmit}>
                <div className="register-journey__stage-heading">
                  <span>Ci siamo quasi, {name}.</span>
                  <h2>Crea il tuo accesso.</h2>
                  <p>Questi dati servono soltanto per accedere in modo sicuro al tuo spazio Sblocco.</p>
                </div>

                <FieldShell icon={Mail} label="Email">
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    required
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nome@email.it"
                    className="register-journey__input"
                  />
                </FieldShell>

                <div className="register-journey__field-grid">
                  <FieldShell icon={LockKeyhole} label="Password" hint={password && password.length < 8 ? 'Almeno 8 caratteri.' : undefined}>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      required
                      minLength={8}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Almeno 8 caratteri"
                      className="register-journey__input"
                    />
                  </FieldShell>

                  <FieldShell icon={LockKeyhole} label="Conferma password">
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      required
                      minLength={8}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Ripeti la password"
                      className="register-journey__input"
                    />
                  </FieldShell>
                </div>

                <p className="register-journey__legal">
                  Creando l’account accetti i <Link to="/termini-e-condizioni" target="_blank">Termini e condizioni</Link> e confermi di aver letto la <Link to="/privacy" target="_blank">Privacy Policy</Link>.
                </p>

                <div className="register-journey__actions">
                  <button type="button" disabled={submitting} onClick={goBack} className="register-journey__back"><ArrowLeft /> Indietro</button>
                  <button type="submit" disabled={loading || submitting} className="register-journey__primary disabled:cursor-wait disabled:opacity-60">
                    {submitting ? 'Creazione in corso...' : 'Crea il mio spazio'} {!submitting ? <ArrowRight /> : null}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
