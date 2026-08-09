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
        title="Sblocco Inglese | L’inglese costruito intorno a ciò che vuoi fare"
        description="Un percorso di inglese pratico costruito sui tuoi obiettivi, con metodo, pratica guidata e situazioni reali."
      />
      <HomeHero />
      <GoalQuickSelector />
      <ExamplePathway />
      <HomeMethod />
      <HomeFinalCTA />
    </div>
  );
}
