import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthFormField from '../components/auth/AuthFormField';
import AuthNotice from '../components/auth/AuthNotice';
import AuthPageShell from '../components/auth/AuthPageShell';
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

    setSuccess('Email di recupero inviata. Controlla la posta e segui il link di Supabase.');
  }

  return (
    <AuthPageShell
      eyebrow="Account"
      title="Recupera password"
      description="Inserisci la tua email e riceverai un link per reimpostare la password."
      footer={<Link className="text-moss underline" to="/login">Torna al login</Link>}
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        {success ? <AuthNotice>{success}</AuthNotice> : null}
        {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}
        <AuthFormField
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
          className="focus-ring rounded-full bg-ink px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Invio in corso...' : 'Invia email di recupero'}
        </button>
      </form>
    </AuthPageShell>
  );
}
