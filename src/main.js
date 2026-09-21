import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import LearnerExperienceBoundary from './components/learning/LearnerExperienceBoundary.jsx';
import { installDownloadCompatibility } from './lib/downloadCompatibility.js';
import { validateSupabaseConfig } from './lib/supabaseConfig.js';
import './index.css';
import './styles/learnerEditorial.css';
import './styles/editorialLearning.css';
import './styles/learnerExperience.css';
import './styles/exerciseExperience.css';
import './styles/exerciseShellRefinement.css';
import './styles/educationalContentResilience.css';
import './styles/downloadCompatibility.css';
import './styles/question-editor-layout.css';

installDownloadCompatibility();
validateSupabaseConfig(import.meta.env);

const chunkRecoveryKey = 'sblocco_chunk_recovery_once';

function recoverFromStaleChunk() {
  if (typeof window === 'undefined') return;

  try {
    if (window.sessionStorage.getItem(chunkRecoveryKey) === '1') return;
    window.sessionStorage.setItem(chunkRecoveryKey, '1');
  } catch {
    // Continue with the reload even if sessionStorage is unavailable.
  }

  window.location.reload();
}

function isDynamicImportFailure(reason) {
  const message = String(reason?.message || reason || '');
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|expected a javascript-or-wasm module script/i.test(message);
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  recoverFromStaleChunk();
});

window.addEventListener('unhandledrejection', (event) => {
  if (!isDynamicImportFailure(event.reason)) return;
  event.preventDefault();
  recoverFromStaleChunk();
});

window.setTimeout(() => {
  try {
    window.sessionStorage.removeItem(chunkRecoveryKey);
  } catch {
    // No action needed.
  }
}, 30000);

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(
      BrowserRouter,
      null,
      React.createElement(
        AuthProvider,
        null,
        React.createElement(
          React.Fragment,
          null,
          React.createElement(LearnerExperienceBoundary),
          React.createElement(App),
        ),
      ),
    ),
  ),
);
