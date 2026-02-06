
import { ExpectedOrder, ConsolidatedItem, MatchResult, AliasSuggestion, Product } from '../types';

/**
 * Similitud de Coseno: Matemática local para comparar significado sin internet.
 */
const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    if (!vecA || !vecB || vecA.length === 0 || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return isNaN(similarity) ? 0 : similarity;
};

const calculateOrderMatch = (physicalItems: ConsolidatedItem[], order: ExpectedOrder): MatchResult => {
    const details = [];
    const potentialAliases: AliasSuggestion[] = [];
    let exactMatches = 0;
    let semanticMatches = 0;

    const unmatchedPhysical = [...physicalItems.filter(i => i.totalQuantity > 0)];
    const unmatchedExpected = [...order.items];

    // FASE 1: MATCH POR CÓDIGO EXACTO
    for (let i = unmatchedPhysical.length - 1; i >= 0; i--) {
        const phys = unmatchedPhysical[i];
        const expIdx = unmatchedExpected.findIndex(e => e.barcode === phys.barcode);
        if (expIdx !== -1) {
            const exp = unmatchedExpected[expIdx];
            exactMatches++;
            details.push({
                barcode: phys.barcode,
                name: exp.name,
                physicalQty: phys.totalQuantity,
                expectedQty: exp.expectedQty,
                difference: phys.totalQuantity - exp.expectedQty
            });
            unmatchedPhysical.splice(i, 1);
            unmatchedExpected.splice(expIdx, 1);
        }
    }

    // FASE 2: MATCH POR CEREBRO SEMÁNTICO
    const SIMILARITY_THRESHOLD = 0.88;
    for (let i = unmatchedPhysical.length - 1; i >= 0; i--) {
        const phys = unmatchedPhysical[i];
        if (!phys.embedding) continue;
        let bestScore = SIMILARITY_THRESHOLD;
        let bestMatchIdx = -1;
        unmatchedExpected.forEach((exp, idx) => {
            if (exp.embedding) {
                const score = cosineSimilarity(phys.embedding!, exp.embedding);
                if (score > bestScore) {
                    bestScore = score;
                    bestMatchIdx = idx;
                }
            }
        });
        if (bestMatchIdx !== -1) {
            const exp = unmatchedExpected[bestMatchIdx];
            semanticMatches++;
            details.push({
                barcode: phys.barcode,
                name: `${exp.name} (Vínculo IA)`,
                physicalQty: phys.totalQuantity,
                expectedQty: exp.expectedQty,
                difference: phys.totalQuantity - exp.expectedQty,
                isSemanticMatch: true
            });
            potentialAliases.push({
                physicalBarcode: phys.barcode,
                physicalName: phys.productName,
                expectedBarcode: exp.barcode,
                expectedName: exp.name,
                quantity: phys.totalQuantity,
                confidence: bestScore * 100
            });
            unmatchedPhysical.splice(i, 1);
            unmatchedExpected.splice(bestMatchIdx, 1);
        }
    }

    unmatchedPhysical.forEach(p => details.push({ barcode: p.barcode, name: p.productName, physicalQty: p.totalQuantity, expectedQty: 0, difference: p.totalQuantity }));
    unmatchedExpected.forEach(e => details.push({ barcode: e.barcode, name: e.name, physicalQty: 0, expectedQty: e.expectedQty, difference: -e.expectedQty }));

    const totalExpectedSKUs = order.totalExpectedSKUs || 1;
    const matchScore = ((exactMatches * 1.0 + semanticMatches * 0.85) / totalExpectedSKUs) * 100;

    return {
        expectedOrder: order,
        matchScore: Math.min(100, matchScore),
        semanticAffinities: semanticMatches,
        status: matchScore > 98 ? 'exact' : (matchScore > 50 ? 'partial' : 'mismatch'),
        details: details.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference)),
        potentialAliases
    };
};

// --- NUEVA LÓGICA DE RADAR SEMÁNTICO ---
const findSemanticNeighbors = (targetEmbedding: number[], catalog: Product[], limit = 3) => {
    return catalog
        .filter(p => p.embedding)
        .map(p => ({
            ...p,
            score: cosineSimilarity(targetEmbedding, p.embedding!)
        }))
        .filter(p => p.score > 0.70) // Sensibilidad del radar
        .sort((a, b) => b.score - a.score)
        .slice(1, limit + 1); // Excluir al mismo producto
};

self.onmessage = (e: MessageEvent) => {
    const { action, physicalItems, expectedOrders, targetEmbedding, catalog } = e.data;

    try {
        if (action === 'GET_SEMANTIC_NEIGHBORS' && targetEmbedding && catalog) {
            const neighbors = findSemanticNeighbors(targetEmbedding, catalog);
            self.postMessage({ success: true, action, neighbors });
            return;
        }

        if (!physicalItems || !expectedOrders) return;
        const results = expectedOrders
            .map((order: ExpectedOrder) => calculateOrderMatch(physicalItems, order))
            .filter((r: MatchResult) => r.matchScore > 15)
            .sort((a: MatchResult, b: MatchResult) => b.matchScore - a.matchScore)
            .slice(0, 8);
        
        self.postMessage({ success: true, results });
    } catch (err: any) {
        self.postMessage({ success: false, error: err.message });
    }
};
