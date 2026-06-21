import React from 'react';
import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import StickyMobileCTA from './components/StickyMobileCTA';
import Home from './pages/Home';
import Simulation from './pages/Simulation';
import Percorsi from './pages/Percorsi';
import Reviews from './pages/Reviews';
import CaseStudies from './pages/CaseStudies';
import FAQ from './pages/FAQ';
import Prenota from './pages/Prenota';
import LegalPage from './pages/LegalPage';
import NotFound from './pages/NotFound';
import { legalPages } from './data/legalPages';

function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) {
        window.setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname, location.hash]);

  return null;
}

export default function App() {
  return (
    <div className="min-h-screen overflow-x-hidden text-ink">
      <ScrollManager />
      <Navbar />
      <main className="pb-24 xl:pb-0">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/simulazione-39" element={<Simulation />} />
          <Route path="/percorsi" element={<Percorsi />} />
          <Route path="/recensioni" element={<Reviews />} />
          <Route path="/casi-reali" element={<CaseStudies />} />
          <Route path="/case-studies" element={<CaseStudies />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/prenota" element={<Prenota />} />
          <Route
            path="/privacy"
            element={<LegalPage page={legalPages.privacy} />}
          />
          <Route
            path="/privacy-policy"
            element={<LegalPage page={legalPages.privacy} />}
          />
          <Route
            path="/cookie-policy"
            element={<LegalPage page={legalPages.cookies} />}
          />
          <Route
            path="/termini-e-condizioni"
            element={<LegalPage page={legalPages.terms} />}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <StickyMobileCTA />
    </div>
  );
}
