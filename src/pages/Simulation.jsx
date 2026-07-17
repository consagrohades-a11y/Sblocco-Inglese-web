import React from 'react';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CreditCard,
  FileText,
  MessageSquareWarning,
  ShieldCheck,
  Sparkles,
  Target,
  Video,
} from 'lucide-react';
import CTAButton from '../components/CTAButton';
import FAQAccordion from '../components/FAQAccordion';
import SEO from '../components/SEO';
import SectionReveal from '../components/SectionReveal';
import TrustBadges from '../components/TrustBadges';
import { externalLinks, primaryOffer } from '../config/site';
import { faqItems, feedbackExamples, receiveItems } from '../data/content';

const auditCta = "Prenota l'audit a 39 euro";

const painPoints = [
  'capisci la domanda, ma la risposta arriva lenta',
  "traduci mentalmente dall'italiano e perdi naturalezza",
  'hai esperienza, ma in inglese sembri meno sicuro/a',
];

const steps = [
  {
    title: 'Form iniziale',
    text: 'Mi dai contesto: livello, obiettivo e situazione da preparare.',
    icon: Target,
  },
  {
    title: 'Audit online',
    text: 'Facciamo una simulazione concreta di colloquio, call o lavoro.',
    icon: Video,
  },
  {
    title: 'Feedback scritto',
    text: 'Ricevi errori principali, frasi migliorate e prossimi step.',
    icon: FileText,
  },
];

const fitItems = [
  'hai una base A2 o superiore',
  'ti blocchi quando devi parlare davvero',
  'vuoi capire cosa migliorare prima di comprare un corso',
];

const notFitItems = [
  'parti completamente da zero',
  'cerchi una garanzia finta di superare un colloquio',
  'vuoi solo conversazione libera senza obiettivo',
];

const proofStats = [
  { value: primaryOffer.duration, label: 'online, mirato' },
  { value: primaryOffer.price, label: 'audit iniziale' },
  { value: 'feedback', label: 'scritto e riusabile' },
];

const simulationFaq = faqItems.slice(0, 4);
const visibleReceiveItems = receiveItems.slice(0, 6);

function CheckList({ items, tone = 'positive' }) {
  const Icon = tone === 'positive' ? Check : AlertTriangle;
  const iconClass = tone === 'positive' ? 'text-moss' : 'text-coral';

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <p key={item} className="flex items-start gap-3 text-sm font-bold leading-6 text-ink/80">
          <Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} />
          {item}
        </p>
      ))}
    </div>
  );
}

function AuditCard() {
  return (
    <aside className="relative overflow-hidden rounded-lg border border-white/15 bg-white p-5 text-ink shadow-soft lg:p-6">
      <div className="absolute inset-x-0 top-0 h-1 scanline" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-moss">Audit iniziale</p>
          <p className="mt-2 text-5xl font-black leading-none text-ink">{primaryOffer.price}</p>
        </div>
        <span className="rounded-full bg-mint px-3 py-1 text-xs font-black text-moss">{primaryOffer.duration}</span>
      </div>

      <div className="mt-6 grid gap-3">
        {[
          ['Simulazione reale', 'colloquio, call, cliente o risposta professionale'],
          ['Diagnosi del blocco', 'dove rallenti, dove traduci, dove perdi precisione'],
          ['Feedback scritto', 'errori principali e frasi più forti da riusare'],
        ].map(([title, text]) => (
          <div key={title} className="rounded-lg border border-ink/10 bg-linen/60 p-4">
            <p className="text-sm font-black text-ink">{title}</p>
            <p className="mt-1 text-sm font-semibold leading-5 text-ink/65">{text}</p>
          </div>
        ))}
      </div>

      <CTAButton className="mt-6 w-full" icon={false}>
        {auditCta}
      </CTAButton>
      <p className="mt-3 text-center text-xs font-bold leading-5 text-ink/65">
        Pagamento esterno sicuro. Nessuna promessa magica: solo diagnosi concreta.
      </p>
    </aside>
  );
}

