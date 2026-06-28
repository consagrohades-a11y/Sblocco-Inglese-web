import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, GraduationCap, Lock } from 'lucide-react';
import SEO from '../components/SEO';

const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];

export default function GrammarHub() {
  return (
    <>
      <SEO title="English Foundations | Sblocco Inglese" description="Un percorso CEFR guidato per costruire inglese utilizzabile, fare pratica e ricevere feedback specifico." />
      <section className="section-shell py-14">
        <span className="eyebrow"><BookOpen aria-hidden="true" className="h-4 w-4" />English Foundations</span>
        <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight sm:text-5xl dark:text-white">Un percorso CEFR per costruire inglese utilizzabile.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-ink/70 dark:text-white/70">Non è solo pratica grammaticale. Ogni livello ti aiuta a capire la regola, usarla in esercizi controllati, verificare gli errori e riprovare con un feedback più chiaro.</p>
        <div className="mt-8 rounded-2xl border border-moss/15 bg-mint/40 p-5 dark:border-mint/20 dark:bg-mint/10">
          <div className="flex items-center gap-2">
            <GraduationCap aria-hidden="true" className="h-5 w-5 text-moss dark:text-mint" />
            <p className="text-sm font-black uppercase tracking-[0.08em] text-moss dark:text-mint">A1 English Foundations</p>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/75 dark:text-white/75">
            Segui un percorso chiaro: livello CEFR, unità guidate, pratica, checkpoint e feedback specifico per capire cosa migliorare.
          </p>
          <Link to="/grammar/a1" className="mt-4 inline-flex items-center gap-2 text-sm font-black text-ink underline decoration-moss decoration-2 underline-offset-4 dark:text-white">
            Inizia A1 English Foundations
          </Link>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {levels.map((level) => level === 'A1' ? (
            <Link key={level} to="/grammar/a1" className="focus-ring rounded-lg border border-moss/25 bg-mint p-5 shadow-sm transition hover:-translate-y-1 dark:border-mint/30 dark:bg-mint/15">
              <CheckCircle2 aria-hidden="true" className="h-6 w-6 text-moss dark:text-mint" />
              <h2 className="mt-4 text-3xl font-black dark:text-white">{level}</h2>
              <p className="mt-2 text-sm font-semibold text-ink/70 dark:text-white/70">Percorso e Quick Checks disponibili</p>
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
