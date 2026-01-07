
import { Product } from '../types';
import { db } from '../db';
import Papa from 'papaparse';
import { sanitizeBarcode } from './utils';
import { validateProduct } from './validator';

/**
 * Repository Pattern: Centraliza el acceso a la tabla de productos
 */
export const getProductByBarcode = async (barcode: string): Promise<Product | undefined> => {
    return await db.products.get(sanitizeBarcode(barcode));
};

export const saveProduct = async (product: Product) => {
  const validation = validateProduct(product);
  if (!validation.valid) {
      throw new Error(`Error de Integridad: ${validation.error}`);
  }
  
  const validatedData = validation.data!;
  const existing = await db.products.get(validatedData.barcode);
  
  let syncStatus: 'add' | 'edit' | 'synced' = 'add';
  if (existing) {
      syncStatus = existing.syncStatus === 'add' ? 'add' : 'edit';
  }

  await db.products.put({ 
      ...validatedData,
      syncStatus
  });
};

export const saveProductBatch = async (products: Product[]) => {
    const validBatch = products
        .map(p => validateProduct(p))
        .filter(v => v.valid)
        .map(v => v.data!);

    if (validBatch.length > 0) {
        await db.products.bulkPut(validBatch);
    }
};

export const deleteProduct = async (barcode: string) => {
  await db.products.delete(sanitizeBarcode(barcode));
};

export const deleteAllProducts = async () => {
  await db.products.clear();
};

export const markProductsAsSynced = async (barcodes: string[]) => {
    if (barcodes.length === 0) return;
    await db.products.where('barcode').anyOf(barcodes).modify({ syncStatus: 'synced' });
};

export const createProductAlias = async (newBarcode: string, originalBarcode: string, fallbackName: string) => {
    const masterProduct = await getProductByBarcode(originalBarcode);
    const newProduct: Product = {
        barcode: newBarcode,
        name: masterProduct ? masterProduct.name : fallbackName,
        category: masterProduct?.category || 'ALIAS_DETECTADO',
        supplier: masterProduct?.supplier || '',
        supplierRut: masterProduct?.supplierRut || '',
        syncStatus: 'add'
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
