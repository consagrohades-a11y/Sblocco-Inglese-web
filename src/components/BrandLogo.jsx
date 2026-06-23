import React from 'react';
import { Link } from 'react-router-dom';
import { brandName } from '../config/site';

const logoSrc = '/assets/brand/chat-chat.svg';

function LogoContent({ compact = false, light = false }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-3">
      <span className={`grid shrink-0 place-items-center rounded-lg border shadow-sm ${
        compact ? 'h-10 w-10' : 'h-11 w-11'
      } ${
        light ? 'border-white/15 bg-white/10' : 'border-ink/10 bg-white'
      }`}
      >
        <img src={logoSrc} alt="" className={compact ? 'h-6 w-6' : 'h-7 w-7'} />
      </span>
      <span className="min-w-0">
        <span className={`block truncate font-black leading-tight ${
          compact ? 'text-sm sm:text-base' : 'text-sm sm:text-base'
        } ${
          light ? 'text-white' : 'text-ink'
        }`}
        >
          {brandName}
        </span>
        {!compact ? (
          <span className={`hidden text-xs font-semibold sm:block ${
            light ? 'text-white/70' : 'text-ink/60'
          }`}
          >
            Corsi, simulazioni e trainer.
          </span>
        ) : null}
      </span>
    </span>
  );
}

export default function BrandLogo({ to = '/', compact = false, light = false, className = '' }) {
  if (!to) {
    return (
      <span className={className}>
        <LogoContent compact={compact} light={light} />
      </span>
    );
  }

  return (
    <Link to={to} className={`focus-ring rounded-lg ${className}`}>
      <LogoContent compact={compact} light={light} />
    </Link>
  );
}
