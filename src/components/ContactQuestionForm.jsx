import React, { useState } from 'react';
import { Send } from 'lucide-react';

const questionFormUrl = 'https://forms.gle/mcss5TWTQj4jZ7ct7';
const formAction = 'https://docs.google.com/forms/d/e/1FAIpQLSejCylow7ayRiVRnRxVJIuuZGJF0KmEAqNRsTufjxMVVnTXAA/formResponse';
const consentText = '“Confermo di aver letto la Privacy Policy e autorizzo Sblocco Inglese a usare questi dati solo per rispondere alla mia richiesta.”';
const doubtTypes = ['Simulazione da €39', 'Pagamento', 'Livello inglese', 'Corsi', 'Trainer Suite', 'Altro'];

const inputClass =
  'mt-2 w-full rounded-2xl border border-ink/10 bg-linen/60 px-4 py-3 text-sm font-semibold text-ink outline-none transition placeholder:text-ink/35 focus:border-moss focus:bg-white focus:ring-4 focus:ring-mint/30';

export default function ContactQuestionForm() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:items-start">
      <form
        action={formAction}
        method="POST"
        target="contact-form-hidden-frame"
        onSubmit={() => setSubmitted(true)}
        className="rounded-[2rem] border border-ink/10 bg-white p-5 shadow-soft sm:p-7"
      >
        <iframe title="Invio modulo contatti" name="contact-form-hidden-frame" className="hidden" />

        <div className="grid gap-5 md:grid-cols-2">
          <label className="text-sm font-black text-ink">
            Nome
            <input className={inputClass} name="entry.924679473" type="text" placeholder="Es. Mario Rossi" required />
          </label>

          <label className="text-sm font-black text-ink">
            Email
            <input className={inputClass} name="entry.643418886" type="email" placeholder="nome@email.com" required />
          </label>
        </div>

        <label className="mt-5 block text-sm font-black text-ink">
          Whatsapp <span className="font-semibold text-ink/45">Opzionale</span>
          <input className={inputClass} name="entry.1757011184" type="tel" placeholder="+39 ..." />
        </label>

        <fieldset className="mt-5 rounded-2xl border border-ink/10 bg-linen/40 p-4">
          <legend className="px-1 text-sm font-black text-ink">Che tipo di dubbio hai?</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {doubtTypes.map((type) => (
              <label key={type} className="flex items-center gap-3 text-sm font-semibold text-ink/75">
                <input className="h-4 w-4 shrink-0 accent-moss" name="entry.697223897" type="radio" value={type} required />
                <span>{type}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="mt-5 block text-sm font-black text-ink">
          Scrivi la tua domanda/richiesta
          <textarea
            className={`${inputClass} min-h-[150px] resize-y leading-6`}
            name="entry.820783450"
            placeholder="Spiega brevemente il tuo dubbio: livello, pagamento, simulazione, corso, trainer o altro."
            required
          />
        </label>

        <label className="mt-5 flex gap-3 rounded-2xl border border-ink/10 bg-linen/50 p-4 text-sm font-semibold leading-6 text-ink/70">
          <input className="mt-1 h-4 w-4 shrink-0 accent-moss" name="entry.145674543" type="checkbox" value={consentText} required />
          <span>
            Confermo di aver letto la Privacy Policy e autorizzo Sblocco Inglese a usare questi dati solo per rispondere
            alla mia richiesta.
          </span>
        </label>

        <div className="mt-5 rounded-2xl border border-ink/10 bg-white p-4 text-sm font-semibold leading-6 text-ink/70">
          Dopo l'invio riceverai sulla mail o il numero di contatto inserito una risposta alla tua richiesta.
          <br />
          La risposta potrebbe non arrivare nell'immediato, si consiglia di aspettare fino alle 24-48h.
          <br />
          Si garantisce che l'invio della seguente, dopo successiva conferma è stata ricevuta.
        </div>

        <button
          type="submit"
          className="focus-ring mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-moss"
        >
          <Send aria-hidden="true" className="h-4 w-4" />
          Invia la domanda
        </button>

        {submitted ? (
          <div className="mt-5 rounded-2xl border border-moss/20 bg-mint/35 p-4 text-sm font-bold leading-6 text-ink">
            Domanda inviata. Se hai inserito email o WhatsApp corretti, riceverai risposta appena possibile.
          </div>
        ) : null}
      </form>

      <div className="rounded-[2rem] border border-ink/10 bg-linen/60 p-6 shadow-sm">
        <h3 className="text-xl font-black text-ink">Prima di scrivere</h3>
        <p className="mt-3 text-sm leading-6 text-ink/70">
          Controlla le FAQ sopra: spesso la risposta su pagamento, conferma dello slot, livello o feedback scritto è già lì.
          Il modulo serve per casi specifici o dubbi personali.
        </p>
        <a
          href={questionFormUrl}
          target="_blank"
          rel="noreferrer"
          className="focus-ring mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-black text-ink shadow-sm hover:bg-mint"
        >
          Apri Google Form in alternativa
        </a>
      </div>
    </div>
  );
}
