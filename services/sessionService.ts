
import { db } from '../db';
import { ScanRecord, CountingSession } from '../types';
import { generateUUID, sanitizeBarcode } from './utils';

// ==========================================
// SESSION MANAGEMENT (Formerly in storage.ts)
// ==========================================

export const createSession = async (erpOrder: string, logisticsLabel: string): Promise<CountingSession> => {
  // Ensure previous active sessions are closed to maintain single-session integrity
  const activeSessions = await db.sessions.where('status').equals('active').toArray();
  if (activeSessions.length > 0) { 
      await Promise.all(activeSessions.map(s => db.sessions.update(s.id, { status: 'completed' }))); 
  }
  
  const newSession: CountingSession = { 
      id: generateUUID(), 
      erpOrder: erpOrder.trim(), 
      logisticsLabel: logisticsLabel.trim(), 
      createdAt: Date.now(), 
      status: 'active', 
      totalUnits: 0, 
      totalSKUs: 0 
  };
  
  await db.sessions.add(newSession); 
  return newSession;
};

// For Blind Reception
export const createDraftSession = async (logisticsLabel: string): Promise<CountingSession> => {
    // Check duplication to avoid double scanning the same label in reception mode
    const existing = await db.sessions.where('logisticsLabel').equals(logisticsLabel).first();
    if (existing) {
        throw new Error('Etiqueta ya registrada');
    }

    const newSession: CountingSession = {
        id: generateUUID(),
        erpOrder: 'PENDIENTE',
        logisticsLabel: logisticsLabel.trim(),
        createdAt: Date.now(),
        status: 'draft',
        totalUnits: 0,
        totalSKUs: 0,
        lastSyncTimestamp: 0
    };
    await db.sessions.add(newSession);
    return newSession;
};

// Activate a draft session when starting count
export const activateDraftSession = async (draftSessionId: string, erpOrder: string): Promise<CountingSession> => {
    const activeSessions = await db.sessions.where('status').equals('active').toArray();
    if (activeSessions.length > 0) { 
        await Promise.all(activeSessions.map(s => db.sessions.update(s.id, { status: 'completed' }))); 
    }

    await db.sessions.update(draftSessionId, {
        status: 'active',
        erpOrder: erpOrder.trim(),
    });
    return (await db.sessions.get(draftSessionId)) as CountingSession;
};

export const closeSession = async (sessionId: string) => { 
    await db.sessions.update(sessionId, { status: 'completed' }); 
    await updateSessionStats(sessionId); 
};

export const deleteSession = async (sessionId: string) => { 
    await (db as any).transaction('rw', db.sessions, db.scans, db.syncQueue, async () => { 
        await db.scans.where('sessionId').equals(sessionId).delete(); 
        await db.sessions.delete(sessionId); 

        // Delete Orphaned Sync Jobs
        const pendingJobs = await db.syncQueue.toArray();
        const jobsToDelete = pendingJobs
            .filter(job => job.session && job.session.id === sessionId)
            .map(job => job.id as number); 
        
        if (jobsToDelete.length > 0) {
            await db.syncQueue.bulkDelete(jobsToDelete);
        }
    }); 
};

export const cleanSyncedSessions = async (): Promise<number> => {
    const syncedSessions = await db.sessions
        .filter(s => !!s.lastSyncTimestamp && s.lastSyncTimestamp > 0)
        .toArray();

    if (syncedSessions.length === 0) return 0;

    let deletedCount = 0;
    for (const session of syncedSessions) {
        await deleteSession(session.id);
        deletedCount++;
    }
    return deletedCount;
};

export const getActiveSession = async (): Promise<CountingSession | undefined> => { 
    return await db.sessions.where('status').equals('active').first(); 
};

export const markErpSessionsAsSynced = async (erpOrder: string) => {
    const sessions = await db.sessions.where('erpOrder').equals(erpOrder).toArray();
    if (sessions.length > 0) { 
        await db.sessions.where('id').anyOf(sessions.map(s => s.id)).modify({ lastSyncTimestamp: Date.now() }); 
    }
};

export const markDraftsAsSynced = async (sessionIds: string[]) => {
    if (sessionIds.length === 0) return;
    await db.sessions.where('id').anyOf(sessionIds).modify({ lastSyncTimestamp: Date.now() });
};

// ==========================================
// ITEM / SCAN MANAGEMENT
// ==========================================

