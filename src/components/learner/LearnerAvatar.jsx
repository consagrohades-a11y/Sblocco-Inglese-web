import React, { useEffect, useMemo, useState } from 'react';
import { getLearnerAvatar } from '../../lib/learnerAvatars.js';

const sizeClasses = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
};

function initialsFromName(value) {
  const parts = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

export default function LearnerAvatar({
  avatarKey,
  displayName,
  size = 'md',
  className = '',
  eager = false,
}) {
  const avatar = useMemo(() => getLearnerAvatar(avatarKey), [avatarKey]);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatar?.src]);

  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#f2eadf] font-black text-ink ring-1 ring-ink/10 dark:bg-white/[0.08] dark:text-white dark:ring-white/10 ${sizeClasses[size] || sizeClasses.md} ${className}`}
      aria-hidden="true"
    >
      {avatar && !imageFailed ? (
        <img
          src={avatar.src}
          alt=""
          className="h-full w-full object-cover"
          loading={eager ? 'eager' : 'lazy'}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span>{initialsFromName(displayName)}</span>
      )}
    </span>
  );
}
