import { db } from '../db';
import { ExpectedOrder, ExpectedItem } from '../types';
import { supabase } from '../lib/supabase';

export class ExpectedOrderRepository {
  static async save(order: ExpectedOrder): Promise<void> {
    await db.expectedOrders.put(order);
  }

  static async getById(id: string): Promise<ExpectedOrder | undefined> {
    return await db.expectedOrders.get(id);
  }

  static async getAll(): Promise<ExpectedOrder[]> {
    return await db.expectedOrders.toArray();
  }

  static async delete(id: string): Promise<void> {
    await db.expectedOrders.delete(id);
  }

  /**
   * Download orders from cloud (Supabase PEDIDOS table)
   * Groups rows by ERP (document ID) and reconstructs ExpectedOrder objects
   */
  static async downloadFromCloud(): Promise<{ success: boolean; orders: ExpectedOrder[]; error?: string }> {
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
          // Mark as synced from cloud
          _syncedFromCloud: true,
        });
      }

      // Save to local DB (merge with existing)
      for (const order of orders) {
        const existing = await db.expectedOrders.get(order.id);
        if (!existing) {
          // New order from cloud - save it
          await db.expectedOrders.put(order);
        }
        // If exists locally, keep local version (local takes precedence)
      }

      return { success: true, orders };
    } catch (err: any) {
      return { success: false, orders: [], error: err.message || 'Unknown error' };
    }
  }

  /**
   * Upload a single order to cloud
   */
  static async uploadToCloud(order: ExpectedOrder): Promise<{ success: boolean; error?: string }> {
    try {
      // First delete existing rows for this ERP
      await supabase
        .from('PEDIDOS')
        .delete()
        .eq('erp', order.id.toUpperCase());

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

      const { error } = await supabase
        .from('PEDIDOS')
        .insert(rows);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unknown error' };
    }
  }

  /**
   * Delete an order from cloud
   */
  static async deleteFromCloud(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('PEDIDOS')
        .delete()
        .eq('erp', orderId.toUpperCase());

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unknown error' };
    }
  }
}

