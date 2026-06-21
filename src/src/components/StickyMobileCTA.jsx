import React from 'react';
import CTAButton from './CTAButton';
import { ctaLabels, primaryOffer } from '../config/site';

export default function StickyMobileCTA() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-paper/95 px-4 py-3 shadow-[0_-10px_30px_rgba(24,34,31,0.12)] backdrop-blur xl:hidden">
      <div className="mx-auto flex max-w-md items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-moss">Prezzo beta</p>
          <p className="truncate text-sm font-black text-ink">Simulazione 30 min - {primaryOffer.price}</p>
        </div>
        <CTAButton className="min-w-fit px-4 py-2 text-sm">{ctaLabels.mobile}</CTAButton>
      </div>
    </div>
  );
}
