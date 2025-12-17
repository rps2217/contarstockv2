
import { Product } from '../types';

/**
 * Calculates a relevance score for a product against a search query.
 * Higher score = better match.
 */
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
            // Bonus: Starts with token
            if (nameLower.startsWith(token)) score += 5;
            // Bonus: Word boundary (e.g. "Coca" matches "Coca Cola" better than "Acocados")
            if (nameLower.includes(` ${token}`) || nameLower.startsWith(token)) score += 5;
        } else if (categoryLower.includes(token)) {
            tokensMatched++;
            score += 5;
        }
    }

    // All tokens matched bonus
    if (tokensMatched === queryTokens.length) score += 50;

    // Penalty for very long names vs short query (relevance density)
    score -= (nameLower.length * 0.01);

    return score;
};

/**
 * Perform a fuzzy search on a list of products.
 * @param products The full list (or cached list) of products.
 * @param query The search string.
 * @param limit Max results.
 */
export const fuzzySearchProducts = (products: Product[], query: string, limit: number = 50): Product[] => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return products.slice(0, limit);

    const tokens = cleanQuery.split(/\s+/).filter(t => t.length > 0);
    
    // Filter first (broad match), then sort by score
    // We only keep items that match AT LEAST ONE token to avoid garbage results
    const candidates = products.filter(p => {
        const str = (p.barcode + ' ' + p.name + ' ' + (p.category || '')).toLowerCase();
        return tokens.some(token => str.includes(token));
    });

    return candidates
        .map(p => ({ product: p, score: scoreProduct(p, tokens) }))
        .sort((a, b) => b.score - a.score)
        .map(wrapper => wrapper.product)
        .slice(0, limit);
};
