import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import CTAButton from '../components/CTAButton';
import SEO from '../components/SEO';

function BulletList({ items }) {
  if (!items?.length) return null;

  return (
    <ul className="mt-4 grid gap-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-sm leading-6 text-ink/70 sm:text-base">
          <CheckCircle2 aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-moss" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Paragraphs({ items }) {
  if (!items?.length) return null;

  return (
    <div className="mt-4 grid gap-3">
      {items.map((item) => (
        <p key={item} className="text-sm leading-6 text-ink/70 sm:text-base sm:leading-7">
          {item}
        </p>
      ))}
    </div>
  );
}

export default function LegalPage({ page }) {
  return (
    <>
      <SEO title={`${page.title} | Sblocco Inglese`} description={page.description} />
      <section className="section-shell pb-10 pt-12 lg:pt-16">
        <span className="eyebrow">
          <AlertCircle aria-hidden="true" className="h-3.5 w-3.5" />
          Informazioni legali
        </span>
        <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight text-ink sm:text-5xl">
          {page.title}
        </h1>
        <p className="mt-4 text-sm font-bold uppercase tracking-[0.08em] text-moss">
          Ultimo aggiornamento: {page.updated}
        </p>
        <div className="mt-6 max-w-4xl rounded-lg border border-coral/20 bg-blush p-5 shadow-sm">
          <p className="text-sm font-semibold leading-6 text-ink/75">
            Queste informazioni descrivono l’uso del sito e dei servizi online di Sblocco Inglese. Per dubbi specifici, contatta l’assistenza prima di prenotare.
          </p>
        </div>
        <Paragraphs items={page.intro} />
      </section>

      <section className="section-shell pb-20">
        <div className="grid gap-5">
          {page.sections.map((section) => (
            <article key={section.title} className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-black text-ink">{section.title}</h2>
              <Paragraphs items={section.paragraphs} />
              <BulletList items={section.bullets} />
              <Paragraphs items={section.paragraphsAfter} />
              <BulletList items={section.bulletsAfter} />
              {section.details?.length ? (
                <div className="mt-4 rounded-lg bg-paper p-4">
                  {section.details.map((detail) => (
                    <p key={detail} className="text-sm font-semibold leading-6 text-ink/70">
                      {detail}
                    </p>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
        <div className="mt-8">
          <CTAButton href="/prenota" variant="secondary">
            Torna alla prenotazione
          </CTAButton>
        </div>
      </section>
    </>
  );
}
