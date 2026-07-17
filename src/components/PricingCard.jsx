import React from 'react';
import { Check, CreditCard, ShieldCheck } from 'lucide-react';
import CTAButton from './CTAButton';
import { riskNotes, simulationIncludes } from '../data/content';
import { ctaLabels, primaryOffer } from '../config/site';

export default function PricingCard({ compact = false }) {
  return (
    <div className="rounded-lg border border-moss/20 bg-white p-5 shadow-soft sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-flex rounded-full bg-butter px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-ink">
            {primaryOffer.priceLabel}
          </span>
          <h3 className="mt-4 text-2xl font-black leading-tight text-ink">
            {primaryOffer.title}
          </h3>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-5xl font-black tracking-tight text-moss">{primaryOffer.price}</p>
          <p className="mt-1 text-sm font-bold text-ink/60">{primaryOffer.duration}</p>
        </div>
      </div>

      <div className={`mt-6 grid gap-3 ${compact ? '' : 'sm:grid-cols-2'}`}>
        {simulationIncludes.map((item) => (
          <div key={item} className="flex items-center gap-3 rounded-lg bg-paper px-4 py-3">
            <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-moss" />
            <span className="text-sm font-bold text-ink/100">{item}</span>
          </div>
        ))}
      </div>

      <CTAButton className="mt-7 w-full">{ctaLabels.primary}</CTAButton>
      <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs font-bold text-ink/60">
        <CreditCard aria-hidden="true" className="h-4 w-4" />
        Il posto viene confermato solo dopo il pagamento.
      </p>

      <div className="mt-6 grid gap-3">
        {riskNotes.map((note) => (
          <div key={note} className="flex items-start gap-3 text-sm leading-6 text-ink/70">
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
            <span>{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
