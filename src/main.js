import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import { installDownloadCompatibility } from './lib/downloadCompatibility.js';
import { validateSupabaseConfig } from './lib/supabaseConfig.js';
import './index.css';
import './styles/downloadCompatibility.css';

installDownloadCompatibility();
validateSupabaseConfig(import.meta.env);

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
        React.createElement(App),
      ),
    ),
  ),
);
