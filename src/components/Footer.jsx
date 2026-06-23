import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { externalLinks, primaryOffer } from '../config/site';
import BrandLogo from './BrandLogo';

export default function Footer() {
  const footerLinks = [
    { label: 'Simulazione', to: '/simulazione-39' },
    { label: 'Trainer', to: '/trainers' },
    { label: 'Percorsi', to: '/percorsi' },
    { label: 'Recensioni', to: '/recensioni' },
    { label: 'Casi reali', to: '/casi-reali' },
    { label: 'Prenota', to: '/prenota' },
  ];

  return (
    <footer className="border-t border-ink/10 bg-ink text-white">
      <div className="section-shell grid gap-10 py-12 lg:grid-cols-[1.1fr_0.85fr_0.75fr] lg:py-14">
        <div>
          <BrandLogo to="/" light />
          <p className="mt-5 max-w-xl text-sm leading-6 text-white/70">
            Inglese pratico per italiani che capiscono, ma si bloccano quando devono parlare in colloqui, call e lavoro.
          </p>
          <Link
            to="/simulazione-39"
            className="focus-ring mt-6 inline-flex items-center gap-2 rounded-full bg-butter px-4 py-2 text-sm font-black text-ink transition hover:bg-white"
          >
            Simulazione {primaryOffer.price}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-mint/90">Ecosistema</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {footerLinks.map((item) => (
              <Link key={item.to} className="text-white/75 transition hover:text-white" to={item.to}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid content-start gap-3 text-sm">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-mint/90">Legal & contatti</p>
          <Link className="text-white/75 transition hover:text-white" to="/privacy-policy">
            Privacy Policy
          </Link>
          <Link className="text-white/75 transition hover:text-white" to="/cookie-policy">
            Cookie Policy
          </Link>
          <Link className="text-white/75 transition hover:text-white" to="/termini-e-condizioni">
            Termini e Condizioni
          </Link>
          <a className="inline-flex items-center gap-2 text-white/75 transition hover:text-white" href={externalLinks.whatsapp}>
            <MessageCircle aria-hidden="true" className="h-4 w-4" />
            Contatti
          </a>
          <p className="mt-3 rounded-lg border border-white/10 bg-white/5 p-4 text-xs leading-5 text-white/60">
            [INSERIRE DATI FISCALI / P.IVA SE E QUANDO APPLICABILE - VERIFICARE CON COMMERCIALISTA]
          </p>
        </div>
      </div>
    </footer>
  );
}
