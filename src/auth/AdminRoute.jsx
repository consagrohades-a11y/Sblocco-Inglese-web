import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export default function AdminRoute({ children }) {
  const {
    loading,
    profile,
    profileError,
    refreshProfile,
    signOut,
    user,
  } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <section className="section-shell py-16">
        <div className="mx-auto max-w-2xl rounded-lg border border-ink/10 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-black text-ink">Controllo accesso amministratore...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!profile) {
    const missing = profileError === 'missing';

    return (
      <section className="section-shell py-16">
        <div className="mx-auto max-w-2xl rounded-2xl border border-ink/10 bg-white p-7 text-center shadow-soft sm:p-9">
          <span className="eyebrow">Accesso amministratore</span>
          <h1 className="mt-4 text-3xl font-black text-ink">
            {missing ? 'Profilo in preparazione.' : 'Profilo non disponibile.'}
          </h1>
          <p className="mt-4 text-base leading-7 text-ink/65">
            La sessione è ancora valida. Riprova il caricamento invece di effettuare un nuovo accesso.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => refreshProfile()}
              className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-black text-white"
            >
              Riprova
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm font-black text-ink"
            >
              Esci
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (profile.role !== 'admin' || profile.status !== 'active') {
    return <Navigate to="/account" replace />;
  }

  return children;
}
