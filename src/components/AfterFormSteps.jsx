import React from 'react';
import { afterFormSteps } from '../data/content';

export default function AfterFormSteps({ className = '' }) {
  return (
    <div className={`rounded-lg border border-moss/20 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      <h3 className="text-2xl font-black text-ink">Dopo il quiz cosa succede?</h3>
      <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-ink/70 sm:text-base">
        Dopo aver compilato il quiz, leggi l’esito, scegli lo slot disponibile, completi il pagamento con PayPal e ricevi la
        conferma della sessione.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {afterFormSteps.map((step, index) => (
          <div key={step} className="flex items-start gap-3 rounded-lg bg-paper px-4 py-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-moss text-xs font-black text-white">
              {index + 1}
            </span>
            <p className="text-sm font-bold leading-6 text-ink/75">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
