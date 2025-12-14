
import * as XLSX from 'xlsx';
import { db } from '../db';
import { ExpectedOrder, MatchResult, ConsolidatedItem, AliasSuggestion } from '../types';
import { sanitizeBarcode, generateUUID, normalizeSku } from './utils';

/**
 * Imports an Excel file containing pending orders.
 * It groups rows by the FIRST column (assuming it's the Internal ID).
 */
export const importExpectedOrders = async (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (json.length < 2) throw new Error("El archivo parece estar vacío.");

        const headers = (json[0] as string[]).map(h => String(h).toUpperCase().trim());
        
        // INTELLIGENT COLUMN DETECTION
        let idIndex = headers.findIndex(h => h.includes('TRASPASO') || h.includes('AGRUPADOR') || h.includes('DOC') || h.includes('NUMERO'));
        if (idIndex === -1) idIndex = 0; // Fallback to first column

        const skuIndex = headers.findIndex(h => h.includes('COD') || h.includes('SKU') || h.includes('ITEM') || h.includes('BARRAS') || h.includes('MATERIAL'));
        const descIndex = headers.findIndex(h => h.includes('DESC') || h.includes('NOM') || h.includes('PROD') || h.includes('TEXTO'));
        const qtyIndex = headers.findIndex(h => h.includes('CANT') || h.includes('QTY') || h.includes('UNID') || h.includes('SOLICITADO') || h.includes('PENDIENTE'));

        if (skuIndex === -1 || qtyIndex === -1) {
          throw new Error("No se encontraron columnas de 'CÓDIGO' o 'CANTIDAD' en el Excel. Verifique los encabezados.");
        }

        console.log(`[Importer] Mapped Columns: ID=${idIndex}, SKU=${skuIndex}, QTY=${qtyIndex}`);

        const groups = new Map<string, ExpectedOrder>();

        for (let i = 1; i < json.length; i++) {
          const row = json[i] as any[];
          if (!row || row.length === 0) continue;

          // Robust reading
          const internalId = String(row[idIndex] || 'SIN_ID').trim();
          const rawSku = String(row[skuIndex] || '');
          const barcode = sanitizeBarcode(rawSku);
          const name = String(row[descIndex] || 'Producto Desconocido').trim();
          const qty = Number(row[qtyIndex] || 0);

          if (!internalId || !barcode || qty <= 0) continue;

          if (!groups.has(internalId)) {
            groups.set(internalId, {
              id: generateUUID(),
              internalId,
              items: [],
              totalExpectedUnits: 0,
              totalExpectedSKUs: 0,
              importedAt: Date.now()
            });
          }

          const group = groups.get(internalId)!;
          
          // Check for existing item in group (sum duplicates in Excel)
          const existingItem = group.items.find(item => item.barcode === barcode);
          if (existingItem) {
            existingItem.expectedQty += qty;
          } else {
            group.items.push({ barcode, name, expectedQty: qty });
            group.totalExpectedSKUs++;
          }
          group.totalExpectedUnits += qty;
        }

        await db.expectedOrders.clear();
        await db.expectedOrders.bulkAdd(Array.from(groups.values()));

        resolve(groups.size);

      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

/**
 * OPTIMIZED MATCHING ALGORITHM (FINGERPRINTING & STRUCTURAL)
 * 1. Matches exact/fuzzy SKUs.
 * 2. If SKUs differ, looks for "Structural Matches" (Identical quantities).
 */
export const calculateOrderMatch = (physicalItems: ConsolidatedItem[], order: ExpectedOrder): MatchResult => {
  
  const physicalMap = new Map<string, { qty: number, originalSku: string, name: string }>();
  physicalItems.forEach(i => {
      physicalMap.set(normalizeSku(i.barcode), { qty: i.totalQuantity, originalSku: i.barcode, name: i.productName });
  });

  const expectedMap = new Map<string, { qty: number, name: string, originalSku: string }>();
  order.items.forEach(i => {
      expectedMap.set(normalizeSku(i.barcode), { qty: i.expectedQty, name: i.name, originalSku: i.barcode });
  });

  // --- PHASE 1: DIRECT MATCHING (SKU) ---
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
    
    // Tracking for Phase 2
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

  // --- PHASE 2: STRUCTURAL MATCHING (ALIAS DETECTION) ---
  // If we have items that exist in Physical but not Expected, and vice versa,
  // check if they share the exact same QUANTITY.
  
  const potentialAliases: AliasSuggestion[] = [];
  let structuralMatches = 0;

  // Simple greedy matching by quantity
  for (const physKey of unmatchedPhysical) {
      const pQty = physicalMap.get(physKey)!.qty;
      
      // Find an unmatched expected item with same quantity
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
          // Remove from pool to avoid double matching
          unmatchedExpected.splice(matchIndex, 1);
      }
  }

  // --- PHASE 3: SCORING ---
  
  // Base scores
  const physicalTotalQty = physicalItems.reduce((acc, i) => acc + i.totalQuantity, 0);
  const totalUniqueSKUs = allKeys.size;
  const skuOverlapRatio = totalUniqueSKUs > 0 ? skuMatches / totalUniqueSKUs : 0;
  
  // Quantity Deviation
  const totalDiff = details.reduce((acc, d) => acc + Math.abs(d.difference), 0);
  const maxQty = Math.max(physicalTotalQty, order.totalExpectedUnits);
  const qtyAccuracy = maxQty > 0 ? Math.max(0, 1 - (totalDiff / maxQty)) : 0;

  // STRUCTURAL BONUS:
  // If we found aliases, it means the *quantities* matched perfectly even if the codes didn't.
  // We effectively treat these as "matches" for the score calculation.
  
  // Recalculate diff considering aliases as "resolved" errors
  // Each alias removes 2 errors (1 extra + 1 missing) of the same qty
  const resolvedDiff = potentialAliases.reduce((acc, alias) => acc + (alias.quantity * 2), 0);
  const effectiveDiff = Math.max(0, totalDiff - resolvedDiff);
  const effectiveQtyAccuracy = maxQty > 0 ? Math.max(0, 1 - (effectiveDiff / maxQty)) : 0;

  // Weighted Score
  // 30% SKU Direct Match
  // 70% Quantity Structure (Effective Accuracy)
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

export const findMatches = async (physicalItems: ConsolidatedItem[]): Promise<MatchResult[]> => {
  const expectedOrders = await db.expectedOrders.toArray();
  const results: MatchResult[] = [];

  for (const order of expectedOrders) {
    const result = calculateOrderMatch(physicalItems, order);
    if (result.matchScore > 15) { 
        results.push(result);
    }
  }

  return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
};
