import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { loading, user, profile, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <section className="section-shell py-16">
        <div className="mx-auto max-w-2xl rounded-lg border border-ink/10 bg-white p-6 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
          <p className="text-sm font-black text-ink dark:text-white">Caricamento account...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (profile && profile.status !== 'active') {
    const removed = profile.status === 'deleted';
    return (
      <section className="section-shell py-16">
        <div className="mx-auto max-w-2xl rounded-2xl border border-ink/10 bg-white p-7 text-center shadow-soft dark:border-white/10 dark:bg-surface-900 sm:p-9">
          <span className="eyebrow">Accesso account</span>
          <h1 className="mt-4 text-3xl font-black text-ink dark:text-white">{removed ? 'Account rimosso' : 'Account sospeso'}</h1>
          <p className="mt-4 text-base leading-7 text-ink/65 dark:text-white/60">
            {removed
              ? 'Questo account non ha più accesso alle attività Sblocco Inglese. Lo storico didattico è stato conservato e può essere ripristinato dall’amministrazione.'
              : 'L’accesso alle attività è temporaneamente sospeso. Contatta l’amministrazione per riattivare il percorso.'}
          </p>
          <button type="button" onClick={() => signOut()} className="focus-ring mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-black text-white transition hover:bg-moss">Esci dall’account</button>
        </div>
      </section>
    );
  }

  return children;
}
