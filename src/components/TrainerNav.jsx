import React from 'react';
import { Brain, ClipboardList, Dumbbell, Menu, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { trainerConfig, trainerHome } from '../data/trainerConfig';
import { supabase } from '../lib/supabaseClient.js';

const practiceHome = {
  id: 'practice',
  route: '/practice',
  title: 'Pratica con le card',
  shortTitle: 'Pratica',
};

const assignmentsHome = {
  id: 'assignments',
  route: '/assignments',
  title: 'Le mie attività',
  shortTitle: 'Attività',
};

const guidedTrainerScopes = [
  ['word-trainer', 'word', null],
  ['general-expression', 'expression', 'general'],
  ['business-expression', 'expression', 'business'],
  ['hospitality-expression', 'expression', 'hospitality'],
];

function navClass({ isActive }) {
  return `focus-ring rounded-full px-3 py-2 text-sm font-black transition ${
    isActive
      ? 'bg-ink text-white shadow-sm dark:bg-mint dark:text-ink'
      : 'text-ink/70 hover:bg-white hover:text-ink dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white'
  }`;
}

export default function TrainerNav() {
  const [open, setOpen] = useState(false);
  const [guidedCounts, setGuidedCounts] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setGuidedCounts(null);
      return undefined;
    }
    let active = true;
    Promise.all(guidedTrainerScopes.map(([, itemType, domain]) => supabase.rpc('get_learner_srs_scope', {
      p_item_type: itemType,
      p_domain: domain,
    }))).then((responses) => {
      if (!active || responses.some((response) => response.error)) return;
      if (!responses.some((response) => Boolean(response.data?.guided))) {
        setGuidedCounts(null);
        return;
      }
      setGuidedCounts(Object.fromEntries(responses.map((response, index) => [
        guidedTrainerScopes[index][0],
        response.data?.item_ids?.length || 0,
      ])));
    });
    return () => { active = false; };
  }, [user?.id]);

  const items = useMemo(() => guidedCounts
    ? [assignmentsHome, trainerHome, ...trainerConfig.filter((trainer) => guidedCounts[trainer.id] > 0)]
    : [trainerHome, practiceHome, ...trainerConfig], [guidedCounts]);

  return (
    <div className="rounded-lg border border-ink/10 bg-white/90 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.06]">
      <div className="flex items-center justify-between gap-3">
        <NavLink to="/trainers" end className="focus-ring inline-flex items-center gap-3 rounded-lg px-1 py-1">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-ink text-mint dark:bg-mint dark:text-ink">
            <Brain aria-hidden="true" className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-black leading-tight text-ink dark:text-white">Trainer Suite</span>
            <span className="hidden text-xs font-semibold text-ink/60 dark:text-white/60 sm:block">Ripasso, deck, progressi.</span>
          </span>
        </NavLink>

        <nav className="hidden flex-wrap items-center gap-1 lg:flex" aria-label="Trainer navigation">
          {items.map((item) => (
            <NavLink key={item.id} to={item.route} end={item.route === '/trainers'} className={navClass}>
              {item.id === 'practice' ? <Dumbbell aria-hidden="true" className="mr-1.5 inline h-4 w-4" /> : null}
              {item.id === 'assignments' ? <ClipboardList aria-hidden="true" className="mr-1.5 inline h-4 w-4" /> : null}
              {item.shortTitle}
            </NavLink>
          ))}
        </nav>

        <button type="button" onClick={() => setOpen((value) => !value)} className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white text-ink dark:border-white/20 dark:bg-white/10 dark:text-white lg:hidden" aria-label={open ? 'Chiudi menu trainer' : 'Apri menu trainer'} aria-expanded={open}>
          {open ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <nav className="mt-3 grid gap-2 border-t border-ink/10 pt-3 dark:border-white/10 lg:hidden" aria-label="Trainer navigation mobile">
          {items.map((item) => (
            <NavLink key={item.id} to={item.route} end={item.route === '/trainers'} onClick={() => setOpen(false)} className={({ isActive }) => `focus-ring rounded-lg px-4 py-3 text-sm font-black transition ${isActive ? 'bg-ink text-white dark:bg-mint dark:text-ink' : 'bg-paper text-ink/70 hover:bg-mint/50 hover:text-ink dark:bg-white/[0.06] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white'}`}>
              {item.title}
            </NavLink>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
