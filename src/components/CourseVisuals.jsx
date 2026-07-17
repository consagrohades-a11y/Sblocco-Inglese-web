import React from 'react';
import {
  BarChart3,
  Check,
  Clock3,
  Headphones,
  MessageCircle,
  Mic2,
  Play,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';

const waveform = [24, 42, 60, 34, 72, 48, 30, 64, 44, 76, 38, 58, 28, 68, 46, 32, 62, 40];

function Waveform({ compact = false }) {
  return (
    <div className={`flex items-center gap-1 ${compact ? 'h-8' : 'h-12'}`} aria-hidden="true">
      {waveform.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className="w-1 rounded-full bg-current opacity-75"
          style={{ height: `${compact ? Math.max(8, height * 0.45) : height * 0.62}px` }}
        />
      ))}
    </div>
  );
}

export function RoleplayPreview({ className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-[2rem] border border-white/15 bg-[#14221e] p-4 shadow-2xl sm:p-5 ${className}`}>
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-butter/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-mint/15 blur-3xl" />

      <div className="relative flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-moss">
            <MessageCircle aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.1em] text-mint/70">Roleplay della settimana</p>
            <p className="text-sm font-black text-white">Aggiornamento di progetto</p>
          </div>
        </div>
        <span className="rounded-full bg-coral px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.08em] text-white">
          In corso
        </span>
      </div>

      <div className="relative mt-4 grid gap-3">
        <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-white p-4 text-ink shadow-lg">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-coral">Collega</p>
          <p className="mt-2 text-sm font-bold leading-6">
            We are still waiting for the final figures. Can you explain what is blocking the delivery?
          </p>
        </div>

        <div className="ml-auto w-[92%] rounded-2xl rounded-tr-md border border-mint/25 bg-mint/[0.10] p-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-mint">La tua risposta</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-white/60">
                Spiega il problema, indica cosa manca e proponi il prossimo passo.
              </p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-coral text-white shadow-lg">
              <Mic2 aria-hidden="true" className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-black/15 px-3 py-2 text-mint">
            <Waveform compact />
            <span className="text-xs font-black text-white/70">00:18</span>
          </div>
        </div>

        <div className="grid gap-2 rounded-2xl border border-butter/20 bg-butter/[0.09] p-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-butter text-ink">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.08em] text-butter">Feedback che puoi riusare</p>
            <p className="mt-1 text-sm font-semibold leading-5 text-white/72">
              Usa “The main issue is…” per introdurre il problema in modo più netto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ListeningPreview({ className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-[2rem] border border-ink/10 bg-ink p-5 text-white shadow-soft sm:p-6 ${className}`}>
      <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-100 text-cyan-800">
            <Headphones aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.08em] text-cyan-200/70">Listening realistico</p>
            <p className="text-base font-black">Client call, bisogni e priorità</p>
          </div>
        </div>
        <span className="text-xs font-black text-white/60">01:12</span>
      </div>

      <div className="relative mt-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
        <button type="button" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-butter text-ink" aria-label="Anteprima audio">
          <Play aria-hidden="true" className="ml-0.5 h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 text-cyan-200">
          <Waveform />
        </div>
      </div>

      <div className="relative mt-4 grid gap-3 sm:grid-cols-3">
        {[
          ['1° ascolto', 'Senso generale'],
          ['2° ascolto', 'Dettagli utili'],
          ['Risposta', 'Reazione vocale'],
        ].map(([label, value], index) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-white/60">0{index + 1}</p>
            <p className="mt-2 text-xs font-black text-cyan-200">{label}</p>
            <p className="mt-1 text-sm font-bold text-white/75">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressPreview({ className = '' }) {
  const metrics = [
    { label: 'Dettagli al primo ascolto', before: 38, after: 78 },
    { label: 'Completezza della risposta', before: 44, after: 84 },
    { label: 'Uso di espressioni professionali', before: 31, after: 73 },
  ];

  return (
    <div className={`rounded-[2rem] border border-white/12 bg-white/[0.07] p-5 text-white shadow-2xl sm:p-6 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.1em] text-mint">Report finale</p>
          <h3 className="mt-2 text-2xl font-black">Il progresso diventa leggibile.</h3>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint text-moss">
          <BarChart3 aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-6 grid gap-5">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <div className="flex items-center justify-between gap-4 text-xs font-bold text-white/65">
              <span>{metric.label}</span>
              <span className="text-mint">{metric.before}% → {metric.after}%</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-coral via-butter to-mint" style={{ width: `${metric.after}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/10 p-4">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-coral">Prima</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/62">Risposte brevi, molti replay, dettagli persi.</p>
        </div>
        <div className="rounded-xl border border-mint/20 bg-mint/[0.09] p-4">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-mint">Dopo</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/78">Messaggio completo, meno dipendenza dal testo, risposta più pronta.</p>
        </div>
      </div>
    </div>
  );
}

