import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import ExerciseRenderer from '../components/exercises/ExerciseRenderer';
import { presentSimpleExercises } from '../content/exercises/a1/presentSimple';

export default function EngineDemo() {
  return (
    <section className="section-shell py-12">
      <SEO title="Shared Exercise Engine Demo | Sblocco Inglese" description="A small A1 present simple proof-of-concept using the shared exercise, diagnostic, recommendation, and progress engines." />
      <div className="rounded-[2rem] bg-ink p-7 text-white shadow-soft">
        <p className="text-xs font-bold uppercase tracking-wider text-mint">Phase 1 proof-of-concept</p>
        <h1 className="mt-3 text-4xl font-black sm:text-5xl">Shared exercise engine</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-white/70">
          Three data-driven A1 exercises share the same scoring, feedback, diagnostic, recommendation, and local progress foundation.
        </p>
        <Link to="/diagnostic" className="focus-ring mt-5 inline-flex rounded-full bg-butter px-5 py-3 font-black text-ink">
          Open English Blocker Diagnostic
        </Link>
      </div>

      <div className="mt-8 grid gap-6">
        {presentSimpleExercises.map((exercise) => (
          <ExerciseRenderer key={exercise.id} exercise={exercise} />
        ))}
      </div>
    </section>
  );
}

