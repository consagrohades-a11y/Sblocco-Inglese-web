import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Section({
  children,
  id,
  tone = 'plain',
  className = '',
  innerClassName = '',
  as: Tag = 'section',
}) {
  const toneClass = {
    plain: 'brand-shell bg-[#fffdfa]',
    soft: 'brand-section brand-shell brand-section-soft',
    ink: 'brand-section brand-section-ink',
    mint: 'brand-section brand-shell bg-[#e0f4ed]',
    linen: 'brand-section brand-shell bg-[#fff1df]',
  }[tone] || '';

  return (
    <Tag id={id} className={`${toneClass} ${className}`}>
      <div className={`section-shell py-14 sm:py-16 lg:py-20 ${innerClassName}`}>{children}</div>
    </Tag>
  );
}

export function SectionHeader({
  eyebrow,
  icon: Icon,
  title,
  copy,
  align = 'left',
  light = false,
  className = '',
}) {
  const centered = align === 'center';

  return (
    <div className={`${centered ? 'mx-auto text-center' : ''} ${className}`}>
      {eyebrow ? (
        <span className={`eyebrow ${light ? 'border-white/15 bg-white/10 text-white' : ''}`}>
          {Icon ? <Icon aria-hidden="true" className="h-3.5 w-3.5" /> : null}
          {eyebrow}
        </span>
      ) : null}
      <h2 className={`section-title ${centered ? 'mx-auto' : ''} ${light ? '!text-white' : ''}`}>{title}</h2>
      {copy ? (
        <p className={`section-copy ${centered ? 'mx-auto' : ''} ${light ? '!text-white/70' : ''}`}>{copy}</p>
      ) : null}
    </div>
  );
}

export function PageHero({
  eyebrow,
  icon: Icon,
  title,
  copy,
  actions,
  children,
  media,
  stats,
  className = '',
}) {
  return (
    <section className={`section-shell pb-12 pt-10 lg:pb-16 lg:pt-14 ${className}`}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.03fr)_minmax(360px,0.74fr)] lg:items-center">
        <div>
          {eyebrow ? (
            <span className="eyebrow">
              {Icon ? <Icon aria-hidden="true" className="h-3.5 w-3.5" /> : null}
              {eyebrow}
            </span>
          ) : null}
          <h1 className="hero-title mt-5">{title}</h1>
          {copy ? <p className="mt-6 max-w-3xl text-lg leading-8 text-ink/70 sm:text-xl">{copy}</p> : null}
          {actions ? <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{actions}</div> : null}
          {stats ? <div className="mt-8">{stats}</div> : null}
        </div>
        {media ? <div>{media}</div> : null}
      </div>
      {children ? <div className="mt-10">{children}</div> : null}
    </section>
  );
}

export function MediaStage({ children, caption, className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-lg border border-ink/10 bg-ink shadow-soft ${className}`}>
      <div className="absolute inset-x-0 top-0 h-1 scanline" />
      {children}
      {caption ? (
        <div className="absolute inset-x-4 bottom-4 rounded-lg border border-white/10 bg-ink/80 p-4 text-white backdrop-blur">
          {caption}
        </div>
      ) : null}
    </div>
  );
}

export function FeatureList({ items, className = '', light = false }) {
  return (
    <div className={`grid gap-3 ${className}`}>
      {items.map((item) => (
        <div
          key={typeof item === 'string' ? item : item.title}
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
            light ? 'border-white/10 bg-white/[0.08] text-white/80' : 'border-ink/10 bg-white/90 text-ink/75'
          }`}
        >
          <CheckCircle2 aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${light ? 'text-mint' : 'text-moss'}`} />
          <div>
            {typeof item === 'string' ? (
              <p className="text-sm font-bold leading-6">{item}</p>
            ) : (
              <>
                <p className={`text-sm font-black leading-6 ${light ? 'text-white' : 'text-ink'}`}>{item.title}</p>
                {item.text ? <p className="mt-1 text-sm leading-6 opacity-80">{item.text}</p> : null}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductCard({ label, title, text, meta, to, action = 'Apri', icon: Icon }) {
  return (
    <article className="brand-card kinetic-card flex h-full flex-col p-5 pt-6 sm:p-6 sm:pt-7">
      <div className="flex items-start justify-between gap-3">
        {label ? (
          <span className="rounded-full bg-mint px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-moss">
            {label}
          </span>
        ) : null}
        {Icon ? (
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-paper text-moss">
            <Icon aria-hidden="true" className="h-5 w-5" />
          </span>
        ) : null}
      </div>
      <h3 className="mt-5 text-2xl font-black leading-tight text-ink">{title}</h3>
      <p className="mt-3 flex-1 text-sm font-semibold leading-6 text-ink/70">{text}</p>
      {meta ? <div className="mt-5">{meta}</div> : null}
      {to ? (
        <Link
          to={to}
          className="focus-ring mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-moss px-5 py-3 text-sm font-extrabold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-[#096d58]"
        >
          {action}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      ) : null}
    </article>
  );
}

export function CtaBand({ eyebrow, title, copy, children, className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-ink p-6 text-white shadow-soft sm:p-8 lg:p-10 ${className}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 scanline" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_0_50%,rgba(255,196,87,0.08)_50%_51%,transparent_51%_100%)]" />
      <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          {eyebrow ? (
            <p className="text-xs font-black uppercase tracking-[0.12em] text-mint/90">{eyebrow}</p>
          ) : null}
          <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-4xl">{title}</h2>
          {copy ? <p className="mt-4 max-w-3xl text-base leading-7 text-white/70">{copy}</p> : null}
        </div>
        {children ? <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">{children}</div> : null}
      </div>
    </div>
  );
}
