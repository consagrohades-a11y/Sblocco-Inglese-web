import React from 'react';

export default function AuthNotice({ tone = 'info', children }) {
  const styles = tone === 'error'
    ? 'border-red-200 bg-red-50 text-red-900'
    : 'border-mint/70 bg-mint/30 text-ink';

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm font-bold leading-6 ${styles}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
