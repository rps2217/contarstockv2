

import { Product } from '../types';
import { productRepository } from '../repositories/DexieProductRepository';
import Papa from 'papaparse';
import { sanitizeBarcode } from './utils';
import { validateProduct } from './validator';

export const getProductByBarcode = async (barcode: string): Promise<Product | undefined> => {
  return await productRepository.getById(sanitizeBarcode(barcode));
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
  
  let syncStatus: 'add' | 'edit' | 'synced' = 'add';
  if (existing) {
    syncStatus = existing.syncStatus === 'add' ? 'add' : 'edit';
  }

  await productRepository.save({ 
    ...validatedData,
    barcode: sanitizedBarcode,
    embedding,
    syncStatus
  });
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
};

export const deleteProduct = async (barcode: string) => {
  await productRepository.delete(sanitizeBarcode(barcode));
};

export const deleteAllProducts = async () => {
  await productRepository.deleteAll();
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
 syncStatus: 'add',
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
 const name = row['DESCRIPCION'] || row['PRODUCTO'] || row['NOMBRE'];
 
 if (rawBarcode && name) {
 products.push({
 barcode: String(rawBarcode),
 name: String(name),
 category: String(row['MUNDO'] || row['CATEGORIA'] || 'GENERAL'),
 supplier: String(row['PROVEEDOR'] || ''),
 supplierRut: String(row['RUT PROVEEDOR'] || ''),
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