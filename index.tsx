
import React from 'react';
import { createRoot } from 'react-dom/client';

/**
 * BLINDAJE DE GLOBALES v5.2
 * Inyectamos Buffer y Long desde esm.sh directamente para evitar errores 
 * de resolución de módulos en el empaquetador (Vite/Rollup).
 */
import { Buffer } from 'https://esm.sh/buffer@6.0.3';
import Long from 'https://esm.sh/long@5.2.3';

if (typeof window !== 'undefined') {
    (window as any).Buffer = Buffer;
    (window as any).Long = Long;
    (window as any).global = window;
    (window as any).globalThis.Buffer = Buffer;
    (window as any).globalThis.Long = Long;
    
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

// Importar App DESPUÉS de establecer los polyfills
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
