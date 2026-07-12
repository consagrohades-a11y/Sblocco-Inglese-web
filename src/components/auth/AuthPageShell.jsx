import React from 'react';
import SEO from '../SEO';

export default function AuthPageShell({ title, description, eyebrow, children, footer }) {
  return (
    <>
      <SEO title={`${title} | Sblocco Inglese`} description={description} />
      <section className="section-shell py-14 lg:py-18">
        <div className="mx-auto max-w-xl rounded-lg border border-ink/10 bg-white p-6 shadow-soft sm:p-8">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="mt-4 text-3xl font-black leading-tight text-ink sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-ink/70">{description}</p>
          <div className="mt-7">{children}</div>
          {footer ? <div className="mt-6 border-t border-ink/10 pt-5 text-sm font-bold text-ink/65">{footer}</div> : null}
        </div>
      </section>
    </>
  );
}
