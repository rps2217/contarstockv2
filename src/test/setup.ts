/**
 * Vitest Setup File
 * 
 * Configuración global para todos los tests.
 */

import '@testing-library/jest-dom';

// Mock para localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock para window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock para console.error en tests (para evitar ruido)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock para IndexedDB (Dexie)
const indexedDBMock = {
  open: () => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      createObjectStore: () => ({
        createIndex: () => {},
        add: () => {},
        put: () => {},
        get: () => {},
        delete: () => {},
        clear: () => {},
      }),
      transaction: () => ({
        objectStore: () => ({
          get: () => ({
            onsuccess: null,
          }),
        }),
      }),
    },
  }),
};

if (typeof window !== 'undefined') {
  (window as any).indexedDB = indexedDBMock;
}

// Configurar variables de entorno para tests
process.env.NODE_ENV = 'test';
