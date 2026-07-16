import React from 'react';
import { ArrowRight, Check, Clock3, MessageCircle, Sparkles, Target, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CourseMapPreview } from '../components/CourseVisuals';
import SEO from '../components/SEO';
import SectionReveal from '../components/SectionReveal';
import { externalLinks } from '../config/site';
import { launchCourses, waitlistCourses } from '../data/courseCatalog';

const cardAccents = [
  {
    shell: 'border-moss/30 bg-mint/35 dark:border-mint/20 dark:bg-mint/[0.06]',
    icon: 'bg-mint text-moss',
    line: 'bg-mint',
  },
  {
    shell: 'border-butter/30 bg-linen/70 dark:border-butter/15 dark:bg-butter/[0.04]',
    icon: 'bg-butter text-ink',
    line: 'bg-butter',
  },
  {
    shell: 'border-coral/20 bg-blush/45 dark:border-coral/15 dark:bg-coral/[0.04]',
    icon: 'bg-blush text-coral',
    line: 'bg-coral',
  },
  {
    shell: 'border-ink/10 bg-white dark:border-white/10 dark:bg-white/[0.05]',
    icon: 'bg-paper text-moss dark:bg-white/10 dark:text-mint',
    line: 'bg-ink dark:bg-mint',
  },
];

