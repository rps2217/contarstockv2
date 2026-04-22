import { db } from '../db';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { logger } from './logger';
import { supabaseSyncService } from './supabaseSyncService';
import { Customer } from '../types';

export class CustomerSyncService {
  private subscription: { unsubscribe: () => void } | null = null;

  startSync(tableName: string = 'CLIENTES') {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    // Inicializar sincronización en tiempo real con Supabase
    this.subscription = supabaseSyncService.startSync(tableName, {
      put: async (data: any) => {
        const customer = data as Customer;
        // Solo actualizamos si no tenemos una eliminación pendiente localmente
        const local = await db.dynamic_data.get(customer.id);
        if (local?.syncStatus !== 'pending_delete') {
          await CustomerRepository.save({ ...customer, syncStatus: 'synced' });
        }
      },
      delete: async (id: string) => {
        await db.dynamic_data.delete(id);
      }
    });

    logger.info('CUSTOMER_SYNC', `Real-time sync for ${tableName} started via Supabase`);
    return this.subscription.unsubscribe;
  }

  stopSync() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }
}

export const customerSyncService = new CustomerSyncService();
