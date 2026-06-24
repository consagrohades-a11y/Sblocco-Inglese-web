import React from 'react';
import { Link } from 'react-router-dom';
import { primaryOffer } from '../config/site';
import BrandLogo from './BrandLogo';

export default function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-ink text-white">
      <div className="section-shell grid gap-8 py-12 lg:grid-cols-3 lg:py-14">
        <div>
          <BrandLogo to="/" light />
          <p className="mt-5 max-w-xl text-sm leading-6 text-white/70">
            Inglese pratico per colloqui, call e lavoro.
          </p>
          <Link className="mt-6 inline-flex rounded-full bg-butter px-4 py-2 text-sm font-black text-ink" to="/prenota#booking-form">
            Prenota la simulazione {primaryOffer.price}
          </Link>
        </div>

        <div className="grid content-start gap-3 text-sm">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-mint/90">Pagine</p>
          <Link className="text-white/75 hover:text-white" to="/simulazione-39">Simulazione</Link>
          <Link className="text-white/75 hover:text-white" to="/percorsi">Percorsi</Link>
          <Link className="text-white/75 hover:text-white" to="/trainers">Trainer</Link>
          <Link className="text-white/75 hover:text-white" to="/recensioni">Founder e recensioni</Link>
          <Link className="text-white/75 hover:text-white" to="/prenota">Prenota</Link>
        </div>

        <div className="grid content-start gap-3 text-sm">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-mint/90">Legal & contatti</p>
          <Link className="text-white/75 hover:text-white" to="/contatti">Contatti e FAQ</Link>
          <Link className="text-white/75 hover:text-white" to="/privacy-policy">Privacy Policy</Link>
          <Link className="text-white/75 hover:text-white" to="/cookie-policy">Cookie Policy</Link>
          <Link className="text-white/75 hover:text-white" to="/termini-e-condizioni">Termini e Condizioni</Link>
          <p className="mt-3 rounded-lg border border-white/10 bg-white/5 p-4 text-xs leading-5 text-white/60">
            Sblocco Inglese è un progetto di formazione linguistica online. La simulazione da {primaryOffer.price} è confermata solo dopo pagamento completato.
          </p>
        </div>
      </div>
    </footer>
  );
}
