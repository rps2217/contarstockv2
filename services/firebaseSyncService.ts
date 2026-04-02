import { db } from '../db';
import { db as firestoreDb, storage } from '../src/lib/firebase';
import { collection, onSnapshot, query, where, doc, setDoc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { logger } from './logger';

export const firebaseSyncService = {
  /**
   * Starts a real-time sync for a specific collection.
   * Updates local Dexie DB when Firestore changes.
   */
  startSync(tableName: string, localTable: any) {
    const colRef = collection(firestoreDb, tableName);
    
    return onSnapshot(colRef, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        const data = { id: change.doc.id, ...change.doc.data() };
        
        if (change.type === 'added' || change.type === 'modified') {
          await localTable.put(data);
        } else if (change.type === 'removed') {
          await localTable.delete(change.doc.id);
        }
      });
      logger.info('SYNC_REALTIME', `SYNC_REALTIME: ${tableName} updated`);
    });
  },

  /**
   * Starts a real-time sync for a specific collection with a filter.
   */
  startFilteredSync(tableName: string, localTable: any, field: string, value: any) {
    const colRef = collection(firestoreDb, tableName);
    const q = query(colRef, where(field, '==', value));
    
    return onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        const data = { id: change.doc.id, ...change.doc.data() };
        
        if (change.type === 'added' || change.type === 'modified') {
          await localTable.put(data);
        } else if (change.type === 'removed') {
          await localTable.delete(change.doc.id);
        }
      });
      logger.info('SYNC_REALTIME', `SYNC_REALTIME: ${tableName} filtered by ${field}=${value} updated`);
    });
  },

  /**
   * Pushes a local change to Firestore.
   */
  async pushChange(tableName: string, id: string, data: any) {
    try {
      const docRef = doc(collection(firestoreDb, tableName), id);
      await setDoc(docRef, data, { merge: true });
    } catch (e) {
      logger.error(`SYNC_PUSH_FAIL: ${tableName}`, e);
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
        batch.set(docRef, row, { merge: true });
      }
      await batch.commit();
      return { success: true, rows_written: rows.length };
    } catch (e) {
      logger.error(`SYNC_BATCH_PUSH_FAIL: ${tableName}`, e);
      return { success: false, error: String(e) };
    }
  },

  async deleteRemote(tableName: string, id: string) {
    try {
      const docRef = doc(collection(firestoreDb, tableName), id);
      await deleteDoc(docRef);
    } catch (e) {
      logger.error(`SYNC_DELETE_FAIL: ${tableName}`, e);
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
