import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, GraduationCap, Lock } from 'lucide-react';
import SEO from '../components/SEO';

const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];

export default function GrammarHub() {
  return (
    <>
      <SEO title="Grammar | Sblocco Inglese" description="Checkpoint di grammatica per livello, con spiegazioni in italiano e feedback mirato sugli argomenti da ripassare." />
      <section className="section-shell py-14">
        <span className="eyebrow"><BookOpen aria-hidden="true" className="h-4 w-4" />Grammar</span>
        <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight sm:text-5xl dark:text-white">Grammar checkpoints, divisi per livello.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-ink/70 dark:text-white/70">Completa piccoli blocchi di grammatica, leggi le correzioni in italiano e capisci esattamente quale micro-argomento devi ripassare.</p>
        <div className="mt-8 rounded-2xl border border-moss/15 bg-mint/40 p-5 dark:border-mint/20 dark:bg-mint/10">
          <div className="flex items-center gap-2">
            <GraduationCap aria-hidden="true" className="h-5 w-5 text-moss dark:text-mint" />
            <p className="text-sm font-black uppercase tracking-[0.08em] text-moss dark:text-mint">A1 Learning Path</p>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/75 dark:text-white/75">
            Una sezione separata con grammar-output units: impari la regola, la usi attivamente e ricevi diagnostic feedback.
          </p>
          <Link to="/grammar/a1" className="mt-4 inline-flex items-center gap-2 text-sm font-black text-ink underline decoration-moss decoration-2 underline-offset-4 dark:text-white">
            Vai all'A1 Learning Path
          </Link>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {levels.map((level) => level === 'A1' ? (
            <Link key={level} to="/grammar/a1" className="focus-ring rounded-lg border border-moss/25 bg-mint p-5 shadow-sm transition hover:-translate-y-1 dark:border-mint/30 dark:bg-mint/15">
              <CheckCircle2 aria-hidden="true" className="h-6 w-6 text-moss dark:text-mint" />
              <h2 className="mt-4 text-3xl font-black dark:text-white">{level}</h2>
              <p className="mt-2 text-sm font-semibold text-ink/70 dark:text-white/70">Checkpoint disponibili</p>
            </Link>
          ) : (
            <div key={level} className="rounded-lg border border-ink/10 bg-white p-5 opacity-65 dark:border-white/10 dark:bg-white/[0.06]">
              <Lock aria-hidden="true" className="h-6 w-6 text-ink/40 dark:text-white/40" />
              <h2 className="mt-4 text-3xl font-black dark:text-white">{level}</h2>
              <p className="mt-2 text-sm font-semibold text-ink/55 dark:text-white/55">In preparazione</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