export const updateSessionStats = async (sessionId: string) => {
  const scans = await db.scans.where('sessionId').equals(sessionId).toArray();
  const totalUnits = scans.reduce((acc, s) => acc + s.quantity, 0);
  const uniqueSkus = new Set(scans.map(s => s.barcode)).size;
  await db.sessions.update(sessionId, { totalUnits, totalSKUs: uniqueSkus });
};

export const getUnsyncedScans = async (erpOrder: string): Promise<ScanRecord[]> => {
    const sessions = await db.sessions.where('erpOrder').equals(erpOrder).toArray();
    const sessionIds = sessions.map(s => s.id);
    
    if (sessionIds.length === 0) return [];

    const scans = await db.scans.where('sessionId').anyOf(sessionIds).toArray();
    return scans.filter(s => !s.synced || s.synced === 0);
};

export const addScan = async (
    sessionId: string, 
    barcode: string, 
    quantity: number, 
    mm?: number, 
    yyyy?: number,
    synced: number = 0,
    isIncident: boolean = false
): Promise<ScanRecord> => {
    const cleanCode = sanitizeBarcode(barcode);
    const record: ScanRecord = {
        id: generateUUID(),
        sessionId,
        barcode: cleanCode,
        quantity,
        timestamp: Date.now(),
        mm,
        yyyy,
        synced,
        isIncident
    };

    await db.scans.add(record);
    await updateSessionStats(sessionId);
    return record;
};

export const markScansAsSynced = async (scanIds: string[]) => {
    if (scanIds.length === 0) return;
    await db.scans.where('id').anyOf(scanIds).modify({ synced: 1 });
};

export const updateScanIncident = async (scanId: string, isIncident: boolean) => {
    await db.scans.update(scanId, { isIncident: isIncident, synced: 0 });
};

export const updateScanQuantity = async (scanId: string, newQuantity: number) => {
  const scan = await db.scans.get(scanId); 
  if (scan) { 
      await db.scans.update(scanId, { quantity: newQuantity, synced: 0 }); 
      await updateSessionStats(scan.sessionId); 
  }
};

export const deleteScan = async (scanId: string) => { 
    const scan = await db.scans.get(scanId); 
    if (scan) { 
        await db.scans.delete(scanId); 
        await updateSessionStats(scan.sessionId); 
    } 
};

// Advanced Item Editing (Complex Logic)
export const deleteSessionItem = async (sessionId: string, barcode: string) => {
  const cleanCode = sanitizeBarcode(barcode); 
  const scans = await db.scans.where('[sessionId+barcode]').equals([sessionId, cleanCode]).toArray();
  if (scans.length > 0) { 
      const ids = scans.map(s => s.id); 
      await db.scans.bulkDelete(ids); 
      await updateSessionStats(sessionId); 
  }
};

export const adjustSessionItemQuantity = async (sessionId: string, barcode: string, delta: number) => {
  const cleanCode = sanitizeBarcode(barcode);
  if (delta > 0) { 
      const lastScan = await db.scans.where('[sessionId+barcode]').equals([sessionId, cleanCode]).last(); 
      await addScan(sessionId, cleanCode, delta, lastScan?.mm, lastScan?.yyyy, 0);
  } else {
    // Remove scans LIFO (Last In First Out)
    let remainingToRemove = Math.abs(delta); 
    const scans = await db.scans.where('[sessionId+barcode]').equals([sessionId, cleanCode]).reverse().sortBy('timestamp'); 
    
    const toDelete: string[] = []; 
    let updateTarget: { id: string, qty: number } | null = null;
    
    for (const scan of scans) { 
        if (remainingToRemove <= 0) break; 
        if (scan.quantity > remainingToRemove) { 
            updateTarget = { id: scan.id, qty: scan.quantity - remainingToRemove }; 
            remainingToRemove = 0; 
        } else { 
            toDelete.push(scan.id); 
            remainingToRemove -= scan.quantity; 
        } 
    }
    
    await (db as any).transaction('rw', db.scans, db.sessions, async () => { 
        if (toDelete.length > 0) await db.scans.bulkDelete(toDelete); 
        if (updateTarget) await db.scans.update(updateTarget.id, { quantity: updateTarget.qty, synced: 0 }); 
        await updateSessionStats(sessionId); 
    });
  }
};
