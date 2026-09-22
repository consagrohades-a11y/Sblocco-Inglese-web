import React from 'react';
import {
  BarChart3,
  Blocks,
  BookOpen,
  ClipboardList,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import AdminPageHeader from '../components/admin/AdminPageHeader.jsx';
import TeacherRadar from '../components/admin/TeacherRadar.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const primaryAreas = [
  {
    title: 'Studenti',
    description: 'Profili learner, gruppi e contesto didattico.',
    to: '/admin/learners',
    icon: Users,
  },
  {
    title: 'Learning Studio',
    description: 'Crea o importa una nuova attività e pubblicala.',
    to: '/admin/content/exercises/studio',
    icon: Blocks,
  },
  {
    title: 'Libreria attività',
    description: 'Trova, organizza, modifica e assegna attività esistenti.',
    to: '/admin/content/exercises/library',
    icon: BookOpen,
  },
  {
    title: 'Assegnazioni',
    description: 'Controlla ciò che è stato assegnato a studenti e gruppi.',
    to: '/admin/assignments',
    icon: ClipboardList,
  },
  {
    title: 'Risultati e review',
    description: 'Apri i tentativi e gestisci ciò che richiede revisione docente.',
    to: '/admin/content/exercises/results',
    icon: BarChart3,
  },
  {
    title: 'Analisi',
    description: 'Leggi andamento, attività e progressi degli studenti.',
    to: '/admin/analytics',
    icon: BarChart3,
  },
];

export default function AdminDashboard() {
  const { profile, user } = useAuth();
  const displayName = profile?.display_name || user?.user_metadata?.display_name || 'Admin';

  return (
    <>
      <SEO title="Dashboard admin | Sblocco Inglese" description="Workspace amministrativo di Sblocco Inglese." />
      <section className="section-shell py-8 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <AdminPageHeader
            eyebrow="Workspace admin"
            title={`Ciao ${displayName}`}
            description="Gestisci studenti, attività, assegnazioni e risultati da un unico spazio."
          />

          <TeacherRadar />

          <div className="mt-8">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-ink/45 dark:text-white/40">
              Aree principali
            </p>
            <div className="mt-3 divide-y divide-ink/10 border-y border-ink/10 dark:divide-white/10 dark:border-white/10">
              {primaryAreas.map((area) => {
                const Icon = area.icon;
                return (
                  <Link
                    key={area.to}
                    to={area.to}
                    className="focus-ring group grid gap-3 py-5 transition hover:bg-clay/[0.025] sm:grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:items-center sm:px-3 dark:hover:bg-white/[0.025]"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-ink/10 bg-white text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white">
                      <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                    </span>
                    <span>
                      <strong className="block text-base font-black text-ink dark:text-white">{area.title}</strong>
                      <span className="mt-1 block text-sm leading-6 text-ink/60 dark:text-white/55">{area.description}</span>
                    </span>
                    <span className="text-xs font-black text-clay opacity-80 transition group-hover:opacity-100 dark:text-coral">
                      Apri
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
