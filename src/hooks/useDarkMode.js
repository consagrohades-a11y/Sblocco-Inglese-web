import { useEffect, useState } from 'react';

function readDarkMode() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

export default function useDarkMode() {
  const [darkMode, setDarkMode] = useState(readDarkMode);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setDarkMode(root.classList.contains('dark'));
    const observer = new MutationObserver(syncTheme);

    syncTheme();
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  return darkMode;
}
