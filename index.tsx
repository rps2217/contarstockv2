
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { Buffer } from 'buffer';

// Polyfill global Buffer and process for libraries that rely on it (e.g. Transformers.js, Google GenAI, Long)
if (typeof window !== 'undefined') {
    (window as any).Buffer = Buffer;
    
    // Some libraries (like 'long' used in protobuf) look for 'global'
    if (typeof (window as any).global === 'undefined') {
        (window as any).global = window;
    }
    
    if (typeof (window as any).process === 'undefined') {
        (window as any).process = { env: {} };
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
