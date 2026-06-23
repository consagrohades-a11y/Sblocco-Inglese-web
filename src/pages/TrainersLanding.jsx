import React from 'react';
import { ArrowRight, Brain, CheckCircle2, Clock3, Lock, MessageSquareText, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import TrainerLayout from '../components/TrainerLayout';
import { trainerConfig } from '../data/trainerConfig';

const trainerUses = [
  'interviews',
  'business conversations',
  'meetings and calls',
  'emails and follow-ups',
  'everyday speaking',
  'vocabulary recall',
  'pronunciation',
  'reducing the "I understand but I freeze" problem',
];

const howToUse = [
  'Choose a trainer.',
  'Select the categories and levels you want.',
  'Study a few new cards.',
  'Review the cards due today.',
  'Use the expressions in your next lesson or real conversation.',
];

function InfoBlock({ icon: Icon, title, children }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-mint text-moss">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <h2 className="mt-5 text-xl font-black text-ink">{title}</h2>
      <div className="mt-3 text-sm font-semibold leading-6 text-ink/70">{children}</div>
    </div>
  );
}

function TrainerCard({ trainer }) {
  const available = trainer.status === 'available';

  return (
    <article className="flex h-full flex-col rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.08em] ${
          available ? 'bg-mint text-moss' : 'bg-linen text-clay'
        }`}
        >
          {available ? 'Available' : 'Coming soon'}
        </span>
        <span className="rounded-full border border-ink/10 px-3 py-1 text-xs font-black text-ink/50">
          {trainer.cardType}
        </span>
      </div>
      <h3 className="mt-5 text-2xl font-black leading-tight text-ink">{trainer.title}</h3>
      <p className="mt-3 flex-1 text-sm font-semibold leading-6 text-ink/70">{trainer.description}</p>
      <div className="mt-5">
        {available ? (
          <Link
            to={trainer.route}
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-moss px-5 py-3 text-sm font-extrabold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-[#096d58]"
          >
            Start trainer
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        ) : (
          <Link
            to={trainer.route}
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-extrabold text-ink transition hover:bg-mint/50"
          >
            Preview
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        )}
      </div>
    </article>
  );
}

export default function TrainersLanding() {
  return (
    <>
      <SEO
        title="Sblocco Trainer | Sblocco Inglese"
        description="A practical review system to help you remember and use English expressions, words and phrases when you speak."
      />

      <TrainerLayout>
        <div className="rounded-lg bg-white/70 p-6 shadow-sm sm:p-8 lg:p-10">
          <span className="eyebrow">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            Review system
          </span>
          <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight text-ink sm:text-5xl">
            Sblocco Trainer
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-ink/70">
            A practical review system to help you remember and actually use English expressions, words and phrases when
            you speak.
          </p>
          <p className="mt-5 max-w-3xl text-sm font-semibold leading-7 text-ink/65">
            I created this trainer to support students outside lessons. Lessons help you understand, practise, and get
            corrected. The trainer helps you meet useful English again and again, so the right phrases become easier to
            recall when you are speaking under pressure.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <InfoBlock icon={MessageSquareText} title="What it helps with">
            <div className="grid gap-2">
              {trainerUses.map((item) => (
                <p key={item} className="flex items-start gap-2">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
                  {item}
                </p>
              ))}
            </div>
          </InfoBlock>

          <InfoBlock icon={Clock3} title="What SRS means">
            <p>
              SRS means spaced repetition system. Instead of reviewing everything randomly, difficult cards come back
              sooner and easier cards come back later. The goal is simple: review before you forget.
            </p>
          </InfoBlock>

          <InfoBlock icon={Brain} title="How to use it">
            <ol className="grid list-decimal gap-2 pl-5">
              {howToUse.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </InfoBlock>
        </div>

        <div className="mt-8 rounded-lg border border-coral/20 bg-blush p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Lock aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-coral" />
            <div>
              <h2 className="text-xl font-black text-ink">Access</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-ink/70">
                The Sblocco Trainer is a paid feature of Sblocco Inglese. If you are currently enrolled in lessons with
                me, access is included for free while you are actively taking lessons.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {trainerConfig.map((trainer) => (
            <TrainerCard key={trainer.id} trainer={trainer} />
          ))}
        </div>
      </TrainerLayout>
    </>
  );
}
