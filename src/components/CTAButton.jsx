import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ctaLabels, externalLinks } from '../config/site';

const variants = {
  primary:
    'bg-moss text-white shadow-lift hover:-translate-y-0.5 hover:bg-[#096d58] hover:shadow-soft active:translate-y-0 active:shadow-lift',
  secondary:
    'border border-ink/20 bg-white/90 text-ink hover:-translate-y-0.5 hover:border-moss/30 hover:bg-mint/50 active:translate-y-0',
  contrast:
    'border border-white/40 bg-butter text-ink shadow-soft hover:-translate-y-0.5 hover:bg-white hover:shadow-soft active:translate-y-0 active:shadow-lift',
  quiet: 'text-moss hover:text-ink active:text-ink',
};

export default function CTAButton({
  children = ctaLabels.primary,
  href = externalLinks.form,
  variant = 'primary',
  className = '',
  icon = true,
  onClick,
}) {
  const finalHref = href;
  const opensNewTab = /^https?:\/\//.test(finalHref || '');
  const classNames =
    variant === 'quiet'
      ? `focus-ring inline-flex items-center gap-2 text-sm font-extrabold transition ${variants[variant]} ${className}`
      : `focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold transition sm:text-base ${variants[variant]} ${className}`;

  if (onClick && !finalHref) {
    return (
      <button type="button" onClick={onClick} className={classNames}>
        {children}
        {icon ? <ArrowRight aria-hidden="true" className="h-4 w-4" /> : null}
      </button>
    );
  }

  return (
    <a
      href={finalHref}
      onClick={onClick}
      className={classNames}
      target={opensNewTab ? '_blank' : undefined}
      rel={opensNewTab ? 'noreferrer' : undefined}
    >
      {children}
      {icon ? <ArrowRight aria-hidden="true" className="h-4 w-4" /> : null}
    </a>
  );
}
