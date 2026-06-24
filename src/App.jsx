import React from 'react';
import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import StickyMobileCTA from './components/StickyMobileCTA';
import BackToTopButton from './components/BackToTopButton';
import Home from './pages/Home';
import Simulation from './pages/Simulation';
import Percorsi from './pages/Percorsi';
import Reviews from './pages/Reviews';
import CaseStudies from './pages/CaseStudies';
import Contact from './pages/Contact';
import Prenota from './pages/Prenota';
import TrainersLanding from './pages/TrainersLanding';
import LegalPage from './pages/LegalPage';
import NotFound from './pages/NotFound';
import { legalPages } from './data/legalPages';
import './trainer-overrides.css';

const Trainer = lazy(() => import('./pages/Trainer'));
const GeneralExpressionTrainer = lazy(() => import('./pages/GeneralExpressionTrainer'));
const WordTrainer = lazy(() => import('./pages/WordTrainer'));

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

function PageFallback() {
  return (
    <div className="section-shell py-16">
      <div className="mx-auto max-w-3xl rounded-lg border border-ink/10 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-black text-ink">Loading trainer...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen overflow-x-hidden text-ink">
      <ScrollManager />
      <Navbar />
      <main className="pb-24 xl:pb-0">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/simulazione-39" element={<Simulation />} />
            <Route path="/percorsi" element={<Percorsi />} />
            <Route path="/recensioni" element={<Reviews />} />
            <Route path="/casi-reali" element={<CaseStudies />} />
            <Route path="/case-studies" element={<CaseStudies />} />
            <Route path="/contatti" element={<Contact />} />
            <Route path="/faq" element={<Navigate to="/contatti#faq" replace />} />
            <Route path="/trainers" element={<TrainersLanding />} />
            <Route path="/trainers/business-expression" element={<Trainer />} />
            <Route path="/trainers/general-expression" element={<GeneralExpressionTrainer />} />
            <Route path="/trainers/word-trainer" element={<WordTrainer />} />
            <Route path="/trainer" element={<Navigate to="/trainers/business-expression" replace />} />
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
        </Suspense>
      </main>
      <Footer />
      <StickyMobileCTA />
      <BackToTopButton />
    </div>
  );
}