function CourseCard({ course, index }) {
  const accent = cardAccents[index % cardAccents.length];

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-[1.9rem] border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft ${accent.shell}`}
    >
      <div className={`absolute inset-x-0 top-0 h-1.5 ${accent.line}`} />
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/45 blur-2xl dark:bg-white/[0.03]" />

      <div className="relative flex flex-wrap items-start justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <span className={`grid h-11 w-11 place-items-center rounded-2xl ${accent.icon}`}>
            {course.featured ? <Sparkles aria-hidden="true" className="h-5 w-5" /> : <Target aria-hidden="true" className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.1em] text-ink/40 dark:text-white/40">Percorso 0{index + 1}</p>
            <p className="mt-1 text-xs font-black text-moss dark:text-mint">{course.status}</p>
          </div>
        </div>
        {course.featured ? (
          <span className="rounded-full bg-coral px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] text-white">
            Percorso principale
          </span>
        ) : null}
      </div>

      <h2 className="relative mt-6 text-3xl font-black leading-tight text-ink dark:text-white">{course.name}</h2>
      <p className="relative mt-4 text-base font-semibold leading-7 text-ink/68 dark:text-white/68">{course.summary}</p>

      <div className="relative mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-ink/10 bg-white/75 p-4 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
          <Clock3 aria-hidden="true" className="h-4 w-4 text-moss dark:text-mint" />
          <p className="mt-2 text-[0.68rem] font-black uppercase tracking-[0.08em] text-ink/40 dark:text-white/40">Durata</p>
          <p className="mt-1 text-sm font-black text-ink dark:text-white">{course.duration}</p>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white/75 p-4 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
          <Users aria-hidden="true" className="h-4 w-4 text-moss dark:text-mint" />
          <p className="mt-2 text-[0.68rem] font-black uppercase tracking-[0.08em] text-ink/40 dark:text-white/40">Formato</p>
          <p className="mt-1 text-sm font-black text-ink dark:text-white">{course.groupSize}</p>
        </div>
      </div>

      <div className="relative mt-6 rounded-[1.4rem] border border-white/55 bg-white/65 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/10">
        <p className="text-xs font-black uppercase tracking-[0.08em] text-coral">Che cosa dovrebbe cambiare</p>
        <p className="mt-3 text-sm font-bold leading-7 text-ink/75 dark:text-white/75">{course.outcome}</p>
      </div>

      <div className="relative mt-6 grid gap-2">
        {course.includes.slice(0, 5).map((item) => (
          <div key={item} className="flex items-start gap-2 text-sm font-semibold leading-6 text-ink/65 dark:text-white/65">
            <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-moss dark:text-mint" />
            {item}
          </div>
        ))}
      </div>

      <div className="relative mt-auto pt-7">
        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-ink/10 pt-5 dark:border-white/10">
          <div>
            <p className="text-3xl font-black text-ink dark:text-white">{course.price}</p>
            <p className="mt-1 text-xs font-semibold text-ink/45 dark:text-white/45">{course.standardPrice}</p>
          </div>
          {course.route.startsWith('/corsi/') ? (
            <Link
              to={course.route}
              className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-moss px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#096d58]"
            >
              Vedi il programma
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          ) : (
            <a
              href={externalLinks.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-moss px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#096d58]"
            >
              Chiedi informazioni
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
          )}
        </div>
        <p className="mt-4 text-xs font-bold leading-5 text-ink/45 dark:text-white/45">{course.availability}</p>
      </div>
    </article>
  );
}

export default function Percorsi() {
  return (
    <>
      <SEO
        title="Corsi di inglese | Sblocco Inglese"
        description="Confronta i percorsi Sblocco Inglese per lavoro, speaking sotto pressione, colloqui, basi, listening e obiettivi professionali specifici."
      />

      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_20%,rgba(255,196,87,0.14),transparent_30%),radial-gradient(circle_at_4%_85%,rgba(78,201,168,0.14),transparent_28%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span className="absolute left-[5%] top-24 h-3 w-3 rounded-full bg-coral/70" />
          <span className="absolute left-[8%] top-36 h-1.5 w-1.5 rounded-full bg-butter" />
          <span className="absolute right-[6%] top-16 h-4 w-4 rotate-45 rounded-sm border border-mint/35" />
        </div>

        <div className="section-shell relative grid gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div>
            <span className="inline-flex rounded-full border border-mint/30 bg-mint/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-mint">
              Corsi e percorsi
            </span>
            <h1 className="mt-6 max-w-5xl text-5xl font-black leading-[0.96] sm:text-6xl lg:text-7xl">
              Non tutti hanno bisogno dello stesso inglese.
            </h1>
            <p className="mt-6 max-w-3xl text-lg font-semibold leading-8 text-white/72 sm:text-xl">
              Alcune persone devono intervenire nelle riunioni. Altre devono capire meglio l’inglese parlato, preparare un
              colloquio o ricostruire le basi. Qui trovi il formato, le ore e il risultato previsto di ogni percorso, senza
              dover prenotare una call solo per capire cosa viene offerto.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/corsi/business-english-flow"
                className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-butter px-6 py-3 text-base font-black text-ink transition hover:-translate-y-0.5 hover:bg-white"
              >
                Scopri Business English Flow
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                to="/metodo"
                className="focus-ring inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 bg-white/[0.04] px-6 py-3 text-base font-black text-white transition hover:bg-white/10"
              >
                Come funziona il metodo
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.08em] text-white/55">
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">gruppi piccoli</span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">pratica vocale</span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">listening</span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">feedback umano</span>
            </div>
          </div>
          <CourseMapPreview />
        </div>
      </section>

      <SectionReveal>
        <section className="relative overflow-hidden py-16 lg:py-20">
          <div className="absolute left-[-5rem] top-20 h-52 w-52 rounded-full bg-mint/25 blur-3xl dark:bg-mint/[0.04]" />
          <div className="section-shell relative">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-coral">Percorsi disponibili o in apertura</p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-ink dark:text-white">
                Puoi entrare direttamente nel percorso che corrisponde al tuo obiettivo.
              </h2>
              <p className="mt-5 text-base font-semibold leading-8 text-ink/65 dark:text-white/65">
                La simulazione da €39 resta disponibile per chi vuole una diagnosi individuale o ha una scadenza urgente. Non è
                però un passaggio obbligatorio prima di chiedere informazioni su un corso.
              </p>
            </div>
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {launchCourses.map((course, index) => (
                <CourseCard key={course.id} course={course} index={index} />
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      <SectionReveal>
        <section className="relative overflow-hidden bg-linen/70 py-16 dark:bg-white/[0.03] lg:py-20">
          <div className="absolute right-[-4rem] top-12 h-52 w-52 rounded-full border-[24px] border-butter/12" />
          <div className="section-shell relative">
            <div className="grid gap-8 lg:grid-cols-[0.74fr_1.26fr] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-moss dark:text-mint">In preparazione</p>
                <h2 className="mt-4 text-4xl font-black leading-tight text-ink dark:text-white">
                  Altri percorsi apriranno quando struttura e materiali saranno pronti.
                </h2>
                <p className="mt-5 text-base font-semibold leading-8 text-ink/65 dark:text-white/65">
                  Puoi lasciare il tuo interesse fin da ora. Questo aiuta anche a decidere quale gruppo aprire per primo e in
                  quali orari.
                </p>
              </div>
              <div className="rounded-[1.6rem] border border-moss/15 bg-mint/45 p-5 dark:border-mint/15 dark:bg-mint/[0.06]">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-moss dark:text-mint">Perché una lista d’interesse</p>
                <p className="mt-2 text-sm font-bold leading-7 text-ink/75 dark:text-white/75">
                  Non voglio aprire corsi generici solo per riempire una pagina. Prima definisco l’obiettivo, le ore, le prove e il risultato finale.
                </p>
              </div>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {waitlistCourses.map((course, index) => (
                <article
                  key={course.name}
                  className="group relative overflow-hidden rounded-[1.6rem] border border-ink/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft dark:border-white/10 dark:bg-white/[0.05]"
                >
                  <span className={`absolute inset-x-0 top-0 h-1 ${index % 3 === 0 ? 'bg-mint' : index % 3 === 1 ? 'bg-coral' : 'bg-butter'}`} />
                  <span className="absolute right-5 top-3 text-5xl font-black text-ink/[0.035] dark:text-white/[0.04]">0{index + 1}</span>
                  <div className="relative flex flex-wrap items-start justify-between gap-3 pt-1">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-coral">{course.level}</p>
                      <h3 className="mt-2 text-2xl font-black text-ink dark:text-white">{course.name}</h3>
                    </div>
                    <span className="rounded-full bg-linen px-3 py-1.5 text-xs font-black text-ink dark:bg-white/10 dark:text-white">
                      Lista d’interesse
                    </span>
                  </div>
                  <p className="relative mt-4 text-sm font-semibold leading-7 text-ink/65 dark:text-white/65">{course.summary}</p>
                  <div className="relative mt-5 flex flex-wrap gap-2 text-xs font-black text-ink/55 dark:text-white/55">
                    <span className="rounded-full border border-ink/10 px-3 py-1.5 dark:border-white/10">{course.duration}</span>
                    <span className="rounded-full border border-ink/10 px-3 py-1.5 dark:border-white/10">{course.price}</span>
                  </div>
                  <a
                    href={externalLinks.whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring relative mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-moss/30 px-5 py-2.5 text-sm font-black text-moss transition hover:bg-mint/45 dark:border-mint/25 dark:text-mint"
                  >
                    Avvisami quando apre
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      <SectionReveal>
        <section className="section-shell py-16 lg:py-20">
          <div className="grid gap-5 lg:grid-cols-3">
            <article className="relative overflow-hidden rounded-[1.9rem] border border-ink/10 bg-white p-7 shadow-sm dark:border-white/10 dark:bg-white/[0.05] lg:col-span-2">
              <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-mint/30 blur-3xl dark:bg-mint/[0.05]" />
              <div className="relative">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint text-moss">
                  <MessageCircle aria-hidden="true" className="h-5 w-5" />
                </span>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.12em] text-coral">Non sai quale scegliere?</p>
                <h2 className="mt-4 text-3xl font-black leading-tight text-ink dark:text-white">
                  Puoi descrivermi la situazione senza acquistare nulla prima.
                </h2>
                <p className="mt-4 max-w-3xl text-base font-semibold leading-8 text-ink/65 dark:text-white/65">
                  Scrivimi che lavoro fai, quando usi l’inglese e cosa succede nel momento in cui diventa difficile. Ti dirò se
                  uno dei percorsi esistenti è adatto oppure se ha più senso aspettare un gruppo diverso.
                </p>
                <a
                  href={externalLinks.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-moss px-6 py-3 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-[#096d58]"
                >
                  <MessageCircle aria-hidden="true" className="h-5 w-5" />
                  Scrivimi su WhatsApp
                </a>
              </div>
            </article>

            <article className="relative overflow-hidden rounded-[1.9rem] bg-ink p-7 text-white shadow-soft">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-butter/12 blur-2xl" />
              <div className="relative">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-butter text-ink">
                  <Target aria-hidden="true" className="h-5 w-5" />
                </span>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.12em] text-mint">Diagnosi individuale</p>
                <h2 className="mt-4 text-2xl font-black leading-tight">Hai una scadenza o vuoi un’analisi più precisa?</h2>
                <p className="mt-4 text-sm font-semibold leading-7 text-white/65">
                  La simulazione da €39 include 30 minuti online, correzione e feedback scritto. È utile soprattutto per
                  colloqui, urgenze e obiettivi molto specifici.
                </p>
                <Link
                  to="/simulazione-39"
                  className="focus-ring mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-butter px-5 py-2.5 text-sm font-black text-ink transition hover:bg-white"
                >
                  Guarda la simulazione
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </article>
          </div>
        </section>
      </SectionReveal>
    </>
  );
}
