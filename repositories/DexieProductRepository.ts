
import { db } from '../db';
import { Product } from '../types';
import { IProductRepository } from './IProductRepository';

export class DexieProductRepository implements IProductRepository {
  async getById(barcode: string): Promise<Product | undefined> {
    return await db.products.get(barcode);
  }

  async save(product: Product): Promise<void> {
    await db.products.put(product);
  }

  async saveBatch(products: Product[]): Promise<void> {
    await db.products.bulkPut(products);
  }

  async delete(barcode: string): Promise<void> {
    await db.products.delete(barcode);
  }

  async deleteAll(): Promise<void> {
    await db.products.clear();
  }

  async getAll(): Promise<Product[]> {
    return await db.products.toArray();
  }

  async markAsSynced(barcodes: string[]): Promise<void> {
    if (barcodes.length === 0) return;
    await db.products.where('barcode').anyOf(barcodes).modify({ syncStatus: 'synced' });
  }
}

export const productRepository = new DexieProductRepository();
