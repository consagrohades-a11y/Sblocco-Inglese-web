import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import AuthFormField from '../components/auth/AuthFormField';
import AuthNotice from '../components/auth/AuthNotice';
import AuthPageShell from '../components/auth/AuthPageShell';
import { useAuth } from '../auth/AuthContext.jsx';
import { getAuthErrorMessage } from '../auth/authMessages';

export default function Register() {
  const { loading, signUp, user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!loading && user) {
    return <Navigate to="/account" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Le password non coincidono.');
      return;
    }

    if (password.length < 8) {
      setError('La password e troppo debole. Usa almeno 8 caratteri.');
      return;
    }

    setSubmitting(true);

    const { data, error: signUpError } = await signUp({
      displayName,
      email: email.trim(),
      password,
    });

    setSubmitting(false);

    if (signUpError) {
      setError(getAuthErrorMessage(signUpError));
      return;
    }

    if (data.session) {
      setSuccess('Account creato. Puoi aprire la pagina account.');
      return;
    }

    setSuccess('Registrazione inviata. Controlla la tua email per confermare l account prima di accedere.');
  }

  return (
    <AuthPageShell
      eyebrow="Account"
      title="Crea account"
      description="Crea un account learner. Il profilo viene inizializzato automaticamente come learner."
      footer={(
        <>
          Hai gia un account? <Link className="text-moss underline" to="/login">Accedi</Link>
        </>
      )}
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        {loading ? <AuthNotice>Controllo sessione in corso...</AuthNotice> : null}
        {success ? <AuthNotice>{success}</AuthNotice> : null}
        {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}

        <AuthFormField
          label="Nome visualizzato"
          type="text"
          autoComplete="name"
          value={displayName}
          required
          onChange={(event) => setDisplayName(event.target.value)}
        />
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
          autoComplete="new-password"
          value={password}
          required
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
        />
        <AuthFormField
          label="Conferma password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          required
          minLength={8}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        <button
          type="submit"
          disabled={loading || submitting}
          className="focus-ring rounded-full bg-ink px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Registrazione in corso...' : 'Registrati'}
        </button>
      </form>
    </AuthPageShell>
  );
}
