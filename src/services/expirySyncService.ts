import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { db as firestoreDb } from '../lib/firebase';
import { expiryRepository } from '../repositories/ExpiryRepository';
import { logger } from './logger';
import { handleFirestoreError, OperationType } from './firebaseSyncService';

export class ExpirySyncService {
  private unsubscribe: (() => void) | null = null;

  startSync(tableName: string) {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    const colRef = collection(firestoreDb, tableName);
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(3000));

    this.unsubscribe = onSnapshot(q, async (snapshot) => {
      // RECONCILIACIÓN INICIAL: Si es la primera carga o hay cambios masivos, 
      // verificamos qué registros locales ya no existen en la nube.
      const remoteIds = new Set(snapshot.docs.map(doc => doc.id));
      const localItems = await expiryRepository.getAll();
      
      // Solo reconciliamos registros que ya han sido sincronizados previamente (tienen syncStatus === 'synced')
      // para no borrar borradores locales que aún no suben a la nube.
      const obsoleteItems = localItems.filter(item => 
        item.syncStatus === 'synced' && !remoteIds.has(item.id)
      );

      if (obsoleteItems.length > 0) {
        logger.info('EXPIRY_SYNC', `Eliminando ${obsoleteItems.length} registros obsoletos detectados en reconciliación`);
        for (const item of obsoleteItems) {
          await (import('../db')).then(m => m.db.dynamic_data.delete(item.id));
        }
      }

      snapshot.docChanges().forEach(async (change) => {
        const data = { id: change.doc.id, ...change.doc.data() };
        
        if (change.type === 'added' || change.type === 'modified') {
          // Solo actualizamos si no hay una eliminación pendiente local
          const db = (await import('../db')).db;
          const local = await db.dynamic_data.get(change.doc.id);
          if (local?.syncStatus !== 'pending_delete') {
            await expiryRepository.save(data as any);
          }
        } else if (change.type === 'removed') {
          // Si se eliminó en la nube, lo borramos localmente de forma directa
          const db = (await import('../db')).db;
          await db.dynamic_data.delete(change.doc.id);
        }
      });
      logger.info('EXPIRY_SYNC', `Real-time sync for ${tableName} updated`);
    }, (error) => {
      logger.error('EXPIRY_SYNC_FAIL', `Error syncing ${tableName}: ${error.message}`, error);
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

export const expirySyncService = new ExpirySyncService();
