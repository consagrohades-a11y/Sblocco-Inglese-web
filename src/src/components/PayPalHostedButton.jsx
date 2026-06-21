import React, { useEffect, useState } from 'react';
import { AlertCircle, CreditCard } from 'lucide-react';
import { paypalPayment } from '../config/site';

export default function PayPalHostedButton() {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timeoutId;
    const containerSelector = `#${paypalPayment.containerId}`;

    const ensureScript = () =>
      new Promise((resolve, reject) => {
        if (window.paypal?.HostedButtons) {
          resolve();
          return;
        }

        const existingScript = document.querySelector('script[data-paypal-hosted-buttons="true"]');

        if (existingScript) {
          existingScript.addEventListener('load', resolve, { once: true });
          existingScript.addEventListener('error', reject, { once: true });
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

    const renderButton = () => {
      const container = document.querySelector(containerSelector);

      if (!container) {
        return;
      }

      if (!window.paypal?.HostedButtons) {
        attempts += 1;

        if (attempts > 40) {
          setStatus('error');
          return;
        }

        timeoutId = window.setTimeout(renderButton, 250);
        return;
      }

      try {
        container.innerHTML = '';
        const renderResult = window.paypal
          .HostedButtons({ hostedButtonId: paypalPayment.hostedButtonId })
          .render(containerSelector);

        Promise.resolve(renderResult)
          .then(() => {
            if (!cancelled) {
              setStatus('ready');
            }
          })
          .catch(() => {
            if (!cancelled) {
              setStatus('error');
            }
          });
      } catch {
        if (!cancelled) {
          setStatus('error');
        }
      }
    };

    ensureScript()
      .then(() => {
        if (!cancelled) {
          renderButton();
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <CreditCard aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-moss" />
        <div>
          <h4 className="text-base font-black text-ink">Pagamento sicuro con PayPal</h4>
          <p className="mt-1 text-sm font-semibold leading-6 text-ink/65">
            Completa il pagamento per confermare lo slot scelto.
          </p>
        </div>
      </div>

      {status === 'loading' ? (
        <div className="mb-3 rounded-lg bg-paper px-4 py-3 text-sm font-bold text-ink/60">
          Caricamento del pulsante PayPal...
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="mb-3 flex items-start gap-3 rounded-lg border border-clay/20 bg-blush px-4 py-3 text-sm font-bold leading-6 text-ink/70">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-clay" />
          <p>
            Il pulsante PayPal non si è caricato. Ricarica la pagina oppure riprova tra qualche minuto.
          </p>
        </div>
      ) : null}

      <div id={paypalPayment.containerId} />
    </div>
  );
}
