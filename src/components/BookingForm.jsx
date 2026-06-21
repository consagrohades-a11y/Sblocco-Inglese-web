import React, { useState } from 'react';
import { CalendarDays, CheckCircle2, ExternalLink, Send, ShieldCheck } from 'lucide-react';
import { bookingForm, externalLinks, primaryOffer } from '../config/site';

const inputClass =
  'focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-base font-semibold text-ink shadow-sm outline-none transition placeholder:text-ink/35 focus:border-moss';

const initialState = Object.fromEntries(
  Object.keys(bookingForm.fields).map((key) => [key, ''])
);

function FieldShell({ label, required, children, helper }) {
  return (
    <div>
      <label className="text-sm font-black text-ink">
        {label}
        {required ? <span className="text-clay"> *</span> : null}
      </label>
      {helper ? <p className="mt-1 text-xs font-semibold leading-5 text-ink/55">{helper}</p> : null}
      {children}
    </div>
  );
}

function TextField({ field, value, onChange }) {
  return (
    <FieldShell label={field.label} required={field.required}>
      <input
        className={inputClass}
        name={field.name}
        type={field.type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        required={field.required}
      />
    </FieldShell>
  );
}

function OptionGroup({ id, field, value, otherValue, onChange, onOtherChange }) {
  const otherName = `${field.name}.other_option_response`;
  const choices = field.allowOther ? [...field.options, 'Altro'] : field.options;

  return (
    <fieldset>
      <legend className="text-sm font-black text-ink">
        {field.label}
        {field.required ? <span className="text-clay"> *</span> : null}
      </legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {choices.map((option) => {
          const optionValue = option === 'Altro' ? '__other_option__' : option;
          const selected = value === optionValue;

          return (
            <label
              key={option}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm font-bold leading-5 transition ${
                selected
                  ? 'border-moss bg-mint text-ink shadow-sm'
                  : 'border-ink/10 bg-white text-ink/70 hover:border-moss/30 hover:bg-mint/40'
              }`}
            >
              <input
                className="h-4 w-4 accent-moss"
                type="radio"
                name={field.name}
                value={optionValue}
                checked={selected}
                onChange={() => onChange(optionValue)}
                required={field.required}
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
      {field.allowOther ? (
        <input
          className={`${inputClass} ${value === '__other_option__' ? '' : 'hidden'}`}
          name={otherName}
          value={otherValue}
          onChange={(event) => onOtherChange(event.target.value)}
          placeholder="Scrivi qui..."
          required={value === '__other_option__'}
          disabled={value !== '__other_option__'}
          aria-label={`${field.label} - altro`}
        />
      ) : null}
      {!field.required ? (
        <p className="mt-2 text-xs font-semibold leading-5 text-ink/50">Puoi lasciare vuoto se non sei sicuro/a.</p>
      ) : null}
    </fieldset>
  );
}

export default function BookingForm() {
  const [values, setValues] = useState(initialState);
  const [otherValues, setOtherValues] = useState({ purpose: '', deadline: '' });
  const [submitted, setSubmitted] = useState(false);
  const fields = bookingForm.fields;

  const update = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setSubmitted(false);
  };

  const updateOther = (key, value) => {
    setOtherValues((current) => ({ ...current, [key]: value }));
    setSubmitted(false);
  };

  const handleSubmit = () => {
    window.setTimeout(() => setSubmitted(true), 500);
  };

  return (
    <div id="booking-form" className="scroll-mt-28 rounded-lg border border-moss/20 bg-white p-5 shadow-soft sm:p-7">
      <div className="flex flex-col gap-4 border-b border-ink/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="eyebrow">
            <Send aria-hidden="true" className="h-3.5 w-3.5" />
            Richiesta simulazione
          </span>
          <h2 className="mt-3 text-2xl font-black leading-tight text-ink sm:text-3xl">
            Compila il modulo
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-ink/65">
            Le risposte servono per preparare una simulazione utile e concreta per il tuo obiettivo.
          </p>
        </div>
        <div className="rounded-lg bg-butter px-4 py-3 text-left sm:text-right">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-ink/60">Prezzo beta</p>
          <p className="text-2xl font-black text-moss">{primaryOffer.price}</p>
        </div>
      </div>

      <iframe title="Invio modulo Google Forms" name="google-form-submit" className="hidden" />

      <form
        action={bookingForm.action}
        method="POST"
        target="google-form-submit"
        onSubmit={handleSubmit}
        className="mt-6 grid gap-6"
      >
        <input type="hidden" name="fvv" value="1" />
        <input type="hidden" name="pageHistory" value="0" />

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField field={fields.fullName} value={values.fullName} onChange={(value) => update('fullName', value)} />
          <TextField field={fields.email} value={values.email} onChange={(value) => update('email', value)} />
          <TextField field={fields.whatsapp} value={values.whatsapp} onChange={(value) => update('whatsapp', value)} />
          <OptionGroup
            id="level"
            field={fields.level}
            value={values.level}
            onChange={(value) => update('level', value)}
            otherValue=""
            onOtherChange={() => {}}
          />
        </div>

        <OptionGroup
          id="purpose"
          field={fields.purpose}
          value={values.purpose}
          otherValue={otherValues.purpose}
          onChange={(value) => update('purpose', value)}
          onOtherChange={(value) => updateOther('purpose', value)}
        />

        <OptionGroup
          id="blocker"
          field={fields.blocker}
          value={values.blocker}
          onChange={(value) => update('blocker', value)}
          otherValue=""
          onOtherChange={() => {}}
        />

        <OptionGroup
          id="deadline"
          field={fields.deadline}
          value={values.deadline}
          otherValue={otherValues.deadline}
          onChange={(value) => update('deadline', value)}
          onOtherChange={(value) => updateOther('deadline', value)}
        />

        <OptionGroup
          id="paymentReadiness"
          field={fields.paymentReadiness}
          value={values.paymentReadiness}
          onChange={(value) => update('paymentReadiness', value)}
          otherValue=""
          onOtherChange={() => {}}
        />

        <div className="rounded-lg border border-moss/15 bg-mint/45 p-4">
          <div className="flex items-start gap-3 text-sm font-bold leading-6 text-ink/75">
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-moss" />
            <p>
              Il posto viene confermato solo dopo il pagamento. Dopo l’invio potrai scegliere lo slot e completare la
              prenotazione.
            </p>
          </div>
        </div>

        {submitted ? (
          <div role="status" className="rounded-lg border border-moss/25 bg-mint p-4 text-sm font-bold leading-6 text-ink">
            <div className="flex items-start gap-3">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-moss" />
              <div>
                <p>
                  Richiesta inviata. Ora puoi scegliere lo slot e completare il pagamento con PayPal.
                </p>
                <a
                  href="#booking-flow"
                  className="focus-ring mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-moss px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#096d58]"
                >
                  Scegli lo slot
                  <CalendarDays aria-hidden="true" className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-moss px-6 py-3 text-sm font-extrabold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-[#096d58] hover:shadow-soft active:translate-y-0 sm:text-base"
          >
            Invia richiesta
            <Send aria-hidden="true" className="h-4 w-4" />
          </button>
          <a
            href={externalLinks.googleForm}
            target="_blank"
            rel="noreferrer"
            className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-extrabold text-ink transition hover:border-moss/30 hover:bg-mint/50"
          >
            Apri il modulo Google
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>

        <div className="flex items-start gap-3 rounded-lg bg-paper px-4 py-3 text-xs font-semibold leading-5 text-ink/55">
          <CalendarDays aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
          <p>
            Il calendario serve a scegliere l’orario. Il pagamento avviene con PayPal nella fase successiva.
          </p>
        </div>
      </form>
    </div>
  );
}
