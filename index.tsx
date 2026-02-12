import React from 'react';
import { createRoot } from 'react-dom/client';

// 1. INYECCIÓN DE POLYFILLS EN CALIENTE
// Usamos imports directos de la CDN para evitar cualquier retraso en el importmap
import { Buffer } from 'https://esm.sh/buffer@6.0.3';
import Long from 'https://esm.sh/long@5.2.3';

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

// 2. CARGA DIFERIDA DE LA APP
// Importamos App después de que los globals están establecidos
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