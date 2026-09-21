import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthFormField from '../components/auth/AuthFormField';
import AuthJourneyShell from '../components/auth/AuthJourneyShell.jsx';
import AuthNotice from '../components/auth/AuthNotice';
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
      setError('Il link di recupero non è valido o è scaduto. Richiedi una nuova email.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Le password non coincidono.');
      return;
    }

    if (password.length < 8) {
      setError('Usa almeno 8 caratteri.');
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await updatePassword({ password });

    if (updateError) {
      setSubmitting(false);
      setError(getAuthErrorMessage(updateError));
      return;
    }

    setSuccess('Password aggiornata. Ti riportiamo al login.');
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
    <AuthJourneyShell
      eyebrow="Nuova password"
      title="Rimettiamo tutto a posto."
      description="Scegli una nuova password per tornare nel tuo spazio Sblocco."
      topAction={<Link className="register-journey__login-link" to="/login"><strong>Accedi</strong></Link>}
      footer={<Link className="auth-journey__quiet-link" to="/forgot-password">Richiedi un nuovo link</Link>}
    >
      <form className="auth-journey__form" onSubmit={handleSubmit}>
        {loading ? <AuthNotice>Controllo link di recupero...</AuthNotice> : null}
        {!loading && !hasRecoverySession ? (
          <AuthNotice tone="error">
            Il link di recupero non è valido o è scaduto. Richiedi una nuova email di recupero.
          </AuthNotice>
        ) : null}
        {success ? <AuthNotice>{success}</AuthNotice> : null}
        {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}

        <AuthFormField
          variant="journey"
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
          variant="journey"
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
          className="register-journey__primary auth-journey__submit disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Aggiornamento in corso...' : 'Salva la nuova password'}
          {!submitting ? <ArrowRight /> : null}
        </button>
      </form>
    </AuthJourneyShell>
  );
}
