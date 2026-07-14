import React from 'react';
import { ArrowRight, ClipboardList, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function StickyMobileCTA() {
  const { profile } = useAuth();
  const isLearner = profile?.role === 'learner' && profile?.status === 'active';

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b1311]/95 px-4 py-3 text-white shadow-[0_-14px_38px_rgba(3,8,7,0.28)] backdrop-blur-xl xl:hidden">
      <div className="mx-auto flex max-w-md items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.07] text-[#8edfc8]">
          {isLearner ? <ClipboardList aria-hidden="true" className="h-5 w-5" /> : <Sparkles aria-hidden="true" className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#8edfc8]">{isLearner ? 'Il tuo percorso' : 'Primo passo'}</p>
          <p className="truncate text-sm font-black text-white">{isLearner ? 'Riprendi da dove eri rimasto' : 'Costruisci il tuo percorso'}</p>
        </div>
        <Link to={isLearner ? '/assignments' : '/prenota'} className="focus-ring inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[#13866f] px-4 py-2.5 text-sm font-black text-white shadow-[0_8px_24px_rgba(14,124,102,0.24)] transition hover:bg-[#18a085]">
          {isLearner ? 'Continua' : 'Inizia'}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
