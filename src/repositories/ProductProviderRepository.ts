/**
 * ProductProviderRepository - Acceso a la relación producto-proveedor
 *
 * Tabla: PRODUCTO_PROVEEDOR
 * Esta tabla relaciona productos con proveedores y define políticas específicas.
 */

import { db, ProductProvider as DBProductProvider } from '../db';

// Re-export the interface from db.ts
export interface ProductProvider extends DBProductProvider {}

// Tipo para registros de Supabase
interface SupabaseProductProviderRecord {
  product_barcode: string;
  provider_rut: string;
  is_primary: boolean | null;
  has_exchange: boolean | null;
  withdrawal_days: number | null;
  exchange_policy: string | null;
  mundo: string | null;
  marca: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Singleton para el repositorio
export const productProviderRepository = {
  table: 'productProviders',

  /**
   * Guardar una relación producto-proveedor
   */
  async save(relation: ProductProvider): Promise<void> {
    const record = {
      ...relation,
      createdAt: relation.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    await db.table(this.table).put(record);
  },

  /**
   * Guardar múltiples relaciones (bulk)
   */
  async saveMany(relations: ProductProvider[]): Promise<void> {
    const records = relations.map(r => ({
      ...r,
      createdAt: r.createdAt || Date.now(),
      updatedAt: Date.now(),
    }));
    await db.table(this.table).bulkPut(records);
  },

  /**
   * Obtener todos los proveedores de un producto
   */
  async getByProduct(barcode: string): Promise<ProductProvider[]> {
    return await db.table(this.table).where('productBarcode').equals(barcode).toArray();
  },

  /**
   * Obtener el proveedor principal de un producto
   */
  async getPrimaryProvider(barcode: string): Promise<ProductProvider | undefined> {
    const providers = await db
      .table(this.table)
      .where('productBarcode')
      .equals(barcode)
      .filter(p => p.isPrimary === true)
      .first();
    return providers;
  },

  /**
   * Obtener todos los productos de un proveedor
   */
  async getByProvider(rut: string): Promise<ProductProvider[]> {
    return await db.table(this.table).where('providerRut').equals(rut).toArray();
  },

  /**
   * Obtener todos los registros
   */
  async getAll(): Promise<ProductProvider[]> {
    return await db.table(this.table).toArray();
  },

  /**
   * Obtener políticas resueltas para un producto
   * Busca primero en PRODUCTO_PROVEEDOR, luego hereda del proveedor
   */
  async getResolvedPolicy(
    barcode: string,
    defaultWithdrawalDays: number = 30,
    defaultHasExchange: boolean = true
  ): Promise<{ withdrawalDays: number; hasExchange: boolean }> {
    const primaryProvider = await this.getPrimaryProvider(barcode);

    if (primaryProvider) {
      return {
        withdrawalDays: primaryProvider.withdrawalDays ?? defaultWithdrawalDays,
        hasExchange: primaryProvider.hasExchange ?? defaultHasExchange,
      };
    }

    return {
      withdrawalDays: defaultWithdrawalDays,
      hasExchange: defaultHasExchange,
    };
  },

  /**
   * Eliminar relación específica
   */
  async delete(productBarcode: string, providerRut: string): Promise<void> {
    const all = await this.getByProduct(productBarcode);
    const toDelete = all.filter((r: ProductProvider) => r.providerRut === providerRut && r.id);
    if (toDelete.length > 0 && toDelete[0].id) {
      await db.table(this.table).delete(toDelete[0].id);
    }
  },

  /**
   * Eliminar todas las relaciones de un producto
   */
  async deleteByProduct(barcode: string): Promise<void> {
    await db.table(this.table).where('productBarcode').equals(barcode).delete();
  },

  /**
   * Establecer proveedor principal
   */
  async setPrimary(productBarcode: string, providerRut: string): Promise<void> {
    const relations = await this.getByProduct(productBarcode);

    // Primero desmarcar todos
    for (const r of relations) {
      if (r.id) {
        await db.table(this.table).update(r.id, {
          isPrimary: r.providerRut === providerRut,
          updatedAt: Date.now(),
        });
      }
    }
  },

  /**
   * Obtener conteo de productos por proveedor
   */
  async getProviderStats(): Promise<Map<string, { total: number; primary: number }>> {
    const all = await this.getAll();
    const stats = new Map<string, { total: number; primary: number }>();

    for (const r of all) {
      const current = stats.get(r.providerRut) || { total: 0, primary: 0 };
      current.total++;
      if (r.isPrimary) current.primary++;
      stats.set(r.providerRut, current);
    }

    return stats;
  },

  /**
   * Importar datos desde Supabase (array de registros remotos)
   */
  async importFromSupabase(records: SupabaseProductProviderRecord[]): Promise<number> {
    const mapped = records.map(r => ({
      productBarcode: r.product_barcode,
      providerRut: String(r.provider_rut),
      isPrimary: Boolean(r.is_primary),
      hasExchange: r.has_exchange,
      withdrawalDays: r.withdrawal_days,
      exchangePolicy: r.exchange_policy,
      mundo: r.mundo,
      marca: r.marca,
      createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
      updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : Date.now(),
    }));

    await this.saveMany(mapped);
    return mapped.length;
  },
};
