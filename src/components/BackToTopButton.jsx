import React from 'react';
import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 520);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Torna all'inizio della pagina"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`focus-ring fixed bottom-24 right-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-white text-ink shadow-soft transition duration-200 hover:-translate-y-0.5 hover:bg-mint xl:bottom-6 xl:right-6 ${
        visible ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <ArrowUp aria-hidden="true" className="h-5 w-5" />
    </button>
  );
}
