import React from 'react';
import { ArrowRight, Clock3, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function AssessmentEntryStrip() {
  const { profile } = useAuth();
  if (profile?.role === 'learner' && profile?.status === 'active') return null;

  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[#14231f] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(78,201,168,0.10),transparent_35%,rgba(255,196,87,0.09))]" />
      <div className="section-shell relative flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-moss">
            <Sparkles aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-black">
              Non sai quale percorso scegliere?
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-white/65">
              <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
              Gratuito, 10-12 minuti: prova pratica e tre brevi prove di
              ascolto. Analisi completa via email; consenso marketing
              facoltativo.
            </p>
          </div>
        </div>
        <Link
          to="/assessment"
          className="focus-ring inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-butter px-5 py-2.5 text-sm font-black text-ink transition hover:-translate-y-0.5 hover:bg-white"
        >
          Inizia lo Sblocco Check
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
