import React from 'react';
import {
  Brain,
  CheckCircle2,
  FileText,
  GraduationCap,
  MessageSquareWarning,
  Sparkles,
  Target,
  Video,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import CTAButton from '../components/CTAButton';
import FAQAccordion from '../components/FAQAccordion';
import PricingCard from '../components/PricingCard';
import ProcessSteps from '../components/ProcessSteps';
import SEO from '../components/SEO';
import SectionReveal from '../components/SectionReveal';
import TrustBadges from '../components/TrustBadges';
import { CtaBand, FeatureList, ProductCard, Section, SectionHeader } from '../components/VisualSystem';
import { ctaLabels, primaryOffer } from '../config/site';
import {
  bookingSteps,
  faqItems,
  feedbackExamples,
  percorsoOffers,
  processSteps,
  receiveItems,
} from '../data/content';
import { trainerConfig } from '../data/trainerConfig';

const pressureSignals = [
  'capisci la domanda, ma la risposta arriva tardi',
  "traduci mentalmente dall'italiano e perdi naturalezza",
  'hai esperienza, ma in inglese sembri meno sicuro/a',
  'call e colloqui ti mettono pressione anche se hai studiato',
];

const systemProof = [
  { value: 'Corsi', label: "Lezioni, struttura, docente" },
  { value: primaryOffer.price, label: 'diagnosi iniziale' },
  { value: '900+', label: 'card trainer disponibili' },
];

const ecosystemRail = [
  { title: 'Corsi', text: 'percorsi guidati', accent: 'bg-mint text-moss' },
  { title: 'Simulazione', text: `diagnosi da ${primaryOffer.price}`, accent: 'bg-butter text-ink' },
  { title: 'Trainer', text: 'ripetizione SRS', accent: 'bg-blush text-coral' },
];

const energyItems = [
  'corsi pratici',
  'colloqui',
  'call',
  'clienti',
  'feedback scritto',
  'trainer SRS',
  'business English',
  'speaking sotto pressione',
];

const productFlow = [
  {
    label: 'Centro',
    title: 'Corsi',
    text: 'Percorsi guidati per costruire sicurezza, risposte e naturalezza nel tempo.',
    accent: 'bg-mint text-moss',
  },
  {
    label: 'Ingresso',
    title: `Simulazione ${primaryOffer.price}`,
    text: 'Una diagnosi concreta per capire blocco, livello e priorità prima di scegliere.',
    accent: 'bg-butter text-ink',
  },
  {
    label: 'Supporto',
    title: 'Trainer',
    text: 'Ripetizione intelligente per far tornare le frasi giuste quando servono.',
    accent: 'bg-blush text-coral',
  },
];

const coursePrinciples = [
  'parti da situazioni reali: colloqui, call, clienti, presentazioni',
  'ricevi correzioni precise, non incoraggiamento generico',
  'trasformi errori ricorrenti in frasi riutilizzabili',
  'continui a ripetere il materiale con il trainer SRS',
];

function Hero() {
  return (
    <section className="hero-frame relative isolate overflow-hidden border-b border-ink/10 bg-ink">
      <img
        src="/assets/museum-of-new-zealand-te-papa-tongarewa-v4dXLnGhOrE-unsplash.jpg"
        alt=""
        className="hero-image-motion absolute inset-0 -z-20 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(17,31,27,0.88)_0%,rgba(17,31,27,0.72)_38%,rgba(17,31,27,0.18)_74%,rgba(17,31,27,0.04)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(17,31,27,0.12)_0%,rgba(17,31,27,0.42)_100%)]" />
      <div className="absolute bottom-0 right-0 -z-10 hidden h-2/3 w-1/2 bg-[linear-gradient(135deg,transparent,rgba(255,196,87,0.16))] lg:block" />

      <div className="section-shell grid min-h-[calc(94svh-88px)] content-center py-16 sm:py-20 lg:min-h-[calc(88svh-88px)]">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.94fr)_minmax(320px,0.44fr)] lg:items-end">
          <div className="max-w-5xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-mint backdrop-blur">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            Corsi di inglese pratico per lavoro, colloqui e speaking
          </span>
          <h1 className="mt-7 max-w-5xl text-5xl font-black leading-[0.95] text-white [text-shadow:0_3px_24px_rgba(0,0,0,0.38)] sm:text-6xl lg:text-7xl">
            Parla inglese con la lucidità che hai già in italiano.
          </h1>
          <p className="mt-6 max-w-3xl text-lg font-medium leading-8 text-white/90 [text-shadow:0_2px_16px_rgba(0,0,0,0.34)] sm:text-xl">
            Sblocco Inglese unisce corsi, simulazioni e trainer per aiutarti a rispondere con più chiarezza quando sei
            sotto pressione: colloqui, call, clienti, lavoro e scelte importanti.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <CTAButton href="/percorsi" variant="contrast">
              Scopri i corsi
            </CTAButton>
            <Link
              to="/simulazione-39"
              className="focus-ring inline-flex min-h-12 items-center justify-center rounded-full border border-white/40 bg-white/10 px-5 py-3 text-sm font-extrabold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:text-ink sm:text-base"
            >
              Inizia con la simulazione da {primaryOffer.price}
            </Link>
          </div>
          <div className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
            {systemProof.map((item, index) => (
              <div
                key={item.label}
                className="hero-float-card rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white backdrop-blur"
                style={{ animationDelay: `${index * 0.45}s` }}
              >
                <p className="text-2xl font-black">{item.value}</p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.08em] text-white/60">{item.label}</p>
              </div>
            ))}
          </div>
          </div>
          <div className="dynamic-rail hidden p-4 backdrop-blur-md lg:block lg:self-end">
            <div className="grid gap-3">
              {ecosystemRail.map((item, index) => (
                <div
                  key={item.title}
                  className="hero-float-card grid grid-cols-[auto_1fr] items-center gap-3 rounded-lg border border-ink/10 bg-white/90 p-3 shadow-sm"
                  style={{ animationDelay: `${0.6 + index * 0.45}s` }}
                >
                  <span className={`grid h-10 w-10 place-items-center rounded-lg text-sm font-black ${item.accent}`}>
                    0{index + 1}
                  </span>
                  <span>
                    <span className="block text-base font-black text-ink">{item.title}</span>
                    <span className="block text-sm font-semibold text-ink/70">{item.text}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EnergyRibbon() {
  const repeated = [...energyItems, ...energyItems];

  return (
    <div className="energy-strip">
      <div className="section-shell overflow-hidden py-3">
        <div className="energy-track gap-3">
          {repeated.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="inline-flex items-center gap-3 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white/80"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-butter" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductFlow() {
  return (
    <div className="flow-panel p-5 sm:p-6 lg:p-8">
      <div className="grid gap-6 lg:grid-cols-[0.74fr_1.26fr] lg:items-center">
        <div className="section-kicker">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-coral">Un unico ecosistema</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-4xl">
            Corsi al centro. Simulazione per iniziare. Trainer per non perdere momentum.
          </h2>
          <p className="mt-4 text-base font-semibold leading-7 text-ink/70">
            Ogni cosa ha un ruolo preciso: non confonde il percorso, lo rende più facile da iniziare e più difficile da
            abbandonare.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {productFlow.map((item, index) => (
            <article key={item.title} className="flow-node">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.08em] ${item.accent}`}>
                {item.label}
              </span>
              <p className="mt-5 text-xs font-black text-ink/50">0{index + 1}</p>
              <h3 className="mt-2 text-2xl font-black leading-tight text-ink">{item.title}</h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-ink/70">{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function PressureVisual() {
  return (
    <div className="brand-panel overflow-hidden !bg-ink !text-white">
      <div className="h-1 scanline" />
      <div className="grid gap-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[0.78fr_1fr] sm:items-center">
          <div className="rounded-lg bg-white/[0.08] p-5">
            <img src="/assets/question-and-answer-svgrepo-com.svg" alt="" className="mx-auto h-44 w-44 object-contain" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-mint/80">Da blocco a risposta</p>
            <h3 className="mt-3 text-2xl font-black leading-tight">
              La pratica serve solo se assomiglia al momento in cui ti blocchi.
            </h3>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Per questo lavoriamo su scene concrete: una domanda di colloquio, una call improvvisa, una risposta a un
              cliente, una frase che in italiano ti sembra chiara ma in inglese si inceppa.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {['Simula', 'Correggi', 'Riusa'].map((step, index) => (
            <div key={step} className="rounded-lg border border-white/10 bg-white/[0.07] p-4">
              <p className="text-xs font-black text-mint/80">0{index + 1}</p>
              <p className="mt-2 text-lg font-black">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CoursePreview() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {percorsoOffers.map((offer) => {
        const Icon = offer.icon;
        return (
          <ProductCard
            key={offer.title}
            label={offer.type}
            title={offer.title}
            text={offer.description}
            to="/percorsi"
            action="Vedi il percorso"
            meta={
              <div className="grid gap-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-mint text-moss">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="text-lg font-black text-coral">{offer.price}</span>
                </div>
                <div className="grid gap-2">
                  {offer.includes.slice(0, 4).map((item) => (
                    <span key={item} className="flex items-start gap-2 text-sm font-semibold leading-5 text-ink/70">
                      <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            }
          />
        );
      })}
    </div>
  );
}

function FeedbackPreview() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {feedbackExamples.map((item) => (
        <article key={item.label} className="brand-card p-5">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-moss">{item.label}</p>
          <div className="mt-4 grid gap-3">
            <div className="rounded-lg bg-blush p-4">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-coral">Prima</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-ink/70">{item.before}</p>
            </div>
            <div className="rounded-lg bg-mint p-4">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-moss">Dopo</p>
              <p className="mt-2 text-sm font-bold leading-6 text-ink">{item.after}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <SEO
        title="Sblocco Inglese | Corsi di speaking per lavoro, colloqui e call"
        description={`Corsi di inglese pratico per italiani che si bloccano quando devono parlare. Inizia con una simulazione da ${primaryOffer.price}, poi continua con percorsi e trainer SRS.`}
      />

      <EnergyRibbon />
      <Hero />

      <SectionReveal className="py-0">
        <Section tone="soft">
          <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div>
              <SectionHeader
                eyebrow="Il problema reale"
                icon={MessageSquareWarning}
                title="Non ti manca solo l'inglese. Ti manca la rapidità nella risposta quando qualcuno ti parla."
                copy="Molte persone hanno studiato, capiscono abbastanza, leggono email e seguono video. Poi arriva una domanda dal vivo e tutto diventa più lento, più rigido, e sconnesso."
              />
              <FeatureList items={pressureSignals} className="mt-7 sm:grid-cols-2" />
            </div>
            <PressureVisual />
          </div>
        </Section>
      </SectionReveal>

      <SectionReveal className="py-0">
        <Section tone="linen">
          <ProductFlow />
        </Section>
      </SectionReveal>

      <SectionReveal className="py-0">
        <Section>
          <div className="rounded-[1.75rem] border border-ink/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-moss dark:text-mint">New grammar-output units</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="text-3xl font-black leading-tight text-ink dark:text-white">A1 Learning Path</h2>
                <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-ink/70 dark:text-white/70">
                  Learn the rule, use it actively, get diagnostic feedback. Trovi le nuove unità A1 dentro la grammatica, senza cambiare il resto del sito.
                </p>
              </div>
              <Link
                to="/grammar/a1"
                className="focus-ring inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-moss dark:bg-mint dark:text-ink"
              >
                Vai all'A1 Learning Path
              </Link>
            </div>
          </div>
        </Section>
      </SectionReveal>

      <SectionReveal className="py-0">
        <Section>
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div>
              <SectionHeader
                eyebrow="Corsi prima di tutto"
                icon={GraduationCap}
                title="Il cuore di Sblocco Inglese sta nei percorsi pratici, guidati e progressivi."
                copy="La simulazione ti dà un primo accesso con una diagnosi chiara. Il corso è dove quella diagnosi trasformata in pratica costante: risposte migliori, più sicurezza e un inglese che regge nei momenti importanti."
              />
              <FeatureList items={coursePrinciples} className="mt-7" />
            </div>
            <CoursePreview />
          </div>
        </Section>
      </SectionReveal>

      <SectionReveal className="py-0">
        <Section tone="linen">
          <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
            <div>
              <SectionHeader
                eyebrow="Primo accesso"
                icon={Target}
                title={`La simulazione da ${primaryOffer.price} è il modo più rapido per capire da dove partire.`}
                copy="È il primo passo: una sessione breve, concreta, con feedback scritto. Serve a vedere il blocco in azione e a scegliere il percorso giusto senza comprare alla cieca."
              />
              <div className="mt-7">
                <FeatureList items={receiveItems} className="sm:grid-cols-2" />
              </div>
            </div>
            <PricingCard />
          </div>
        </Section>
      </SectionReveal>

      <SectionReveal className="py-0">
        <Section>
          <SectionHeader
            eyebrow="Metodo"
            icon={Video}
            title="Una struttura chiara, perché parlare sotto pressione non si improvvisa."
            copy="Ogni sessione ha un ritmo preciso: obiettivo, simulazione, correzione, feedback. Il corso allunga quel lavoro nel tempo; il trainer lo rende ripetibile."
            align="center"
          />
          <div className="mt-9">
            <ProcessSteps steps={processSteps} title="Metodo Sblocco Inglese" />
          </div>
        </Section>
      </SectionReveal>

      <SectionReveal className="py-0">
        <Section tone="soft">
          <SectionHeader
            eyebrow="Feedback che resta"
            icon={FileText}
            title="Le frasi deboli diventano frasi da usare davvero."
            copy="Non esci con un vago “devo parlare di più”. Esci con correzioni, alternative e formule che puoi rivedere prima di una call, un colloquio o una risposta importante."
          />
          <div className="mt-8">
            <FeedbackPreview />
          </div>
        </Section>
      </SectionReveal>

      <SectionReveal className="py-0">
        <Section tone="ink">
          <div className="grid gap-9 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div>
              <SectionHeader
                eyebrow="Prodotto digitale"
                icon={Brain}
                title="Il Trainer è il prodotto che mantiene vivo il lavoro tra una sessione e l'altra."
                copy="Frasi, parole e risposte tornano con ripetizione dilazionata: ciò che è difficile ricompare prima, ciò che è stabile torna più avanti. Non sostituisce i corsi: li rende più efficaci. Ogni lezione diventa una palestra in più dove utilizzare tutto ciò che si è imparato dentro e fuori."
                light
              />
              <Link
                to="/trainers"
                className="focus-ring mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-butter px-5 py-3 text-sm font-extrabold text-ink transition hover:bg-white"
              >
                Esplora il Trainer
              </Link>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {trainerConfig.map((trainer) => (
                <ProductCard
                  key={trainer.id}
                  label={`${trainer.cardCount} card`}
                  title={trainer.shortTitle}
                  text={trainer.description}
                  to={trainer.route}
                  action="Apri"
                  meta={
                    <div className="rounded-lg border border-ink/10 bg-paper p-3">
                      <img src={trainer.visual} alt="" className="mx-auto h-24 w-24 object-contain" />
                    </div>
                  }
                />
              ))}
            </div>
          </div>
        </Section>
      </SectionReveal>

      <SectionReveal id="come-funziona" className="py-0">
        <Section>
          <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
            <div>
              <SectionHeader
                eyebrow="Percorso di ingresso"
                icon={CheckCircle2}
                title="Se non sai da quale corso partire, parti dalla simulazione."
                copy="È il modo più sicuro per capire livello, blocco principale e urgenza reale. Dopo, il passo successivo sarà molto più chiaro."
              />
              <div className="mt-7">
                <TrustBadges />
              </div>
            </div>
            <ProcessSteps steps={bookingSteps.slice(0, 4)} title="Prenotazione simulazione" />
          </div>
        </Section>
      </SectionReveal>

      <SectionReveal className="py-0">
        <Section tone="linen">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div>
              <SectionHeader
                eyebrow="FAQ"
                title="Dubbi prima di iniziare?"
                copy="Le domande più comuni riguardano livello, corsi, simulazione, pagamento e cosa ricevi dopo la prima sessione."
              />
            </div>
            <FAQAccordion items={faqItems.slice(0, 4)} />
          </div>
          <div className="mt-10">
            <CtaBand
              eyebrow="Primo passo"
              title="Vuoi capire quale percorso può sbloccare il tuo inglese?"
              copy={`Inizia con la simulazione da ${primaryOffer.price}: breve, concreta, pensata per trasformare il blocco in una direzione di lavoro chiara.`}
            >
              <CTAButton href="/percorsi" variant="contrast">
                Guarda i corsi
              </CTAButton>
              <CTAButton href="/simulazione-39" variant="secondary">
                Inizia da {primaryOffer.price}
              </CTAButton>
            </CtaBand>
          </div>
        </Section>
      </SectionReveal>
    </>
  );
}
