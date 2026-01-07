import { Product } from '../types';

let searchWorker: Worker | null = null;
let workerFailed = false;
let currentResolve: ((value: Product[]) => void) | null = null;

const scoreProduct = (product: Product, queryTokens: string[]): number => {
    let score = 0;
    const nameLower = product.name.toLowerCase();
    const barcodeLower = product.barcode.toLowerCase();
    if (barcodeLower === queryTokens[0]) return 1000;
    if (barcodeLower.includes(queryTokens[0])) score += 500;
    let tokensMatched = 0;
    for (const token of queryTokens) {
        if (nameLower.includes(token)) {
            tokensMatched++;
            score += 10;
        }
    }
    return score;
};

const syncSearch = (products: Product[], query: string, limit: number): Product[] => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return products.slice(0, limit);
    const tokens = cleanQuery.split(/\s+/);
    return products
        .filter(p => (p.barcode + ' ' + p.name).toLowerCase().includes(tokens[0]))
        .map(p => ({ product: p, score: scoreProduct(p, tokens) }))
        .sort((a, b) => b.score - a.score)
        .map(w => w.product)
        .slice(0, limit);
};

const getWorker = () => {
    if (workerFailed) return null;
    if (!searchWorker) {
        try {
            searchWorker = new Worker(new URL('../workers/search.worker.ts', import.meta.url), { type: 'module' });
            searchWorker.onmessage = (e) => {
                if (currentResolve) {
                    currentResolve(e.data);
                    currentResolve = null;
                }
            };
            searchWorker.onerror = () => {
                console.warn("Search worker failed, using main thread");
                workerFailed = true;
                searchWorker = null;
            };
        } catch (e) {
            workerFailed = true;
            return null;
        }
    }
    return searchWorker;
};

export const fuzzySearchProducts = (products: Product[], query: string, limit: number = 50): Promise<Product[]> => {
    return new Promise((resolve) => {
        const worker = getWorker();
        if (!worker) {
            resolve(syncSearch(products, query, limit));
            return;
        }
        currentResolve = resolve;
        worker.postMessage({ products, query, limit });
    });
};