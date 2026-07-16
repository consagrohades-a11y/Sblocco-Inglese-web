import React from 'react';
import { ArrowRight, Headphones, MessageCircleMore, RefreshCw, Target, UserRoundCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ListeningPreview, MethodLoopVisual } from '../components/CourseVisuals';
import SEO from '../components/SEO';
import SectionReveal from '../components/SectionReveal';
import { sbloccoMethodSteps } from '../data/courseCatalog';

const differences = [
  {
    title: 'Non è conversazione lasciata al caso',
    text: 'Ogni attività ha una situazione, un obiettivo e un comportamento comunicativo da allenare. Parlare è importante, ma deve essere chiaro cosa stai imparando a fare.',
  },
  {
    title: 'Non è grammatica studiata in isolamento',
    text: 'La grammatica viene spiegata e corretta quando serve a rendere la tua risposta più precisa. Non diventa un ostacolo che rimanda continuamente la pratica reale.',
  },
  {
    title: 'Non è un’app che ti lascia solo',
    text: 'La piattaforma organizza la pratica, ma il feedback, le priorità e gli adattamenti restano umani. La tecnologia serve a dare continuità al lavoro con l’insegnante.',
  },
];

const listeningPrinciples = [
  {
    icon: Headphones,
    title: 'Prima il senso, poi i dettagli',
    text: 'Impari a capire cosa sta succedendo senza bloccarti perché hai perso una singola parola.',
  },
  {
    icon: RefreshCw,
    title: 'Il replay diventa un dato',
    text: 'Confrontiamo ciò che capisci al primo ascolto, ciò che recuperi dopo e quanto dipendi ancora dalla trascrizione.',
  },
  {
    icon: MessageCircleMore,
    title: 'L’ascolto porta a una risposta',
    text: 'Dopo aver capito, devi reagire: chiedere un chiarimento, dare un aggiornamento o rispondere al cliente.',
  },
];

