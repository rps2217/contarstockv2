import React from 'react';
import { createRoot } from 'react-dom/client';

// 1. INYECCIÓN DE POLYFILLS USANDO EL IMPORTMAP
// Esto resuelve los errores "module not found" al usar los alias definidos en index.html
import { Buffer } from 'buffer';
import Long from 'long';

if (typeof window !== 'undefined') {
    (window as any).Buffer = Buffer;
    (window as any).Long = Long;
    (window as any).global = window;
    (window as any).globalThis.Buffer = Buffer;
    
    if (typeof (window as any).process === 'undefined') {
        (window as any).process = { 
            env: { NODE_ENV: 'production' },
            nextTick: (fn: Function) => setTimeout(fn, 0),
            browser: true,
            version: '',
            argv: []
        };
    }
}

// 2. CARGA DE LA APLICACIÓN
import App from './App.tsx';

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