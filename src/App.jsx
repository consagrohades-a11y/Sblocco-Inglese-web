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
import ProtectedRoute from './auth/ProtectedRoute';
import AdminRoute from './auth/AdminRoute';
import { legalPages } from './data/legalPages';
import './trainer-overrides.css';

const Trainer = lazy(() => import('./pages/Trainer'));
const GeneralExpressionTrainer = lazy(() => import('./pages/GeneralExpressionTrainer'));
const HospitalityExpressionTrainer = lazy(() => import('./pages/HospitalityExpressionTrainer'));
const WordTrainer = lazy(() => import('./pages/WordTrainer'));
const GrammarHub = lazy(() => import('./pages/GrammarHub'));
const GrammarA1Hub = lazy(() => import('./pages/GrammarA1Hub'));
const GrammarA1Topic = lazy(() => import('./pages/GrammarA1Test'));
const EngineDemo = lazy(() => import('./pages/EngineDemo'));
const DiagnosticPage = lazy(() => import('./pages/DiagnosticPage'));
const A1UnitPage = lazy(() => import('./pages/A1UnitPage'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const UpdatePassword = lazy(() => import('./pages/UpdatePassword'));
const Account = lazy(() => import('./pages/Account'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminLearners = lazy(() => import('./pages/AdminLearners'));
const AdminLearnerDetail = lazy(() => import('./pages/AdminLearnerDetail'));
const AdminCreateAssignment = lazy(() => import('./pages/AdminCreateAssignment'));
const AdminAssignmentContent = lazy(() => import('./pages/AdminAssignmentContent'));
const LearnerAssignments = lazy(() => import('./pages/LearnerAssignments'));
const LearnerAssignmentDetail = lazy(() => import('./pages/LearnerAssignmentDetail'));

function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash;
    const isAuthHash =
      hash.includes('access_token=') ||
      hash.includes('refresh_token=') ||
      hash.includes('error=') ||
      hash.includes('error_code=');

    if (hash && !isAuthHash) {
      const elementId = decodeURIComponent(hash.slice(1));
      const target = document.getElementById(elementId);

      if (target) {
        window.setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
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
      <div className="mx-auto max-w-3xl rounded-lg border border-ink/10 bg-white p-6 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
        <p className="text-sm font-black text-ink dark:text-white">Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-paper text-ink transition-colors duration-300 dark:bg-[#0f1715] dark:text-white">
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
            <Route path="/trainers/hospitality-expression" element={<HospitalityExpressionTrainer />} />
            <Route path="/trainers/word-trainer" element={<WordTrainer />} />
            <Route path="/grammar" element={<GrammarHub />} />
            <Route path="/grammar/a1" element={<GrammarA1Hub />} />
            <Route path="/grammar/a1/:topicId" element={<GrammarA1Topic />} />
            <Route path="/engine-demo" element={<EngineDemo />} />
            <Route path="/diagnostic" element={<DiagnosticPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/assignments" element={<ProtectedRoute><LearnerAssignments /></ProtectedRoute>} />
            <Route path="/assignments/:assignmentId" element={<ProtectedRoute><LearnerAssignmentDetail /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/learners" element={<AdminRoute><AdminLearners /></AdminRoute>} />
            <Route path="/admin/learners/:learnerId" element={<AdminRoute><AdminLearnerDetail /></AdminRoute>} />
            <Route path="/admin/learners/:learnerId/assignments/new" element={<AdminRoute><AdminCreateAssignment /></AdminRoute>} />
            <Route path="/admin/learners/:learnerId/assignments/:assignmentId/content" element={<AdminRoute><AdminAssignmentContent /></AdminRoute>} />
            <Route path="/levels/a1/be-basic-sentences" element={<A1UnitPage key="a1-be-basic-sentences" unitId="be-basic-sentences" />} />
            <Route path="/levels/a1/present-simple-normal-verbs" element={<A1UnitPage key="a1-present-simple-normal-verbs" unitId="present-simple-normal-verbs" />} />
            <Route path="/trainer" element={<Navigate to="/trainers/business-expression" replace />} />
            <Route path="/prenota" element={<Prenota />} />
            <Route path="/privacy" element={<LegalPage page={legalPages.privacy} />} />
            <Route path="/privacy-policy" element={<LegalPage page={legalPages.privacy} />} />
            <Route path="/cookie-policy" element={<LegalPage page={legalPages.cookies} />} />
            <Route path="/termini-e-condizioni" element={<LegalPage page={legalPages.terms} />} />
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
