import React, { useLayoutEffect } from 'react';
import ExamplePathway from '../components/home/ExamplePathway';
import GoalQuickSelector from '../components/home/GoalQuickSelector';
import HomeFinalCTA from '../components/home/HomeFinalCTA';
import HomeHero from '../components/home/HomeHero';
import HomeMethod from '../components/home/HomeMethod';
import SEO from '../components/SEO';
import '../styles/homepage.css';

export default function Home() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');

    return () => {
      const savedTheme = window.localStorage.getItem('sblocco_theme');
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
      if (savedTheme === 'dark' || (savedTheme !== 'light' && prefersDark)) {
        root.classList.add('dark');
      }
    };
  }, []);

  return (
    <div className="home-editorial">
      <SEO
        title="Sblocco Inglese | Impara l’inglese partendo da ciò che vuoi farci"
        description="Sblocco parte da ciò che vuoi riuscire a fare e costruisce da lì la lingua e la pratica che ti servono per arrivarci."
      />
      <HomeHero />
      <GoalQuickSelector />
      <ExamplePathway />
      <HomeMethod />
      <HomeFinalCTA />
    </div>
  );
}
