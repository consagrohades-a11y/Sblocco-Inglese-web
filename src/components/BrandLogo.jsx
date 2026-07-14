import React from 'react';
import { Link } from 'react-router-dom';
import { brandName } from '../config/site';

const logoSrc = '/assets/brand/chat-chat.svg';

function LogoContent({ compact = false, light = false }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-3">
      <img src={logoSrc} alt="" className={`shrink-0 object-contain ${compact ? 'h-9 w-9' : 'h-10 w-10'}`} />
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
    <Link to={to} className={`focus-ring rounded-md ${className}`}>
      <LogoContent compact={compact} light={light} />
    </Link>
  );
}
