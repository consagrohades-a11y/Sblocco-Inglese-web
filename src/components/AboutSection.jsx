import React from 'react';
import { CheckCircle2, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { aboutMe } from '../config/site';
import ReviewCarousel from './ReviewCarousel';

export default function AboutSection({ showReviews = false, className = '' }) {
  return (
    <div className={`grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start ${className}`}>
      <div>
        <span className="eyebrow">
          <UserRoundCheck aria-hidden="true" className="h-3.5 w-3.5" />
          Persona reale, metodo pratico
        </span>
        <h2 className="section-title">{aboutMe.title}</h2>
        {aboutMe.lead ? (
          <p className="mt-5 rounded-lg border border-moss/15 bg-white p-5 text-lg font-extrabold leading-8 text-ink shadow-sm">
            {aboutMe.lead}
          </p>
        ) : null}
        <div className="mt-5 grid gap-4 text-base leading-7 text-ink/70">
          {aboutMe.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {aboutMe.badges.map((badge) => (
            <div key={badge} className="flex items-center gap-3 rounded-lg border border-ink/10 bg-white px-4 py-3 shadow-sm">
              <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-moss" />
              <span className="text-sm font-black text-ink/75">{badge}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 rounded-lg border border-coral/20 bg-blush p-4 text-sm font-semibold leading-6 text-ink/70">
          <ShieldCheck aria-hidden="true" className="mr-2 inline h-4 w-4 text-coral" />
          {aboutMe.disclaimer}
        </p>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-[0.9fr_1.1fr]">
          <figure className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft">
            <div className="aspect-[4/5] max-h-[560px] overflow-hidden bg-paper">
              <img
                src={aboutMe.media.photo}
                alt="Rhema, insegnante di inglese online"
                className="h-full w-full object-cover object-[center_18%]"
                loading="lazy"
              />
            </div>
          </figure>
          <div className="rounded-lg border border-moss/20 bg-white p-5 shadow-soft sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-moss">Profilo tutor</p>
            <h3 className="mt-3 text-2xl font-black leading-tight text-ink">Esperienza reale, metodo pratico.</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-ink/70">
              L’esperienza su Preply documenta il lavoro svolto con studenti
              online. In Sblocco Inglese il focus resta su speaking, correzione
              mirata e situazioni professionali.
            </p>
            <div className="mt-5 grid gap-3">
              {['Tutor online', 'Studenti italiani e internazionali', 'Approccio strutturato'].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-lg bg-mint/50 p-3">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
                  <span className="text-sm font-black leading-5 text-ink/75">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {showReviews ? <ReviewCarousel /> : null}
      </div>
    </div>
  );
}
