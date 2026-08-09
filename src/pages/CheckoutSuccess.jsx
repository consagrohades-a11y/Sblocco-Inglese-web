import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock3, LoaderCircle, RefreshCw } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import SEO from '../components/SEO.jsx';
import { loadCheckoutStatus } from '../lib/pathwayCommerce.js';

export default function CheckoutSuccess() {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const automaticChecks = useRef(0);

  const checkStatus = useCallback(async ({ silent = false } = {}) => {
    if (!sessionId || !session?.access_token) {
      setError('La sessione di pagamento non è valida.');
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError('');
    try {
      const payload = await loadCheckoutStatus({ sessionId, accessToken: session.access_token });
      setResult(payload);
    } catch (statusError) {
      setError(statusError.message || 'Non è stato possibile verificare l’accesso.');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, sessionId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    if (!result || result.fulfilled || result.status === 'failed' || automaticChecks.current >= 2) return undefined;
    automaticChecks.current += 1;
    const timer = window.setTimeout(() => checkStatus({ silent: true }), automaticChecks.current === 1 ? 3500 : 6500);
    return () => window.clearTimeout(timer);
  }, [checkStatus, result]);

  return (
    <>
      <SEO title="Pagamento completato | Sblocco Inglese" description="Verifica del pagamento e dell’accesso al tuo percorso Sblocco Inglese." />
      <section className="section-shell py-16 sm:py-24">
        <div className="mx-auto max-w-2xl overflow-hidden rounded-[2rem] border border-ink/10 bg-white shadow-soft dark:border-white/10 dark:bg-surface-900">
          <div className="bg-ink p-8 text-white sm:p-10">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-mint text-moss"><CheckCircle2 aria-hidden="true" className="h-6 w-6" /></span>
            <h1 className="mt-6 text-4xl font-black sm:text-5xl">Pagamento completato</h1>
            <p className="mt-4 text-base leading-7 text-white/70">Stiamo verificando il tuo accesso.</p>
          </div>
          <div className="p-8 sm:p-10">
            {loading && !result ? <p className="flex items-center gap-3 text-sm font-bold text-ink/70 dark:text-white/70"><LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin text-moss" />Controllo del webhook in corso...</p> : null}
            {result?.fulfilled ? (
              <div>
                <h2 className="text-2xl font-black text-ink dark:text-white">Il tuo percorso è pronto.</h2>
                <p className="mt-3 text-sm leading-6 text-ink/65 dark:text-white/65">Il pagamento è stato verificato e l’accesso è stato associato al tuo account.</p>
                <Link to={result.accessUrl || '/account'} className="focus-ring mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-moss px-6 py-3 text-sm font-black text-white hover:bg-[#096d58]">Vai al mio percorso</Link>
              </div>
            ) : result?.status === 'failed' ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100">
                <h2 className="font-black">L’accesso non è stato attivato.</h2>
                <p className="mt-2 text-sm leading-6">La verifica ha rilevato un problema. Nessun accesso viene simulato: contatta l’assistenza indicando l’email del tuo account.</p>
              </div>
            ) : result ? (
              <div>
                <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100">
                  <Clock3 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
                  <div><h2 className="font-black">Il pagamento è stato ricevuto.</h2><p className="mt-2 text-sm leading-6">Il tuo accesso potrebbe richiedere qualche secondo.</p></div>
                </div>
                <button type="button" onClick={() => checkStatus()} disabled={loading} className="focus-ring mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 text-sm font-black text-ink dark:border-white/15 dark:text-white">
                  <RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Aggiorna stato
                </button>
              </div>
            ) : null}
            {error ? <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100" role="alert">{error}</p> : null}
          </div>
        </div>
      </section>
    </>
  );
}

