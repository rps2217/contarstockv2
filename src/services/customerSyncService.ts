import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { db as firestoreDb } from '../lib/firebase';
import { db } from '../db';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { logger } from './logger';
import { handleFirestoreError, OperationType } from './firebaseSyncService';
import { Customer } from '../types';

export class CustomerSyncService {
  private unsubscribe: (() => void) | null = null;

  startSync(tableName: string = 'CLIENTES') {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    const colRef = collection(firestoreDb, tableName);
    const q = query(colRef, orderBy('updatedAt', 'desc'), limit(1000));

    this.unsubscribe = onSnapshot(q, async (snapshot) => {
      // Reconciliación: Si un registro local sincronizado ya no existe en la nube, se elimina localmente.
      const remoteIds = new Set(snapshot.docs.map(doc => doc.id));
      const localItems = await db.dynamic_data.where('tableName').equals('CLIENTES').toArray();
      
      const obsoleteItems = localItems.filter(item => 
        item.syncStatus === 'synced' && !remoteIds.has(item.id)
      );

      if (obsoleteItems.length > 0) {
        logger.info('CUSTOMER_SYNC', `Eliminando ${obsoleteItems.length} clientes obsoletos`);
        for (const item of obsoleteItems) {
          await db.dynamic_data.delete(item.id);
        }
      }

      snapshot.docChanges().forEach(async (change) => {
        const data = { id: change.doc.id, ...change.doc.data() } as Customer;
        
        if (change.type === 'added' || change.type === 'modified') {
          // Solo actualizamos si no tenemos una eliminación pendiente localmente para este ID
          const local = await db.dynamic_data.get(change.doc.id);
          if (local?.syncStatus !== 'pending_delete') {
            await CustomerRepository.save({ ...data, syncStatus: 'synced' });
          }
        } else if (change.type === 'removed') {
          // Si se eliminó en la nube, lo borramos localmente de forma directa para evitar bucles
          await db.dynamic_data.delete(change.doc.id);
        }
      });
      logger.info('CUSTOMER_SYNC', `Real-time sync for ${tableName} updated`);
    }, (error) => {
      logger.error('CUSTOMER_SYNC_FAIL', `Error syncing ${tableName}: ${error.message}`, error);
      try {
        handleFirestoreError(error, OperationType.LIST, tableName);
      } catch (e) {
        // Silent fail for background sync
      }
    });

    return this.unsubscribe;
  }

  stopSync() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

export const customerSyncService = new CustomerSyncService();
