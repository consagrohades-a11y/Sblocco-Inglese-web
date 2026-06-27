import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, ClipboardCheck, Target } from 'lucide-react';
import SEO from '../components/SEO';
import { grammarA1Checkpoints } from '../data/grammarA1Test';

function countQuestions(checkpoint) {
  return checkpoint.exercises.reduce((total, exercise) => total + (exercise.items?.length || 0), 0);
}

export default function GrammarA1Test() {
  return (
    <>
      <SEO title="A1 Grammar | Sblocco Inglese" description="Indice A1 di grammatica inglese: scegli un argomento, entra nella pagina dedicata e completa i checkpoint." />
      <section className="section-shell py-12">
        <span className="eyebrow"><BookOpen aria-hidden="true" className="h-4 w-4" />A1 Grammar</span>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <h1 className="max-w-5xl text-4xl font-black leading-tight sm:text-5xl dark:text-white">A1 Grammar: scegli un argomento.</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-ink/70 dark:text-white/70">
              Questa pagina è l’indice del livello A1. Prima scegli il tema, poi entri nella pagina dedicata e completi i singoli checkpoint. Così la sezione resta pulita e può crescere con nuovi livelli, argomenti e test.
            </p>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
            <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-moss dark:text-mint"><Target className="h-4 w-4" />Struttura scalabile</p>
            <p className="mt-3 text-sm leading-6 text-ink/70 dark:text-white/70">
              Ogni topic ha una pagina propria. Dentro trovi spiegazione breve, cosa controlla e i test disponibili. In futuro si possono aggiungere A2, B1 o nuovi micro-test senza rendere l’indice pesante.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {grammarA1Checkpoints.map((checkpoint) => (
            <Link
              key={checkpoint.id}
              to={`/grammar/a1/${checkpoint.id}`}
              className="focus-ring group rounded-[1.5rem] border border-ink/10 bg-white/90 p-6 shadow-sm transition hover:-translate-y-1 hover:border-moss/30 hover:shadow-soft dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-mint/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-wider text-moss dark:text-mint">{checkpoint.eyebrow}</p>
                  <h2 className="mt-2 text-2xl font-black leading-tight text-ink dark:text-white">{checkpoint.title}</h2>
                </div>
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mint text-moss transition group-hover:translate-x-1 dark:bg-mint/15 dark:text-mint">
                  <ArrowRight aria-hidden="true" className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-ink/70 dark:text-white/70">{checkpoint.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-linen px-3 py-1 text-xs font-black text-ink/70 dark:bg-white/10 dark:text-white/70">
                  <ClipboardCheck aria-hidden="true" className="h-3.5 w-3.5" />{checkpoint.exercises.length} test
                </span>
                <span className="rounded-full bg-linen px-3 py-1 text-xs font-black text-ink/70 dark:bg-white/10 dark:text-white/70">{countQuestions(checkpoint)} domande</span>
              </div>
              <ul className="mt-5 grid gap-2 text-sm font-semibold leading-6 text-ink/75 dark:text-white/75">
                {checkpoint.checks.slice(0, 3).map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
