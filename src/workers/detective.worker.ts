
import { ExpectedOrder, ConsolidatedItem, MatchResult, AliasSuggestion } from '../types';

/**
 * MOTOR DE CÁLCULO NEURAL OFFLINE (Vector Math)
 * Compara dos vectores de 384 dimensiones para determinar afinidad semántica.
 */
const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    if (!vecA || !vecB || vecA.length === 0 || vecA.length !== vecB.length) return 0;
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return isNaN(similarity) ? 0 : similarity;
};

const calculateOrderMatch = (physicalItems: ConsolidatedItem[], order: ExpectedOrder): MatchResult => {
    const details: any[] = [];
    const potentialAliases: AliasSuggestion[] = [];
    let exactMatches = 0;
    let semanticMatches = 0;

    const unmatchedPhysical = [...physicalItems.filter(i => i.totalQuantity > 0)];
    const unmatchedExpected = [...order.items];

    // FASE 1: MATCH POR IDENTIDAD TÉCNICA (SKU)
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
                difference: phys.totalQuantity - exp.expectedQty,
                isSemanticMatch: false
            });
            unmatchedPhysical.splice(i, 1);
            unmatchedExpected.splice(expIdx, 1);
        }
    }

    // FASE 2: DEDUCCIÓN SEMÁNTICA (IA Offline)
    // Umbral de confianza industrial: 0.82
    const SIMILARITY_THRESHOLD = 0.82;
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
                name: `${exp.name} (IA-LINK)`,
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

    // FASE 3: CONSOLIDACIÓN DE DISCREPANCIAS
    unmatchedPhysical.forEach(p => details.push({ barcode: p.barcode, name: p.productName, physicalQty: p.totalQuantity, expectedQty: 0, difference: p.totalQuantity }));
    unmatchedExpected.forEach(e => details.push({ barcode: e.barcode, name: e.name, physicalQty: 0, expectedQty: e.expectedQty, difference: -e.expectedQty }));

    const totalExpectedSKUs = order.totalExpectedSKUs || 1;
    // La IA puntúa un 15% menos que el código exacto para incentivar la corrección de etiquetas
    const matchScore = ((exactMatches * 1.0 + semanticMatches * 0.85) / totalExpectedSKUs) * 100;

    return {
        expectedOrder: order,
        matchScore: Math.min(100, matchScore),
        semanticAffinities: semanticMatches,
        status: matchScore > 95 ? 'exact' : (matchScore > 40 ? 'partial' : 'mismatch'),
        details: details.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference)),
        potentialAliases
    };
};

self.onmessage = (e: MessageEvent) => {
    const { physicalItems, expectedOrders } = e.data;
    if (!physicalItems || !expectedOrders) return;

    try {
        const results = expectedOrders
            .map((order: ExpectedOrder) => calculateOrderMatch(physicalItems, order))
            .filter((r: MatchResult) => r.matchScore > 10)
            .sort((a: MatchResult, b: MatchResult) => b.matchScore - a.matchScore)
            .slice(0, 10);
        
        self.postMessage({ success: true, results });
    } catch (err: any) {
        self.postMessage({ success: false, error: err.message });
    }
};
