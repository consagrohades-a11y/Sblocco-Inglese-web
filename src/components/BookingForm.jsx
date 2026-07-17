import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, ExternalLink, RotateCcw, Send, ShieldCheck } from 'lucide-react';
import { bookingForm, externalLinks, primaryOffer } from '../config/site';

const inputClass =
  'focus-ring mt-2 w-full max-w-sm rounded-lg border border-ink/15 bg-white px-4 py-3 text-base font-semibold text-ink shadow-sm outline-none transition placeholder:text-ink/35 focus:border-moss';

const initialState = Object.fromEntries(Object.keys(bookingForm.fields).map((key) => [key, '']));

const suitabilityResults = {
  fit: {
    label: 'Profilo adatto',
    title: 'Quiz inviato: puoi procedere con slot e pagamento.',
    text: 'Dalle tue risposte sembra che la simulazione da €39 sia un buon primo passo: hai un obiettivo concreto e una base su cui lavorare.',
    detailsTitle: 'Perché ha senso procedere',
    details: [
      'hai indicato una base utile per lavorare su speaking reale',
      'la simulazione può trasformare il blocco in errori e frasi da correggere',
      'dopo lo slot, il pagamento PayPal conferma il posto',
    ],
    canProceed: true,
    tone: 'border-moss/25 bg-mint',
    badge: 'bg-moss text-white',
    icon: 'text-moss',
  },
  possible: {
    label: 'Probabilmente adatta',
    title: 'Quiz inviato: puoi procedere, con un obiettivo molto pratico.',
    text: 'Le risposte indicano che la simulazione può aiutarti a capire cosa ti blocca e a ricevere frasi più chiare da riutilizzare. Se non conosci bene il tuo livello, useremo la sessione anche per orientarti.',
    detailsTitle: 'Come usarla bene',
    details: [
      'scegli una situazione precisa da simulare: colloquio, call, cliente o trasferimento',
      'porta frasi o domande che ti mettono in difficoltà',
      'procedi se vuoi una diagnosi pratica, non una lezione generica',
    ],
    canProceed: true,
    tone: 'border-butter bg-butter/70',
    badge: 'bg-ink text-white',
    icon: 'text-moss',
  },
  notFit: {
    label: 'Meglio non procedere ora',
    title: 'Quiz inviato, ma per ora non ti consiglio il pagamento.',
    text: 'Dalle risposte sembra che una simulazione professionale da 30 minuti non sia il passo più utile in questo momento. Meglio chiarire l’obiettivo o lavorare prima sulle basi.',
    detailsTitle: 'Cosa fare invece',
    details: ['non scegliere slot e non pagare adesso', 'riparti da frasi semplici, presentazione personale e risposte base', 'rifai il quiz quando hai una situazione concreta da preparare'],
    canProceed: false,
    tone: 'border-coral/25 bg-blush',
    badge: 'bg-coral text-white',
    icon: 'text-coral',
  },
};

function getSuitabilityResult(values) {
  if (values.paymentReadiness === 'No' || values.level === 'A1') return suitabilityResults.notFit;
  if (values.paymentReadiness === 'Forse' || values.level === 'Non lo so' || values.blocker === 'Mi blocco completamente') {
    return suitabilityResults.possible;
  }
  return suitabilityResults.fit;
}

function FieldShell({ label, required, children }) {
  return (
    <div>
      <label className="text-sm font-black text-ink">
        {label}{required ? <span className="text-clay"> *</span> : null}
      </label>
      {children}
    </div>
  );
}

function TextField({ field, value, onChange }) {
  return (
    <FieldShell label={field.label} required={field.required}>
      <input className={inputClass} name={field.name} type={field.type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} required={field.required} />
    </FieldShell>
  );
}

