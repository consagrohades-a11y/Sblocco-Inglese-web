import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { brandName, externalLinks } from '../config/site';

export default function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-ink text-white">
      <div className="section-shell grid gap-8 py-10 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-lg font-black">{brandName}</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Servizi online di inglese pratico per colloqui e lavoro
          </p>
          <p className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4 text-xs leading-5 text-white/70">
            [INSERIRE DATI FISCALI / P.IVA SE E QUANDO APPLICABILE — VERIFICARE CON COMMERCIALISTA]
          </p>
        </div>
        <div className="grid gap-3 text-sm">
          <Link className="text-white/100 transition hover:text-white" to="/privacy-policy">
            Privacy Policy
          </Link>
          <Link className="text-white/100 transition hover:text-white" to="/cookie-policy">
            Cookie Policy
          </Link>
          <Link className="text-white/100 transition hover:text-white" to="/termini-e-condizioni">
            Termini e Condizioni
          </Link>
          <a className="inline-flex items-center gap-2 text-white/100 transition hover:text-white" href={externalLinks.whatsapp}>
            <MessageCircle aria-hidden="true" className="h-4 w-4" />
            Contatti
          </a>
        </div>
      </div>
    </footer>
  );
}
