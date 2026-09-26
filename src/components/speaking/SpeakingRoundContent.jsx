import React from 'react';
import { normalizeSpeakingMaterial } from '../../lib/speakingRoundContract.js';

function Kicker({ children }) {
  return <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-clay">{children}</p>;
}

function NumberMission({ material, compact }) {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <section className="rounded-3xl bg-white p-5 text-ink sm:p-7">
        <Kicker>Mission</Kicker>
        <p className={`mt-3 font-black leading-tight ${compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-5xl'}`}>{material.mission}</p>
      </section>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {material.facts.map((fact, index) => (
          <div key={`${fact.label}-${index}`} className="rounded-2xl border border-white/15 bg-white/[0.08] p-4">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-white/65">{fact.label}</p>
            <p className={`mt-2 font-black text-white ${compact ? 'text-2xl' : 'text-3xl'}`}>{fact.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PictureDetective({ material, compact }) {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
      <div className="overflow-hidden rounded-3xl bg-white p-2">
        <img src={material.image_src} alt={material.image_alt} className="max-h-[28rem] w-full rounded-[1.25rem] object-contain" />
      </div>
      <section className="rounded-3xl bg-white p-5 text-ink sm:p-6">
        <Kicker>Look closely</Kicker>
        <p className={`mt-3 font-black leading-tight ${compact ? 'text-2xl' : 'text-3xl sm:text-4xl'}`}>{material.question}</p>
        {material.clues.length ? (
          <div className="mt-5 grid gap-2">
            {material.clues.map((clue, index) => <div key={index} className="rounded-xl bg-linen px-4 py-3 text-sm font-bold">{clue}</div>)}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ExplainWithoutSaying({ material, compact }) {
  return (
    <div className="mx-auto w-full max-w-4xl text-center">
      <section className="rounded-3xl bg-white p-6 text-ink sm:p-8">
        <Kicker>Explain this</Kicker>
        <p className={`mt-3 font-black leading-none ${compact ? 'text-4xl' : 'text-5xl sm:text-7xl'}`}>{material.target}</p>
      </section>
      <div className="mt-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/70">Do not say</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {material.forbidden_words.map((word) => <span key={word} className="rounded-full border border-white/20 bg-white/[0.09] px-4 py-2 text-sm font-black text-white">{word}</span>)}
        </div>
      </div>
    </div>
  );
}

function ConversationDetective({ material, compact }) {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="grid gap-3">
        {material.turns.map((turn, index) => (
          <div key={index} className={`rounded-2xl p-4 text-left ${index % 2 === 0 ? 'mr-8 bg-white text-ink' : 'ml-8 border border-white/15 bg-white/[0.08] text-white'}`}>
            <p className={`text-[0.68rem] font-black uppercase tracking-[0.13em] ${index % 2 === 0 ? 'text-clay' : 'text-white/65'}`}>{turn.speaker}</p>
            <p className={`mt-2 font-black leading-snug ${compact ? 'text-lg' : 'text-xl sm:text-2xl'}`}>{turn.line}</p>
          </div>
        ))}
      </div>
      <section className="mt-5 rounded-3xl bg-white p-5 text-center text-ink sm:p-6">
        <Kicker>Detective question</Kicker>
        <p className={`mt-3 font-black leading-tight ${compact ? 'text-xl' : 'text-2xl sm:text-3xl'}`}>{material.question}</p>
      </section>
    </div>
  );
}

function MakeTheChoice({ material, compact }) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <p className={`mx-auto max-w-4xl text-center font-black leading-tight text-white ${compact ? 'text-2xl' : 'text-3xl sm:text-4xl'}`}>{material.question}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {material.options.map((option, index) => (
          <section key={index} className="rounded-3xl bg-white p-5 text-left text-ink sm:p-6">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-clay">Option {index + 1}</p>
            <p className={`mt-2 font-black ${compact ? 'text-xl' : 'text-2xl'}`}>{option.title}</p>
            <p className="mt-2 text-sm font-bold leading-6 text-ink/70">{option.detail}</p>
          </section>
        ))}
      </div>
      {material.criteria.length ? (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {material.criteria.map((criterion) => <span key={criterion} className="rounded-full border border-white/20 bg-white/[0.08] px-3 py-1.5 text-xs font-black text-white">{criterion}</span>)}
        </div>
      ) : null}
    </div>
  );
}

export default function SpeakingRoundContent({ material: rawMaterial, compact = false }) {
  const material = normalizeSpeakingMaterial(rawMaterial);
  if (!material) return null;

  if (material.format === 'number_mission') return <NumberMission material={material} compact={compact} />;
  if (material.format === 'picture_detective') return <PictureDetective material={material} compact={compact} />;
  if (material.format === 'explain_without_saying') return <ExplainWithoutSaying material={material} compact={compact} />;
  if (material.format === 'conversation_detective') return <ConversationDetective material={material} compact={compact} />;
  if (material.format === 'make_the_choice') return <MakeTheChoice material={material} compact={compact} />;
  return null;
}
