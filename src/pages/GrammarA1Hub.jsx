import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Sigma } from 'lucide-react';
import SEO from '../components/SEO';
import { grammarA1Checkpoints } from '../data/grammarA1Test';

const countQuestions = (checkpoint) => checkpoint.exercises.reduce((total, exercise) => total + exercise.items.length, 0);
const unitCards = [
  {
    title: 'Unit 1: Be, Basic Sentences and Simple Questions',
    text: 'Costruisci frasi con be, domande semplici e risposte brevi.',
    to: '/levels/a1/be-basic-sentences',
  },
  {
    title: 'Unit 2: Present Simple, Normal Verbs and Do/Does',
    text: 'Rendi automatiche frasi, domande e negative con i verbi normali.',
    to: '/levels/a1/present-simple-normal-verbs',
  },
];

export default function GrammarA1Hub() {
  return (
    <>
      <SEO title="A1 Grammar | Sblocco Inglese" description="Unità pratiche e checkpoint A1 per trasformare le regole base in frasi utilizzabili." />
      <section className="section-shell py-12">
        <span className="eyebrow"><BookOpen aria-hidden="true" className="h-4 w-4" />A1 Grammar</span>
        <div className="mt-5 max-w-4xl">
          <h1 className="text-4xl font-black leading-tight sm:text-5xl dark:text-white">A1: regole base, frasi vere e controllo degli errori.</h1>
          <p className="mt-4 text-lg leading-8 text-ink/70 dark:text-white/70">
            Parti dalle unità guidate se vuoi studiare e produrre frasi. Usa i checkpoint quando vuoi controllare un punto grammaticale preciso.
          </p>
        </div>

        <section className="mt-10 rounded-[1.5rem] border border-ink/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.05]" aria-labelledby="a1-units-title">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-moss dark:bg-mint/15 dark:text-mint">
                <Sigma className="h-3.5 w-3.5" />
                Percorso guidato
              </span>
              <h2 id="a1-units-title" className="mt-3 text-2xl font-black leading-tight text-ink dark:text-white">Unità A1 da fare in ordine</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/65">
                Qui non fai solo un test: leggi la regola, la usi attivamente e ricevi feedback diagnostico sulle strutture che non sono ancora stabili.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {unitCards.map((unit) => (
              <Link
                key={unit.to}
                to={unit.to}
                className="focus-ring group rounded-2xl border border-ink/10 bg-paper p-5 transition hover:-translate-y-1 hover:border-moss/25 hover:shadow-soft dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-mint/35"
              >
                <p className="text-sm font-black uppercase tracking-wide text-moss dark:text-mint">Grammar-output unit</p>
                <h3 className="mt-3 text-xl font-black leading-tight text-ink dark:text-white">{unit.title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink/70 dark:text-white/70">{unit.text}</p>
                <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-black text-white transition group-hover:gap-3 dark:bg-mint dark:text-ink">
                  Apri unità <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12 border-t border-ink/10 pt-8 dark:border-white/10" aria-labelledby="a1-checkpoints-title">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-moss dark:text-mint">Controllo mirato</p>
            <h2 id="a1-checkpoints-title" className="mt-2 text-3xl font-black leading-tight text-ink dark:text-white">Checkpoint grammaticali</h2>
            <p className="mt-3 text-sm leading-6 text-ink/65 dark:text-white/65">
              Usa questi blocchi per verificare un argomento specifico. Sono separati dal percorso guidato: servono a trovare l’errore, non a sostituire le unità.
            </p>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2">
            {grammarA1Checkpoints.map((checkpoint) => (
              <Link
                key={checkpoint.id}
                to={`/grammar/a1/${checkpoint.id}`}
                className="focus-ring group rounded-[1.5rem] border border-ink/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-moss/25 hover:shadow-soft dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-mint/35"
              >
                <p className="text-sm font-black uppercase tracking-wider text-moss dark:text-mint">{checkpoint.eyebrow}</p>
                <h3 className="mt-3 text-2xl font-black leading-tight text-ink dark:text-white">{checkpoint.title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink/70 dark:text-white/70">{checkpoint.description}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-mint px-3 py-1 text-xs font-black text-ink dark:bg-mint/15 dark:text-mint">{checkpoint.exercises.length} test</span>
                  <span className="rounded-full bg-linen px-3 py-1 text-xs font-black text-ink dark:bg-white/10 dark:text-white">{countQuestions(checkpoint)} domande</span>
                </div>

                <ul className="mt-5 grid gap-2 text-sm font-semibold leading-6 text-ink/75 dark:text-white/75">
                  {checkpoint.checks.slice(0, 4).map((item) => <li key={item}>• {item}</li>)}
                </ul>

                <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-black text-white transition group-hover:gap-3 dark:bg-mint dark:text-ink">
                  Apri checkpoint <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </>
  );
}
