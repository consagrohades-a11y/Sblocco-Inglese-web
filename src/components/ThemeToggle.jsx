import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export const THEME_CHANGE_EVENT = 'sblocco-theme-change';

function getInitialTheme() {
  if (typeof window === 'undefined') return false;

  const savedTheme = window.localStorage.getItem('sblocco_theme');
  if (savedTheme === 'dark') return true;
  if (savedTheme === 'light') return false;

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export default function ThemeToggle({ mobile = false }) {
  const [darkMode, setDarkMode] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    window.localStorage.setItem('sblocco_theme', darkMode ? 'dark' : 'light');
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { darkMode } }));
  }, [darkMode]);

  useEffect(() => {
    function syncTheme(event) {
      if (typeof event.detail?.darkMode === 'boolean') setDarkMode(event.detail.darkMode);
    }
    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
  }, []);

  return (
    <button
      type="button"
      className={
        mobile
          ? 'focus-ring flex w-full items-center justify-between rounded-lg bg-white/80 px-4 py-3 text-base font-bold text-ink hover:bg-mint/50 dark:bg-white/10 dark:text-white dark:hover:bg-white/15'
          : 'focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-white text-ink shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:border-white/10 dark:bg-white/10 dark:text-white'
      }
      aria-label={darkMode ? 'Attiva modalità chiara' : 'Attiva modalità scura'}
      onClick={() => setDarkMode((value) => !value)}
    >
      {mobile ? <span>{darkMode ? 'Modalità chiara' : 'Modalità scura'}</span> : null}
      {darkMode ? <Sun aria-hidden="true" className="h-5 w-5" /> : <Moon aria-hidden="true" className="h-5 w-5" />}
    </button>
  );
}
