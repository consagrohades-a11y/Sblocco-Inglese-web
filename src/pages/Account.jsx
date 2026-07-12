import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthNotice from '../components/auth/AuthNotice';
import AuthPageShell from '../components/auth/AuthPageShell';
import { useAuth } from '../auth/AuthContext.jsx';
import { getAuthErrorMessage } from '../auth/authMessages';

function DetailRow({ label, value }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-linen/50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-ink/45">{label}</p>
      <p className="mt-1 break-words text-base font-black text-ink">{value || '-'}</p>
    </div>
  );
}

export default function Account() {
  const { loading, profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSignOut() {
    setError('');
    setSubmitting(true);
    const { error: signOutError } = await signOut();
    setSubmitting(false);

    if (signOutError) {
      setError(getAuthErrorMessage(signOutError));
      return;
    }

    navigate('/', { replace: true });
  }

  const displayName = profile?.display_name || user?.user_metadata?.display_name || '';

  return (
    <AuthPageShell
      eyebrow="Account"
      title="Il tuo account"
      description="Qui trovi le prime informazioni del profilo collegato a Supabase Auth."
    >
      <div className="grid gap-4">
        {loading ? <AuthNotice>Caricamento profilo...</AuthNotice> : null}
        {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}
        <DetailRow label="Nome visualizzato" value={displayName} />
        <DetailRow label="Email" value={user?.email} />
        <DetailRow label="Lingua interfaccia" value={profile?.interface_language} />
        <DetailRow label="Ruolo account" value={profile?.role} />
        <button
          type="button"
          disabled={submitting}
          onClick={handleSignOut}
          className="focus-ring mt-2 rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink shadow-sm transition hover:bg-linen disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Uscita in corso...' : 'Logout'}
        </button>
      </div>
    </AuthPageShell>
  );
}
