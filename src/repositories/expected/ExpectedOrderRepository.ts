/**
 * ExpectedOrderRepository - Patrón Singleton
 *
 * REEMPLAZA a src/repositories/ExpectedOrderRepository.ts
 *
 * PATRÓN ACTUAL (v2):
 * - export const expectedOrderRepository - Instancia singleton
 * - export class ExpectedOrderRepository - Clase con métodos de instancia + estáticos
 *
 * @deprecated Los métodos estáticos serán eliminados en v4
 */

import { db } from '../../db';
import { ExpectedOrder, ExpectedItem } from '../../types';
import { supabase } from '../../lib/supabase';
import { logger } from '../../services/logger';

const MODULE = 'ExpectedOrderRepository';

export class ExpectedOrderRepository {
  // ============================================================================
  // MÉTODOS ESTÁTICOS (Legacy - para backwards compatibility)
  // ============================================================================
  static async save(order: ExpectedOrder): Promise<void> {
    try {
      await db.expectedOrders.put(order);
      logger.info(MODULE, 'Order saved', { orderId: order.id });
    } catch (err: any) {
      logger.error(MODULE, 'Error saving order', { orderId: order.id, error: err.message });
      throw err;
    }
  }

  static async getById(id: string): Promise<ExpectedOrder | undefined> {
    try {
      return await db.expectedOrders.get(id);
    } catch (err: any) {
      logger.error(MODULE, 'Error getting order by id', { orderId: id, error: err.message });
      throw err;
    }
  }

  static async getAll(): Promise<ExpectedOrder[]> {
    try {
      return await db.expectedOrders.toArray();
    } catch (err: any) {
      logger.error(MODULE, 'Error getting all orders', { error: err.message });
      throw err;
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await db.expectedOrders.delete(id);
      logger.info(MODULE, 'Order deleted', { orderId: id });
    } catch (err: any) {
      logger.error(MODULE, 'Error deleting order', { orderId: id, error: err.message });
      throw err;
    }
  }

  static async downloadFromCloud(): Promise<{
    success: boolean;
    orders: ExpectedOrder[];
    error?: string;
  }> {
    return new ExpectedOrderRepository().downloadFromCloud();
  }

  static async uploadToCloud(order: ExpectedOrder): Promise<{ success: boolean; error?: string }> {
    return new ExpectedOrderRepository().uploadToCloud(order);
  }

  static async deleteFromCloud(orderId: string): Promise<{ success: boolean; error?: string }> {
    return new ExpectedOrderRepository().deleteFromCloud(orderId);
  }

  // ============================================================================
  // MÉTODOS DE INSTANCIA (Nuevo patrón)
  // ============================================================================
  private table = () => db.expectedOrders;

  private ensureErrorCapture() {
    // Error capture setup (unchanged from original)
  }

  async save(order: ExpectedOrder): Promise<void> {
    try {
      await this.table().put(order);
      logger.info(MODULE, 'Order saved', { orderId: order.id });
    } catch (err: any) {
      logger.error(MODULE, 'Error saving order', { orderId: order.id, error: err.message });
      throw err;
    }
  }

  async getById(id: string): Promise<ExpectedOrder | undefined> {
    try {
      return await this.table().get(id);
    } catch (err: any) {
      logger.error(MODULE, 'Error getting order by id', { orderId: id, error: err.message });
      throw err;
    }
  }

  async getAll(): Promise<ExpectedOrder[]> {
    try {
      return await this.table().toArray();
    } catch (err: any) {
      logger.error(MODULE, 'Error getting all orders', { error: err.message });
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.table().delete(id);
      logger.info(MODULE, 'Order deleted', { orderId: id });
    } catch (err: any) {
      logger.error(MODULE, 'Error deleting order', { orderId: id, error: err.message });
      throw err;
    }
  }

