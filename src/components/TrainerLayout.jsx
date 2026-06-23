import React from 'react';
import TrainerNav from './TrainerNav';

export default function TrainerLayout({ children, className = '' }) {
  return (
    <section className={`section-shell pb-16 pt-8 lg:pt-10 ${className}`}>
      <div className="mx-auto max-w-7xl">
        <TrainerNav />
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}
