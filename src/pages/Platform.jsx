import React from 'react';
import {
  ArrowRight,
  BarChart3,
  BellRing,
  ClipboardCheck,
  Headphones,
  MessageSquareText,
  Mic2,
  Repeat2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import SectionReveal from '../components/SectionReveal';

const features = [
  {
    icon: ClipboardCheck,
    title: 'Sai cosa fare questa settimana',
    text: 'Nella tua area trovi attività, scadenze e materiali in ordine. Non devi ricostruire il percorso da messaggi, documenti e link separati.',
  },
  {
    icon: Headphones,
    title: 'Alleni l’ascolto in modo guidato',
    text: 'I listening non servono solo a verificare se hai capito. Ti aiutano a distinguere senso generale, dettagli, tono e parole che conosci ma non riconosci nel parlato.',
  },
  {
    icon: Mic2,
    title: 'Parli anche fuori dalla lezione',
    text: 'Nei roleplay vedi le battute dell’altro personaggio e registri le tue risposte turno per turno, come in una conversazione reale.',
  },
  {
    icon: MessageSquareText,
    title: 'Il feedback resta accessibile',
    text: 'Puoi riaprire le correzioni, riascoltare ciò che hai consegnato e capire cosa rendere più chiaro nella prova successiva.',
  },
  {
    icon: Repeat2,
    title: 'Le espressioni tornano nel Trainer',
    text: 'Il materiale importante viene riproposto nel tempo. Le frasi più difficili tornano prima, quelle già stabili tornano più avanti.',
  },
  {
    icon: BarChart3,
    title: 'Vedi il percorso, non solo il voto',
    text: 'Progressi, attività completate e confronti tra prove iniziali e finali rendono più concreto ciò che stai migliorando.',
  },
];

const learnerFlow = [
  ['01', 'Apri la missione della settimana', 'Vedi subito l’obiettivo, il lavoro richiesto e la scadenza.'],
  ['02', 'Prepari il linguaggio', 'Ripassi espressioni e strutture utili prima di affrontare la situazione.'],
  ['03', 'Ascolti e reagisci', 'Capisci le informazioni importanti e produci una risposta pertinente.'],
  ['04', 'Consegni la prova', 'Invii testo o registrazione direttamente dalla piattaforma.'],
  ['05', 'Ricevi la revisione', 'Una notifica ti porta al feedback, ai commenti e al punteggio aggiornato.'],
  ['06', 'Ripeti ciò che serve', 'Il Trainer riprende il linguaggio più importante e lo rende parte della pratica successiva.'],
];

export default function Platform() {
  return (
    <>
      <SEO
        title="La piattaforma Sblocco Inglese"
        description="Attività ordinate, listening, roleplay vocali, feedback umano, Trainer e progressi in un’unica area studente."
      />

      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(78,201,168,0.17),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(232,111,81,0.14),transparent_32%)]" />
        <div className="section-shell relative grid gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div>
            <span className="inline-flex rounded-full border border-mint/30 bg-mint/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-mint">
              La piattaforma
            </span>
            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.97] sm:text-6xl">
              Tra una lezione e l’altra non devi chiederti da dove ricominciare.
            </h1>
            <p className="mt-6 max-w-3xl text-lg font-semibold leading-8 text-white/75 sm:text-xl">
              La piattaforma raccoglie il percorso in un unico posto: attività, listening, roleplay vocali, Trainer, feedback e
              progressi. Non sostituisce il lavoro con l’insegnante. Gli dà continuità.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/corsi/business-english-flow"
                className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-butter px-6 py-3 text-base font-black text-ink transition hover:bg-white"
              >
                Vedi il percorso completo
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                to="/metodo"
                className="focus-ring inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 px-6 py-3 text-base font-black text-white transition hover:bg-white/10"
              >
                Scopri il metodo
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/15 bg-white/[0.07] p-5 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-mint">La tua settimana</p>
                <h2 className="mt-2 text-2xl font-black">Gestire una richiesta del cliente</h2>
              </div>
              <span className="rounded-full bg-coral px-3 py-1.5 text-xs font-black text-white">In corso</span>
            </div>
            <div className="mt-6 grid gap-3">
              {[
                ['Listening', 'Capisci bisogni, preferenze e vincoli'],
                ['Trainer', '18 espressioni per fare domande e consigliare'],
                ['Roleplay', 'Rispondi vocalmente al cliente, turno per turno'],
                ['Feedback', 'Revisione su chiarezza, tono e linguaggio'],
              ].map(([label, text], index) => (
                <div key={label} className="grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-white/12 bg-white/[0.06] p-4">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-mint text-xs font-black text-ink">0{index + 1}</span>
                  <div>
                    <p className="text-sm font-black">{label}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-white/58">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SectionReveal>
        <section className="section-shell py-16 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-coral">Cosa trovi dentro</p>
            <h2 className="mt-4 text-4xl font-black leading-tight text-ink dark:text-white">
              Ogni funzione serve a rendere la pratica più chiara e più vicina alle situazioni reali.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint text-moss dark:bg-mint/15 dark:text-mint">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-xl font-black text-ink dark:text-white">{title}</h3>
                <p className="mt-3 text-sm font-semibold leading-7 text-ink/65 dark:text-white/65">{text}</p>
              </article>
            ))}
          </div>
        </section>
      </SectionReveal>

      <SectionReveal>
        <section className="bg-linen/70 py-16 dark:bg-white/[0.03] lg:py-20">
          <div className="section-shell grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-moss dark:text-mint">Un’esperienza ordinata</p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-ink dark:text-white">
                Dalla consegna al feedback, ogni passaggio resta collegato.
              </h2>
              <p className="mt-5 text-base font-semibold leading-8 text-ink/65 dark:text-white/65">
                Lo studente non riceve una lista infinita di risorse. Riceve una sequenza con un obiettivo, una prova e un
                ritorno chiaro su ciò che deve migliorare.
              </p>
            </div>
            <div className="grid gap-3">
              {learnerFlow.map(([number, title, text]) => (
                <article key={number} className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-sm font-black text-white dark:bg-mint dark:text-ink">
                    {number}
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-ink dark:text-white">{title}</h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-ink/65 dark:text-white/65">{text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      <SectionReveal>
        <section className="section-shell py-16 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-coral">Feedback e privacy</p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-ink dark:text-white">
                Le registrazioni servono per imparare, non per diventare contenuti pubblici.
              </h2>
              <p className="mt-5 text-base font-semibold leading-8 text-ink/65 dark:text-white/65">
                Le produzioni vocali vengono usate per la revisione e per il confronto dei progressi. Non sono visibili agli
                altri studenti e non vengono utilizzate per marketing senza un consenso separato ed esplicito.
              </p>
            </div>
            <div className="rounded-[2rem] bg-ink p-7 text-white sm:p-9">
              <BellRing aria-hidden="true" className="h-7 w-7 text-mint" />
              <p className="mt-5 text-xs font-black uppercase tracking-[0.12em] text-mint">Nuova revisione</p>
              <h3 className="mt-3 text-2xl font-black">Ho visto i tuoi esercizi.</h3>
              <p className="mt-4 text-sm font-semibold leading-7 text-white/65">
                Apri il roleplay per ascoltare di nuovo le tue risposte, leggere i commenti sui singoli turni e vedere quali
                espressioni riprendere nel Trainer.
              </p>
              <div className="mt-6 rounded-2xl border border-white/12 bg-white/[0.07] p-5">
                <p className="text-sm font-black">Punto forte</p>
                <p className="mt-2 text-sm font-semibold text-white/62">La raccomandazione è chiara e collegata al bisogno del cliente.</p>
                <p className="mt-4 text-sm font-black">Da consolidare</p>
                <p className="mt-2 text-sm font-semibold text-white/62">Usa “it pairs well with” invece di “it goes good with”.</p>
              </div>
            </div>
          </div>
        </section>
      </SectionReveal>

      <section className="bg-ink py-16 text-white">
        <div className="section-shell flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-mint">La piattaforma dentro i corsi</p>
            <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
              Non devi acquistare una serie di strumenti separati. La pratica digitale fa parte del percorso.
            </h2>
          </div>
          <Link
            to="/percorsi"
            className="focus-ring inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-butter px-6 py-3 text-base font-black text-ink transition hover:bg-white"
          >
            Guarda i corsi
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
