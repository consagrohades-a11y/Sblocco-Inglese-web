import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthFormField from '../components/auth/AuthFormField';
import AuthNotice from '../components/auth/AuthNotice';
import AuthPageShell from '../components/auth/AuthPageShell';
import { useAuth } from '../auth/AuthContext.jsx';
import { getAuthErrorMessage } from '../auth/authMessages';

export default function UpdatePassword() {
  const { loading, session, signOut, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const hasRecoverySession = Boolean(session);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!hasRecoverySession) {
      setError('Il link di recupero non e valido o e scaduto. Richiedi una nuova email di recupero password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Le password non coincidono.');
      return;
    }

    if (password.length < 8) {
      setError('La password e troppo debole. Usa almeno 8 caratteri.');
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await updatePassword({ password });

    if (updateError) {
      setSubmitting(false);
      setError(getAuthErrorMessage(updateError));
      return;
    }

    setSuccess('Password aggiornata. Tra poco potrai accedere con la nuova password.');
    await signOut();
    setSubmitting(false);

    window.setTimeout(() => {
      navigate('/login', {
        replace: true,
        state: { message: 'Password aggiornata. Accedi con la nuova password.' },
      });
    }, 1200);
  }

  return (
    <AuthPageShell
      eyebrow="Account"
      title="Aggiorna password"
      description="Imposta una nuova password dopo aver aperto il link di recupero ricevuto via email."
      footer={<Link className="text-moss underline" to="/forgot-password">Richiedi un nuovo link</Link>}
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        {loading ? <AuthNotice>Controllo link di recupero...</AuthNotice> : null}
        {!loading && !hasRecoverySession ? (
          <AuthNotice tone="error">
            Il link di recupero non e valido o e scaduto. Richiedi una nuova email di recupero password.
          </AuthNotice>
        ) : null}
        {success ? <AuthNotice>{success}</AuthNotice> : null}
        {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}

        <AuthFormField
          label="Nuova password"
          type="password"
          autoComplete="new-password"
          value={password}
          required
          minLength={8}
          disabled={loading || !hasRecoverySession || submitting || Boolean(success)}
          onChange={(event) => setPassword(event.target.value)}
        />
        <AuthFormField
          label="Conferma nuova password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          required
          minLength={8}
          disabled={loading || !hasRecoverySession || submitting || Boolean(success)}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        <button
          type="submit"
          disabled={loading || !hasRecoverySession || submitting || Boolean(success)}
          className="focus-ring rounded-full bg-ink px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Aggiornamento in corso...' : 'Aggiorna password'}
        </button>
      </form>
    </AuthPageShell>
  );
}