  /**
   * Download orders from cloud (Supabase PEDIDOS table)
   */
  async downloadFromCloud(): Promise<{
    success: boolean;
    orders: ExpectedOrder[];
    error?: string;
  }> {
    logger.info(MODULE, 'downloadFromCloud: Starting...');
    try {
      const { data, error } = await supabase
        .from('PEDIDOS')
        .select('*')
        .order('erp', { ascending: true });

      if (error) {
        return { success: false, orders: [], error: error.message };
      }

      if (!data || data.length === 0) {
        return { success: true, orders: [] };
      }

      // Group rows by erp (document ID)
      const groupedByErp = new Map<string, typeof data>();
      for (const row of data) {
        const erpId = row.erp?.toUpperCase();
        if (!erpId) continue;

        if (!groupedByErp.has(erpId)) {
          groupedByErp.set(erpId, []);
        }
        groupedByErp.get(erpId)!.push(row);
      }

      // Convert to ExpectedOrder objects
      const orders: ExpectedOrder[] = [];

      for (const [erpId, rows] of groupedByErp) {
        const items: ExpectedItem[] = rows.map(row => ({
          barcode: row.barcode?.toString() || '',
          name: row.name || `SKU ${row.barcode}`,
          expectedQty: row.qty || 0,
        }));

        const totalUnits = items.reduce((acc, item) => acc + item.expectedQty, 0);
        const uniqueSkus = new Set(items.map(i => i.barcode)).size;
        const firstRow = rows[0];

        orders.push({
          id: erpId,
          internalId: erpId,
          items,
          totalExpectedUnits: totalUnits,
          totalExpectedSKUs: uniqueSkus,
          importedAt: firstRow.created_at ? new Date(firstRow.created_at).getTime() : Date.now(),
          metadata: {
            documentType: firstRow.document_type || 'Picking List',
            date: firstRow.date || new Date().toLocaleDateString(),
            purchaseOrder: firstRow.purchase_order || '',
            orderNote: firstRow.order_note || '',
          },
          _syncedFromCloud: true,
        });
      }

      // Save to local DB
      let savedCount = 0;
      for (const order of orders) {
        try {
          const existing = await this.table().get(order.id);
          if (!existing) {
            await this.table().put(order);
            savedCount++;
          }
        } catch (dbErr: any) {
          logger.error(MODULE, 'Error saving order to DB', {
            orderId: order.id,
            error: dbErr.message,
          });
        }
      }

      logger.info(MODULE, `downloadFromCloud: Saved ${savedCount} new orders`);
      return { success: true, orders };
    } catch (err: any) {
      logger.error(MODULE, 'downloadFromCloud: Unexpected error', { error: err.message });
      return { success: false, orders: [], error: err.message || 'Unknown error' };
    }
  }

  /**
   * Upload a single order to cloud
   */
  async uploadToCloud(order: ExpectedOrder): Promise<{ success: boolean; error?: string }> {
    logger.info(MODULE, 'uploadToCloud: Starting', { orderId: order.id });
    try {
      // Delete existing rows for this ERP
      const { error: deleteError } = await supabase
        .from('PEDIDOS')
        .delete()
        .eq('erp', order.id.toUpperCase());

      if (deleteError) {
        return { success: false, error: deleteError.message };
      }

      // Insert all items
      const rows = order.items.map(item => ({
        erp: order.id.toUpperCase(),
        barcode: item.barcode,
        name: item.name,
        qty: item.expectedQty,
        document_type: order.metadata?.documentType || 'Picking List',
        date: order.metadata?.date || new Date().toLocaleDateString(),
        purchase_order: order.metadata?.purchaseOrder || '',
        order_note: order.metadata?.orderNote || '',
      }));

      const { error: insertError } = await supabase.from('PEDIDOS').insert(rows);

      if (insertError) {
        return { success: false, error: insertError.message };
      }

      return { success: true };
    } catch (err: any) {
      logger.error(MODULE, 'uploadToCloud: Unexpected error', { error: err.message });
      return { success: false, error: err.message || 'Unknown error' };
    }
  }

  /**
   * Delete an order from cloud
   */
  async deleteFromCloud(orderId: string): Promise<{ success: boolean; error?: string }> {
    logger.info(MODULE, 'deleteFromCloud: Starting', { orderId });
    try {
      const { error } = await supabase.from('PEDIDOS').delete().eq('erp', orderId.toUpperCase());

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      logger.error(MODULE, 'deleteFromCloud: Unexpected error', { error: err.message });
      return { success: false, error: err.message || 'Unknown error' };
    }
  }
}

// ============================================================================
// EXPORT - SINGLETON
// ============================================================================

export const expectedOrderRepository = new ExpectedOrderRepository();

// ============================================================================
// EXPORT LEGACY (Deprecated)
// ============================================================================

export const ExpectedOrderRepositoryLegacy = {
  save: (order: ExpectedOrder) => expectedOrderRepository.save(order),
  getById: (id: string) => expectedOrderRepository.getById(id),
  getAll: () => expectedOrderRepository.getAll(),
  delete: (id: string) => expectedOrderRepository.delete(id),
  downloadFromCloud: () => expectedOrderRepository.downloadFromCloud(),
  uploadToCloud: (order: ExpectedOrder) => expectedOrderRepository.uploadToCloud(order),
  deleteFromCloud: (orderId: string) => expectedOrderRepository.deleteFromCloud(orderId),
};
