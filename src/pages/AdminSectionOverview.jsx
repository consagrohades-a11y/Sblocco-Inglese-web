import React from 'react';
import { BarChart3, ClipboardList, Settings, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import ThemeToggle from '../components/ThemeToggle';
import { adminButton, adminSurface } from '../styles/adminUi.js';

const sections = {
  assignments: {
    eyebrow: 'Assegnazioni',
    title: 'Gestione delle attività',
    description: 'Le assegnazioni attuali vengono create e gestite dal profilo del singolo studente. La vista globale arriverà insieme a filtri, stati e progressi sincronizzati.',
    icon: ClipboardList,
    action: { label: 'Apri gli studenti', to: '/admin/learners', icon: Users },
    items: ['Attive', 'Bozze', 'Completate', 'Archiviate'],
  },
  analytics: {
    eyebrow: 'Analisi',
    title: 'Attività e risultati',
    description: 'Questa area raccoglierà attività degli studenti, card difficili e risultati degli esercizi quando i progressi saranno sincronizzati su Supabase.',
    icon: BarChart3,
    items: ['Attività studenti', 'Card difficili', 'Risultati esercizi'],
  },
  settings: {
    eyebrow: 'Impostazioni',
    title: 'Tema e account',
    description: 'Le preferenze dell’interfaccia e dell’account saranno raccolte qui. Il tema completo Chiaro, Scuro e Sistema verrà collegato al profilo nella fase dedicata.',
    icon: Settings,
    action: { label: 'Apri account personale', to: '/account', icon: Users },
    items: ['Tema', 'Account'],
  },
};

export default function AdminSectionOverview({ section }) {
  const config = sections[section];
  const Icon = config.icon;
  const ActionIcon = config.action?.icon;

  return (
    <>
      <SEO title={`${config.eyebrow} | Admin | Sblocco Inglese`} description={config.description} />
      <section className="section-shell py-10 lg:py-14">
        <div className="mx-auto max-w-5xl">
          <header className={`${adminSurface.panel} p-6 sm:p-8`}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-mint text-moss dark:bg-emerald-400/15 dark:text-emerald-300">
              <Icon aria-hidden="true" className="h-6 w-6" />
            </div>
            <span className="eyebrow mt-5">{config.eyebrow}</span>
            <h1 className="mt-3 text-3xl font-black text-ink dark:text-white sm:text-4xl">{config.title}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-ink/70 dark:text-white/65">{config.description}</p>

            {section === 'settings' ? (
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-ink/10 bg-linen/35 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <ThemeToggle />
                <div>
                  <p className="text-sm font-black text-ink dark:text-white">Cambia tema</p>
                  <p className="mt-1 text-xs font-semibold text-ink/55 dark:text-white/50">La preferenza attuale viene salvata nel browser.</p>
                </div>
              </div>
            ) : null}

            {config.action ? (
              <div className="mt-6">
                <Link to={config.action.to} className={adminButton.primary}>
                  <ActionIcon aria-hidden="true" className="h-4 w-4" />
                  {config.action.label}
                </Link>
              </div>
            ) : null}
          </header>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {config.items.map((item) => (
              <article key={item} className={`${adminSurface.muted} p-5`}>
                <p className="text-sm font-black text-ink dark:text-white">{item}</p>
                <p className="mt-2 text-xs font-semibold leading-5 text-ink/50 dark:text-white/45">Struttura predisposta, dati disponibili nella fase dedicata.</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
