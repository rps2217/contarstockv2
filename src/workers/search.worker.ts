import { Product } from '../types';

// --- SEARCH LOGIC (Moved from services/search.ts) ---

const scoreProduct = (product: Product, queryTokens: string[]): number => {
 let score = 0;
 const nameLower = product.name.toLowerCase();
 const barcodeLower = product.barcode.toLowerCase();
 const categoryLower = (product.category || '').toLowerCase();

 // 1. Critical Match: Barcode Exact
 if (barcodeLower === queryTokens[0]) return 1000;
 // 1b. Barcode Partial (High priority)
 if (barcodeLower.includes(queryTokens[0])) score += 500;

 // 2. Token Matching (Name)
 let tokensMatched = 0;
 for (const token of queryTokens) {
 if (nameLower.includes(token)) {
 tokensMatched++;
 score += 10;
 if (nameLower.startsWith(token)) score += 5;
 if (nameLower.includes(` ${token}`) || nameLower.startsWith(token)) score += 5;
 } else if (categoryLower.includes(token)) {
 tokensMatched++;
 score += 5;
 }
 }

 if (tokensMatched === queryTokens.length) score += 50;
 score -= (nameLower.length * 0.01);

 return score;
};

// --- WORKER HANDLER ---

self.onmessage = (e: MessageEvent) => {
 const { products, query, limit } = e.data;

 if (!products || !query) {
 self.postMessage([]);
 return;
 }

 const cleanQuery = query.trim().toLowerCase();
 if (!cleanQuery) {
 self.postMessage(products.slice(0, limit || 50));
 return;
 }

 const tokens = cleanQuery.split(/\s+/).filter((t: string) => t.length > 0);
 
 // Filter first (broad match) then sort
 const results = products
 .filter((p: Product) => {
 const str = (p.barcode + ' ' + p.name + ' ' + (p.category || '')).toLowerCase();
 return tokens.some((token: string) => str.includes(token));
 })
 .map((p: Product) => ({ product: p, score: scoreProduct(p, tokens) }))
 .sort((a: any, b: any) => b.score - a.score)
 .map((wrapper: any) => wrapper.product)
 .slice(0, limit || 50);

 self.postMessage(results);
};
// Forced GitHub sync
