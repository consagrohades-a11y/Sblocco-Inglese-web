import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthFormField from '../components/auth/AuthFormField';
import AuthNotice from '../components/auth/AuthNotice';
import AuthPageShell from '../components/auth/AuthPageShell';
import { useAuth } from '../auth/AuthContext.jsx';
import { getAuthErrorMessage } from '../auth/authMessages';

export default function Login() {
  const { loading, signIn, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!loading && user) {
    return <Navigate to="/account" replace />;
  }

  const from = location.state?.from || '/account';
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
    <AuthPageShell
      eyebrow="Account"
      title="Accedi"
      description="Entra con email e password per vedere il tuo account Sblocco Inglese."
      footer={(
        <>
          Non hai un account? <Link className="text-moss underline" to="/register">Registrati</Link>
          <span className="mx-2 text-ink/30">/</span>
          <Link className="text-moss underline" to="/forgot-password">Password dimenticata?</Link>
        </>
      )}
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        {notice ? <AuthNotice>{notice}</AuthNotice> : null}
        {loading ? <AuthNotice>Controllo sessione in corso...</AuthNotice> : null}
        {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}

        <AuthFormField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          required
          onChange={(event) => setEmail(event.target.value)}
        />
        <AuthFormField
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
          className="focus-ring rounded-full bg-ink px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Accesso in corso...' : 'Accedi'}
        </button>
      </form>
    </AuthPageShell>
  );
}
