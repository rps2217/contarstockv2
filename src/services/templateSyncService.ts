
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { db as firestoreDb } from '../lib/firebase';
import { db } from '../db';
import { MessageTemplateRepository } from '../repositories/MessageTemplateRepository';
import { logger } from './logger';
import { handleFirestoreError, OperationType } from './firebaseSyncService';
import { MessageTemplate } from '../types';

export class TemplateSyncService {
  private unsubscribe: (() => void) | null = null;
  private tableName = 'PLANTILLAS_MENSAJES';

  startSync() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    const colRef = collection(firestoreDb, this.tableName);
    const q = query(colRef, orderBy('updatedAt', 'desc'), limit(100));

    this.unsubscribe = onSnapshot(q, async (snapshot) => {
      // Reconciliación
      const remoteIds = new Set(snapshot.docs.map(doc => doc.id));
      const localItems = await db.dynamic_data.where('tableName').equals(this.tableName).toArray();
      
      const obsoleteItems = localItems.filter(item => 
        item.syncStatus === 'synced' && !remoteIds.has(item.id)
      );

      if (obsoleteItems.length > 0) {
        logger.info('TEMPLATE_SYNC', `Eliminando ${obsoleteItems.length} plantillas obsoletas`);
        for (const item of obsoleteItems) {
          await db.dynamic_data.delete(item.id);
        }
      }

      snapshot.docChanges().forEach(async (change) => {
        const data = { id: change.doc.id, ...change.doc.data() } as MessageTemplate;
        
        if (change.type === 'added' || change.type === 'modified') {
          const local = await db.dynamic_data.get(change.doc.id);
          if (local?.syncStatus !== 'pending_delete') {
            await MessageTemplateRepository.save({ ...data });
          }
        } else if (change.type === 'removed') {
          await db.dynamic_data.delete(change.doc.id);
        }
      });
      logger.info('TEMPLATE_SYNC', `Real-time sync for ${this.tableName} updated`);
    }, (error) => {
      logger.error('TEMPLATE_SYNC_FAIL', `Error syncing ${this.tableName}: ${error.message}`);
      try {
        handleFirestoreError(error, OperationType.LIST, this.tableName);
      } catch (e) {}
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

export const templateSyncService = new TemplateSyncService();
