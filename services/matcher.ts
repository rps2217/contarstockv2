
import * as XLSX from 'xlsx';
import { db } from '../db';
import { ExpectedOrder, MatchResult, ConsolidatedItem } from '../types';
import { sanitizeBarcode, generateUUID } from './utils';

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

        const headers = (json[0] as string[]).map(h => String(h).toUpperCase());
        
        const idIndex = 0; 
        const skuIndex = headers.findIndex(h => h.includes('COD') || h.includes('SKU') || h.includes('ITEM') || h.includes('BARRAS'));
        const descIndex = headers.findIndex(h => h.includes('DESC') || h.includes('NOM') || h.includes('PROD'));
        const qtyIndex = headers.findIndex(h => h.includes('CANT') || h.includes('QTY') || h.includes('UNID') || h.includes('SOLICITADO'));

        if (skuIndex === -1 || qtyIndex === -1) {
          throw new Error("No se encontraron columnas de 'CÓDIGO' o 'CANTIDAD' en el Excel.");
        }

        const groups = new Map<string, ExpectedOrder>();

        for (let i = 1; i < json.length; i++) {
          const row = json[i] as any[];
          if (!row || row.length === 0) continue;

          const internalId = String(row[idIndex] || 'SIN_ID').trim();
          const barcode = sanitizeBarcode(String(row[skuIndex] || ''));
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

export const calculateOrderMatch = (physicalItems: ConsolidatedItem[], order: ExpectedOrder): MatchResult => {
  const physicalMap = new Map(physicalItems.map(i => [i.barcode, i.totalQuantity]));
  const physicalTotalQty = physicalItems.reduce((acc, i) => acc + i.totalQuantity, 0);

  let matchesCount = 0;
  const details = [];

  const allSkus = new Set([...physicalMap.keys(), ...order.items.map(i => i.barcode)]);

  for (const sku of allSkus) {
    const physicalQty = physicalMap.get(sku) || 0;
    const expectedItem = order.items.find(i => i.barcode === sku);
    const expectedQty = expectedItem?.expectedQty || 0;
    const name = expectedItem?.name || physicalItems.find(i => i.barcode === sku)?.productName || 'Desconocido';

    const diff = physicalQty - expectedQty;

    if (physicalQty > 0 && expectedQty > 0) {
      matchesCount++; 
    }

    details.push({
      barcode: sku,
      name,
      physicalQty,
      expectedQty,
      difference: diff
    });
  }

  const totalUniqueSKUs = allSkus.size;
  const skuOverlapRatio = totalUniqueSKUs > 0 ? matchesCount / totalUniqueSKUs : 0;

  const totalDiff = details.reduce((acc, d) => acc + Math.abs(d.difference), 0);
  const maxQty = Math.max(physicalTotalQty, order.totalExpectedUnits);
  const qtyAccuracy = maxQty > 0 ? Math.max(0, 1 - (totalDiff / maxQty)) : 0;

  const matchScore = (skuOverlapRatio * 60) + (qtyAccuracy * 40);

  let status: 'exact' | 'partial' | 'mismatch' = 'mismatch';
  if (matchScore > 99) status = 'exact';
  else if (matchScore > 40) status = 'partial';

  return {
      expectedOrder: order,
      matchScore,
      status,
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
  const expectedOrders = await db.expectedOrders.toArray();
  const results: MatchResult[] = [];

  for (const order of expectedOrders) {
    const result = calculateOrderMatch(physicalItems, order);
    
    if (result.matchScore > 10) { 
        results.push(result);
    }
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
};
