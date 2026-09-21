import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import AuthFormField from '../components/auth/AuthFormField';
import AuthJourneyShell from '../components/auth/AuthJourneyShell.jsx';
import AuthNotice from '../components/auth/AuthNotice';
import { useAuth } from '../auth/AuthContext.jsx';
import { getAuthErrorMessage } from '../auth/authMessages';
import { authPath, safeReturnTo } from '../lib/safeReturnTo.js';

export default function Login() {
  const { loading, signIn, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const requestedReturnTo = new URLSearchParams(location.search).get('returnTo') || location.state?.from;
  const from = safeReturnTo(requestedReturnTo, '/account');

  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  const notice = location.state?.message;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const { error: signInError } = await signIn({
      email: email.trim(),
      password,
    });

    setSubmitting(false);

    if (signInError) {
      setError(getAuthErrorMessage(signInError));
      return;
    }

    navigate(from, { replace: true });
  }

  return (
    <AuthJourneyShell
      eyebrow="Bentornato"
      title="Riprendiamo da dove avevi lasciato."
      description="Il tuo spazio Sblocco è già qui. Accedi e continua il percorso."
      topAction={(
        <span className="register-journey__login-link">
          Non hai un account? <Link to={authPath('/register', from)}><strong>Registrati</strong></Link>
        </span>
      )}
      footer={(
        <div className="auth-journey__links">
          <Link to="/forgot-password">Hai dimenticato la password?</Link>
          <Link to="/">Torna al sito</Link>
        </div>
      )}
    >
      <form className="auth-journey__form" onSubmit={handleSubmit}>
        {notice ? <AuthNotice>{notice}</AuthNotice> : null}
        {loading ? <AuthNotice>Controllo sessione in corso...</AuthNotice> : null}
        {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}

        <AuthFormField
          variant="journey"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          required
          onChange={(event) => setEmail(event.target.value)}
        />
        <AuthFormField
          variant="journey"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          required
          onChange={(event) => setPassword(event.target.value)}
        />

        <button
          type="submit"
          disabled={loading || submitting}
          className="register-journey__primary auth-journey__submit disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Accesso in corso...' : 'Entra nel mio spazio'}
          {!submitting ? <ArrowRight /> : null}
        </button>
      </form>
    </AuthJourneyShell>
  );
}
