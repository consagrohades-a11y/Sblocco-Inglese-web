import React from 'react';

export default function AuthFormField({ label, variant = 'default', ...inputProps }) {
  const journey = variant === 'journey';

  return (
    <label className={journey ? 'register-journey__field' : 'block'}>
      <span className={journey ? 'register-journey__field-label' : 'text-sm font-black text-ink'}>
        {label}
      </span>
      <input
        {...inputProps}
        className={journey
          ? 'register-journey__input'
          : 'mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-base font-semibold text-ink outline-none transition placeholder:text-ink/35 focus:border-moss focus:ring-4 focus:ring-mint/40'}
      />
    </label>
  );
}
