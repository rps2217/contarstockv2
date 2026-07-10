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

  // Alias para getById (compatibilidad)
  async get(barcode: string): Promise<Product | null> {
    return (await this.table.get(barcode)) ?? null;
  }

  override async save(product: Product): Promise<void> {
    const record = ProductSchema.parse({
      ...product,
      syncStatus: product.syncStatus || 'pending'
    }) as Product;
    await this.table.put(record);
  }

  // Alias para save (compatibilidad)
  async saveProduct(product: Product): Promise<string> {
    await this.save(product);
    return product.barcode;
  }

  override async saveBatch(products: Product[]): Promise<void> {
    const records = products.map(p => ({
      ...p,
      syncStatus: p.syncStatus || 'pending'
    }));
    await this.table.bulkPut(records);
  }

  // Alias para saveBatch (compatibilidad)
  async saveMany(products: Product[]): Promise<void> {
    await this.saveBatch(products);
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

  // Eliminacion permanente
  async permanentDelete(barcode: string): Promise<void> {
    await this.table.delete(barcode);
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

  // Alias para compatibilidad
  async markSynced(barcode: string): Promise<void> {
    await this.table.update(barcode, { syncStatus: 'synced' });
  }

  // SMART SEARCH: Optimizacion de Joyeria para catalogos masivos
  async search(query: string, limit: number = 200): Promise<Product[]> {
    const q = query.trim();
    if (!q) return this.getLimited(limit);

    // 1. Prioridad: Busqueda exacta por codigo de barras (Instantanea)
    const exactMatch = await this.table.get(q);
    if (exactMatch) return [exactMatch];

    // 2. Si es numerico, buscar por prefijo de codigo de barras
    if (/^\d+$/.test(q)) {
      return await this.table
        .where('barcode')
        .startsWith(q)
        .limit(limit)
        .toArray();
    }

    // 3. Busqueda por prefijo de nombre (Usa el indice 'name')
    return await this.table
      .where('name')
      .startsWithIgnoreCase(q)
      .limit(limit)
      .toArray();
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

  async getCategories(): Promise<string[]> {
    const products = await this.table.toArray();
    return [...new Set(products.map(p => p.category).filter(Boolean))];
  }

  async getSuppliers(): Promise<string[]> {
    const products = await this.table.toArray();
    return [...new Set(products.map(p => p.supplier).filter(Boolean) as string[])];
  }

  // OPTIMIZED STATS: Evitar toArray() masivo
  async getQuickStats() {
    const total = await this.table.count();
    if (total === 0) return { total: 0, trained: 0, synced: 0 };

    const synced = await this.table.where('syncStatus').equals('synced').count();
    return { total, synced };
  }
}

export const productRepository = new DexieProductRepository();
