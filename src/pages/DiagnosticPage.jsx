import React from 'react';
import SEO from '../components/SEO';
import DiagnosticRenderer from '../components/diagnostics/DiagnosticRenderer';
import { englishBlockerDiagnostic } from '../content/diagnostics/englishBlocker';

export default function DiagnosticPage() {
  return (
    <section className="section-shell py-12">
      <SEO title="English Blocker Diagnostic | Sblocco Inglese" description="A lightweight diagnostic skeleton that collects evidence and recommends what to train next." />
      <DiagnosticRenderer diagnostic={englishBlockerDiagnostic} />
    </section>
  );
}

