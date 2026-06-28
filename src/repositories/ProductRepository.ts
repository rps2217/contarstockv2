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

  // Soft delete - marca como pending_delete
  async softDelete(barcode: string): Promise<Product | null> {
    const product = await this.table.get(barcode);
    if (!product) return null;
    await this.table.update(barcode, { syncStatus: 'pending_delete' });
    return product;
  }

  // Restore desde soft delete
  async restore(barcode: string): Promise<void> {
    await this.table.update(barcode, { syncStatus: 'synced' });
  }

  // Eliminación permanente
  async permanentDelete(barcode: string): Promise<void> {
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
    return [...new Set(products.map(p => p.supplier).filter(Boolean) as string[])];
  }

  // Paginación con cursor
  async getPaginated(options: {
    cursor?: string;
    limit: number;
    filter?: { category?: string; supplier?: string };
  }): Promise<{
    items: Product[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    const { cursor, limit, filter } = options;
    
    let results = await this.table.toArray();

    // Aplicar filtros
    if (filter?.category) {
      results = results.filter(p => p.category === filter.category);
    }
    if (filter?.supplier) {
      results = results.filter(p => p.supplier === filter.supplier);
    }

    // Cursor-based pagination
    if (cursor) {
      const cursorIndex = results.findIndex(p => p.barcode === cursor);
      if (cursorIndex !== -1) {
        results = results.slice(cursorIndex + 1);
      }
    }

    const hasMore = results.length > limit;
    const items = results.slice(0, limit);
    
    return {
      items,
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1].barcode : undefined,
      hasMore,
    };
  }
}

export const productRepository = new ProductRepository();
