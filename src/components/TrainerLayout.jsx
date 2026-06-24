import React from 'react';
import TrainerNav from './TrainerNav';

export default function TrainerLayout({ children, className = '' }) {
  return (
    <section className={`section-shell pb-10 pt-4 sm:pt-6 lg:pb-16 lg:pt-8 ${className}`}>
      <div className="mx-auto max-w-7xl">
        <TrainerNav />
        <div className="mt-5 sm:mt-8">{children}</div>
      </div>
    </section>
  );
}
