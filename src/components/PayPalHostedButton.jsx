import React, { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { paypalPayment } from '../config/site';

export default function PayPalHostedButton() {
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = () =>
      new Promise((resolve, reject) => {
        if (window.paypal?.HostedButtons) return resolve();
        const found = document.querySelector('script[data-paypal-hosted-buttons="true"]');
        if (found) {
          found.addEventListener('load', resolve, { once: true });
          found.addEventListener('error', reject, { once: true });
          return;
        }
        const script = document.createElement('script');
        script.src = paypalPayment.sdkUrl;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.dataset.paypalHostedButtons = 'true';
        script.addEventListener('load', resolve, { once: true });
        script.addEventListener('error', reject, { once: true });
        document.head.appendChild(script);
      });

    load()
      .then(() => {
        if (cancelled) return;
        const selector = `#${paypalPayment.containerId}`;
        document.querySelector(selector).innerHTML = '';
        window.paypal.HostedButtons({ hostedButtonId: paypalPayment.hostedButtonId }).render(selector);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-md rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <CreditCard aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-moss" />
        <div>
          <h4 className="text-base font-black text-ink">Pagamento sicuro con PayPal</h4>
          <p className="mt-1 text-sm font-semibold leading-6 text-ink/70">
            Completa il pagamento per confermare lo slot scelto.
          </p>
        </div>
      </div>
      {error ? <p className="mb-3 rounded-lg bg-blush px-4 py-3 text-sm font-bold text-ink/70">Il pulsante PayPal non si è caricato. Ricarica la pagina.</p> : null}
      <div id={paypalPayment.containerId} />
    </div>
  );
}
