import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Polyfill global Buffer, Long, and process for libraries that rely on it
// Usamos import() dinámico o asumiendo que el importmap ya los cargó si es necesario, 
// pero aquí los forzamos para las librerías que buscan en el scope global.
import { Buffer } from 'buffer';
import Long from 'long';

if (typeof window !== 'undefined') {
    (window as any).Buffer = Buffer;
    (window as any).Long = Long;
    
    if (typeof (window as any).global === 'undefined') {
        (window as any).global = window;
    }
    
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