import { collection, onSnapshot, query, limit, orderBy, where } from 'firebase/firestore';
import { db as firestoreDb } from '../lib/firebase';
import { eventRepository } from '../repositories/EventRepository';
import { logger } from './logger';
import { handleFirestoreError, OperationType } from './firebaseSyncService';

export class EventSyncService {
  private unsubscribe: (() => void) | null = null;

  startSync(tableName: string) {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    const colRef = collection(firestoreDb, tableName);
    
    // ESTRATEGIA DELTA SYNC:
    // Recuperamos el último timestamp sincronizado para solo pedir lo nuevo.
    const lastSync = localStorage.getItem(`last_sync_${tableName}`);
    const lastSyncTime = lastSync ? parseInt(lastSync) : 0;

    const q = query(
      colRef, 
      where('timestamp', '>', lastSyncTime),
      orderBy('timestamp', 'asc') // Ascendente para procesar en orden cronológico
    );

    this.unsubscribe = onSnapshot(q, async (snapshot) => {
      let latestTimestamp = lastSyncTime;

      const changes = snapshot.docChanges();
      if (changes.length === 0) return;

      for (const change of changes) {
        const docData = change.doc.data();
        const data = { id: change.doc.id, ...docData };
        
        // Actualizamos el cursor del último cambio
        if (docData.timestamp && docData.timestamp > latestTimestamp) {
          latestTimestamp = docData.timestamp;
        }

        if (change.type === 'added' || change.type === 'modified') {
          await eventRepository.save({ ...(data as any), syncStatus: 'synced' });
        } else if (change.type === 'removed') {
          await eventRepository.delete(change.doc.id);
        }
      }

      // Guardamos el nuevo punto de referencia
      if (latestTimestamp > lastSyncTime) {
        localStorage.setItem(`last_sync_${tableName}`, latestTimestamp.toString());
      }
      
      logger.info('EVENT_SYNC', `Delta sync processed ${snapshot.size} changes for ${tableName}`);
    }, (error) => {
      if (error.code === 'resource-exhausted') {
        logger.error('EVENT_SYNC_CRITICAL', `Cuota agotada en ${tableName}: Suspendiendo sincronización`);
        this.stopSync();
      } else {
        logger.error('EVENT_SYNC_FAIL', `Error syncing ${tableName}: ${error.message}`, error);
        try {
          handleFirestoreError(error, OperationType.LIST, tableName);
        } catch (e) {
          // Silent fail for background sync
        }
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

export const eventSyncService = new EventSyncService();