function ProofStrip() {
  return (
    <div className="border-y border-ink/10 bg-white/85">
      <div className="section-shell grid gap-3 py-4 sm:grid-cols-3">
        {proofStats.map((item) => (
          <div key={item.label} className="rounded-lg border border-ink/10 bg-linen/60 px-4 py-3 text-center shadow-sm">
            <p className="text-2xl font-black text-moss">{item.value}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.08em] text-ink/65">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-soft">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-mint text-moss">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <h3 className="mt-5 text-xl font-black text-ink">{title}</h3>
      <p className="mt-3 text-sm font-semibold leading-6 text-ink/70">{children}</p>
    </div>
  );
}

export default function Simulation() {
  const proofExamples = feedbackExamples.slice(0, 2);

  return (
    <>
      <SEO
        title={`${primaryOffer.fullTitle} | Sblocco Inglese`}
        description={`Prenota un audit online da ${primaryOffer.price} per capire cosa ti blocca quando parli inglese e ricevere feedback scritto con frasi migliorate.`}
      />

      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(220,239,232,0.2),transparent_31%),radial-gradient(circle_at_78%_22%,rgba(255,196,87,0.18),transparent_30%),linear-gradient(135deg,#111f1b_0%,#18221f_58%,#0e2a24_100%)]" />
        <div className="h-1 scanline" />
        <div className="section-shell grid gap-9 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.44fr)] lg:items-center lg:py-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-butter/50 bg-butter px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-ink shadow-soft">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
              Audit inglese online - {primaryOffer.price}
            </span>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.02] text-white sm:text-5xl lg:text-6xl">
              Capisci l'inglese, ma ti blocchi quando devi parlare?
            </h1>
            <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-white/78 sm:text-xl">
              In 30 minuti vediamo il blocco mentre succede: simulazione pratica, correzione delle frasi deboli e feedback scritto su cosa migliorare subito.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <CTAButton variant="contrast">{auditCta}</CTAButton>
              <CTAButton href="#come-funziona" variant="secondary">
                Guarda come funziona
              </CTAButton>
            </div>
            <div className="mt-7 max-w-3xl rounded-lg bg-white/90 p-3">
              <TrustBadges />
            </div>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/60">
              Pensato per italiani che capiscono più di quanto riescono a dire sotto pressione.
            </p>
          </div>
          <AuditCard />
        </div>
      </section>

      <ProofStrip />

      <SectionReveal className="bg-white/70 py-14">
        <div className="section-shell grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div>
            <span className="eyebrow">
              <MessageSquareWarning aria-hidden="true" className="h-3.5 w-3.5" />
              Ti riconosci?
            </span>
            <h2 className="section-title">Il problema non è solo sapere inglese. È rispondere quando conta.</h2>
            <p className="section-copy">
              L'audit serve a vedere il momento esatto in cui perdi lucidità, così il feedback non resta astratto.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {painPoints.map((item, index) => (
              <div key={item} className="brand-card p-4" style={{ transitionDelay: `${index * 55}ms` }}>
                <Check aria-hidden="true" className="h-5 w-5 text-moss" />
                <p className="mt-3 text-sm font-black leading-6 text-ink">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionReveal>

      <SectionReveal id="come-funziona" className="bg-linen/60 py-14">
        <div className="section-shell">
          <div className="mx-auto max-w-3xl text-center">
            <span className="eyebrow">Come funziona</span>
            <h2 className="section-title mx-auto">Tre passaggi, nessuna lezione generica.</h2>
            <p className="section-copy mx-auto">
              Il percorso è breve e chiaro: contesto, simulazione, feedback scritto.
            </p>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article key={step.title} className="flow-node p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-mint text-sm font-black text-moss">
                      0{index + 1}
                    </span>
                    <Icon aria-hidden="true" className="h-5 w-5 text-moss" />
                  </div>
                  <h3 className="mt-5 text-lg font-black text-ink">{step.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-ink/70">{step.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </SectionReveal>

      <SectionReveal className="py-14">
        <div className="section-shell grid gap-8 lg:grid-cols-[0.84fr_1.16fr] lg:items-start">
          <div>
            <span className="eyebrow">
              <FileText aria-hidden="true" className="h-3.5 w-3.5" />
              Cosa ricevi
            </span>
            <h2 className="section-title">Una diagnosi utilizzabile, non solo “devi parlare di più”.</h2>
            <p className="section-copy">
              Il feedback ti aiuta a capire quali errori frenano il tuo speaking e quali frasi puoi iniziare a riusare.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {visibleReceiveItems.map((item) => (
              <div key={item} className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-soft">
                <Check aria-hidden="true" className="h-5 w-5 text-moss" />
                <p className="mt-3 text-sm font-bold text-ink/85">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionReveal>

      <SectionReveal className="bg-white/70 py-14">
        <div className="section-shell grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
          <div>
            <span className="eyebrow">Per chi è</span>
            <h2 className="section-title">È utile se hai già una base, ma non riesci a usarla bene sotto pressione.</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-lg border border-moss/20 bg-mint/50 p-5 shadow-sm">
              <h3 className="text-xl font-black text-ink">È adatto se...</h3>
              <div className="mt-5">
                <CheckList items={fitItems} />
              </div>
            </div>
            <div className="rounded-lg border border-coral/20 bg-blush p-5 shadow-sm">
              <h3 className="text-xl font-black text-ink">Non è ideale se...</h3>
              <div className="mt-5">
                <CheckList items={notFitItems} tone="warning" />
              </div>
            </div>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal className="py-14">
        <div className="section-shell">
          <div className="mx-auto max-w-3xl text-center">
            <span className="eyebrow">Esempio di feedback</span>
            <h2 className="section-title mx-auto">Le frasi deboli diventano frasi più chiare.</h2>
            <p className="section-copy mx-auto">
              Durante e dopo l'audit, il focus è trasformare risposte vaghe in risposte utilizzabili.
            </p>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {proofExamples.map((item) => (
              <article key={item.label} className="brand-card p-5">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-moss">{item.label}</p>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-lg bg-blush p-4">
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-coral">Prima</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-ink/70">{item.before}</p>
                  </div>
                  <div className="rounded-lg bg-mint p-4">
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-moss">Dopo</p>
                    <p className="mt-2 text-sm font-black leading-6 text-ink">{item.after}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </SectionReveal>

      <SectionReveal className="bg-linen/60 py-14">
        <div className="section-shell grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div>
            <span className="eyebrow">Dubbi rapidi</span>
            <h2 className="section-title">Prima di pagare, chiarisci le cose essenziali.</h2>
            <p className="section-copy">
              Se hai un dubbio personale, puoi usare la pagina Contatti. Questa sezione risponde alle obiezioni più comuni.
            </p>
          </div>
          <FAQAccordion items={simulationFaq} />
        </div>
      </SectionReveal>

      <SectionReveal className="py-14">
        <div className="section-shell">
          <div className="rounded-lg border border-ink/10 bg-ink p-6 text-white shadow-soft sm:p-8 lg:grid lg:grid-cols-[1fr_0.72fr] lg:items-center lg:gap-8">
            <div>
              <span className="inline-flex rounded-full bg-butter px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-ink">
                Primo passo - {primaryOffer.price}
              </span>
              <h2 className="mt-5 max-w-3xl text-3xl font-black leading-tight sm:text-4xl">
                Vuoi capire cosa blocca il tuo inglese prima di comprare un corso?
              </h2>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-white/70">
                Prenota l'audit: breve, concreto, con feedback scritto e una direzione chiara per decidere il prossimo passo.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <CTAButton variant="contrast">{auditCta}</CTAButton>
                <CTAButton href={externalLinks.bookingFlow} variant="secondary">
                  Guarda disponibilità
                </CTAButton>
              </div>
            </div>
            <div className="mt-7 grid gap-3 lg:mt-0">
              <MiniCard icon={CreditCard} title="Pagamento PayPal">
                Il sito non raccoglie dati di pagamento. Il posto è confermato dopo il pagamento.
              </MiniCard>
              <MiniCard icon={CalendarClock} title="30 minuti online">
                Sessione breve, mirata e pensata per vedere il blocco mentre succede.
              </MiniCard>
              <MiniCard icon={ShieldCheck} title="Una diagnosi, non una promessa magica">
                Capisci livello, errori e priorità. Nessuna garanzia finta, solo feedback concreto.
              </MiniCard>
            </div>
          </div>
        </div>
      </SectionReveal>
    </>
  );
}
