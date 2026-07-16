import React from 'react';
import {
  ArrowRight,
  BarChart3,
  Check,
  Clock3,
  Headphones,
  MessageCircle,
  Mic2,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import SectionReveal from '../components/SectionReveal';
import { externalLinks } from '../config/site';
import { businessEnglishWeeks, launchCourses } from '../data/courseCatalog';

const course = launchCourses.find((item) => item.id === 'business-english-flow');

const outcomes = [
  'presentarti e spiegare il tuo ruolo con più precisione',
  'seguire il senso di un aggiornamento e riconoscere scadenze, problemi e prossimi passi',
  'partecipare a una riunione senza aspettare di avere la frase perfetta',
  'chiedere chiarimenti e controllare di aver capito',
  'dare aggiornamenti chiari su progressi, ritardi e difficoltà',
  'capire meglio le esigenze di un cliente e proporre una soluzione',
  'gestire disaccordi e conversazioni delicate con un tono professionale',
  'rispondere a domande successive senza perdere completamente il filo',
];

const weeklyCycle = [
  {
    icon: Users,
    title: 'Incontro live',
    text: 'Impari e provi il linguaggio della settimana in una lezione pratica con un gruppo piccolo.',
  },
  {
    icon: Headphones,
    title: 'Listening guidato',
    text: 'Ascolti conversazioni realistiche e impari a individuare il senso, i dettagli importanti e ciò che devi fare dopo.',
  },
  {
    icon: Mic2,
    title: 'Roleplay registrato',
    text: 'Rispondi vocalmente dentro una situazione di lavoro e puoi riascoltarti prima di consegnare.',
  },
  {
    icon: Sparkles,
    title: 'Trainer mirato',
    text: 'Le espressioni utili tornano durante la settimana, così non restano legate a una sola lezione.',
  },
  {
    icon: MessageCircle,
    title: 'Feedback umano',
    text: 'Ricevi correzioni su chiarezza, naturalezza, tono, grammatica e gestione della conversazione.',
  },
  {
    icon: BarChart3,
    title: 'Progresso visibile',
    text: 'Confrontiamo la prova iniziale e quella finale per vedere cosa è cambiato davvero.',
  },
];

const faq = [
  {
    question: 'Devo avere già un buon livello?',
    answer:
      'Non serve parlare in modo fluente. Il percorso è pensato soprattutto per persone tra A2 avanzato, B1 e B2 che riescono già a costruire frasi, ma fanno fatica a usarle con rapidità nelle situazioni di lavoro.',
  },
  {
    question: 'È un corso di grammatica?',
    answer:
      'La grammatica viene corretta e spiegata quando serve a rendere più chiaro ciò che vuoi dire. Non è però un corso costruito intorno a lunghe spiegazioni teoriche: il centro è usare l’inglese in situazioni professionali.',
  },
  {
    question: 'Quanto lavoro c’è tra una lezione e l’altra?',
    answer:
      'In media da due a tre ore alla settimana, distribuite tra listening, Trainer, esercizi e una produzione parlata. Le attività sono divise in passaggi brevi e hanno una direzione chiara.',
  },
  {
    question: 'Devo registrare la mia voce?',
    answer:
      'Sì. Una parte importante del percorso consiste nel rispondere vocalmente a roleplay e situazioni realistiche. Le registrazioni servono per ricevere feedback e confrontare il prima e il dopo. Non vengono pubblicate.',
  },
  {
    question: 'Cosa succede se salto un incontro?',
    answer:
      'Avrai comunque accesso alle attività della settimana. Il corso funziona meglio con una presenza regolare, quindi prima dell’iscrizione controlleremo che gli orari siano compatibili con il gruppo.',
  },
  {
    question: 'Il prezzo di €199 resterà uguale?',
    answer:
      'No. È il prezzo della prima cohort a pagamento, pensato per chi entra mentre il programma viene consolidato dopo il pilot. Il prezzo previsto per le edizioni successive è €249.',
  },
];

function CourseMetric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur">
      <Icon aria-hidden="true" className="h-5 w-5 text-mint" />
      <p className="mt-3 text-xs font-black uppercase tracking-[0.1em] text-white/55">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

export default function BusinessEnglishFlow() {
  return (
    <>
      <SEO
        title="Business English Flow | Sblocco Inglese"
        description="Un percorso di 8 settimane per usare l’inglese con più controllo in riunioni, aggiornamenti, conversazioni con clienti e situazioni professionali reali."
      />

      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,196,87,0.18),transparent_28%),radial-gradient(circle_at_10%_80%,rgba(78,201,168,0.16),transparent_30%)]" />
        <div className="section-shell relative grid gap-10 py-16 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:py-24">
          <div>
            <span className="inline-flex rounded-full border border-mint/30 bg-mint/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-mint">
              {course.status}
            </span>
            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.97] sm:text-6xl">
              Usa l’inglese nel lavoro senza preparare ogni frase in anticipo.
            </h1>
            <p className="mt-6 max-w-3xl text-lg font-semibold leading-8 text-white/78 sm:text-xl">
              Business English Flow è un percorso di otto settimane per chi ha idee, esperienza e competenze professionali,
              ma in inglese partecipa meno di quanto vorrebbe. Lavoriamo su riunioni, aggiornamenti, clienti, problemi e
              decisioni attraverso lezioni live, listening realistici, roleplay vocali e feedback umano.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={externalLinks.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-butter px-6 py-3 text-base font-black text-ink transition hover:-translate-y-0.5 hover:bg-white"
              >
                Chiedi un posto nella cohort
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </a>
              <Link
                to="/metodo"
                className="focus-ring inline-flex min-h-12 items-center justify-center rounded-full border border-white/30 bg-white/[0.06] px-6 py-3 text-base font-black text-white transition hover:bg-white/12"
              >
                Guarda come lavoriamo
              </Link>
            </div>
            <p className="mt-4 text-sm font-semibold text-white/55">
              Prima edizione a pagamento prevista per settembre 2026. Gruppo piccolo, massimo 8 persone.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/15 bg-white/[0.08] p-5 shadow-2xl backdrop-blur sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/12 pb-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-mint">Prezzo cohort fondatrice</p>
                <p className="mt-2 text-5xl font-black">{course.price}</p>
                <p className="mt-1 text-sm font-semibold text-white/50">{course.standardPrice}</p>
              </div>
              <span className="rounded-full bg-coral px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] text-white">
                8 settimane
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <CourseMetric icon={Clock3} label="Lezioni" value={course.liveHours} />
              <CourseMetric icon={Users} label="Gruppo" value={course.groupSize} />
              <CourseMetric icon={BarChart3} label="Impegno" value={course.totalHours} />
              <CourseMetric icon={ShieldCheck} label="Livello" value={course.level} />
            </div>
            <div className="mt-5 grid gap-2">
              {course.includes.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm font-semibold leading-6 text-white/75">
                  <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-mint" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SectionReveal>
        <section className="section-shell py-16 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-coral">A chi serve davvero</p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-ink dark:text-white">
                Non devi sembrare più intelligente in inglese. Devi riuscire a far vedere la competenza che hai già.
              </h2>
              <p className="mt-5 text-base font-semibold leading-8 text-ink/65 dark:text-white/65">
                Questo percorso è pensato per chi capisce abbastanza, ma durante una conversazione reale rallenta, perde
                dettagli importanti o usa un inglese molto più semplice rispetto alle proprie capacità professionali.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {outcomes.map((item) => (
                <div key={item} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
                  <Check aria-hidden="true" className="h-5 w-5 text-moss dark:text-mint" />
                  <p className="mt-3 text-sm font-bold leading-6 text-ink/75 dark:text-white/75">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      <SectionReveal>
        <section className="bg-linen/70 py-16 dark:bg-white/[0.03] lg:py-20">
          <div className="section-shell">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-moss dark:text-mint">Il ritmo di ogni settimana</p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-ink dark:text-white">
                La lezione non resta isolata. Quello che impari torna nell’ascolto, nella pratica e nel feedback.
              </h2>
              <p className="mt-5 text-base font-semibold leading-8 text-ink/65 dark:text-white/65">
                Ogni settimana ha un obiettivo comunicativo preciso. Prima prepari il linguaggio, poi lo riconosci quando
                viene usato da altri e infine lo usi in una situazione in cui devi reagire davvero.
              </p>
            </div>
            <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {weeklyCycle.map(({ icon: Icon, title, text }) => (
                <article key={title} className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint text-moss dark:bg-mint/15 dark:text-mint">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-xl font-black text-ink dark:text-white">{title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-ink/65 dark:text-white/65">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      <SectionReveal>
        <section className="section-shell py-16 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-coral">Programma completo</p>
            <h2 className="mt-4 text-4xl font-black leading-tight text-ink dark:text-white">
              Otto settimane costruite intorno a ciò che succede davvero nel lavoro.
            </h2>
          </div>
          <div className="mt-9 grid gap-4 lg:grid-cols-2">
            {businessEnglishWeeks.map((week) => (
              <article key={week.number} className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
                <div className="flex items-start gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink text-sm font-black text-white dark:bg-mint dark:text-ink">
                    {week.number}
                  </span>
                  <div>
                    <h3 className="text-xl font-black text-ink dark:text-white">{week.title}</h3>
                    <p className="mt-3 text-sm font-semibold leading-6 text-ink/70 dark:text-white/70">{week.result}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 border-t border-ink/10 pt-5 dark:border-white/10 sm:grid-cols-2">
                  <div className="rounded-xl bg-cyan-50 p-4 dark:bg-cyan-300/[0.06]">
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-cyan-800 dark:text-cyan-200">Listening</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-ink/65 dark:text-white/65">{week.listening}</p>
                  </div>
                  <div className="rounded-xl bg-violet-50 p-4 dark:bg-violet-300/[0.06]">
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-violet-800 dark:text-violet-200">Produzione</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-ink/65 dark:text-white/65">{week.production}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </SectionReveal>

      <SectionReveal>
        <section className="bg-ink py-16 text-white lg:py-20">
          <div className="section-shell grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-mint">Un risultato che puoi vedere</p>
              <h2 className="mt-4 text-4xl font-black leading-tight">Alla fine non ricevi soltanto un attestato di partecipazione.</h2>
              <p className="mt-5 text-base font-semibold leading-8 text-white/68">
                Ripeti una prova equivalente a quella iniziale e ricevi un report con ciò che ora riesci a fare, i progressi
                nell’ascolto e nello speaking, gli errori che continuano a tornare e il passo successivo più utile.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['Registrazione iniziale e finale', 'Puoi ascoltare il cambiamento nella struttura, nella chiarezza e nella gestione delle pause.'],
                ['Profilo di listening', 'Confrontiamo comprensione al primo ascolto, dettagli, uso dei replay e capacità di rispondere.'],
                ['Competenze dimostrate', 'Una checklist concreta delle situazioni professionali che ora riesci a gestire meglio.'],
                ['Piano successivo', 'Sai cosa consolidare e quale percorso ha senso dopo, senza ripartire da zero.'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-white/12 bg-white/[0.07] p-5">
                  <h3 className="text-lg font-black">{title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-white/62">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      <SectionReveal>
        <section className="section-shell py-16 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-coral">Domande frequenti</p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-ink dark:text-white">Prima di chiedere un posto</h2>
              <p className="mt-5 text-base font-semibold leading-8 text-ink/65 dark:text-white/65">
                Il corso richiede partecipazione e pratica. Queste risposte servono a capire subito se il formato è adatto a te.
              </p>
            </div>
            <div className="grid gap-3">
              {faq.map((item) => (
                <details key={item.question} className="group rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-white/[0.05]">
                  <summary className="cursor-pointer list-none pr-8 text-base font-black text-ink dark:text-white">
                    {item.question}
                  </summary>
                  <p className="mt-4 text-sm font-semibold leading-7 text-ink/65 dark:text-white/65">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      <section className="bg-linen py-16 dark:bg-white/[0.03]">
        <div className="section-shell">
          <div className="rounded-[2rem] bg-ink p-7 text-white sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-mint">Cohort fondatrice, settembre 2026</p>
              <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
                Ti interessa il percorso? Scrivimi cosa fai e in quali situazioni l’inglese ti limita di più.
              </h2>
              <p className="mt-4 text-base font-semibold leading-7 text-white/68">
                Ti rispondo con informazioni chiare sul gruppo, sugli orari e sull’idoneità del corso. Non devi acquistare la
                simulazione prima di manifestare interesse.
              </p>
            </div>
            <div className="mt-7 flex shrink-0 flex-col gap-3 lg:mt-0">
              <a
                href={externalLinks.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-butter px-6 py-3 text-base font-black text-ink transition hover:bg-white"
              >
                Scrivimi su WhatsApp
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </a>
              <Link
                to="/percorsi"
                className="focus-ring inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 px-6 py-3 text-sm font-black text-white transition hover:bg-white/10"
              >
                Confronta gli altri percorsi
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
