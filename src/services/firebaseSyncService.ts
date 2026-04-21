import { db } from '../db';
import { db as firestoreDb, storage, auth } from '../lib/firebase';
import { collection, onSnapshot, query, where, doc, setDoc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { logger } from './logger';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const firebaseSyncService = {
  /**
   * Starts a real-time sync for a specific collection.
   * Updates local Dexie DB when Firestore changes.
   * USES DELTA SYNC STRATEGY TO SAVE QUOTA.
   */
  startSync(tableName: string, localTable: any) {
    const colRef = collection(firestoreDb, tableName);
    
    // DELTA SYNC: Solo pedimos lo nuevo basado en el último timestamp local
    const lastSync = localStorage.getItem(`last_sync_${tableName}`);
    const lastSyncTime = lastSync ? parseInt(lastSync) : 0;

    const q = query(
      colRef, 
      where('timestamp', '>', lastSyncTime)
    );

    return onSnapshot(q, (snapshot) => {
      let latestTimestamp = lastSyncTime;

      snapshot.docChanges().forEach(async (change) => {
        const docData = change.doc.data();
        const data = { id: change.doc.id, ...docData };
        
        if (docData.timestamp && docData.timestamp > latestTimestamp) {
          latestTimestamp = docData.timestamp;
        }

        if (change.type === 'added' || change.type === 'modified') {
          await localTable.put(data);
        } else if (change.type === 'removed') {
          await localTable.delete(change.doc.id);
        }
      });

      if (latestTimestamp > lastSyncTime) {
        localStorage.setItem(`last_sync_${tableName}`, latestTimestamp.toString());
      }
      
      logger.info('SYNC_REALTIME', `Delta sync: ${tableName} processed ${snapshot.size} changes`);
    }, (error) => {
      if (error.code === 'resource-exhausted') {
        logger.error('SYNC_REALTIME_CRITICAL', `Cuota agotada en ${tableName}: Suspendiendo`);
      } else {
        logger.error('SYNC_REALTIME_FAIL', `Error en tabla ${tableName}: ${error.message}`, error);
        handleFirestoreError(error, OperationType.LIST, tableName);
      }
    });
  },

  /**
   * Starts a real-time sync for a specific collection with a filter.
   * COMPATIBLE WITH DELTA SYNC TO SAVE QUOTA.
   */
  startFilteredSync(tableName: string, localTable: any, field: string, value: any) {
    const colRef = collection(firestoreDb, tableName);
    
    // DELTA SYNC: Solo pedimos lo nuevo basado en el último timestamp local
    const lastSync = localStorage.getItem(`last_sync_${tableName}_${field}_${value}`);
    const lastSyncTime = lastSync ? parseInt(lastSync) : 0;

    const q = query(
      colRef, 
      where(field, '==', value),
      where('timestamp', '>', lastSyncTime)
    );
    
    return onSnapshot(q, (snapshot) => {
      let latestTimestamp = lastSyncTime;

      snapshot.docChanges().forEach(async (change) => {
        const docData = change.doc.data();
        const data = { id: change.doc.id, ...docData };
        
        if (docData.timestamp && docData.timestamp > latestTimestamp) {
          latestTimestamp = docData.timestamp;
        }

        if (change.type === 'added' || change.type === 'modified') {
          await localTable.put(data);
        } else if (change.type === 'removed') {
          await localTable.delete(change.doc.id);
        }
      });

      if (latestTimestamp > lastSyncTime) {
        localStorage.setItem(`last_sync_${tableName}_${field}_${value}`, latestTimestamp.toString());
      }

      logger.info('SYNC_REALTIME', `Delta sync filtered: ${tableName} updated`);
    }, (error) => {
      if (error.code === 'resource-exhausted') {
        logger.error('SYNC_REALTIME_FILTERED_CRITICAL', `Cuota agotada en filtrado ${tableName}`);
      } else {
        logger.error('SYNC_REALTIME_FILTERED_FAIL', `Error filtrado en tabla ${tableName}: ${error.message}`, error);
        handleFirestoreError(error, OperationType.LIST, tableName);
      }
    });
  },

  /**
   * Pushes a local change to Firestore.
   */
  async pushChange(tableName: string, id: string, data: any) {
    try {
      const sanitized = this.sanitizeData(data);
      const docRef = doc(collection(firestoreDb, tableName), id);
      await setDoc(docRef, sanitized, { merge: true });
    } catch (e) {
      logger.error(`SYNC_PUSH_FAIL: ${tableName}`, e);
      handleFirestoreError(e, OperationType.WRITE, `${tableName}/${id}`);
    }
  },

  /**
   * Pushes a batch of changes to Firestore.
   */
  async pushBatch(tableName: string, rows: any[]) {
    try {
      const colRef = collection(firestoreDb, tableName);
      const batch = writeBatch(firestoreDb);
      for (const row of rows) {
        const docRef = doc(colRef, String(row.ID || row.id));
        const sanitized = this.sanitizeData(row);
        batch.set(docRef, sanitized, { merge: true });
      }
      await batch.commit();
      return { success: true, rows_written: rows.length };
    } catch (e) {
      logger.error(`SYNC_BATCH_PUSH_FAIL: ${tableName}`, e);
      try {
        handleFirestoreError(e, OperationType.WRITE, tableName);
      } catch (err) {
        return { success: false, error: String(e) };
      }
      return { success: false, error: String(e) };
    }
  },

  /**
   * Removes undefined fields from object to prevent Firestore errors.
   */
  sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    // Create a shallow copy to avoid mutating original
    const result = { ...data };
    
    Object.keys(result).forEach(key => {
      if (result[key] === undefined) {
        delete result[key];
      } else if (result[key] !== null && typeof result[key] === 'object' && !Array.isArray(result[key])) {
        // Recursive sanitization for nested objects (not arrays)
        result[key] = this.sanitizeData(result[key]);
      }
    });
    
    return result;
  },

  async deleteRemote(tableName: string, id: string) {
    try {
      const docRef = doc(collection(firestoreDb, tableName), id);
      await deleteDoc(docRef);
    } catch (e) {
      logger.error(`SYNC_DELETE_FAIL: ${tableName}`, e);
      handleFirestoreError(e, OperationType.DELETE, `${tableName}/${id}`);
    }
  },

  async query(tableName: string, field: string, value: any) {
    try {
      const colRef = collection(firestoreDb, tableName);
      const q = query(colRef, where(field, '==', value));
      const snapshot = await getDocs(q);
      const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, rows };
    } catch (e) {
      logger.error(`SYNC_QUERY_FAIL: ${tableName}`, e);
      try {
        handleFirestoreError(e, OperationType.LIST, tableName);
      } catch (err) {
        return { success: false, rows: [], error: String(e) };
      }
      return { success: false, rows: [], error: String(e) };
    }
  },

  async pullBatch(tableName: string) {
    try {
      const colRef = collection(firestoreDb, tableName);
      const snapshot = await getDocs(colRef);
      const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, rows };
    } catch (e) {
      logger.error(`SYNC_PULL_FAIL: ${tableName}`, e);
      try {
        handleFirestoreError(e, OperationType.LIST, tableName);
      } catch (err) {
        return { success: false, rows: [], error: String(e) };
      }
      return { success: false, rows: [], error: String(e) };
    }
  },

  async uploadPhoto(base64: string, path: string) {
    try {
      const storageRef = ref(storage, path);
      // Remove data:image/jpeg;base64, if present
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      await uploadString(storageRef, base64Data, 'base64');
      const downloadURL = await getDownloadURL(storageRef);
      return { success: true, fileUrl: downloadURL };
    } catch (e) {
      logger.error('PHOTO_UPLOAD_FAIL', e);
      return { success: false, error: String(e) };
    }
  }
};

// Forced GitHub sync
