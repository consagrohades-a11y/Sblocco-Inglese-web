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
import { ListeningPreview, ProgressPreview, RoleplayPreview } from '../components/CourseVisuals';
import SEO from '../components/SEO';
import SectionReveal from '../components/SectionReveal';
import { externalLinks } from '../config/site';
import { businessEnglishWeeks, launchCourses } from '../data/courseCatalog';

const course = launchCourses.find((item) => item.id === 'business-english-flow');

const outcomes = [
  'presentarti e spiegare il tuo ruolo senza ridurlo a due frasi generiche',
  'seguire un aggiornamento e riconoscere scadenze, problemi e prossimi passi',
  'entrare in una riunione senza aspettare di avere la frase perfetta',
  'chiedere chiarimenti e controllare di aver capito bene',
  'dare aggiornamenti chiari su progressi, ritardi e difficoltà',
  'capire meglio ciò che vuole un cliente e proporre una soluzione',
  'gestire disaccordi e conversazioni delicate con un tono professionale',
  'rispondere alle domande successive senza perdere completamente il filo',
];

const weeklyCycle = [
  {
    icon: Users,
    number: '01',
    title: 'Incontro live',
    text: 'Impari e provi il linguaggio della settimana in un gruppo piccolo, con spazio per parlare davvero.',
  },
  {
    icon: Headphones,
    number: '02',
    title: 'Listening guidato',
    text: 'Ascolti conversazioni realistiche e impari a separare il senso generale dai dettagli che servono per rispondere.',
  },
  {
    icon: Mic2,
    number: '03',
    title: 'Roleplay vocale',
    text: 'Rispondi dentro una situazione professionale, riascolti la tua risposta e la migliori prima di consegnarla.',
  },
  {
    icon: Sparkles,
    number: '04',
    title: 'Trainer mirato',
    text: 'Le espressioni utili tornano durante la settimana, così non restano legate a una sola lezione.',
  },
  {
    icon: MessageCircle,
    number: '05',
    title: 'Feedback umano',
    text: 'Ricevi correzioni su chiarezza, naturalezza, tono, grammatica e gestione della conversazione.',
  },
  {
    icon: BarChart3,
    number: '06',
    title: 'Progresso visibile',
    text: 'Confrontiamo la prova iniziale e quella finale per capire che cosa è cambiato davvero.',
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
      'La grammatica viene corretta e spiegata quando serve a rendere più chiaro ciò che vuoi dire. Non è però un corso costruito intorno a lunghe spiegazioni teoriche. Il centro è usare l’inglese in situazioni professionali.',
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
    <div className="rounded-2xl border border-white/12 bg-white/[0.07] p-4 backdrop-blur">
      <Icon aria-hidden="true" className="h-5 w-5 text-mint" />
      <p className="mt-3 text-[0.68rem] font-black uppercase tracking-[0.1em] text-white/60">{label}</p>
      <p className="mt-1 text-base font-black text-white">{value}</p>
    </div>
  );
}

