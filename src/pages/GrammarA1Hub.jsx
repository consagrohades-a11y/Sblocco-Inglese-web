import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Layers3 } from 'lucide-react';
import SEO from '../components/SEO';
import { grammarA1Checkpoints } from '../data/grammarA1Test';

const countQuestions = (checkpoint) => checkpoint.exercises.reduce((total, exercise) => total + exercise.items.length, 0);

export default function GrammarA1Hub() {
  return (
    <>
      <SEO title="A1 Grammar | Sblocco Inglese" description="Indice A1 di grammatica inglese con topic separati, test mirati e correzioni in italiano." />
      <section className="section-shell py-12">
        <span className="eyebrow"><BookOpen aria-hidden="true" className="h-4 w-4" />A1 Grammar</span>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <h1 className="max-w-5xl text-4xl font-black leading-tight sm:text-5xl dark:text-white">A1 Grammar topics</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-ink/70 dark:text-white/70">
              Scegli prima l’argomento, poi entra nella pagina dedicata e completa i test collegati. Così la sezione resta pulita e può crescere con A2, B1 e gli altri livelli.
            </p>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
            <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-moss dark:text-mint"><Layers3 className="h-4 w-4" />Struttura scalabile</p>
            <p className="mt-2 text-sm leading-6 text-ink/70 dark:text-white/70">
              Livello → topic → test. Ogni pagina valuta un’area precisa e mantiene le correzioni separate.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {grammarA1Checkpoints.map((checkpoint) => (
            <Link
              key={checkpoint.id}
              to={`/grammar/a1/${checkpoint.id}`}
              className="focus-ring group rounded-[1.5rem] border border-ink/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-moss/25 hover:shadow-soft dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-mint/35"
            >
              <p className="text-sm font-black uppercase tracking-wider text-moss dark:text-mint">{checkpoint.eyebrow}</p>
              <h2 className="mt-3 text-2xl font-black leading-tight text-ink dark:text-white">{checkpoint.title}</h2>
              <p className="mt-3 text-sm leading-6 text-ink/70 dark:text-white/70">{checkpoint.description}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-mint px-3 py-1 text-xs font-black text-ink dark:bg-mint/15 dark:text-mint">{checkpoint.exercises.length} test</span>
                <span className="rounded-full bg-linen px-3 py-1 text-xs font-black text-ink dark:bg-white/10 dark:text-white">{countQuestions(checkpoint)} domande</span>
              </div>

              <ul className="mt-5 grid gap-2 text-sm font-semibold leading-6 text-ink/75 dark:text-white/75">
                {checkpoint.checks.slice(0, 4).map((item) => <li key={item}>• {item}</li>)}
              </ul>

              <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-black text-white transition group-hover:gap-3 dark:bg-mint dark:text-ink">
                Apri topic <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
