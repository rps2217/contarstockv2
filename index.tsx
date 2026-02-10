
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { Buffer } from 'buffer';
// @ts-ignore - Long is used by protobufs in some GenAI/Transformer versions
import Long from 'long';

// Polyfill global Buffer, Long, and process for libraries that rely on it
if (typeof window !== 'undefined') {
    (window as any).Buffer = Buffer;
    (window as any).Long = Long;
    
    // Some libraries look for 'global'
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
