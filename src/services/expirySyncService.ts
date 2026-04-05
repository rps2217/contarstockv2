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

    this.unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        const data = { id: change.doc.id, ...change.doc.data() };
        
        if (change.type === 'added' || change.type === 'modified') {
          await expiryRepository.save(data as any);
        } else if (change.type === 'removed') {
          await expiryRepository.delete(change.doc.id);
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
