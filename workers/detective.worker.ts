
import { ExpectedOrder, ConsolidatedItem, MatchResult, AliasSuggestion } from '../types';
import { normalizeSku } from '../services/utils';

// --- DUPLICATED UTILS FOR WORKER ISOLATION ---
// We duplicate simple utils to avoid complex import chains in some bundlers
const normalizeForWorker = (sku: string): string => {
    if (!sku) return "";
    const clean = sku.replace(/[^a-zA-Z0-9]/g, "");
    return clean.replace(/^0+/, "");
};

// --- CORE LOGIC (Moved from matcher.ts) ---

const calculateOrderMatch = (physicalItems: ConsolidatedItem[], order: ExpectedOrder): MatchResult => {
  const physicalMap = new Map<string, { qty: number, originalSku: string, name: string }>();
  physicalItems.forEach(i => {
      physicalMap.set(normalizeForWorker(i.barcode), { qty: i.totalQuantity, originalSku: i.barcode, name: i.productName });
  });

  const expectedMap = new Map<string, { qty: number, name: string, originalSku: string }>();
  order.items.forEach(i => {
      expectedMap.set(normalizeForWorker(i.barcode), { qty: i.expectedQty, name: i.name, originalSku: i.barcode });
  });

  // PHASE 1: DIRECT MATCHING
  const allKeys = new Set([...physicalMap.keys(), ...expectedMap.keys()]);
  const details = [];
  
  let skuMatches = 0;
  const unmatchedPhysical: string[] = [];
  const unmatchedExpected: string[] = [];

  for (const key of allKeys) {
    const physData = physicalMap.get(key);
    const expData = expectedMap.get(key);

    const physicalQty = physData?.qty || 0;
    const expectedQty = expData?.qty || 0;
    
    if (physicalQty > 0 && expectedQty === 0) unmatchedPhysical.push(key);
    if (expectedQty > 0 && physicalQty === 0) unmatchedExpected.push(key);

    const displaySku = expData?.originalSku || physData?.originalSku || key;
    const name = expData?.name || physData?.name || 'Producto Desconocido';
    const diff = physicalQty - expectedQty;

    if (physicalQty > 0 && expectedQty > 0) {
      skuMatches++;
    }

    details.push({
      barcode: displaySku,
      name,
      physicalQty,
      expectedQty,
      difference: diff
    });
  }

  // PHASE 2: ALIAS DETECTION (Structural Matching)
  const potentialAliases: AliasSuggestion[] = [];
  let structuralMatches = 0;

  for (const physKey of unmatchedPhysical) {
      const pQty = physicalMap.get(physKey)!.qty;
      // Greedy match by quantity
      const matchIndex = unmatchedExpected.findIndex(expKey => expectedMap.get(expKey)!.qty === pQty);
      
      if (matchIndex !== -1) {
          const expKey = unmatchedExpected[matchIndex];
          const expData = expectedMap.get(expKey)!;
          const physData = physicalMap.get(physKey)!;

          potentialAliases.push({
              physicalBarcode: physData.originalSku,
              physicalName: physData.name,
              expectedBarcode: expData.originalSku,
              expectedName: expData.name,
              quantity: pQty
          });

          structuralMatches++;
          unmatchedExpected.splice(matchIndex, 1);
      }
  }

  // PHASE 3: SCORING
  const physicalTotalQty = physicalItems.reduce((acc, i) => acc + i.totalQuantity, 0);
  const totalUniqueSKUs = allKeys.size;
  const skuOverlapRatio = totalUniqueSKUs > 0 ? skuMatches / totalUniqueSKUs : 0;
  
  const totalDiff = details.reduce((acc, d) => acc + Math.abs(d.difference), 0);
  const maxQty = Math.max(physicalTotalQty, order.totalExpectedUnits);
  
  const resolvedDiff = potentialAliases.reduce((acc, alias) => acc + (alias.quantity * 2), 0);
  const effectiveDiff = Math.max(0, totalDiff - resolvedDiff);
  const effectiveQtyAccuracy = maxQty > 0 ? Math.max(0, 1 - (effectiveDiff / maxQty)) : 0;

  const matchScore = ((skuOverlapRatio * 30) + (effectiveQtyAccuracy * 70)) * 100;

  let status: 'exact' | 'partial' | 'mismatch' = 'mismatch';
  if (matchScore > 98) status = 'exact';
  else if (matchScore > 50) status = 'partial';

  return {
      expectedOrder: order,
      matchScore,
      status,
      details: details.sort((a, b) => a.difference - b.difference),
      potentialAliases
  };
};

// --- WORKER EVENT LISTENER ---

self.onmessage = (e: MessageEvent) => {
    const { physicalItems, expectedOrders } = e.data;
    
    if (!physicalItems || !expectedOrders) {
        self.postMessage({ error: 'Datos incompletos para el análisis.' });
        return;
    }

    try {
        const results: MatchResult[] = [];
        
        // Process all orders
        for (const order of expectedOrders) {
            const result = calculateOrderMatch(physicalItems, order);
            // Threshold to reduce noise
            if (result.matchScore > 15) { 
                results.push(result);
            }
        }

        // Sort best matches first
        const sorted = results.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
        
        self.postMessage({ success: true, results: sorted });
    } catch (err: any) {
        self.postMessage({ error: err.message });
    }
};
