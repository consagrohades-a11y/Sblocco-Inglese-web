import React from 'react';
import { CheckCircle2, FileText, ShieldAlert } from 'lucide-react';
import CTAButton from '../components/CTAButton';
import SEO from '../components/SEO';
import SectionReveal from '../components/SectionReveal';
import { caseStudies, ctaLabels, primaryOffer } from '../config/site';

function CaseStudyCard({ study, index }) {
  return (
    <article className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-flex rounded-full bg-mint px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-moss">
            {study.label}
          </span>
          <h2 className="mt-4 max-w-3xl text-2xl font-black leading-tight text-ink sm:text-3xl">
            {study.title}
          </h2>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-paper text-sm font-black text-moss">
          {index + 1}
        </span>
      </div>

      <div className="mt-6 grid gap-4 text-base leading-7 text-ink/70">
        {study.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      {study.result ? (
        <div className="mt-6 rounded-lg border border-moss/20 bg-mint/60 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-moss">Risultato</p>
          <p className="mt-2 text-sm font-bold leading-6 text-ink/75">{study.result}</p>
        </div>
      ) : null}

      <div className="mt-6">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink/60">Focus del lavoro</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {study.focus.map((item) => (
            <span key={item} className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-paper px-3 py-2 text-xs font-bold text-ink/70">
              <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-moss" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

export default function CaseStudies() {
  return (
    <>
      <SEO
        title="Casi reali | Sblocco Inglese"
        description="Esempi reali di percorsi in cui l’inglese è stato collegato a obiettivi concreti: trasferimento, lavoro, colloqui e opportunità internazionali."
      />

      <section className="section-shell pb-12 pt-12 lg:pt-16">
        <span className="eyebrow">
          <FileText aria-hidden="true" className="h-3.5 w-3.5" />
          Esempi concreti
        </span>
        <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight text-ink sm:text-5xl">
          Casi reali
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-ink/70">
          Esempi reali di percorsi in cui l’inglese è stato collegato a obiettivi concreti: trasferimento, lavoro,
          colloqui e opportunità internazionali.
        </p>
        <div className="mt-6 max-w-4xl rounded-lg border border-coral/20 bg-blush p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-coral" />
            <p className="text-sm font-semibold leading-6 text-ink/70">{caseStudies.disclaimer}</p>
          </div>
        </div>
      </section>

      <SectionReveal className="pb-16">
        <div className="section-shell grid gap-6">
          {caseStudies.items.map((study, index) => (
            <CaseStudyCard key={study.title} study={study} index={index} />
          ))}
        </div>
      </SectionReveal>

      <SectionReveal className="bg-moss py-14 text-white sm:py-16">
        <div className="section-shell">
          <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="max-w-3xl text-3xl font-black leading-tight sm:text-4xl">
                Ti riconosci in una di queste situazioni?
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/70">
                Se capisci l’inglese ma ti blocchi quando devi usarlo per un colloquio, un lavoro, una call o un
                obiettivo concreto, la simulazione da {primaryOffer.price} serve proprio a questo: testare una
                situazione reale, ricevere correzioni e capire cosa migliorare subito.
              </p>
            </div>
            <div>
              <CTAButton variant="contrast" className="focus-visible:ring-white focus-visible:ring-offset-moss">
                {ctaLabels.primary}
              </CTAButton>
              <p className="mt-3 max-w-xs text-sm font-semibold leading-6 text-white/80">
                Il posto viene confermato solo dopo il pagamento.
              </p>
            </div>
          </div>
        </div>
      </SectionReveal>
    </>
  );
}
