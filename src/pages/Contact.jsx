import React from 'react';
import { HelpCircle, Mail, MessageCircle, Send, ShieldCheck } from 'lucide-react';
import FAQAccordion from '../components/FAQAccordion';
import ContactQuestionForm from '../components/ContactQuestionForm';
import SEO from '../components/SEO';
import SectionReveal from '../components/SectionReveal';
import { externalLinks, primaryOffer } from '../config/site';
import { faqItems } from '../data/content';

const contactEmail = externalLinks.email.replace('mailto:', '');

export default function Contact() {
  return (
    <>
      <SEO
        title="Contatti e FAQ | Sblocco Inglese"
        description={`Contatti, assistenza e domande frequenti sulla simulazione inglese da ${primaryOffer.price}: email, WhatsApp, modulo domande, pagamento e conferma.`}
      />

      <section className="section-shell pb-12 pt-12 lg:pt-16">
        <span className="eyebrow">
          <HelpCircle aria-hidden="true" className="h-3.5 w-3.5" />
          Contatti e domande frequenti
        </span>
        <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight text-ink sm:text-5xl">
          Hai un dubbio prima di prenotare?
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-ink/70">
          Prima di procedere puoi controllare le FAQ, scrivere una domanda o usare il contatto assistenza. L’obiettivo
          è evitare prenotazioni confuse: la simulazione da {primaryOffer.price} funziona meglio quando livello,
          obiettivo e aspettative sono chiari.
        </p>
      </section>

      <SectionReveal className="pb-16">
        <div className="section-shell grid gap-5 lg:grid-cols-3">
          <a
            href={externalLinks.email}
            className="focus-ring rounded-lg border border-ink/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
          >
            <Mail aria-hidden="true" className="h-6 w-6 text-moss" />
            <h2 className="mt-4 text-xl font-black text-ink">Email assistenza</h2>
            <p className="mt-2 text-sm font-bold text-ink/70">{contactEmail}</p>
            <p className="mt-4 text-sm leading-6 text-ink/60">
              Usa l’email per dubbi su prenotazione, pagamento, livello o accesso ai materiali.
            </p>
          </a>

          <a
            href={externalLinks.whatsapp}
            target="_blank"
            rel="noreferrer"
            className="focus-ring rounded-lg border border-ink/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
          >
            <MessageCircle aria-hidden="true" className="h-6 w-6 text-moss" />
            <h2 className="mt-4 text-xl font-black text-ink">WhatsApp</h2>
            <p className="mt-2 text-sm font-bold text-ink/70">Per dubbi rapidi prima di prenotare</p>
            <p className="mt-4 text-sm leading-6 text-ink/60">
              Non è il canale principale di vendita: serve solo se ti manca un’informazione concreta prima del quiz.
            </p>
          </a>

          <a
            href="#scrivi-domanda"
            className="focus-ring rounded-lg border border-ink/10 bg-ink p-6 text-white shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
          >
            <Send aria-hidden="true" className="h-6 w-6 text-mint" />
            <h2 className="mt-4 text-xl font-black">Scrivi una domanda</h2>
            <p className="mt-2 text-sm font-bold text-white/75">Modulo assistenza</p>
            <p className="mt-4 text-sm leading-6 text-white/70">
              Ideale se vuoi lasciare contesto e ricevere una risposta ordinata senza perdere il filo della richiesta.
            </p>
          </a>
        </div>
      </SectionReveal>

      <SectionReveal className="bg-linen/50 py-16">
        <div className="section-shell grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div className="rounded-lg bg-white p-6 shadow-soft">
            <div className="flex items-start gap-3">
              <ShieldCheck aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-moss" />
              <div>
                <h2 className="text-2xl font-black text-ink">Cosa puoi aspettarti</h2>
                <p className="mt-3 text-sm leading-6 text-ink/70">
                  La simulazione non è una promessa generica: è un primo controllo pratico sul tuo speaking. Si lavora
                  su una situazione reale, ricevi correzioni e dopo la sessione hai un feedback scritto da riutilizzare.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-3">
            {[
              'Il pagamento passa da PayPal: il sito non raccoglie dati di carte o conti bancari.',
              'Lo slot è confermato solo dopo il pagamento completato.',
              'Se il quiz mostra che la simulazione non è adatta, è meglio non prenotare subito.',
              'I risultati dipendono da livello, obiettivo e pratica personale: non vengono promessi esiti lavorativi garantiti.',
            ].map((item) => (
              <div key={item} className="rounded-lg border border-ink/10 bg-white p-4 text-sm font-bold leading-6 text-ink/70">
                {item}
              </div>
            ))}
          </div>
        </div>
      </SectionReveal>

      <SectionReveal id="faq" className="scroll-mt-24 py-16">
        <div className="section-shell grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <div className="rounded-lg bg-ink p-6 text-white shadow-soft lg:sticky lg:top-28">
            <h2 className="text-2xl font-black">FAQ</h2>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Qui trovi le risposte ai dubbi più comuni su livello, pagamento, feedback scritto e conferma della sessione.
            </p>
          </div>
          <FAQAccordion items={faqItems} />
        </div>
      </SectionReveal>

      <SectionReveal id="scrivi-domanda" className="scroll-mt-24 bg-white/70 py-16">
        <div className="section-shell">
          <div className="mb-6 max-w-3xl">
            <span className="eyebrow">Modulo domande</span>
            <h2 className="section-title">Scrivi il tuo dubbio</h2>
            <p className="section-copy">
              Compila il modulo se vuoi chiarire un dubbio prima di prenotare. Dopo l’invio vedrai una conferma qui
              nella pagina; la risposta arriverà via email o, se lo lasci, via WhatsApp.
            </p>
          </div>
          <ContactQuestionForm />
        </div>
      </SectionReveal>
    </>
  );
}
