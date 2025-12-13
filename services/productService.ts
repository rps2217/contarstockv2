
import { Product } from '../types';
import { db } from '../db';
import Papa from 'papaparse';
import { sanitizeBarcode } from './utils';
import { validateProduct } from './validator';

// --- PRODUCT CRUD (PURE LOCAL) ---

export const saveProduct = async (product: Product) => {
  const cleanBarcode = sanitizeBarcode(product.barcode);
  
  // Validation Guard
  const validation = validateProduct({ ...product, barcode: cleanBarcode });
  if (!validation.valid) {
      throw new Error(`Error de validación: ${validation.error}`);
  }
  
  const existing = await db.products.get(cleanBarcode);
  let syncStatus: 'add' | 'edit' | 'synced' = 'add';

  if (existing) {
      syncStatus = existing.syncStatus === 'add' ? 'add' : 'edit';
  }

  const cleanProduct: Product = { 
      ...product, 
      barcode: cleanBarcode,
      syncStatus: syncStatus
  };
  await db.products.put(cleanProduct);
};

export const saveProductBatch = async (products: Product[]) => {
    const validProducts: Product[] = [];
    
    // Filter and sanitize
    for (const p of products) {
        const cleanBarcode = sanitizeBarcode(p.barcode);
        const candidate = { ...p, barcode: cleanBarcode };
        
        if (validateProduct(candidate).valid) {
            validProducts.push(candidate);
        }
    }

    if (validProducts.length > 0) {
        await db.products.bulkPut(validProducts);
    }
};

export const markProductsAsSynced = async (barcodes: string[]) => {
    if (barcodes.length === 0) return;
    await db.products.where('barcode').anyOf(barcodes).modify({ syncStatus: 'synced' });
};

export const deleteProduct = async (barcode: string) => {
  await db.products.delete(sanitizeBarcode(barcode));
};

export const deleteAllProducts = async () => {
  await db.products.clear();
};

// --- BULK OPERATIONS (LOCAL CSV) ---

export const bulkImportProducts = async (csvText: string): Promise<number> => {
    return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            worker: true, // PERFORMANCE: Run in background thread
            transformHeader: (h) => h.trim().toUpperCase(),
            complete: async (results) => {
                try {
                    const products: Product[] = [];
                    let errors = 0;
                    
                    // Processing logic inside the completion callback
                    // Note: We cannot use async/await comfortably inside the forEach if we want speed,
                    // so we process data first then bulk insert.
                    
                    for (const row of results.data as any[]) {
                        const rawBarcode = row['COD PRODUCTO'] || row['CODIGO'] || row['codigo'] || row['SKU'] || row['BARCODE'] || row['ID'];
                        const name = row['DESCRIPCION'] || row['descripcion'] || row['NOMBRE'] || row['PRODUCTO'] || row['NAME'];
                        const category = row['MUNDO'] || row['mundo'] || row['CATEGORIA'] || row['CATEGORY'] || '';
                        const supplier = row['PROVEEDOR'] || row['proveedor'] || row['SUPPLIER'] || '';
                        const supplierRut = row['RUT PROVEEDOR'] || row['rut proveedor'] || row['RUT'] || '';

                        if (rawBarcode && name) {
                            const p: Product = {
                                barcode: sanitizeBarcode(String(rawBarcode)),
                                name: String(name).trim(),
                                category: String(category).trim(),
                                supplier: String(supplier).trim(),
                                supplierRut: String(supplierRut).trim(),
                                syncStatus: 'synced'
                            };
                            
                            // Simple validation logic duplicated here to avoid import issues inside workers if we moved this entirely
                            if (p.barcode.length > 0 && p.name.length > 0) {
                                products.push(p);
                            } else {
                                errors++;
                            }
                        }
                    }

                    if (products.length > 0) {
                        // Batch insert is efficient
                        await db.products.bulkPut(products);
                    }
                    
                    console.log(`Import: ${products.length} valid, ${errors} invalid skipped.`);
                    resolve(products.length);
                } catch (err) {
                    reject(err);
                }
            },
            error: (err: any) => {
                reject(err);
            }
        });
    });
};
