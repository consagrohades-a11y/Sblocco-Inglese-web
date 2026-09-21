import React from 'react';
import LearnerAvatar from './LearnerAvatar.jsx';
import { LEARNER_AVATARS } from '../../lib/learnerAvatars.js';

export default function LearnerAvatarPicker({
  value,
  onChange,
  disabled = false,
}) {
  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-4" role="list" aria-label="Scegli il tuo avatar">
      {LEARNER_AVATARS.map((avatar, index) => {
        const selected = value === avatar.key;
        return (
          <button
            key={avatar.key}
            type="button"
            role="listitem"
            aria-label={`Scegli ${avatar.label}`}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange?.(avatar.key)}
            className={`focus-ring group relative mx-auto grid h-16 w-16 place-items-center rounded-2xl border bg-white transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 dark:bg-white/[0.04] ${selected
              ? 'border-coral ring-2 ring-coral/30'
              : 'border-ink/10 hover:border-coral/35 dark:border-white/10 dark:hover:border-coral/35'
            }`}
          >
            <LearnerAvatar
              avatarKey={avatar.key}
              displayName={String(index + 1)}
              size="lg"
              className="transition group-hover:scale-[1.03]"
            />
            {selected ? (
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-coral text-[10px] font-black text-white shadow-sm">
                ✓
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
