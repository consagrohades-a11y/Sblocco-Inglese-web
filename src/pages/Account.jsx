import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthNotice from '../components/auth/AuthNotice';
import AuthPageShell from '../components/auth/AuthPageShell';
import { useAuth } from '../auth/AuthContext.jsx';
import { getAuthErrorMessage } from '../auth/authMessages';

function DetailRow({ label, value }) {
  return (
    <div className="border-b border-ink/10 py-4 last:border-b-0">
      <p className="text-xs font-black uppercase tracking-wide text-ink/45">{label}</p>
      <p className="mt-1 break-words text-base font-black text-ink">{value || '-'}</p>
    </div>
  );
}

const languageLabels = {
  it: 'Italiano',
  en: 'English',
};

const roleLabels = {
  learner: 'Studente',
  admin: 'Amministratore',
};

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
  const language = languageLabels[profile?.interface_language] || profile?.interface_language;
  const role = roleLabels[profile?.role] || profile?.role;
  const isAdmin = profile?.role === 'admin' && profile?.status === 'active';

  return (
    <AuthPageShell
      eyebrow="Account"
      title="Il tuo account"
      description="Controlla le informazioni principali del tuo profilo Sblocco Inglese."
    >
      <div className="grid gap-5">
        {loading ? <AuthNotice>Caricamento profilo...</AuthNotice> : null}
        {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}

        {isAdmin ? (
          <div className="rounded-xl border border-moss/20 bg-mint/25 p-5">
            <p className="text-xs font-black uppercase tracking-wide text-moss">Accesso amministratore</p>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              Il tuo profilo può accedere agli strumenti di gestione della piattaforma.
            </p>
            <Link
              to="/admin"
              className="focus-ring mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-black text-white transition hover:bg-moss"
            >
              Apri il pannello admin
            </Link>
          </div>
        ) : null}

        <div className="rounded-xl border border-ink/10 bg-white px-5">
          <DetailRow label="Nome" value={displayName} />
          <DetailRow label="Email" value={user?.email} />
          <DetailRow label="Lingua" value={language} />
          <DetailRow label="Tipo di account" value={role} />
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={handleSignOut}
          className="focus-ring rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink shadow-sm transition hover:bg-linen disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Uscita in corso...' : 'Esci dall account'}
        </button>
      </div>
    </AuthPageShell>
  );
}
