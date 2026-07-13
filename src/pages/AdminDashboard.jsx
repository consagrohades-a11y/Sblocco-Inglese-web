import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useAuth } from '../auth/AuthContext.jsx';

const sections = [
  {
    title: 'Studenti',
    description: 'Visualizza gli account learner e prepara la gestione delle assegnazioni.',
    status: 'Disponibile',
    to: '/admin/learners',
    cta: 'Apri studenti',
  },
  {
    title: 'Assegnazioni',
    description: 'Crea percorsi e attività da assegnare agli studenti.',
    status: 'Disponibile dai profili studenti',
  },
  {
    title: 'Contenuti Trainer',
    description: 'Crea, revisiona, approva e pubblica nuove espressioni General direttamente in Supabase.',
    status: 'Disponibile',
    to: '/admin/content/trainers',
    cta: 'Apri contenuti Trainer',
  },
  {
    title: 'Importazione rapida',
    description: 'Carica una carta JSON, controlla l’anteprima e salvala in Supabase come bozza da revisionare.',
    status: 'Disponibile',
    to: '/admin/content/trainers/import',
    cta: 'Importa una carta',
  },
  {
    title: 'Elimina carta',
    description: 'Trova ed elimina definitivamente una carta Trainer non pubblicata, senza entrare in Supabase.',
    status: 'Disponibile',
    to: '/admin/content/trainers/delete',
    cta: 'Gestisci eliminazione',
  },
];

export default function AdminDashboard() {
  const { profile, user } = useAuth();
  const displayName = profile?.display_name || user?.user_metadata?.display_name || 'Admin';

  return (
    <>
      <SEO title="Pannello admin | Sblocco Inglese" description="Pannello amministrativo di Sblocco Inglese." />
      <section className="section-shell py-12 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft sm:p-8">
            <span className="eyebrow">Amministrazione</span>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-black leading-tight text-ink sm:text-4xl">Pannello admin</h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-ink/70">Ciao {displayName}. Da qui gestisci studenti, assegnazioni e contenuti della piattaforma.</p>
              </div>
              <Link to="/account" className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm font-black text-ink transition hover:bg-linen">Torna al tuo account</Link>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-moss">{section.status}</p>
                <h2 className="mt-3 text-xl font-black text-ink">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ink/65">{section.description}</p>
                {section.to ? (
                  <Link to={section.to} className="focus-ring mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-black text-white transition hover:bg-moss">{section.cta}</Link>
                ) : null}
              </section>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-moss/20 bg-mint/25 p-6">
            <p className="text-xs font-black uppercase tracking-wide text-moss">Contenuti Trainer</p>
            <h2 className="mt-2 text-xl font-black text-ink">Flusso diretto in Supabase</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/70">Le nuove carte partono come bozze. Puoi correggerle, approvarle e pubblicarle solo quando rispettano lo standard completo.</p>
          </div>
        </div>
      </section>
    </>
  );
}
