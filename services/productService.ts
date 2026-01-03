
import { Product } from '../types';
import { db } from '../db';
import Papa from 'papaparse';
import { sanitizeBarcode } from './utils';
import { validateProduct } from './validator';

/**
 * REGLA DE ESTABILIDAD:
 * Los productos guardados mediante esta función deben ser sanitizados siempre.
 * Si el producto ya existe y es 'synced', cambiar a 'edit' para asegurar que se suba el cambio.
 */
export const saveProduct = async (product: Product) => {
  const cleanBarcode = sanitizeBarcode(product.barcode);
  const validation = validateProduct({ ...product, barcode: cleanBarcode });
  if (!validation.valid) throw new Error(`Error: ${validation.error}`);
  
  const existing = await db.products.get(cleanBarcode);
  let syncStatus: 'add' | 'edit' | 'synced' = 'add';
  
  if (existing) {
      // No bajamos de nivel 'add', pero si era 'synced' ahora es 'edit'
      syncStatus = existing.syncStatus === 'add' ? 'add' : 'edit';
  }

  await db.products.put({ 
      ...product, 
      barcode: cleanBarcode, 
      syncStatus,
      name: product.name || 'PENDIENTE' // Fallback de seguridad
  });
};

export const saveProductBatch = async (products: Product[]) => {
    const valid = products.map(p => ({ ...p, barcode: sanitizeBarcode(p.barcode) }))
                         .filter(p => validateProduct(p).valid);
    if (valid.length > 0) await db.products.bulkPut(valid);
};

export const createProductAlias = async (newBarcode: string, originalBarcode: string, fallbackName: string) => {
    const masterProduct = await db.products.get(sanitizeBarcode(originalBarcode));
    const newProduct: Product = {
        barcode: sanitizeBarcode(newBarcode),
        name: masterProduct ? masterProduct.name : fallbackName,
        category: masterProduct?.category || 'ALIAS_DETECTADO',
        supplier: masterProduct?.supplier || '',
        supplierRut: masterProduct?.supplierRut || '',
        syncStatus: 'add'
    };
    await saveProduct(newProduct);
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
                        const rawBarcode = row['COD PRODUCTO'] || row['CODIGO'] || row['SKU'];
                        const name = row['DESCRIPCION'] || row['PRODUCTO'];
                        const category = row['MUNDO'] || row['CATEGORIA'] || '';
                        const supplier = row['PROVEEDOR'] || '';
                        const rut = row['RUT PROVEEDOR'] || '';

                        if (rawBarcode && name) {
                            products.push({
                                barcode: sanitizeBarcode(String(rawBarcode)),
                                name: String(name).trim(),
                                category: String(category).trim(),
                                supplier: String(supplier).trim(),
                                supplierRut: String(rut).trim(),
                                syncStatus: 'synced'
                            });
                        }
                    }
                    if (products.length > 0) await db.products.bulkPut(products);
                    resolve(products.length);
                } catch (err) { reject(err); }
            },
            error: (err: any) => reject(err)
        });
    });
};
