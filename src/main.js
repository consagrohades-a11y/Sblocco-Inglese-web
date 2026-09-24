import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import LearnerExperienceBoundary from './components/learning/LearnerExperienceBoundary.jsx';
import AppErrorBoundary from './components/AppErrorBoundary.jsx';
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

const chunkRecoveryNoticeId = 'sblocco-version-recovery';

function isDynamicImportFailure(reason) {
  const message = String(reason?.message || reason || '');
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|expected a javascript-or-wasm module script|loading chunk/i.test(message);
}

function showChunkRecoveryNotice() {
  if (typeof document === 'undefined' || document.getElementById(chunkRecoveryNoticeId)) return;

  const notice = document.createElement('div');
  notice.id = chunkRecoveryNoticeId;
  Object.assign(notice.style, {
    position: 'fixed',
    inset: 'auto 1rem 1rem 1rem',
    zIndex: '2147483647',
    maxWidth: '42rem',
    margin: '0 auto',
    padding: '1rem 1.1rem',
    borderRadius: '1rem',
    background: '#fffdf9',
    color: '#142f3f',
    boxShadow: '0 18px 60px rgba(20,47,63,0.18)',
    border: '1px solid rgba(20,47,63,0.12)',
    fontFamily: 'inherit',
  });

  const title = document.createElement('strong');
  title.textContent = 'È disponibile una versione più recente.';
  title.style.display = 'block';
  title.style.fontWeight = '900';

  const copy = document.createElement('span');
  copy.textContent = 'Questa scheda non verrà ricaricata da sola. Aggiorna quando vuoi per continuare con la versione nuova.';
  copy.style.display = 'block';
  copy.style.marginTop = '0.35rem';
  copy.style.fontSize = '0.875rem';
  copy.style.lineHeight = '1.45';

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Aggiorna ora';
  Object.assign(button.style, {
    marginTop: '0.8rem',
    border: '0',
    borderRadius: '999px',
    padding: '0.65rem 1rem',
    background: '#142f3f',
    color: '#ffffff',
    fontWeight: '900',
    cursor: 'pointer',
  });
  button.addEventListener('click', () => window.location.reload());

  notice.append(title, copy, button);
  document.body.appendChild(notice);
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  showChunkRecoveryNotice();
});

window.addEventListener('unhandledrejection', (event) => {
  if (!isDynamicImportFailure(event.reason)) return;
  event.preventDefault();
  showChunkRecoveryNotice();
});

window.addEventListener('error', (event) => {
  if (!isDynamicImportFailure(event.error || event.message)) return;
  showChunkRecoveryNotice();
});

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
          AppErrorBoundary,
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
  ),
);
