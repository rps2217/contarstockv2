
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

  async getLimited(limit: number): Promise<Product[]> {
    return await db.products.limit(limit).toArray();
  }

  async getPendingSyncCount(): Promise<number> {
    return await db.products.where('syncStatus').equals('pending').count();
  }

  async getPendingSync(): Promise<Product[]> {
    return await db.products.where('syncStatus').equals('pending').toArray();
  }

  async markAsSynced(barcodes: string[]): Promise<void> {
    if (barcodes.length === 0) return;
    await db.products.where('barcode').anyOf(barcodes).modify({ syncStatus: 'synced' });
  }

  // SMART SEARCH: Optimización de Joyería para catálogos masivos
  async search(query: string, limit: number = 200): Promise<Product[]> {
    const q = query.trim();
    if (!q) return this.getLimited(limit);

    // 1. Prioridad: Búsqueda exacta por código de barras (Instantánea)
    const exactMatch = await db.products.get(q);
    if (exactMatch) return [exactMatch];

    // 2. Si es numérico, buscar por prefijo de código de barras
    if (/^\d+$/.test(q)) {
      return await db.products
        .where('barcode')
        .startsWith(q)
        .limit(limit)
        .toArray();
    }

    // 3. Búsqueda por prefijo de nombre (Usa el índice 'name')
    return await db.products
      .where('name')
      .startsWithIgnoreCase(q)
      .limit(limit)
      .toArray();
  }

  // OPTIMIZED STATS: Evitar toArray() masivo
  async getQuickStats() {
    const total = await db.products.count();
    if (total === 0) return { total: 0, trained: 0, synced: 0 };

    const synced = await db.products.where('syncStatus').equals('synced').count();
    // Nota: El filtrado de 'trained' requiere recorrer o tener un índice de embeddings
    // Por ahora, usaremos una aproximación o un límite si no hay índice
    return { total, synced };
  }
}

export const productRepository = new DexieProductRepository();

// Forced GitHub sync
