import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Lock } from 'lucide-react';
import SEO from '../components/SEO';

const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];

export default function GrammarHub() {
  return (
    <>
      <SEO title="Grammar Practice | Sblocco Inglese" description="Sessioni di grammatica per livello con spiegazioni e feedback sugli argomenti da ripassare." />
      <section className="section-shell py-14">
        <span className="eyebrow"><BookOpen aria-hidden="true" className="h-4 w-4" />Grammar practice</span>
        <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight sm:text-5xl">Grammatica per livello, con feedback utile.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-ink/70">Completa una sessione, leggi le spiegazioni e scopri quali argomenti richiedono ancora pratica.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {levels.map((level) => level === 'A1' ? (
            <Link key={level} to="/grammar/a1" className="focus-ring rounded-lg border border-moss/25 bg-mint p-5 shadow-sm transition hover:-translate-y-1">
              <CheckCircle2 aria-hidden="true" className="h-6 w-6 text-moss" />
              <h2 className="mt-4 text-3xl font-black">{level}</h2>
              <p className="mt-2 text-sm font-semibold text-ink/70">60 domande · disponibile</p>
            </Link>
          ) : (
            <div key={level} className="rounded-lg border border-ink/10 bg-white p-5 opacity-65">
              <Lock aria-hidden="true" className="h-6 w-6 text-ink/40" />
              <h2 className="mt-4 text-3xl font-black">{level}</h2>
              <p className="mt-2 text-sm font-semibold text-ink/55">In preparazione</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
