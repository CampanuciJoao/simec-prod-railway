import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { AlertasProvider } from '@/contexts/AlertasContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

import App from '@/App';

// Fontes self-hosted via @fontsource-variable. Eliminou dependencia
// do Google Fonts CDN — quando a CDN falhava (rede instavel, firewall
// corporativo, ad-blocker), valores numericos caiam pra Courier do
// sistema e o UI ficava desconfigurado.
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';

import '@/index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AlertasProvider>
              <App />
            </AlertasProvider>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);