function DecorativeDots() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <span className="absolute left-[6%] top-20 h-3 w-3 rounded-full bg-coral/70" />
      <span className="absolute left-[9%] top-32 h-1.5 w-1.5 rounded-full bg-butter" />
      <span className="absolute right-[5%] top-16 h-4 w-4 rotate-45 rounded-sm border border-mint/35" />
      <span className="absolute bottom-20 right-[9%] h-2.5 w-2.5 rounded-full bg-mint/70" />
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_16%,rgba(255,196,87,0.17),transparent_28%),radial-gradient(circle_at_8%_84%,rgba(78,201,168,0.16),transparent_30%)]" />
        <DecorativeDots />
        <div className="section-shell relative grid gap-12 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-24">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex rounded-full border border-mint/30 bg-mint/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-mint">
                {course.status}
              </span>
              <span className="inline-flex rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.1em] text-white/65">
                Piccolo gruppo, molta pratica
              </span>
            </div>
            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.96] sm:text-6xl lg:text-7xl">
              Usa l’inglese nel lavoro senza preparare ogni frase in anticipo.
            </h1>
            <p className="mt-6 max-w-3xl text-lg font-semibold leading-8 text-white/76 sm:text-xl">
              Business English Flow è un percorso di otto settimane per chi ha idee, esperienza e competenze professionali,
              ma in inglese partecipa meno di quanto vorrebbe. Lavoriamo su riunioni, aggiornamenti, clienti, problemi e
              decisioni con lezioni live, listening realistici, roleplay vocali e feedback umano.
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

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ['8 settimane', 'un obiettivo diverso ogni settimana'],
                ['12 ore live', 'più attività guidate in piattaforma'],
                ['Prima e dopo', 'prove comparabili e report finale'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur">
                  <p className="text-base font-black text-white">{title}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-white/48">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-5 -top-5 hidden h-20 w-20 rotate-12 rounded-[1.4rem] border border-butter/25 bg-butter/[0.08] lg:block" />
            <RoleplayPreview />
            <div className="relative mx-3 -mt-2 rounded-[1.6rem] border border-white/12 bg-[#0f1a17] p-5 shadow-2xl sm:mx-6">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-mint">Prezzo cohort fondatrice</p>
                  <p className="mt-2 text-4xl font-black">{course.price}</p>
                  <p className="mt-1 text-xs font-semibold text-white/60">{course.standardPrice}</p>
                </div>
                <span className="rounded-full bg-coral px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] text-white">
                  settembre 2026
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <CourseMetric icon={Clock3} label="Lezioni" value={course.liveHours} />
                <CourseMetric icon={Users} label="Gruppo" value={course.groupSize} />
                <CourseMetric icon={BarChart3} label="Impegno" value={course.totalHours} />
                <CourseMetric icon={ShieldCheck} label="Livello" value={course.level} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <SectionReveal>
        <section className="relative overflow-hidden py-16 lg:py-20">
          <div className="absolute left-0 top-0 h-40 w-40 rounded-full bg-blush/60 blur-3xl dark:bg-coral/[0.04]" />
          <div className="section-shell relative grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div className="lg:sticky lg:top-28">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-coral">A chi serve davvero</p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-ink dark:text-white">
                Non devi sembrare più intelligente in inglese. Devi riuscire a far vedere la competenza che hai già.
              </h2>
              <p className="mt-5 text-base font-semibold leading-8 text-ink/65 dark:text-white/65">
                Questo percorso è pensato per chi capisce abbastanza, ma durante una conversazione reale rallenta, perde
                dettagli importanti o usa un inglese molto più semplice rispetto alle proprie capacità professionali.
              </p>
              <div className="mt-7 rounded-[1.5rem] border border-moss/15 bg-mint/45 p-5 dark:border-mint/15 dark:bg-mint/[0.07]">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-moss dark:text-mint">Il punto non è parlare perfettamente</p>
                <p className="mt-2 text-sm font-bold leading-7 text-ink/75 dark:text-white/75">
                  Il punto è capire, rispondere e continuare la conversazione senza perdere completamente il controllo.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {outcomes.map((item, index) => (
                <div
                  key={item}
                  className={`relative overflow-hidden rounded-[1.5rem] border p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-soft dark:border-white/10 dark:bg-white/[0.05] ${
                    index % 4 === 0
                      ? 'border-moss/15 bg-mint/35'
                      : index % 4 === 1
                        ? 'border-coral/15 bg-blush/45'
                        : index % 4 === 2
                          ? 'border-butter/25 bg-linen/70'
                          : 'border-ink/10 bg-white'
                  }`}
                >
                  <span className="absolute right-4 top-3 text-4xl font-black text-ink/[0.045] dark:text-white/[0.05]">0{index + 1}</span>
                  <Check aria-hidden="true" className="h-5 w-5 text-moss dark:text-mint" />
                  <p className="relative mt-4 text-sm font-bold leading-7 text-ink/75 dark:text-white/75">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      <SectionReveal>
        <section className="relative overflow-hidden bg-linen/70 py-16 dark:bg-white/[0.03] lg:py-20">
          <div className="absolute right-[-5rem] top-12 h-52 w-52 rounded-full border-[24px] border-butter/10" />
          <div className="section-shell relative">
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

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {weeklyCycle.map(({ icon: Icon, number, title, text }, index) => (
                <article
                  key={title}
                  className="group relative overflow-hidden rounded-[1.6rem] border border-ink/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft dark:border-white/10 dark:bg-white/[0.05]"
                >
                  <span className="absolute right-5 top-3 text-5xl font-black text-ink/[0.04] dark:text-white/[0.05]">{number}</span>
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl ${index % 3 === 0 ? 'bg-mint text-moss' : index % 3 === 1 ? 'bg-butter text-ink' : 'bg-blush text-coral'}`}>
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-xl font-black text-ink dark:text-white">{title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-7 text-ink/65 dark:text-white/65">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      <SectionReveal>
        <section className="section-shell py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-coral">Listening che porta a una risposta</p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-ink dark:text-white">
                Non ascolti solo per scegliere A, B o C. Ascolti per capire che cosa devi fare dopo.
              </h2>
              <p className="mt-5 text-base font-semibold leading-8 text-ink/65 dark:text-white/65">
                Lavoriamo sul senso generale, sui dettagli utili, sul tono e sulle parole che conosci ma non riconosci quando
                vengono pronunciate naturalmente. Poi usi quelle informazioni in una risposta vocale.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  'meno dipendenza dalla trascrizione',
                  'più attenzione a scadenze, numeri e richieste',
                  'riconoscimento di espressioni nel parlato reale',
                  'risposta costruita a partire da ciò che hai sentito',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.05]">
                    <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-moss dark:text-mint" />
                    <p className="text-sm font-bold leading-6 text-ink/70 dark:text-white/70">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <ListeningPreview />
          </div>
        </section>
      </SectionReveal>

      <SectionReveal>
        <section className="relative overflow-hidden py-16 lg:py-20">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-coral/30 to-transparent" />
          <div className="section-shell">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-coral">Programma completo</p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-ink dark:text-white">
                Otto settimane costruite intorno a ciò che succede davvero nel lavoro.
              </h2>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              {businessEnglishWeeks.map((week, index) => (
                <article
                  key={week.number}
                  className="group relative overflow-hidden rounded-[1.7rem] border border-ink/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft dark:border-white/10 dark:bg-white/[0.05]"
                >
                  <div className={`absolute inset-y-0 left-0 w-1.5 ${index % 3 === 0 ? 'bg-mint' : index % 3 === 1 ? 'bg-coral' : 'bg-butter'}`} />
                  <div className="flex items-start gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ink text-sm font-black text-white dark:bg-mint dark:text-ink">
                      {week.number}
                    </span>
                    <div>
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-ink/60 dark:text-white/60">Settimana {Number(week.number)}</p>
                      <h3 className="mt-1 text-xl font-black text-ink dark:text-white">{week.title}</h3>
                      <p className="mt-3 text-sm font-semibold leading-7 text-ink/70 dark:text-white/70">{week.result}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 border-t border-ink/10 pt-5 dark:border-white/10 sm:grid-cols-2">
                    <div className="rounded-2xl bg-cyan-50 p-4 dark:bg-cyan-300/[0.06]">
                      <div className="flex items-center gap-2">
                        <Headphones aria-hidden="true" className="h-4 w-4 text-cyan-800 dark:text-cyan-200" />
                        <p className="text-xs font-black uppercase tracking-[0.08em] text-cyan-800 dark:text-cyan-200">Listening</p>
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-6 text-ink/65 dark:text-white/65">{week.listening}</p>
                    </div>
                    <div className="rounded-2xl bg-violet-50 p-4 dark:bg-violet-300/[0.06]">
                      <div className="flex items-center gap-2">
                        <Mic2 aria-hidden="true" className="h-4 w-4 text-violet-800 dark:text-violet-200" />
                        <p className="text-xs font-black uppercase tracking-[0.08em] text-violet-800 dark:text-violet-200">Produzione</p>
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-6 text-ink/65 dark:text-white/65">{week.production}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      <SectionReveal>
        <section className="relative overflow-hidden bg-ink py-16 text-white lg:py-20">
          <div className="absolute left-[-5rem] top-[-4rem] h-64 w-64 rounded-full bg-coral/10 blur-3xl" />
          <div className="absolute bottom-[-5rem] right-[-3rem] h-64 w-64 rounded-full bg-mint/10 blur-3xl" />
          <div className="section-shell relative grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-mint">Un risultato che puoi vedere</p>
              <h2 className="mt-4 text-4xl font-black leading-tight">Alla fine non ricevi soltanto un attestato di partecipazione.</h2>
              <p className="mt-5 text-base font-semibold leading-8 text-white/68">
                Ripeti una prova equivalente a quella iniziale e ricevi un report con ciò che ora riesci a fare, i progressi
                nell’ascolto e nello speaking, gli errori che continuano a tornare e il passo successivo più utile.
              </p>
              <div className="mt-7 grid gap-3">
                {[
                  'registrazione iniziale e finale',
                  'profilo di listening con replay e dettagli',
                  'checklist delle competenze dimostrate',
                  'piano successivo personalizzato',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                    <Check aria-hidden="true" className="h-4 w-4 text-mint" />
                    <p className="text-sm font-bold text-white/72">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <ProgressPreview />
          </div>
        </section>
      </SectionReveal>

      <SectionReveal>
        <section className="section-shell py-16 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-coral">Domande frequenti</p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-ink dark:text-white">Prima di chiedere un posto</h2>
              <p className="mt-5 text-base font-semibold leading-8 text-ink/65 dark:text-white/65">
                Il corso richiede partecipazione e pratica. Queste risposte servono a capire subito se il formato è adatto a te.
              </p>
            </div>
            <div className="grid gap-3">
              {faq.map((item, index) => (
                <details
                  key={item.question}
                  className="group rounded-[1.4rem] border border-ink/10 bg-white p-5 shadow-sm open:border-moss/20 open:bg-mint/20 dark:border-white/10 dark:bg-white/[0.05] dark:open:bg-mint/[0.06]"
                >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base font-black text-ink dark:text-white">
                    <span>{item.question}</span>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-paper text-xs font-black text-moss transition group-open:rotate-45 dark:bg-white/10 dark:text-mint">+</span>
                  </summary>
                  <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-ink/65 dark:text-white/65">{item.answer}</p>
                  <span className="mt-3 block text-[0.65rem] font-black uppercase tracking-[0.08em] text-ink/25 dark:text-white/25">0{index + 1}</span>
                </details>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      <section className="relative overflow-hidden bg-linen py-16 dark:bg-white/[0.03]">
        <div className="absolute right-16 top-8 h-16 w-16 rotate-12 rounded-[1.4rem] border border-coral/15 bg-blush/50" />
        <div className="section-shell relative">
          <div className="overflow-hidden rounded-[2rem] bg-ink p-7 text-white shadow-soft sm:p-10 lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10">
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
