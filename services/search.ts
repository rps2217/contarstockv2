import { Product } from '../types';

// Singleton worker instance to avoid overhead
let searchWorker: Worker | null = null;

// Map to handle multiple simultaneous requests if necessary (though usually sequential in UI)
let currentResolve: ((value: Product[]) => void) | null = null;

const getWorker = () => {
    if (!searchWorker) {
        searchWorker = new Worker(new URL('../workers/search.worker.ts', import.meta.url), { type: 'module' });
        
        searchWorker.onmessage = (e) => {
            if (currentResolve) {
                currentResolve(e.data);
                currentResolve = null;
            }
        };
        
        searchWorker.onerror = (e) => {
            console.error("Search Worker Error:", e);
            if (currentResolve) {
                currentResolve([]); // Fallback to empty on error
                currentResolve = null;
            }
        };
    }
    return searchWorker;
};

/**
 * Perform a fuzzy search on a list of products using a background Web Worker.
 * This prevents UI freeze on large datasets.
 */
export const fuzzySearchProducts = (products: Product[], query: string, limit: number = 50): Promise<Product[]> => {
    return new Promise((resolve) => {
        const worker = getWorker();
        
        // If a request is already pending, we could cancel it or just overwrite the resolver.
        // Overwriting is essentially "debouncing" logic on the receiving end.
        currentResolve = resolve;

        worker.postMessage({
            products, // Note: Structured cloning of large arrays has a cost, but less than freezing main thread logic.
            query,
            limit
        });
    });
};