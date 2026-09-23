import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthJourneyShell from '../components/auth/AuthJourneyShell.jsx';
import AuthNotice from '../components/auth/AuthNotice';
import { useAuth } from '../auth/AuthContext.jsx';
import { getAuthErrorMessage } from '../auth/authMessages.js';
import { safeReturnTo } from '../lib/safeReturnTo.js';
import { supabase } from '../lib/supabaseClient.js';

function readHashParams(hash) {
  return new URLSearchParams(String(hash || '').replace(/^#/, ''));
}

async function getSessionWithRetry() {
  const delays = [0, 120, 260, 520];

  for (const delay of delays) {
    if (delay) {
      await new Promise((resolve) => window.setTimeout(resolve, delay));
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data.session) return data.session;
  }

  return null;
}

export default function AuthCallback() {
  const { loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const startedRef = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading || startedRef.current) return undefined;

    startedRef.current = true;
    let cancelled = false;

    async function completeAuth() {
      const search = new URLSearchParams(location.search);
      const hash = readHashParams(location.hash);
      const flowType = search.get('type') || hash.get('type') || 'signup';
      const providerError = search.get('error_description')
        || hash.get('error_description')
        || search.get('error')
        || hash.get('error');

      if (providerError) {
        if (!cancelled) {
          setError(flowType === 'recovery'
            ? 'Il link per reimpostare la password non è valido o è scaduto. Richiedine uno nuovo.'
            : 'Il link di conferma non è valido o è scaduto. Prova ad accedere o richiedi una nuova conferma.');
        }
        return;
      }

      try {
        const code = search.get('code');

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        const nextSession = await getSessionWithRetry();

        if (!nextSession) {
          throw new Error('Auth session missing');
        }

        if (cancelled) return;

        if (flowType === 'recovery') {
          navigate('/update-password', { replace: true });
          return;
        }

        const returnTo = safeReturnTo(search.get('returnTo'), '/account');
        navigate(returnTo, {
          replace: true,
          state: { message: 'Email confermata. Il tuo account Sblocco è pronto.' },
        });
      } catch (authError) {
        if (!cancelled) {
          setError(getAuthErrorMessage(authError));
        }
      }
    }

    completeAuth();

    return () => {
      cancelled = true;
    };
  }, [loading, location.hash, location.search, navigate]);

  return (
    <AuthJourneyShell
      eyebrow="Sblocco Inglese"
      title={error ? 'Questo link non ha funzionato.' : 'Stiamo completando il tuo accesso.'}
      description={error
        ? 'Puoi riprovare dal login o richiedere un nuovo link.'
        : 'Manca solo un istante. Non chiudere questa pagina.'}
      topAction={<Link className="register-journey__login-link" to="/login"><strong>Accedi</strong></Link>}
      footer={<Link className="auth-journey__quiet-link" to="/">Torna al sito</Link>}
    >
      <div className="auth-journey__form">
        {error ? (
          <AuthNotice tone="error">{error}</AuthNotice>
        ) : (
          <AuthNotice>Verifica in corso...</AuthNotice>
        )}

        {error ? (
          <div className="auth-journey__links">
            <Link to="/login">Torna al login</Link>
            <Link to="/forgot-password">Recupera la password</Link>
          </div>
        ) : null}
      </div>
    </AuthJourneyShell>
  );
}
