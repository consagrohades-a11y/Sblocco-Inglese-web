import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import BrandLogo from './BrandLogo';

function LearnerFooter() {
  return (
    <footer className="border-t border-white/[0.08] bg-surface-950 text-white">
      <div className="section-shell flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <BrandLogo to="/assignments" compact light />
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-white/65" aria-label="Collegamenti studente a piè di pagina">
          <Link className="transition hover:text-white" to="/assignments">Attività</Link>
          <Link className="transition hover:text-white" to="/trainers">Trainer</Link>
          <Link className="transition hover:text-white" to="/progressi">Progressi</Link>
          <Link className="transition hover:text-white" to="/account">Account</Link>
          <Link className="transition hover:text-white" to="/privacy-policy">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}

export default function Footer() {
  const { profile } = useAuth();
  const isLearner = profile?.role === 'learner' && profile?.status === 'active';

  if (isLearner) return <LearnerFooter />;

  return (
    <footer className="border-t border-white/[0.08] bg-ink text-white">
      <div className="section-shell grid gap-7 py-9 md:grid-cols-[1.1fr_0.8fr_1fr] lg:py-10">
        <div>
          <BrandLogo to="/" compact light />
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/65">Inglese pratico per colloqui, call e lavoro.</p>
          <Link className="mt-4 inline-flex rounded-full bg-mint px-4 py-2 text-sm font-black text-ink transition hover:bg-white" to="/prenota">
            Inizia il tuo percorso
          </Link>
        </div>

        <div className="grid content-start gap-2.5 text-sm">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-mint/90">Pagine</p>
          <Link className="text-white/70 hover:text-white" to="/percorsi">Corsi</Link>
          <Link className="text-white/70 hover:text-white" to="/trainers">Trainer</Link>
          <Link className="text-white/70 hover:text-white" to="/grammar">English Foundations</Link>
          <Link className="text-white/70 hover:text-white" to="/recensioni">Founder</Link>
        </div>

        <div className="grid content-start gap-2.5 text-sm">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-mint/90">Legal e contatti</p>
          <Link className="text-white/70 hover:text-white" to="/contatti">Contatti e FAQ</Link>
          <Link className="text-white/70 hover:text-white" to="/privacy-policy">Privacy Policy</Link>
          <Link className="text-white/70 hover:text-white" to="/cookie-policy">Cookie Policy</Link>
          <Link className="text-white/70 hover:text-white" to="/termini-e-condizioni">Termini e Condizioni</Link>
          <p className="mt-1 text-xs leading-5 text-white/60">Sblocco Inglese è un progetto di formazione linguistica online.</p>
        </div>
      </div>
    </footer>
  );
}