export function MethodLoopVisual({ className = '' }) {
  const nodes = [
    { icon: Target, title: 'Situazione', text: 'Un obiettivo reale' },
    { icon: Headphones, title: 'Ascolto', text: 'Capire ciò che conta' },
    { icon: Mic2, title: 'Risposta', text: 'Usare la lingua' },
    { icon: MessageCircle, title: 'Feedback', text: 'Correggere con senso' },
    { icon: Sparkles, title: 'Trainer', text: 'Farlo tornare' },
  ];

  return (
    <div className={`relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.07] p-5 sm:p-6 ${className}`}>
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-butter/10 blur-3xl" />
      <p className="relative text-xs font-black uppercase tracking-[0.12em] text-mint">Il ciclo Sblocco</p>
      <div className="relative mt-5 grid gap-3">
        {nodes.map(({ icon: Icon, title, text }, index) => (
          <div key={title} className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-[#13211d]/80 p-3.5">
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${index % 3 === 0 ? 'bg-butter text-ink' : index % 3 === 1 ? 'bg-mint text-moss' : 'bg-coral text-white'}`}>
              <Icon aria-hidden="true" className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-sm font-black text-white">{title}</p>
              <p className="mt-0.5 text-xs font-semibold text-white/65">{text}</p>
            </div>
            <span className="text-xs font-black text-white/25">0{index + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CourseMapPreview({ className = '' }) {
  const cards = [
    { title: 'Business English Flow', meta: '8 settimane · gruppo', accent: 'bg-mint text-moss', icon: Users },
    { title: 'Speaking Under Pressure', meta: '6 settimane · gruppo', accent: 'bg-butter text-ink', icon: Mic2 },
    { title: 'Interview Sprint', meta: '2 settimane · privato', accent: 'bg-coral text-white', icon: Target },
  ];

  return (
    <div className={`relative min-h-[390px] ${className}`}>
      <div className="absolute inset-4 rounded-[2rem] border border-white/10 bg-white/[0.05]" />
      <div className="absolute left-4 top-5 h-24 w-24 rounded-full bg-mint/10 blur-2xl" />
      <div className="absolute bottom-4 right-0 h-28 w-28 rounded-full bg-butter/15 blur-2xl" />
      <div className="relative grid gap-4 pt-5 sm:pl-8">
        {cards.map(({ title, meta, accent, icon: Icon }, index) => (
          <div
            key={title}
            className="rounded-[1.4rem] border border-white/15 bg-[#17241f]/95 p-4 shadow-2xl backdrop-blur"
            style={{ transform: `translateX(${index * 18}px) rotate(${index === 1 ? 1.2 : index === 2 ? -1 : 0}deg)` }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${accent}`}>
                <Icon aria-hidden="true" className="h-4.5 w-4.5" />
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.08em] text-white/65">
                Percorso 0{index + 1}
              </span>
            </div>
            <h3 className="mt-4 text-lg font-black text-white">{title}</h3>
            <p className="mt-1 text-xs font-semibold text-white/65">{meta}</p>
            <div className="mt-4 flex items-center gap-2">
              <span className="h-1.5 flex-1 rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-gradient-to-r from-mint via-butter to-coral" style={{ width: `${72 - index * 13}%` }} />
              </span>
              <Clock3 aria-hidden="true" className="h-3.5 w-3.5 text-white/35" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
