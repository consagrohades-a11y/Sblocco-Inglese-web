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
import BusinessEnglishFlow from './pages/BusinessEnglishFlow';
import Method from './pages/Method';
import Platform from './pages/Platform';
import Assessment from './pages/Assessment';
import AssessmentResult from './pages/AssessmentResult';
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

const Trainer = lazy(() => import('./pages/Trainer'));
const GeneralExpressionTrainer = lazy(() => import('./pages/GeneralExpressionTrainer'));
const HospitalityExpressionTrainer = lazy(() => import('./pages/HospitalityExpressionTrainer'));
const TravelExpressionTrainer = lazy(() => import('./pages/TravelExpressionTrainer'));
const WordTrainer = lazy(() => import('./pages/WordTrainer'));
const PracticeHub = lazy(() => import('./pages/PracticeHub'));
const ExercisePlayer = lazy(() => import('./pages/ExercisePlayer'));
const GrammarHub = lazy(() => import('./pages/GrammarHub'));
const GrammarA1Hub = lazy(() => import('./pages/GrammarA1Hub'));
const GrammarA1Topic = lazy(() => import('./pages/GrammarA1Test'));
const EngineDemo = lazy(() => import('./pages/EngineDemo'));
const A1UnitPage = lazy(() => import('./pages/A1UnitPage'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const UpdatePassword = lazy(() => import('./pages/UpdatePassword'));
const Account = lazy(() => import('./pages/Account'));
const AdminShell = lazy(() => import('./components/AdminShell'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminLearners = lazy(() => import('./pages/AdminLearners'));
const AdminLearnerDetail = lazy(() => import('./pages/AdminLearnerDetail'));
const AdminGroups = lazy(() => import('./pages/AdminGroups'));
const AdminGroupDetail = lazy(() => import('./pages/AdminGroupDetail'));
const AdminAssessmentLeads = lazy(() => import('./pages/AdminAssessmentLeads'));
const AdminCreateAssignment = lazy(() => import('./pages/AdminCreateAssignment'));
const AdminAssignmentContent = lazy(() => import('./pages/AdminAssignmentContent'));
const AdminTrainerContent = lazy(() => import('./pages/AdminTrainerContent'));
const AdminTrainerCardImport = lazy(() => import('./pages/AdminTrainerCardImport'));
const AdminTrainerCardDelete = lazy(() => import('./pages/AdminTrainerCardDelete'));
const AdminTravelTrainer = lazy(() => import('./pages/AdminTravelTrainer'));
const AdminWordTrainerContent = lazy(() => import('./pages/AdminWordTrainerContent'));
const AdminWordTrainerImport = lazy(() => import('./pages/AdminWordTrainerImport'));
const AdminWordDecks = lazy(() => import('./pages/AdminWordDecks'));
const AdminDecks = lazy(() => import('./pages/AdminDecks'));
const AdminWordTrainerArchive = lazy(() => import('./pages/AdminWordTrainerArchive'));
const AdminContentOverview = lazy(() => import('./pages/AdminContentOverview'));
const AdminSectionOverview = lazy(() => import('./pages/AdminSectionOverview'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const AdminLearnerAnalytics = lazy(() => import('./pages/AdminLearnerAnalytics'));
const AdminExerciseBuilder = lazy(() => import('./pages/AdminExerciseBuilder'));
const AdminExerciseBuilderReview = lazy(() => import('./pages/AdminExerciseBuilderReview'));
const AdminExerciseBuilderLibrary = lazy(() => import('./pages/AdminExerciseBuilderLibrary'));
const AdminExerciseDiagnostics = lazy(() => import('./pages/AdminExerciseDiagnostics'));
const AdminExerciseDiagnosticImport = lazy(() => import('./pages/AdminExerciseDiagnosticImport'));
const AdminExerciseQuestionBank = lazy(() => import('./pages/AdminExerciseQuestionBank'));
const AdminExercisePools = lazy(() => import('./pages/AdminExercisePools'));
const AdminExerciseComposer = lazy(() => import('./pages/AdminExerciseComposer'));
const AdminExerciseQuestionEditor = lazy(() => import('./pages/AdminExerciseQuestionEditor'));
const AdminExerciseCollections = lazy(() => import('./pages/AdminExerciseCollections'));
const AdminExerciseResults = lazy(() => import('./pages/AdminExerciseResults'));
const AdminExerciseMaintenance = lazy(() => import('./pages/AdminExerciseMaintenance'));
const LearnerAssignments = lazy(() => import('./pages/LearnerAssignments'));
const LearnerAssignmentDetail = lazy(() => import('./pages/LearnerAssignmentDetail'));
const LearnerCollectionPath = lazy(() => import('./pages/LearnerCollectionPath'));
const LearnerProgress = lazy(() => import('./pages/LearnerProgress'));

function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash;
    const isAuthHash = hash.includes('access_token=') || hash.includes('refresh_token=') || hash.includes('error=') || hash.includes('error_code=');

    if (hash && !isAuthHash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
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
  return <div className="section-shell py-16"><div className="mx-auto max-w-3xl rounded-lg border border-ink/10 bg-white p-6 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.06]"><p className="text-sm font-black text-ink dark:text-white">Loading...</p></div></div>;
}

export default function App() {
  const location = useLocation();
  const isAdmin = location.pathname === '/admin' || location.pathname.startsWith('/admin/');

  return (
    <div className="min-h-screen overflow-x-clip bg-paper text-ink transition-colors duration-300 dark:bg-[#0f1715] dark:text-white">
      <ScrollManager />
      {!isAdmin ? <Navbar /> : null}
      <main className={isAdmin ? '' : 'pb-24 xl:pb-0'}>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/simulazione-39" element={<Simulation />} />
            <Route path="/percorsi" element={<Percorsi />} />
            <Route path="/corsi/business-english-flow" element={<BusinessEnglishFlow />} />
            <Route path="/metodo" element={<Method />} />
            <Route path="/piattaforma" element={<Platform />} />
            <Route path="/assessment" element={<Assessment />} />
            <Route path="/profilo/:token" element={<AssessmentResult />} />
            <Route path="/recensioni" element={<Reviews />} />
            <Route path="/casi-reali" element={<CaseStudies />} />
            <Route path="/case-studies" element={<CaseStudies />} />
            <Route path="/contatti" element={<Contact />} />
            <Route path="/faq" element={<Navigate to="/contatti#faq" replace />} />
            <Route path="/trainers" element={<TrainersLanding />} />
            <Route path="/trainers/business-expression" element={<Trainer />} />
            <Route path="/trainers/general-expression" element={<GeneralExpressionTrainer />} />
            <Route path="/trainers/hospitality-expression" element={<HospitalityExpressionTrainer />} />
            <Route path="/trainers/travel-expression" element={<TravelExpressionTrainer />} />
            <Route path="/trainers/word-trainer" element={<WordTrainer />} />
            <Route path="/practice" element={<ProtectedRoute><PracticeHub /></ProtectedRoute>} />
            <Route path="/exercises" element={<ProtectedRoute><ExercisePlayer /></ProtectedRoute>} />
            <Route path="/collections" element={<ProtectedRoute><LearnerCollectionPath /></ProtectedRoute>} />
            <Route path="/grammar" element={<GrammarHub />} />
            <Route path="/grammar/a1" element={<GrammarA1Hub />} />
            <Route path="/grammar/a1/:topicId" element={<GrammarA1Topic />} />
            <Route path="/engine-demo" element={<EngineDemo />} />
            <Route path="/diagnostic" element={<Navigate to="/assessment" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/assignments" element={<ProtectedRoute><LearnerAssignments /></ProtectedRoute>} />
            <Route path="/assignments/:assignmentId" element={<ProtectedRoute><LearnerAssignmentDetail /></ProtectedRoute>} />
            <Route path="/progressi" element={<ProtectedRoute><LearnerProgress /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminShell /></AdminRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="learners" element={<AdminLearners />} />
              <Route path="learners/:learnerId" element={<AdminLearnerDetail />} />
              <Route path="groups" element={<AdminGroups />} />
              <Route path="groups/:groupId" element={<AdminGroupDetail />} />
              <Route path="leads" element={<AdminAssessmentLeads />} />
              <Route path="learners/:learnerId/assignments/new" element={<AdminCreateAssignment />} />
              <Route path="learners/:learnerId/assignments/:assignmentId/content" element={<AdminAssignmentContent />} />
              <Route path="content" element={<AdminContentOverview />} />
              <Route path="content/exercises" element={<AdminExerciseBuilder />} />
              <Route path="content/exercises/review" element={<AdminExerciseBuilderReview />} />
              <Route path="content/exercises/library" element={<AdminExerciseBuilderLibrary />} />
              <Route path="content/exercises/diagnostics" element={<AdminExerciseDiagnostics />} />
              <Route path="content/exercises/diagnostics/import" element={<AdminExerciseDiagnosticImport />} />
              <Route path="content/exercises/questions" element={<AdminExerciseQuestionBank />} />
              <Route path="content/exercises/questions/edit" element={<AdminExerciseQuestionEditor />} />
              <Route path="content/exercises/pools" element={<AdminExercisePools />} />
              <Route path="content/exercises/composer" element={<AdminExerciseComposer />} />
              <Route path="content/exercises/collections" element={<AdminExerciseCollections />} />
              <Route path="content/exercises/results" element={<AdminExerciseResults />} />
              <Route path="content/exercises/maintenance" element={<AdminExerciseMaintenance />} />
              <Route path="content/words" element={<AdminWordTrainerContent />} />
              <Route path="content/words/import" element={<AdminWordTrainerImport />} />
              <Route path="content/words/decks" element={<AdminWordDecks />} />
              <Route path="content/words/archive" element={<AdminWordTrainerArchive />} />
              <Route path="content/expressions" element={<AdminTrainerContent />} />
              <Route path="content/expressions/import" element={<AdminTrainerCardImport />} />
              <Route path="content/expressions/decks" element={<AdminDecks itemType="expression" domain="general" />} />
              <Route path="content/expressions/archive" element={<AdminTrainerCardDelete />} />
              <Route path="content/business-expressions" element={<AdminTrainerContent domain="business" />} />
              <Route path="content/business-expressions/import" element={<AdminTrainerCardImport domain="business" />} />
              <Route path="content/business-expressions/decks" element={<AdminDecks itemType="expression" domain="business" />} />
              <Route path="content/business-expressions/archive" element={<AdminTrainerCardDelete domain="business" />} />
              <Route path="content/hospitality-expressions" element={<AdminTrainerContent domain="hospitality" />} />
              <Route path="content/hospitality-expressions/import" element={<AdminTrainerCardImport domain="hospitality" />} />
              <Route path="content/hospitality-expressions/decks" element={<AdminDecks itemType="expression" domain="hospitality" />} />
              <Route path="content/hospitality-expressions/archive" element={<AdminTrainerCardDelete domain="hospitality" />} />
              <Route path="content/travel-expressions" element={<AdminTravelTrainer />} />
              <Route path="assignments" element={<AdminSectionOverview section="assignments" />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="analytics/learners/:learnerId" element={<AdminLearnerAnalytics />} />
              <Route path="settings" element={<AdminSectionOverview section="settings" />} />
              <Route path="content/trainers" element={<Navigate to="/admin/content/expressions" replace />} />
              <Route path="content/trainers/import" element={<Navigate to="/admin/content/expressions/import" replace />} />
              <Route path="content/trainers/delete" element={<Navigate to="/admin/content/expressions/archive" replace />} />
            </Route>
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
      {!isAdmin ? <Footer /> : null}
      {!isAdmin ? <StickyMobileCTA /> : null}
      {!isAdmin ? <BackToTopButton /> : null}
    </div>
  );
}
