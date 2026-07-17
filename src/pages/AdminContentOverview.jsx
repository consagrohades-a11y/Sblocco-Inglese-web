import React from 'react';
import { Archive, BookOpen, FileJson, FileSpreadsheet, Plane } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { adminButton, adminSurface } from '../styles/adminUi.js';

const areas = [
  {
    title: 'Word Trainer',
    description: 'Gestisci word card A0-C1 con revisione, pubblicazione e importazione batch.',
    status: 'Supabase attivo',
    actions: [
      { label: 'Apri editor e revisione', to: '/admin/content/words', icon: BookOpen, variant: 'primary' },
      { label: 'Importa CSV o JSON', to: '/admin/content/words/import', icon: FileSpreadsheet, variant: 'secondary' },
      { label: 'Archivio ed eliminazione', to: '/admin/content/words/archive', icon: Archive, variant: 'secondary' },
    ],
  },
  {
    title: 'General Expressions',
    description: 'Gestisci espressioni General, importazione JSON, revisione, pubblicazione e archivio.',
    status: 'Supabase attivo',
    actions: [
      { label: 'Apri editor e revisione', to: '/admin/content/expressions', icon: BookOpen, variant: 'primary' },
      { label: 'Importa JSON', to: '/admin/content/expressions/import', icon: FileJson, variant: 'secondary' },
      { label: 'Archivio ed eliminazione', to: '/admin/content/expressions/archive', icon: Archive, variant: 'secondary' },
    ],
  },
  {
    title: 'Business Expressions',
    description: 'Crea e revisiona espressioni per lavoro, riunioni, colloqui e comunicazione professionale.',
    status: 'Supabase attivo',
    actions: [
      { label: 'Apri editor e revisione', to: '/admin/content/business-expressions', icon: BookOpen, variant: 'primary' },
      { label: 'Importa CSV o JSON', to: '/admin/content/business-expressions/import', icon: FileJson, variant: 'secondary' },
      { label: 'Archivio ed eliminazione', to: '/admin/content/business-expressions/archive', icon: Archive, variant: 'secondary' },
    ],
  },
  {
    title: 'Hospitality Expressions',
    description: 'Crea e revisiona espressioni per accoglienza, ristorazione, hotel e servizio agli ospiti.',
    status: 'Supabase attivo',
    actions: [
      { label: 'Apri editor e revisione', to: '/admin/content/hospitality-expressions', icon: BookOpen, variant: 'primary' },
      { label: 'Importa CSV o JSON', to: '/admin/content/hospitality-expressions/import', icon: FileJson, variant: 'secondary' },
      { label: 'Archivio ed eliminazione', to: '/admin/content/hospitality-expressions/archive', icon: Archive, variant: 'secondary' },
    ],
  },
  {
    title: 'Travel Expression Trainer',
    description: 'Gestisci in un unico spazio le Travel card, il catalogo iniziale, le nuove importazioni e la pubblicazione nel Trainer.',
    status: 'Supabase attivo',
    actions: [
      { label: 'Gestisci Travel Trainer', to: '/admin/content/travel-expressions', icon: Plane, variant: 'primary' },
    ],
  },
];

export default function AdminContentOverview() {
  return (
    <>
      <SEO title="Contenuti | Admin | Sblocco Inglese" description="Gestione centralizzata dei contenuti Trainer." />
      <section className="section-shell py-10 lg:py-14">
        <div className="mx-auto max-w-6xl">
          <header className={`${adminSurface.panel} p-6 sm:p-8`}>
            <span className="eyebrow">Contenuti</span>
            <h1 className="mt-4 text-3xl font-black text-ink dark:text-white sm:text-4xl">Gestione Trainer</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-ink/70 dark:text-white/65">
              Ogni famiglia di contenuti raccoglie editor, importazioni, revisione, pubblicazione, archivio ed eliminazione consentita.
            </p>
          </header>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            {areas.map((area) => (
              <article key={area.title} className={`${adminSurface.panel} p-6 sm:p-7`}>
                <p className="text-xs font-bold uppercase tracking-wide text-moss dark:text-emerald-300">{area.status}</p>
                <h2 className="mt-3 text-2xl font-black text-ink dark:text-white">{area.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/60">{area.description}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {area.actions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link key={action.to} to={action.to} className={adminButton[action.variant]}>
                        <Icon aria-hidden="true" className="h-4 w-4" />
                        {action.label}
                      </Link>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>

        </div>
      </section>
    </>
  );
}