function OptionGroup({ field, value, otherValue, onChange, onOtherChange }) {
  const otherName = `${field.name}.other_option_response`;
  const choices = field.allowOther ? [...field.options, 'Altro'] : field.options;

  return (
    <fieldset>
      <legend className="text-sm font-black text-ink">
        {field.label}{field.required ? <span className="text-clay"> *</span> : null}
      </legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {choices.map((option) => {
          const optionValue = option === 'Altro' ? '__other_option__' : option;
          const selected = value === optionValue;
          return (
            <label key={option} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm font-bold leading-5 transition ${selected ? 'border-moss bg-mint text-ink shadow-sm' : 'border-ink/10 bg-white text-ink/70 hover:border-moss/30 hover:bg-mint/40'}`}>
              <input className="h-4 w-4 accent-moss" type="radio" name={field.name} value={optionValue} checked={selected} onChange={() => onChange(optionValue)} required={field.required} />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
      {field.allowOther ? (
        <input className={`${inputClass} ${value === '__other_option__' ? '' : 'hidden'}`} name={otherName} value={otherValue} onChange={(event) => onOtherChange(event.target.value)} placeholder="Scrivi qui..." required={value === '__other_option__'} disabled={value !== '__other_option__'} />
      ) : null}
      {!field.required ? <p className="mt-2 text-xs font-semibold leading-5 text-ink/65">Puoi lasciare vuoto se non sei sicuro/a.</p> : null}
    </fieldset>
  );
}

export default function BookingForm() {
  const [values, setValues] = useState(initialState);
  const [otherValues, setOtherValues] = useState({ purpose: '', deadline: '' });
  const [submittedResult, setSubmittedResult] = useState(null);
  const resultRef = useRef(null);
  const fields = bookingForm.fields;

  const update = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setSubmittedResult(null);
  };

  const updateOther = (key, value) => {
    setOtherValues((current) => ({ ...current, [key]: value }));
    setSubmittedResult(null);
  };

  useEffect(() => {
    if (!submittedResult) return;
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    resultRef.current?.focus({ preventScroll: true });
  }, [submittedResult]);

  return (
    <div id="booking-form" className="scroll-mt-28 rounded-lg border border-moss/20 bg-white p-5 shadow-soft sm:p-7">
      <div className="flex flex-col gap-4 border-b border-ink/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="eyebrow"><Send aria-hidden="true" className="h-3.5 w-3.5" />Quiz di idoneità</span>
          <h2 className="mt-3 text-2xl font-black leading-tight text-ink sm:text-3xl">Compila il quiz</h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-ink/70">Le risposte vengono inviate e ti mostrano subito se ha senso procedere con slot e pagamento.</p>
        </div>
        <div className="rounded-lg bg-butter px-4 py-3 text-left sm:text-right">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink/60">Prezzo beta</p>
          <p className="text-2xl font-black text-moss">{primaryOffer.price}</p>
        </div>
      </div>

      <iframe title="Invio quiz Google Forms" name="google-form-submit" className="hidden" />
      <form action={bookingForm.action} method="POST" target="google-form-submit" onSubmit={() => window.setTimeout(() => setSubmittedResult(getSuitabilityResult(values)), 500)} className="mt-6 grid gap-6">
        <input type="hidden" name="fvv" value="1" />
        <input type="hidden" name="pageHistory" value="0" />

        <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
          <TextField field={fields.fullName} value={values.fullName} onChange={(value) => update('fullName', value)} />
          <TextField field={fields.email} value={values.email} onChange={(value) => update('email', value)} />
          <TextField field={fields.whatsapp} value={values.whatsapp} onChange={(value) => update('whatsapp', value)} />
        </div>

        <OptionGroup field={fields.level} value={values.level} onChange={(value) => update('level', value)} otherValue="" onOtherChange={() => {}} />
        <OptionGroup field={fields.purpose} value={values.purpose} otherValue={otherValues.purpose} onChange={(value) => update('purpose', value)} onOtherChange={(value) => updateOther('purpose', value)} />
        <OptionGroup field={fields.blocker} value={values.blocker} onChange={(value) => update('blocker', value)} otherValue="" onOtherChange={() => {}} />
        <OptionGroup field={fields.deadline} value={values.deadline} otherValue={otherValues.deadline} onChange={(value) => update('deadline', value)} onOtherChange={(value) => updateOther('deadline', value)} />
        <OptionGroup field={fields.paymentReadiness} value={values.paymentReadiness} onChange={(value) => update('paymentReadiness', value)} otherValue="" onOtherChange={() => {}} />

        <div className="rounded-lg border border-moss/15 bg-mint/50 p-4 text-sm font-bold leading-6 text-ink/75">
          <ShieldCheck aria-hidden="true" className="mr-2 inline h-5 w-5 text-moss" />
          Il posto viene confermato solo dopo il pagamento. Dopo il quiz potrai scegliere lo slot e completare la prenotazione.
        </div>

        {submittedResult ? (
          <div ref={resultRef} role="status" tabIndex={-1} className={`rounded-lg border p-4 text-sm font-bold leading-6 text-ink outline-none ${submittedResult.tone}`}>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] ${submittedResult.badge}`}>{submittedResult.label}</span>
            <p className="mt-3 text-base font-black leading-6 text-ink">{submittedResult.title}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-ink/70">{submittedResult.text}</p>
            <ul className="mt-4 grid gap-2 rounded-lg bg-white/75 p-4">
              {submittedResult.details.map((detail) => (
                <li key={detail} className="flex items-start gap-2 text-sm font-semibold leading-6 text-ink/70">
                  {submittedResult.canProceed ? <CheckCircle2 aria-hidden="true" className={`mt-1 h-4 w-4 shrink-0 ${submittedResult.icon}`} /> : <AlertCircle aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-coral" />}
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
            {submittedResult.canProceed ? (
              <a href="#booking-flow" className="focus-ring mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-moss px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#096d58]">
                Scegli lo slot <CalendarDays aria-hidden="true" className="h-4 w-4" />
              </a>
            ) : (
              <button type="button" onClick={() => setSubmittedResult(null)} className="focus-ring mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-extrabold text-ink transition hover:border-coral/30 hover:bg-white/80">
                <RotateCcw aria-hidden="true" className="h-4 w-4" />Modifica le risposte
              </button>
            )}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="submit" className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-moss px-6 py-3 text-sm font-extrabold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-[#096d58] hover:shadow-soft active:translate-y-0 sm:text-base">
            Invia il quiz <Send aria-hidden="true" className="h-4 w-4" />
          </button>
          <a href={externalLinks.googleForm} target="_blank" rel="noreferrer" className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-extrabold text-ink transition hover:border-moss/30 hover:bg-mint/50">
            Apri il quiz su Google <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>
      </form>
    </div>
  );
}
