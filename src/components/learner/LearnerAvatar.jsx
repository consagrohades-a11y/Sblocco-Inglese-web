import React, { useEffect, useMemo, useState } from 'react';
import {
  getLearnerAvatar,
  getLearnerAvatarBackground,
} from '../../lib/learnerAvatars.js';

const sizeClasses = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
  '2xl': 'h-24 w-24 text-2xl',
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
  backgroundKey,
  displayName,
  size = 'md',
  className = '',
  eager = false,
}) {
  const avatar = useMemo(() => getLearnerAvatar(avatarKey), [avatarKey]);
  const background = useMemo(() => getLearnerAvatarBackground(backgroundKey), [backgroundKey]);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatar?.src]);

  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-black ring-1 ring-ink/10 dark:ring-white/10 ${sizeClasses[size] || sizeClasses.md} ${className}`}
      style={{ backgroundColor: background.color, color: background.textColor }}
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
