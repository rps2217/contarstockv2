
import { db } from '../db';
import { Product } from '../types';
import { IProductRepository } from './IProductRepository';
import { ProductSchema } from '../schemas/database';
import { BaseDexieRepository } from './core/BaseDexieRepository';

export class DexieProductRepository extends BaseDexieRepository<Product> implements IProductRepository {
  constructor() {
    super(db.products);
  }

  override async getById(barcode: string): Promise<Product | undefined> {
    return await this.table.get(barcode);
  }

  override async save(product: Product): Promise<void> {
    const record = ProductSchema.parse({
      ...product,
      syncStatus: product.syncStatus || 'pending'
    }) as Product;
    await this.table.put(record);
  }

  override async saveBatch(products: Product[]): Promise<void> {
    const records = products.map(p => ({
      ...p,
      syncStatus: p.syncStatus || 'pending'
    }));
    await this.table.bulkPut(records);
  }

  override async delete(barcode: string): Promise<void> {
    const product = await this.table.get(barcode);
    if (product) {
      if (product.syncStatus === 'synced' || product.syncStatus === 'error') {
        await this.table.update(barcode, { syncStatus: 'pending_delete' });
      } else {
        await this.table.delete(barcode);
      }
    }
  }

  override async deleteAll(): Promise<void> {
    await this.table.clear();
  }

  override async getAll(): Promise<Product[]> {
    return await this.table.toArray();
  }

  async getLimited(limit: number): Promise<Product[]> {
    return await this.table.limit(limit).toArray();
  }

  async getPendingSyncCount(): Promise<number> {
    return await this.table.where('syncStatus').equals('pending').count();
  }

  async getPendingSync(): Promise<Product[]> {
    return await this.table.where('syncStatus').equals('pending').toArray();
  }

  async markAsSynced(barcodes: string[]): Promise<void> {
    if (barcodes.length === 0) return;
    await this.table.where('barcode').anyOf(barcodes).modify({ syncStatus: 'synced' });
  }

  // SMART SEARCH: Optimización de Joyería para catálogos masivos
  async search(query: string, limit: number = 200): Promise<Product[]> {
    const q = query.trim();
    if (!q) return this.getLimited(limit);

    // 1. Prioridad: Búsqueda exacta por código de barras (Instantánea)
    const exactMatch = await this.table.get(q);
    if (exactMatch) return [exactMatch];

    // 2. Si es numérico, buscar por prefijo de código de barras
    if (/^\d+$/.test(q)) {
      return await this.table
        .where('barcode')
        .startsWith(q)
        .limit(limit)
        .toArray();
    }

    // 3. Búsqueda por prefijo de nombre (Usa el índice 'name')
    return await this.table
      .where('name')
      .startsWithIgnoreCase(q)
      .limit(limit)
      .toArray();
  }

  // OPTIMIZED STATS: Evitar toArray() masivo
  async getQuickStats() {
    const total = await this.table.count();
    if (total === 0) return { total: 0, trained: 0, synced: 0 };

    const synced = await this.table.where('syncStatus').equals('synced').count();
    // Nota: El filtrado de 'trained' requiere recorrer o tener un índice de embeddings
    // Por ahora, usaremos una aproximación o un límite si no hay índice
    return { total, synced };
  }
}

export const productRepository = new DexieProductRepository();

