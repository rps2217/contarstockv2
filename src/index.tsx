import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

/**
 * BLINDAJE DE GLOBALES v5.3
 * Utilizamos las dependencias instaladas localmente y gestionadas por Vite.
 */
import { Buffer } from 'buffer';
import Long from 'long';

if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
  (window as any).Long = Long;
  (window as any).global = window;
  (window as any).globalThis.Buffer = Buffer;
  (window as any).globalThis.Long = Long;

  if (typeof (window as any).process === 'undefined') {
    (window as any).process = {
      env: { NODE_ENV: 'production' },
      nextTick: (fn: () => void) => setTimeout(fn, 0),
      browser: true,
      version: '',
      argv: [],
    };
  }

  // === APLICAR TEMA APPSTEAM DARK ===
  document.body.classList.add('appsheet-dark');
}

// Importar App DESPUÉS de establecer los polyfills
import App from './App';

// ============================================================================
// MONITORING - Sentry + Web Vitals
// ============================================================================
import { initSentry, initWebVitals } from './services/monitoring';

// Inicializar solo en producción
if (import.meta.env.PROD) {
  initSentry().catch(console.error);
  initWebVitals().catch(console.error);
}

/**
 * SUPRESIÓN DE ADVERTENCIAS DE LIBRERÍAS (RECHARTS)
 * Recharts utiliza defaultProps en componentes funcionales, lo cual está deprecado en React 18.3+.
 * Esta advertencia será eliminada en futuras versiones de la librería.
 */
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Support for defaultProps will be removed from function components')
  ) {
    return;
  }
  originalWarn(...args);
};

const container = document.getElementById('root');
if (!container) {
  throw new Error('No se encontró el elemento root');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
