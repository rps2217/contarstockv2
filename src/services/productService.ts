

import { Product } from '../types';
import { productRepository } from '../repositories/DexieProductRepository';
import Papa from 'papaparse';
import { sanitizeBarcode, normalizeIdentity } from './utils';
import { validateProduct } from './validator';
import { supabaseSyncService } from './supabaseSyncService';
import { invalidateProductCache, invalidateAllProductCache } from './aggregator';

export const getProductByBarcode = async (barcode: string): Promise<Product | undefined> => {
  return await productRepository.getById(sanitizeBarcode(barcode));
};

export const resolveUnknownProducts = async (skus: string[], config: any) => {
  if (!skus || skus.length === 0) return;

  const productsTable = config?.productsTableName || 'PRODUCTOS';
  const barcodeCol = config?.mappings?.products?.barcode || 'barcode';
  const nameCol = config?.mappings?.products?.name || 'name';
  const supplierCol = config?.mappings?.products?.supplier || 'supplier';
  const supplierRutCol = config?.mappings?.products?.supplierRut || 'supplierRut';

  for (const sku of skus) {
    try {
      console.debug(`[Detective] Buscando identidad de SKU: ${sku} en Supabase: ${productsTable}`);
      const response = await supabaseSyncService.query(productsTable, barcodeCol, sku);
      
      if (response.success && response.rows && response.rows.length > 0) {
        const p = response.rows[0] as any;
        const sanitizedSku = sanitizeBarcode(sku); 
        
        await saveProduct({
          barcode: sanitizedSku,
          name: p[nameCol] || p.name || p.DESCRIPTOR || p.DESCRIPCION || p.NOMBRE || 'PRODUCTO IDENTIFICADO',
          category: p.category || p.CATEGORIA || 'GENERAL',
          supplier: p[supplierCol] || p.supplier || p.PROVEEDOR || 'N/A',
          supplierRut: sanitizeBarcode(p[supplierRutCol] || p.supplierRut || p.PROVEEDOR_RUT || ''),
          price: typeof p.price === 'number' ? p.price : parseFloat(String(p.price || p.PRICE || 0).replace(/[^0-9.]/g, '')),
          syncStatus: 'synced'
        });
        console.info(`[Detective] SKU ${sku} identificado como: ${p[nameCol] || p.name}`);
      } else {
        console.warn(`[Detective] SKU ${sku} no encontrado en Supabase.`);
      }
    } catch (e) {
      console.warn(`[Detective] Error al resolver SKU ${sku}:`, e);
    }
  }
};

export const saveProduct = async (product: Product) => {
  const validation = validateProduct(product);
  if (!validation.valid) {
    throw new Error(`Error de Integridad: ${validation.error}`);
  }
  
  const validatedData = validation.data!;
  // UNIFICACIÓN DE IDENTIDAD: Sanitizar el SKU antes de guardar
  const sanitizedBarcode = sanitizeBarcode(validatedData.barcode);
  
  const existing = await productRepository.getById(sanitizedBarcode);
  
  // Preservar embedding si el nuevo no trae nada (aprendizaje local)
  const embedding = validatedData.embedding || existing?.embedding;
  
  let syncStatus: 'pending' | 'synced' = 'pending';
  // If it was already synced, we move it back to pending for the next cloud update
  // UNLESS it's explicitly set to synced (e.g. during an initial fetch from cloud)
  if (validatedData.syncStatus === 'synced') {
    syncStatus = 'synced';
  }

  await productRepository.save({ 
    ...validatedData,
    barcode: sanitizedBarcode,
    embedding,
    syncStatus
  });

  // FIX: Invalida el cache para este producto después de guardar
  invalidateProductCache([sanitizedBarcode]);
};

export const saveProductBatch = async (products: Product[]) => {
  const validInbound = products
    .map(p => validateProduct(p))
    .filter(v => v.valid)
    .map(v => ({
      ...v.data!,
      barcode: sanitizeBarcode(v.data!.barcode) // NORMALIZACIÓN MASIVA
    }));

  if (validInbound.length === 0) return;

  // Lógica Anti-Sobrescritura de Aprendizaje IA
  const barcodes = validInbound.map(p => p.barcode);
  // Nota: getAll() podría ser lento con muchos productos, pero es necesario para la fusión local
  const existingProducts = await productRepository.getAll(); 
  const filteredExisting = existingProducts.filter(p => barcodes.includes(p.barcode));
  
  const existingMap = new Map<string, Product>(filteredExisting.map(p => [p.barcode, p]));

  const mergedBatch = validInbound.map(inbound => {
    const local = existingMap.get(inbound.barcode);
    return {
      ...inbound,
      embedding: inbound.embedding || local?.embedding
    };
  });

  await productRepository.saveBatch(mergedBatch);

  // FIX: Invalida el cache para todos los productos del batch después de guardar
  invalidateProductCache(barcodes);
};

export const deleteProduct = async (barcode: string) => {
  const sanitizedBarcode = sanitizeBarcode(barcode);
  await productRepository.delete(sanitizedBarcode);
  // FIX: Invalida el cache después de eliminar
  invalidateProductCache([sanitizedBarcode]);
};

export const deleteAllProducts = async () => {
  await productRepository.deleteAll();
  // FIX: Invalida todo el cache después de eliminar todo
  invalidateAllProductCache();
};

export const markProductsAsSynced = async (barcodes: string[]) => {
  await productRepository.markAsSynced(barcodes);
};

export const createProductAlias = async (newBarcode: string, originalBarcode: string, fallbackName: string) => {
  const masterProduct = await getProductByBarcode(originalBarcode);
  const newProduct: Product = {
    barcode: newBarcode,
    name: masterProduct ? masterProduct.name : fallbackName,
    category: masterProduct?.category || 'ALIAS_DETECTADO',
    supplier: masterProduct?.supplier || '',
    supplierRut: masterProduct?.supplierRut || '',
    syncStatus: 'pending',
    embedding: masterProduct?.embedding
  };
  await saveProduct(newProduct);
};

export const bulkImportProducts = async (csvText: string): Promise<number> => {
 return new Promise((resolve, reject) => {
 Papa.parse(csvText, {
 header: true,
 skipEmptyLines: true,
 dynamicTyping: true,
 delimiter: "", 
 transformHeader: (h) => h.trim().toUpperCase(),
 complete: async (results) => {
 try {
 const products: Product[] = [];
 for (const row of results.data as any[]) {
 const rawBarcode = row['COD PRODUCTO'] || row['CODIGO'] || row['SKU'] || row['EAN'];
 const name = row['DESCRIPCION'] || row['PRODUCTO'] || row['NOMBRE'] || row['DESCRIPTOR'];
 
 if (rawBarcode && name) {
 products.push({
 barcode: String(rawBarcode),
 name: String(name),
 category: String(row['MUNDO'] || row['CATEGORIA'] || row['FAMILIA'] || 'GENERAL'),
 supplier: String(row['PROVEEDOR'] || row['LABORATORIO'] || row['MARCA'] || row['LAB'] || ''),
 supplierRut: normalizeIdentity(String(row['RUT PROVEEDOR'] || row['RUT'] || row['PROVEEDOR_RUT'] || row['RUT_PROVEEDOR'] || '')),
 syncStatus: 'synced'
 });
 }
 }
 await saveProductBatch(products);
 resolve(products.length);
 } catch (err) { reject(err); }
 },
 error: (err: any) => reject(err)
 });
 });
};
