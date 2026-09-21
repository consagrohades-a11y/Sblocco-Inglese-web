import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthFormField from '../components/auth/AuthFormField';
import AuthJourneyShell from '../components/auth/AuthJourneyShell.jsx';
import AuthNotice from '../components/auth/AuthNotice';
import { useAuth } from '../auth/AuthContext.jsx';
import { getAuthErrorMessage } from '../auth/authMessages';

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    const { error: resetError } = await requestPasswordReset({ email: email.trim() });

    setSubmitting(false);

    if (resetError) {
      setError(getAuthErrorMessage(resetError));
      return;
    }

    setSuccess('Email inviata. Apri il link che trovi nella posta e scegli una nuova password.');
  }

  return (
    <AuthJourneyShell
      eyebrow="Recupero accesso"
      title="Rientriamo nel tuo spazio."
      description="Inserisci l’email che usi per Sblocco. Ti mandiamo un link per scegliere una nuova password."
      topAction={<Link className="register-journey__login-link" to="/login"><strong>Accedi</strong></Link>}
      footer={<Link className="auth-journey__quiet-link" to="/login">Torna al login</Link>}
    >
      <form className="auth-journey__form" onSubmit={handleSubmit}>
        {success ? <AuthNotice>{success}</AuthNotice> : null}
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

        <button
          type="submit"
          disabled={submitting}
          className="register-journey__primary auth-journey__submit disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Invio in corso...' : 'Mandami il link'}
          {!submitting ? <ArrowRight /> : null}
        </button>
      </form>
    </AuthJourneyShell>
  );
}
