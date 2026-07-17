import React from 'react';
import { ArrowLeft, ArrowRight, ClipboardList, Sparkles } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function StickyMobileCTA() {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isLearner = profile?.role === 'learner' && profile?.status === 'active';
  const isHomepage = location.pathname === '/';
  const isAssessment =
    location.pathname === '/assessment' ||
    location.pathname.startsWith('/profilo/');
  const routeParams = new URLSearchParams(location.search);
  const assignmentId = routeParams.get('assignmentId') || '';
  const requestedReturnTo = routeParams.get('returnTo') || '';
  const safeReturnTo = requestedReturnTo.startsWith('/assignments/')
    ? requestedReturnTo
    : '';
  const assignmentReturnTo =
    location.pathname === '/practice' && assignmentId
      ? `/assignments/${assignmentId}`
      : safeReturnTo;

  function goBack() {
    if (window.history.length > 1) navigate(-1);
    else navigate('/assignments');
  }

  if (isAssessment || isHomepage) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/95 px-4 py-3 text-ink shadow-[0_-14px_38px_rgba(24,34,31,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0b1311]/95 dark:text-white dark:shadow-[0_-14px_38px_rgba(3,8,7,0.28)] xl:hidden">
      <div className="mx-auto flex max-w-md items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-ink/10 bg-mint/60 text-moss dark:border-white/10 dark:bg-white/[0.07] dark:text-[#8edfc8]">
          {isLearner ? (
            <ClipboardList aria-hidden="true" className="h-5 w-5" />
          ) : (
            <Sparkles aria-hidden="true" className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-moss dark:text-[#8edfc8]">
            {isLearner ? 'Il tuo percorso' : 'Sblocco Check'}
          </p>
          <p className="truncate text-sm font-black text-ink dark:text-white">
            {isLearner
              ? 'Riprendi da dove eri rimasto'
              : 'Scopri cosa ti blocca davvero'}
          </p>
        </div>
        {isLearner && assignmentReturnTo ? (
          <Link
            to={assignmentReturnTo}
            className="focus-ring inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-ink/15 bg-ink/[0.05] px-4 py-2.5 text-sm font-black text-ink transition hover:bg-ink/[0.09] dark:border-white/15 dark:bg-white/[0.07] dark:text-white dark:hover:bg-white/[0.12]"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Torna all’attività
          </Link>
        ) : isLearner ? (
          <button
            type="button"
            onClick={goBack}
            className="focus-ring inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-ink/15 bg-ink/[0.05] px-4 py-2.5 text-sm font-black text-ink transition hover:bg-ink/[0.09] dark:border-white/15 dark:bg-white/[0.07] dark:text-white dark:hover:bg-white/[0.12]"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Indietro
          </button>
        ) : (
          <Link
            to="/assessment"
            className="focus-ring inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[#13866f] px-4 py-2.5 text-sm font-black text-white shadow-[0_8px_24px_rgba(14,124,102,0.24)] transition hover:bg-[#18a085]"
          >
            Inizia
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
