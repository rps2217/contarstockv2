import { collection, onSnapshot, query, limit, orderBy, where } from 'firebase/firestore';
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
    
    // ESTRATEGIA DELTA SYNC:
    // Recuperamos el último timestamp sincronizado para solo pedir lo nuevo.
    const lastSync = localStorage.getItem(`last_sync_${tableName}`);
    const lastSyncTime = lastSync ? parseInt(lastSync) : 0;

    // Solo pedimos documentos cuyo timestamp sea superior al último que tenemos.
    // Esto es el corazón del ahorro de cuota: convertimos miles de lecturas en solo las necesarias.
    const q = query(
      colRef, 
      where('timestamp', '>', lastSyncTime),
      orderBy('timestamp', 'asc') // Ascendente para procesar en orden y actualizar el lastSyncTime correctamente
    );

    this.unsubscribe = onSnapshot(q, async (snapshot) => {
      let latestTimestamp = lastSyncTime;

      snapshot.docChanges().forEach(async (change) => {
        const docData = change.doc.data();
        const data = { id: change.doc.id, ...docData };
        
        // Actualizamos el cursor del último cambio
        if (docData.timestamp && docData.timestamp > latestTimestamp) {
          latestTimestamp = docData.timestamp;
        }

        if (change.type === 'added' || change.type === 'modified') {
          await expiryRepository.save(data as any);
        } else if (change.type === 'removed') {
          await expiryRepository.delete(change.doc.id);
        }
      });

      // Guardamos el nuevo punto de referencia
      if (latestTimestamp > lastSyncTime) {
        localStorage.setItem(`last_sync_${tableName}`, latestTimestamp.toString());
      }
      
      logger.info('EXPIRY_SYNC', `Delta sync processed ${snapshot.size} changes`);
    }, (error) => {
      if (error.code === 'resource-exhausted') {
        logger.error('EXPIRY_SYNC_CRITICAL', 'Cuota agotada: Suspendiendo sincronización hasta nuevo aviso');
        this.stopSync(); // Frenado total de emergencias
      } else {
        logger.error('EXPIRY_SYNC_FAIL', `Error: ${error.message}`);
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
