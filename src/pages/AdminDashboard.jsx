import React from 'react';
import { BarChart3, BookOpen, ClipboardList, Settings, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useAuth } from '../auth/AuthContext.jsx';
import { adminButton, adminSurface } from '../styles/adminUi.js';

const sections = [
  {
    title: 'Studenti',
    description: 'Account learner, profili, relazioni didattiche e accesso alle assegnazioni.',
    to: '/admin/learners',
    icon: Users,
    status: 'Attivo',
  },
  {
    title: 'Contenuti',
    description: 'Word ed Expression card con importazione, revisione e pubblicazione.',
    to: '/admin/content',
    icon: BookOpen,
    status: 'Attivo',
  },
  {
    title: 'Assegnazioni',
    description: 'Attività collegate agli studenti, con struttura pronta per filtri e progressi.',
    to: '/admin/assignments',
    icon: ClipboardList,
    status: 'In sviluppo',
  },
  {
    title: 'Analisi',
    description: 'Attività studenti, card difficili e risultati degli esercizi.',
    to: '/admin/analytics',
    icon: BarChart3,
    status: 'In sviluppo',
  },
  {
    title: 'Impostazioni',
    description: 'Tema dell’interfaccia e gestione dell’account amministratore.',
    to: '/admin/settings',
    icon: Settings,
    status: 'Parziale',
  },
];

export default function AdminDashboard() {
  const { profile, user } = useAuth();
  const displayName = profile?.display_name || user?.user_metadata?.display_name || 'Admin';

  return (
    <>
      <SEO title="Dashboard admin | Sblocco Inglese" description="Workspace amministrativo di Sblocco Inglese." />
      <section className="section-shell py-10 lg:py-14">
        <div className="mx-auto max-w-6xl">
          <header className={`${adminSurface.panel} p-6 sm:p-8`}>
            <span className="eyebrow">Dashboard</span>
            <h1 className="mt-4 text-3xl font-black leading-tight text-ink dark:text-white sm:text-4xl">Ciao {displayName}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-ink/70 dark:text-white/65">
              Gestisci studenti, contenuti e attività da un unico workspace. Le funzioni non ancora collegate a dati reali sono indicate chiaramente.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/admin/content/words" className={adminButton.primary}>Revisiona Word card</Link>
              <Link to="/admin/content/expressions" className={adminButton.positive}>Revisiona Expressions</Link>
              <Link to="/admin/learners" className={adminButton.secondary}>Apri studenti</Link>
            </div>
          </header>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <Link key={section.title} to={section.to} className={`${adminSurface.panel} focus-ring group p-6 transition hover:-translate-y-0.5 hover:border-moss/25 hover:shadow-soft dark:hover:border-emerald-300/25`}>
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mint text-moss dark:bg-emerald-400/15 dark:text-emerald-300">
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-linen px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-wide text-ink/55 dark:bg-white/10 dark:text-white/55">{section.status}</span>
                  </div>
                  <h2 className="mt-5 text-xl font-black text-ink dark:text-white">{section.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/60">{section.description}</p>
                  <span className="mt-5 inline-flex text-sm font-black text-moss group-hover:underline dark:text-emerald-300">Apri sezione</span>
                </Link>
              );
            })}
          </div>

          <section className="mt-6 rounded-2xl border border-moss/20 bg-mint/25 p-6 dark:border-emerald-300/20 dark:bg-emerald-400/10">
            <p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Flusso contenuti</p>
            <h2 className="mt-2 text-xl font-black text-ink dark:text-white">Bozza, revisione, approvazione, pubblicazione</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/70 dark:text-white/60">
              Le card diventano visibili agli studenti soltanto dopo aver superato i requisiti di completezza ed essere state pubblicate.
            </p>
          </section>
        </div>
      </section>
    </>
  );
}
