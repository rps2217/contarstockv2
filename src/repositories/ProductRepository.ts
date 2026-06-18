import { db } from '../db';
import type { Product } from '../types';

/**
 * Repository para Products
 * Usa barcode como identificador primario
 */
export class ProductRepository {
  private table = db.products;

  async get(barcode: string): Promise<Product | null> {
    return (await this.table.get(barcode)) ?? null;
  }

  async getAll(): Promise<Product[]> {
    return await this.table.toArray();
  }

  async save(product: Product): Promise<string> {
    await this.table.put(product);
    return product.barcode;
  }

  async saveMany(products: Product[]): Promise<void> {
    await this.table.bulkPut(products);
  }

  async delete(barcode: string): Promise<void> {
    await this.table.delete(barcode);
  }

  async count(): Promise<number> {
    return await this.table.count();
  }

  async getByCategory(category: string): Promise<Product[]> {
    return await this.table.where('category').equals(category).toArray();
  }

  async getBySupplier(supplier: string): Promise<Product[]> {
    return await this.table.where('supplier').equals(supplier).toArray();
  }

  async getPendingSync(): Promise<Product[]> {
    return await this.table.where('syncStatus').equals('pending').toArray();
  }

  async markSynced(barcode: string): Promise<void> {
    await this.table.update(barcode, { syncStatus: 'synced' });
  }

  async search(query: string): Promise<Product[]> {
    const lowerQuery = query.toLowerCase();
    return await this.table
      .filter(p => 
        p.barcode.toLowerCase().includes(lowerQuery) ||
        p.name.toLowerCase().includes(lowerQuery)
      )
      .toArray();
  }

  async getCategories(): Promise<string[]> {
    const products = await this.table.toArray();
    return [...new Set(products.map(p => p.category).filter(Boolean))];
  }

  async getSuppliers(): Promise<string[]> {
    const products = await this.table.toArray();
    return [...new Set(products.map(p => p.supplier).filter(Boolean))];
  }
}

export const productRepository = new ProductRepository();
