
import * as XLSX from 'xlsx';
import { db } from '../db';
import { ExpectedOrder, MatchResult, ConsolidatedItem } from '../types';
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
        // Priority: "TRASPASO" -> "AGRUPADOR" -> "ID" -> First Column
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
 * OPTIMIZED MATCHING ALGORITHM (FINGERPRINTING)
 * Calculates match based on content intersection.
 * Handles "Fuzzy SKU" matching (ignores leading zeros).
 */
export const calculateOrderMatch = (physicalItems: ConsolidatedItem[], order: ExpectedOrder): MatchResult => {
  
  // 1. Build Physical Map (Key = Normalized SKU)
  const physicalMap = new Map<string, { qty: number, originalSku: string }>();
  physicalItems.forEach(i => {
      physicalMap.set(normalizeSku(i.barcode), { qty: i.totalQuantity, originalSku: i.barcode });
  });

  // 2. Build Expected Map (Key = Normalized SKU)
  const expectedMap = new Map<string, { qty: number, name: string, originalSku: string }>();
  order.items.forEach(i => {
      expectedMap.set(normalizeSku(i.barcode), { qty: i.expectedQty, name: i.name, originalSku: i.barcode });
  });

  // 3. Union of all Keys (Normalized)
  const allKeys = new Set([...physicalMap.keys(), ...expectedMap.keys()]);

  let matchesCount = 0;
  const details = [];

  // 4. Comparison Pass
  for (const key of allKeys) {
    const physData = physicalMap.get(key);
    const expData = expectedMap.get(key);

    const physicalQty = physData?.qty || 0;
    const expectedQty = expData?.qty || 0;
    
    // Prefer the Expected SKU for display if available (usually cleaner in Excel), else Physical
    const displaySku = expData?.originalSku || physData?.originalSku || key;
    const name = expData?.name || 'Producto Desconocido';

    const diff = physicalQty - expectedQty;

    if (physicalQty > 0 && expectedQty > 0) {
      matchesCount++; 
    }

    details.push({
      barcode: displaySku,
      name,
      physicalQty,
      expectedQty,
      difference: diff
    });
  }

  // 5. Scoring Logic
  const physicalTotalQty = physicalItems.reduce((acc, i) => acc + i.totalQuantity, 0);
  
  // SKUs in common
  const totalUniqueSKUs = allKeys.size;
  const skuOverlapRatio = totalUniqueSKUs > 0 ? matchesCount / totalUniqueSKUs : 0;

  // Quantity Deviation
  const totalDiff = details.reduce((acc, d) => acc + Math.abs(d.difference), 0);
  const maxQty = Math.max(physicalTotalQty, order.totalExpectedUnits);
  
  // Accuracy: 1.0 means perfect match (0 diff).
  const qtyAccuracy = maxQty > 0 ? Math.max(0, 1 - (totalDiff / maxQty)) : 0;

  // Weighted Score: 40% SKU overlap + 60% Quantity Accuracy
  // We prioritize quantity accuracy because if you have 100 items and get 99 right, that's a good match
  const matchScore = ((skuOverlapRatio * 40) + (qtyAccuracy * 60)) * 100;

  let status: 'exact' | 'partial' | 'mismatch' = 'mismatch';
  if (matchScore > 98) status = 'exact';
  else if (matchScore > 50) status = 'partial';

  return {
      expectedOrder: order,
      matchScore,
      status,
      // Sort: Errors first, then alphabetical
      details: details.sort((a, b) => {
          const aIsDiff = a.difference !== 0;
          const bIsDiff = b.difference !== 0;
          if (aIsDiff && !bIsDiff) return -1;
          if (!aIsDiff && bIsDiff) return 1;
          return 0;
      })
  };
};

export const findMatches = async (physicalItems: ConsolidatedItem[]): Promise<MatchResult[]> => {
  // Fetch all orders efficiently
  const expectedOrders = await db.expectedOrders.toArray();
  const results: MatchResult[] = [];

  // Map-reduce pattern for calculation
  for (const order of expectedOrders) {
    const result = calculateOrderMatch(physicalItems, order);
    
    // Filter logic:
    // If the physical count is very small (e.g. 1 item), only show very high probability matches.
    // If the physical count is large, we can be more lenient.
    if (result.matchScore > 15) { 
        results.push(result);
    }
  }

  // Return top 10 matches sorted by score
  return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
};
