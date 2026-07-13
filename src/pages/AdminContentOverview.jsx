import React from 'react';
import { Archive, BookOpen, FileJson, FileSpreadsheet, Trash2 } from 'lucide-react';
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
                <p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">{area.status}</p>
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

          <section className={`${adminSurface.panel} mt-6 p-6 sm:p-7`}>
            <p className="text-xs font-black uppercase tracking-wide text-amber-700 dark:text-amber-300">Migrazione controllata</p>
            <h2 className="mt-2 text-xl font-black text-ink dark:text-white">Business e Hospitality Expressions</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/60">
              I Trainer esistenti restano disponibili agli studenti. Entreranno in questa area soltanto dopo audit, classificazione e migrazione in Supabase.
            </p>
          </section>
        </div>
      </section>
    </>
  );
}