export default function Method() {
  return (
    <>
      <SEO
        title="Il metodo Sblocco Inglese"
        description="Situazioni reali, preparazione mirata, listening, roleplay, feedback umano e Trainer: scopri come funziona il metodo Sblocco Inglese."
      />

      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_16%,rgba(255,196,87,0.14),transparent_28%),radial-gradient(circle_at_7%_84%,rgba(78,201,168,0.14),transparent_30%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span className="absolute left-[5%] top-24 h-3 w-3 rounded-full bg-coral/70" />
          <span className="absolute left-[8%] top-36 h-1.5 w-1.5 rounded-full bg-butter" />
          <span className="absolute right-[6%] top-16 h-4 w-4 rotate-45 rounded-sm border border-mint/35" />
        </div>
        <div className="section-shell relative grid gap-12 py-16 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:py-24">
          <div>
            <span className="inline-flex rounded-full border border-mint/30 bg-mint/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-mint">
              Il metodo Sblocco Inglese
            </span>
            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.96] sm:text-6xl lg:text-7xl">
              Sapere una regola non basta. Devi riuscire a usarla mentre qualcuno aspetta la tua risposta.
            </h1>
            <p className="mt-6 max-w-3xl text-lg font-semibold leading-8 text-white/75 sm:text-xl">
              Prepari il linguaggio, ascolti come viene usato, rispondi, ricevi correzioni e ripeti ciò che ti serve finché
              diventa più disponibile quando sei sotto pressione.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/percorsi"
                className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-butter px-6 py-3 text-base font-black text-ink transition hover:-translate-y-0.5 hover:bg-white"
              >
                Guarda i percorsi
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                to="/piattaforma"
                className="focus-ring inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 bg-white/[0.04] px-6 py-3 text-base font-black text-white transition hover:bg-white/10"
              >
                Guarda la piattaforma
              </Link>
            </div>
            <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.1em] text-mint">La domanda che guida il lavoro</p>
              <p className="mt-3 text-xl font-black leading-8 text-white">
                Cosa devi riuscire a fare in inglese che oggi eviti, rimandi o gestisci peggio di quanto vorresti?
              </p>
            </div>
          </div>
          <MethodLoopVisual />
        </div>
      </section>

      <SectionReveal>
        <section className="relative overflow-hidden py-16 lg:py-20">
          <div className="absolute left-[-5rem] top-20 h-52 w-52 rounded-full bg-mint/25 blur-3xl dark:bg-mint/[0.04]" />
          <div className="section-shell relative">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-coral">Il ciclo completo</p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-ink dark:text-white">
                Ogni passaggio prepara quello successivo.
              </h2>
              <p className="mt-5 text-base font-semibold leading-8 text-ink/65 dark:text-white/65">
                Non accumuli contenuti separati. Il linguaggio che incontri viene usato, corretto e ripreso più volte dentro lo
                stesso obiettivo.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sbloccoMethodSteps.map((step, index) => (
                <article
                  key={step.number}
                  className="group relative overflow-hidden rounded-[1.6rem] border border-ink/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft dark:border-white/10 dark:bg-white/[0.05]"
                >
                  <span className={`absolute inset-x-0 top-0 h-1 ${index % 3 === 0 ? 'bg-mint' : index % 3 === 1 ? 'bg-coral' : 'bg-butter'}`} />
                  <span className="absolute right-5 top-3 text-5xl font-black text-ink/[0.035] dark:text-white/[0.04]">{step.number}</span>
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl ${index % 3 === 0 ? 'bg-mint text-moss' : index % 3 === 1 ? 'bg-blush text-coral' : 'bg-butter text-ink'}`}>
                    <span className="text-sm font-black">{step.number}</span>
                  </span>
                  <h3 className="relative mt-5 text-xl font-black text-ink dark:text-white">{step.title}</h3>
                  <p className="relative mt-3 text-sm font-semibold leading-7 text-ink/65 dark:text-white/65">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      <SectionReveal>
        <section className="relative overflow-hidden bg-linen/70 py-16 dark:bg-white/[0.03] lg:py-20">
          <div className="absolute right-[-4rem] top-12 h-52 w-52 rounded-full border-[24px] border-butter/12" />
          <div className="section-shell relative grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-moss dark:text-mint">Ascoltare per interagire</p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-ink dark:text-white">
                Capire meglio non significa soltanto fare più quiz con l’audio.
              </h2>
              <p className="mt-5 text-base font-semibold leading-8 text-ink/65 dark:text-white/65">
                Il listening viene scomposto: senso generale, dettagli importanti, tono, parole conosciute ma non riconosciute e
                capacità di costruire una risposta mentre stai ancora elaborando ciò che hai sentito.
              </p>
              <div className="mt-7 grid gap-3">
                {listeningPrinciples.map(({ icon: Icon, title, text }, index) => (
                  <article key={title} className="flex gap-4 rounded-[1.4rem] border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${index === 0 ? 'bg-cyan-50 text-cyan-800 dark:bg-cyan-300/[0.08] dark:text-cyan-200' : index === 1 ? 'bg-butter text-ink' : 'bg-mint text-moss'}`}>
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-black text-ink dark:text-white">{title}</h3>
                      <p className="mt-2 text-sm font-semibold leading-6 text-ink/65 dark:text-white/65">{text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <ListeningPreview />
          </div>
        </section>
      </SectionReveal>

      <SectionReveal>
        <section className="section-shell py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-coral">Cosa cambia rispetto a una lezione normale</p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-ink dark:text-white">
                La pratica ha una direzione e lascia una traccia.
              </h2>
              <div className="mt-6 flex items-start gap-3 rounded-[1.5rem] border border-moss/15 bg-mint/50 p-5 dark:border-mint/15 dark:bg-mint/[0.08]">
                <Target aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-moss dark:text-mint" />
                <p className="text-sm font-bold leading-7 text-ink/75 dark:text-white/75">
                  Il criterio non è quante pagine hai completato. È ciò che riesci a capire e fare in una prova realistica alla fine del percorso.
                </p>
              </div>
            </div>
            <div className="grid gap-4">
              {differences.map((item, index) => (
                <article
                  key={item.title}
                  className={`relative overflow-hidden rounded-[1.5rem] border p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.05] ${
                    index === 0 ? 'border-moss/15 bg-mint/30' : index === 1 ? 'border-coral/15 bg-blush/40' : 'border-butter/25 bg-linen/65'
                  }`}
                >
                  <span className="absolute right-5 top-3 text-5xl font-black text-ink/[0.035] dark:text-white/[0.04]">0{index + 1}</span>
                  <UserRoundCheck aria-hidden="true" className="h-5 w-5 text-moss dark:text-mint" />
                  <h3 className="relative mt-4 text-xl font-black text-ink dark:text-white">{item.title}</h3>
                  <p className="relative mt-3 text-sm font-semibold leading-7 text-ink/65 dark:text-white/65">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      <section className="relative overflow-hidden bg-ink py-16 text-white">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-butter/10 blur-3xl" />
        <div className="section-shell relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-mint">Dal metodo al percorso</p>
            <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
              Ora puoi vedere quale corso usa questo metodo per il problema che vuoi risolvere.
            </h2>
          </div>
          <Link
            to="/percorsi"
            className="focus-ring inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-butter px-6 py-3 text-base font-black text-ink transition hover:-translate-y-0.5 hover:bg-white"
          >
            Confronta i corsi
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
