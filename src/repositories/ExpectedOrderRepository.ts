import { db } from '../db';
import { ExpectedOrder, ExpectedItem } from '../types';
import { supabase } from '../lib/supabase';
import { logger } from '../services/logger';

const MODULE = 'ExpectedOrderRepository';

// Capturador global para errores de Dexie/IndexedDB
const setupGlobalErrorCapture = () => {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const message = args[0]?.toString() || '';
    if (message.includes('orderBy') || message.includes('undefined') || message.includes('Cannot')) {
      logger.error(MODULE, 'Captured console.error', { 
        originalMessage: message,
        args: args.slice(1),
        stack: new Error().stack 
      });
    }
    originalError.apply(console, args);
  };
};

// Ejecutar una sola vez
let errorCaptureSetup = false;
const ensureErrorCapture = () => {
  if (!errorCaptureSetup) {
    setupGlobalErrorCapture();
    errorCaptureSetup = true;
  }
};

export class ExpectedOrderRepository {
  static async save(order: ExpectedOrder): Promise<void> {
    ensureErrorCapture();
    try {
      await db.expectedOrders.put(order);
      logger.info(MODULE, 'Order saved', { orderId: order.id });
    } catch (err: any) {
      logger.error(MODULE, 'Error saving order', { orderId: order.id, error: err.message, stack: err.stack });
      throw err;
    }
  }

  static async getById(id: string): Promise<ExpectedOrder | undefined> {
    ensureErrorCapture();
    try {
      return await db.expectedOrders.get(id);
    } catch (err: any) {
      logger.error(MODULE, 'Error getting order by id', { orderId: id, error: err.message, stack: err.stack });
      throw err;
    }
  }

  static async getAll(): Promise<ExpectedOrder[]> {
    ensureErrorCapture();
    try {
      return await db.expectedOrders.toArray();
    } catch (err: any) {
      logger.error(MODULE, 'Error getting all orders', { error: err.message, stack: err.stack });
      throw err;
    }
  }

  static async delete(id: string): Promise<void> {
    ensureErrorCapture();
    try {
      await db.expectedOrders.delete(id);
      logger.info(MODULE, 'Order deleted', { orderId: id });
    } catch (err: any) {
      logger.error(MODULE, 'Error deleting order', { orderId: id, error: err.message, stack: err.stack });
      throw err;
    }
  }

  /**
   * Download orders from cloud (Supabase PEDIDOS table)
   * Groups rows by ERP (document ID) and reconstructs ExpectedOrder objects
   */
  static async downloadFromCloud(): Promise<{ success: boolean; orders: ExpectedOrder[]; error?: string }> {
    logger.info(MODULE, 'downloadFromCloud: Starting...');
    ensureErrorCapture();
    try {
      const { data, error } = await supabase
        .from('PEDIDOS')
        .select('*')
        .order('erp', { ascending: true });

      if (error) {
        logger.error(MODULE, 'Supabase query error', { error: error.message, code: error.code });
        return { success: false, orders: [], error: error.message };
      }

      if (!data || data.length === 0) {
        logger.info(MODULE, 'No data from cloud, returning empty array');
        return { success: true, orders: [] };
      }

      logger.info(MODULE, `Received ${data.length} rows from cloud`);

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

      logger.info(MODULE, `Grouped into ${groupedByErp.size} orders`);

      // Convert to ExpectedOrder objects
      const orders: ExpectedOrder[] = [];
      
      for (const [erpId, rows] of groupedByErp) {
        const items: ExpectedItem[] = rows.map(row => ({
          barcode: row.barcode?.toString() || '',
          name: row.name || `SKU ${row.barcode}`,
          expectedQty: row.qty || 0,
        }));

        // Calculate totals
        const totalUnits = items.reduce((acc, item) => acc + item.expectedQty, 0);
        const uniqueSkus = new Set(items.map(i => i.barcode)).size;

        // Get the first row's metadata
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

      // Save to local DB (merge with existing)
      let savedCount = 0;
      for (const order of orders) {
        try {
          const existing = await db.expectedOrders.get(order.id);
          if (!existing) {
            await db.expectedOrders.put(order);
            savedCount++;
          }
        } catch (dbErr: any) {
          logger.error(MODULE, 'Error saving individual order to DB', { 
            orderId: order.id, 
            error: dbErr.message,
            stack: dbErr.stack 
          });
        }
      }

      logger.info(MODULE, `downloadFromCloud: Completed. Saved ${savedCount} new orders`);
      return { success: true, orders };
    } catch (err: any) {
      logger.error(MODULE, 'downloadFromCloud: Unexpected error', { 
        error: err.message, 
        stack: err.stack 
      });
      return { success: false, orders: [], error: err.message || 'Unknown error' };
    }
  }

  /**
   * Upload a single order to cloud
   */
  static async uploadToCloud(order: ExpectedOrder): Promise<{ success: boolean; error?: string }> {
    logger.info(MODULE, 'uploadToCloud: Starting', { orderId: order.id });
    ensureErrorCapture();
    try {
      // First delete existing rows for this ERP
      const { error: deleteError } = await supabase
        .from('PEDIDOS')
        .delete()
        .eq('erp', order.id.toUpperCase());

      if (deleteError) {
        logger.error(MODULE, 'Error deleting existing rows', { error: deleteError.message });
        return { success: false, error: deleteError.message };
      }

      // Then insert all items
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

      const { error: insertError } = await supabase
        .from('PEDIDOS')
        .insert(rows);

      if (insertError) {
        logger.error(MODULE, 'Error inserting rows', { error: insertError.message });
        return { success: false, error: insertError.message };
      }

      logger.info(MODULE, 'uploadToCloud: Completed', { orderId: order.id, rowsInserted: rows.length });
      return { success: true };
    } catch (err: any) {
      logger.error(MODULE, 'uploadToCloud: Unexpected error', { 
        orderId: order.id,
        error: err.message, 
        stack: err.stack 
      });
      return { success: false, error: err.message || 'Unknown error' };
    }
  }

  /**
   * Delete an order from cloud
   */
  static async deleteFromCloud(orderId: string): Promise<{ success: boolean; error?: string }> {
    logger.info(MODULE, 'deleteFromCloud: Starting', { orderId });
    ensureErrorCapture();
    try {
      const { error } = await supabase
        .from('PEDIDOS')
        .delete()
        .eq('erp', orderId.toUpperCase());

      if (error) {
        logger.error(MODULE, 'Error deleting from cloud', { orderId, error: error.message });
        return { success: false, error: error.message };
      }

      logger.info(MODULE, 'deleteFromCloud: Completed', { orderId });
      return { success: true };
    } catch (err: any) {
      logger.error(MODULE, 'deleteFromCloud: Unexpected error', { 
        orderId,
        error: err.message 
      });
      return { success: false, error: err.message || 'Unknown error' };
    }
  }
}

