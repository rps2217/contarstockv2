
import * as XLSX from 'xlsx';
import { db } from '../db';
import { ExpectedOrder, MatchResult, ConsolidatedItem, AliasSuggestion } from '../types';
import { sanitizeBarcode, generateUUID, normalizeSku } from './utils';

/**
 * Imports an Excel file containing pending orders.
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
        
        let idIndex = headers.findIndex(h => h.includes('TRASPASO') || h.includes('AGRUPADOR') || h.includes('DOC') || h.includes('NUMERO'));
        if (idIndex === -1) idIndex = 0; 

        const skuIndex = headers.findIndex(h => h.includes('COD') || h.includes('SKU') || h.includes('ITEM') || h.includes('BARRAS') || h.includes('MATERIAL'));
        const descIndex = headers.findIndex(h => h.includes('DESC') || h.includes('NOM') || h.includes('PROD') || h.includes('TEXTO'));
        const qtyIndex = headers.findIndex(h => h.includes('CANT') || h.includes('QTY') || h.includes('UNID') || h.includes('SOLICITADO') || h.includes('PENDIENTE'));

        if (skuIndex === -1 || qtyIndex === -1) {
          throw new Error("Columnas 'CÓDIGO' o 'CANTIDAD' no detectadas.");
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
          const existingItem = group.items.find(item => normalizeSku(item.barcode) === normalizeSku(barcode));
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
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
};

/**
 * ALGORITMO DE COINCIDENCIA MEJORADO (DETECTIVE v4.5)
 * Capaz de identificar una orden desde el primer ítem escaneado si la huella es única.
 */
export const calculateOrderMatch = (physicalItems: ConsolidatedItem[], order: ExpectedOrder): MatchResult => {
  const physicalMap = new Map<string, number>();
  physicalItems.forEach(i => {
    if (i.totalQuantity > 0) physicalMap.set(normalizeSku(i.barcode), i.totalQuantity);
  });

  const expectedMap = new Map<string, number>();
  order.items.forEach(i => {
    expectedMap.set(normalizeSku(i.barcode), i.expectedQty);
  });

  let skuInOrderCount = 0;
  let qtyAccuracySum = 0;
  const details: any[] = [];
  const potentialAliases: AliasSuggestion[] = [];

  // 1. Analizar items que DEBERÍAN estar
  order.items.forEach(exp => {
    const normSku = normalizeSku(exp.barcode);
    const physQty = physicalMap.get(normSku) || 0;
    
    if (physQty > 0) {
        skuInOrderCount++;
        const accuracy = Math.min(physQty, exp.expectedQty) / Math.max(physQty, exp.expectedQty);
        qtyAccuracySum += accuracy;
    }

    details.push({
        barcode: exp.barcode,
        name: exp.name,
        physicalQty: physQty,
        expectedQty: exp.expectedQty,
        difference: physQty - exp.expectedQty
    });
  });

  // 2. Analizar items SOBRANTES (que no están en esta orden)
  let extraItemsCount = 0;
  physicalItems.forEach(phys => {
      const normSku = normalizeSku(phys.barcode);
      if (!expectedMap.has(normSku) && phys.totalQuantity > 0) {
          extraItemsCount++;
          details.push({
              barcode: phys.barcode,
              name: phys.productName,
              physicalQty: phys.totalQuantity,
              expectedQty: 0,
              difference: phys.totalQuantity
          });
      }
  });

  const totalPhysicalSkus = physicalMap.size;
  if (totalPhysicalSkus === 0) return { expectedOrder: order, matchScore: 0, status: 'mismatch', details, potentialAliases };

  // --- LÓGICA DE PUNTUACIÓN (BAYESIANA SIMPLIFICADA) ---
  
  // Precisión: ¿De lo que he escaneado, cuánto pertenece a esta orden? (Castigo por extras)
  const precision = skuInOrderCount / totalPhysicalSkus; 
  
  // Cobertura: ¿De esta orden, cuánto he avanzado ya?
  const coverage = skuInOrderCount / order.totalExpectedSKUs;

  // Precisión de cantidades de los items que sí coincidieron
  const avgQtyAccuracy = skuInOrderCount > 0 ? qtyAccuracySum / skuInOrderCount : 0;

  // Score final: 60% Precisión de pertenencia, 20% Cobertura de orden, 20% Precisión de cantidad
  const matchScore = (precision * 0.6 + coverage * 0.2 + avgQtyAccuracy * 0.2) * 100;

  let status: 'exact' | 'partial' | 'mismatch' = 'mismatch';
  if (matchScore > 98 && extraItemsCount === 0) status = 'exact';
  else if (matchScore > 20) status = 'partial'; // Umbral bajo para permitir "Discovery" rápido

  return {
      expectedOrder: order,
      matchScore,
      status,
      details: details.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference)),
      potentialAliases
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

  return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
};
