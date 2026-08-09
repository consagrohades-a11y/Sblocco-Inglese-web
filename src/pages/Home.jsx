import React from 'react';
import ExamplePathway from '../components/home/ExamplePathway';
import GoalQuickSelector from '../components/home/GoalQuickSelector';
import HomeFinalCTA from '../components/home/HomeFinalCTA';
import HomeHero from '../components/home/HomeHero';
import HomeMethod from '../components/home/HomeMethod';
import SEO from '../components/SEO';
import '../styles/homepage.css';

export default function Home() {
  return (
    <div className="home-editorial">
      <SEO
        title="Sblocco Inglese | L’inglese costruito intorno a ciò che vuoi fare"
        description="Un percorso di inglese pratico costruito sui tuoi obiettivi, con metodo, pratica guidata e situazioni reali."
      />
      <HomeHero />
      <GoalQuickSelector />
      <HomeMethod />
      <ExamplePathway />
      <HomeFinalCTA />
    </div>
  );
}
