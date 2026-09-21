import React from 'react';
import LearnerAvatar from './LearnerAvatar.jsx';
import {
  DEFAULT_LEARNER_AVATAR_BACKGROUND_KEY,
  LEARNER_AVATAR_BACKGROUNDS,
  LEARNER_AVATARS,
} from '../../lib/learnerAvatars.js';

export default function LearnerAvatarPicker({
  value,
  backgroundValue,
  onChange,
  onBackgroundChange,
  disabled = false,
  variant = 'card',
}) {
  const selectedBackground = backgroundValue || DEFAULT_LEARNER_AVATAR_BACKGROUND_KEY;
  const bare = variant === 'bare';

  return (
    <div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/55 dark:text-white/55">Sfondo</p>
        <div className="mt-3 flex flex-wrap gap-3" aria-label="Scegli il colore di sfondo">
          {LEARNER_AVATAR_BACKGROUNDS.map((background) => {
            const selected = selectedBackground === background.key;
            return (
              <button
                key={background.key}
                type="button"
                aria-label={`Sfondo ${background.label}`}
                aria-pressed={selected}
                title={background.label}
                disabled={disabled}
                onClick={() => onBackgroundChange?.(background.key)}
                className={`focus-ring relative h-11 w-11 rounded-full border-2 transition hover:scale-105 disabled:cursor-wait disabled:opacity-60 ${selected
                  ? 'border-coral ring-2 ring-coral/25 ring-offset-2 ring-offset-white dark:ring-offset-surface-900'
                  : 'border-white shadow-[0_0_0_1px_rgba(24,34,31,0.16)] dark:border-surface-900 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.18)]'
                }`}
                style={{ backgroundColor: background.color }}
              >
                {selected ? (
                  <span
                    className="absolute inset-0 grid place-items-center text-xs font-black"
                    style={{ color: background.textColor }}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 border-t border-ink/8 pt-5 dark:border-white/8">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/55 dark:text-white/55">Personaggio</p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" aria-label="Scegli il tuo avatar">
          {LEARNER_AVATARS.map((avatar, index) => {
            const selected = value === avatar.key;
            return (
              <button
                key={avatar.key}
                type="button"
                aria-label={`Scegli ${avatar.label}`}
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => onChange?.(avatar.key)}
                className={`focus-ring group relative mx-auto grid min-h-32 w-full max-w-36 place-items-center rounded-2xl transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 ${bare ? 'border border-transparent bg-transparent p-1' : 'border bg-white p-3 dark:bg-white/[0.04]'} ${selected
                  ? 'border-coral ring-2 ring-coral/30'
                  : bare
                    ? 'hover:bg-coral/[0.035]'
                    : 'border-ink/10 hover:border-coral/35 dark:border-white/10 dark:hover:border-coral/35'
                }`}
              >
                <LearnerAvatar
                  avatarKey={avatar.key}
                  backgroundKey={selectedBackground}
                  displayName={String(index + 1)}
                  size="2xl"
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
      </div>
    </div>
  );
}
