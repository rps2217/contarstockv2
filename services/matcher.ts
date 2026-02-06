import * as XLSX from 'xlsx';
import { db } from '../db';
import { ExpectedOrder, ExpectedItem } from '../types';
import { sanitizeBarcode, generateUUID } from './utils';
import { VectorService } from './vectorService';

export const importExpectedOrders = async (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (json.length < 2) throw new Error("El archivo no tiene datos.");

        const headers = (json[0] as string[]).map(h => String(h).toUpperCase().trim());
        const idCol = headers.findIndex(h => h.includes('ERP') || h.includes('DOC') || h.includes('ORDEN'));
        const skuCol = headers.findIndex(h => h.includes('COD') || h.includes('SKU') || h.includes('ITEM'));
        const nameCol = headers.findIndex(h => h.includes('DESC') || h.includes('PROD') || h.includes('NOM'));
        const qtyCol = headers.findIndex(h => h.includes('CANT') || h.includes('QTY'));

        if (skuCol === -1 || qtyCol === -1) throw new Error("No se detectaron columnas de SKU o CANTIDAD.");

        const ordersMap = new Map<string, ExpectedOrder>();

        for (let i = 1; i < json.length; i++) {
          const row = json[i] as any[];
          if (!row || row.length === 0) continue;

          const erpId = idCol !== -1 ? String(row[idCol] || 'GUIA_TEMP').trim() : 'GUIA_TEMP';
          const barcode = sanitizeBarcode(String(row[skuCol] || ''));
          const name = nameCol !== -1 ? String(row[nameCol] || 'Producto').trim() : 'Producto';
          const qty = Number(row[qtyCol] || 0);

          if (!barcode || qty <= 0) continue;

          if (!ordersMap.has(erpId)) {
            ordersMap.set(erpId, {
              id: generateUUID(),
              internalId: erpId,
              items: [],
              totalExpectedUnits: 0,
              totalExpectedSKUs: 0,
              importedAt: Date.now()
            });
          }

          const order = ordersMap.get(erpId)!;
          order.items.push({ barcode, name, expectedQty: qty });
          order.totalExpectedUnits += qty;
          order.totalExpectedSKUs++;
        }

        const orders = Array.from(ordersMap.values());

        // VECTORIZACIÓN INTELIGENTE (Online)
        if (navigator.onLine && orders.length > 0) {
            console.log("[SemanticBrain] Vectorizando guía para deducción offline...");
            for (const order of orders) {
                for (const item of order.items) {
                    item.embedding = await VectorService.generateEmbedding(item.name) || undefined;
                }
            }
        }

        await db.expectedOrders.clear();
        await db.expectedOrders.bulkAdd(orders);
        resolve(orders.length);
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
};