
import { db } from '../db';
import { ScanRecord, CountingSession } from '../types';
import { generateUUID, sanitizeBarcode } from './utils';
import { logger } from './logger';

// ==========================================
// WRITE BUFFER OPTIMIZATION (ACID + MIRRORING)
// ==========================================

let scanBuffer: ScanRecord[] = [];
let flushTimer: any = null;
let isFlushing = false;
const MIRROR_KEY = 'logicount_emergency_buffer';

// --- BLACK BOX RECOVERY ---
// Checks for crashed/unsaved data on startup
(async () => {
    try {
        const mirrored = localStorage.getItem(MIRROR_KEY);
        if (mirrored) {
            const parsed = JSON.parse(mirrored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                console.warn(`[Recovery] Found ${parsed.length} unsaved records in Black Box mirror. Recovering...`);
                scanBuffer = [...scanBuffer, ...parsed]; // Merge with any current
                localStorage.removeItem(MIRROR_KEY); // Clear immediately to prevent double-add loop if flush fails repeatedly
                flushBuffer();
            }
        }
    } catch (e) {
        console.error("[Recovery] Failed to check emergency mirror", e);
    }
})();

const saveMirror = () => {
    try {
        if (scanBuffer.length > 0) {
            localStorage.setItem(MIRROR_KEY, JSON.stringify(scanBuffer));
        } else {
            localStorage.removeItem(MIRROR_KEY);
        }
    } catch (e) {
        console.warn("Mirror save failed (Quota?)", e);
    }
};

const flushBuffer = async () => {
    // Prevent re-entry or empty flush
    if (scanBuffer.length === 0 || isFlushing) return;
    
    isFlushing = true;
    
    // Create a local copy of the batch to attempt writing
    const batch = [...scanBuffer];
    
    try {
        // --- CRITICAL: ACID TRANSACTION ---
        await (db as any).transaction('rw', db.scans, db.sessions, async () => {
            // 1. Write the raw scans
            await db.scans.bulkAdd(batch);
            
            // 2. Identify affected sessions
            const affectedSessions = new Set(batch.map(s => s.sessionId));
            
            // 3. Recalculate stats for affected sessions explicitly within the transaction
            for (const sessionId of affectedSessions) {
                let totalUnits = 0;
                const uniqueSkus = new Set<string>();

                await db.scans.where('sessionId').equals(sessionId).each(scan => {
                    totalUnits += scan.quantity;
                    uniqueSkus.add(scan.barcode);
                });

                await db.sessions.update(sessionId, { 
                    totalUnits, 
                    totalSKUs: uniqueSkus.size 
                });
            }
        });

        // SUCCESS: Remove written items from buffer
        const writtenIds = new Set(batch.map(s => s.id));
        scanBuffer = scanBuffer.filter(s => !writtenIds.has(s.id));
        
        // Update Mirror
        saveMirror();

    } catch (e: any) {
        // FAILURE: Retry logic handled by data staying in scanBuffer
        logger.error("Buffer", "Transaction Failed - Retrying next cycle", e);
        console.error("Flush failed, data kept in buffer for retry.");
    } finally {
        isFlushing = false;
        
        // If there are still items (due to failure or new adds), schedule next flush quickly
        if (scanBuffer.length > 0) {
            if (flushTimer) clearTimeout(flushTimer);
            flushTimer = setTimeout(flushBuffer, 500); // Retry/Next in 500ms
        } else {
            flushTimer = null;
        }
    }
};

// --- WATCHDOG ---
// Safety mechanism if isFlushing gets stuck to true (rare race condition)
setInterval(() => {
    if (isFlushing && scanBuffer.length > 0) {
        // If flushing takes > 10s, something is wrong. Release lock.
        console.warn("[Watchdog] Resetting stuck flush lock.");
        isFlushing = false;
        flushBuffer();
    }
}, 10000);

// --- SAFETY MECHANISM: FLUSH ON EXIT ---
if (typeof window !== 'undefined') {
    window.addEventListener('visibilitychange', () => {
        if (document.hidden) flushBuffer();
    });
    window.addEventListener('pagehide', () => {
        flushBuffer();
    });
}

const addToBuffer = (record: ScanRecord) => {
    scanBuffer.push(record);
    saveMirror(); // Sync to LocalStorage immediately
    
    if (scanBuffer.length >= 50) {
        flushBuffer();
    } else if (!flushTimer) {
        flushTimer = setTimeout(flushBuffer, 200);
    }
};

// ==========================================
// SESSION MANAGEMENT
// ==========================================

export const createSession = async (erpOrder: string, logisticsLabel: string): Promise<CountingSession> => {
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
  logger.info('Session', `Created: ${erpOrder} / ${logisticsLabel}`);
  return newSession;
};

export const createDraftSession = async (logisticsLabel: string): Promise<CountingSession> => {
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

export const activateDraftSession = async (draftSessionId: string, erpOrder: string): Promise<CountingSession> => {
    const activeSessions = await db.sessions.where('status').equals('active').toArray();
    if (activeSessions.length > 0) { 
        await Promise.all(activeSessions.map(s => db.sessions.update(s.id, { status: 'completed' }))); 
    }

    await db.sessions.update(draftSessionId, {
        status: 'active',
        erpOrder: erpOrder.trim(),
    });
    logger.info('Session', `Draft Activated: ${erpOrder}`);
    return (await db.sessions.get(draftSessionId)) as CountingSession;
};

export const closeSession = async (sessionId: string) => { 
    await flushBuffer();
    await (db as any).transaction('rw', db.sessions, db.scans, async () => {
        await updateSessionStatsInternal(sessionId);
        await db.sessions.update(sessionId, { status: 'completed' }); 
    });
    logger.info('Session', `Closed: ${sessionId}`);
};

export const deleteSession = async (sessionId: string) => { 
    return (db as any).transaction('rw', db.sessions, db.scans, db.syncQueue, async () => { 
        await db.scans.where('sessionId').equals(sessionId).delete(); 
        await db.sessions.delete(sessionId); 
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
    const syncedSessions = await db.sessions.filter(s => !!s.lastSyncTimestamp && s.lastSyncTimestamp > 0).toArray();
    if (syncedSessions.length === 0) return 0;
    
    let deletedCount = 0;
    await (db as any).transaction('rw', db.sessions, db.scans, db.syncQueue, async () => {
        for (const session of syncedSessions) {
            await db.scans.where('sessionId').equals(session.id).delete();
            await db.sessions.delete(session.id);
            deletedCount++;
        }
    });
    logger.info('Maintenance', `Cleaned ${deletedCount} synced sessions.`);
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

const updateSessionStatsInternal = async (sessionId: string) => {
  let totalUnits = 0;
  const uniqueSkus = new Set<string>();

  await db.scans.where('sessionId').equals(sessionId).each(scan => {
      totalUnits += scan.quantity;
      uniqueSkus.add(scan.barcode);
  });

  await db.sessions.update(sessionId, { totalUnits, totalSKUs: uniqueSkus.size });
};

export const updateSessionStats = async (sessionId: string) => {
    await (db as any).transaction('rw', db.scans, db.sessions, async () => {
        await updateSessionStatsInternal(sessionId);
    });
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

    addToBuffer(record);
    
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
      await (db as any).transaction('rw', db.scans, db.sessions, async () => {
          await db.scans.update(scanId, { quantity: newQuantity, synced: 0 }); 
          await updateSessionStatsInternal(scan.sessionId); 
      });
  }
};

export const deleteScan = async (scanId: string) => { 
    const scan = await db.scans.get(scanId); 
    if (scan) { 
        await (db as any).transaction('rw', db.scans, db.sessions, async () => {
            await db.scans.delete(scanId); 
            await updateSessionStatsInternal(scan.sessionId); 
        });
    } 
};

export const deleteSessionItem = async (sessionId: string, barcode: string) => {
  const cleanCode = sanitizeBarcode(barcode); 
  await (db as any).transaction('rw', db.scans, db.sessions, async () => {
      const scans = await db.scans.where('[sessionId+barcode]').equals([sessionId, cleanCode]).toArray();
      if (scans.length > 0) { 
          const ids = scans.map(s => s.id); 
          await db.scans.bulkDelete(ids); 
          await updateSessionStatsInternal(sessionId); 
      }
  });
};

export const adjustSessionItemQuantity = async (sessionId: string, barcode: string, delta: number) => {
  const cleanCode = sanitizeBarcode(barcode);
  if (delta > 0) { 
      const lastScan = await db.scans.where('[sessionId+barcode]').equals([sessionId, cleanCode]).last(); 
      await addScan(sessionId, cleanCode, delta, lastScan?.mm, lastScan?.yyyy, 0);
  } else {
    let remainingToRemove = Math.abs(delta); 
    await (db as any).transaction('rw', db.scans, db.sessions, async () => { 
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
        if (toDelete.length > 0) await db.scans.bulkDelete(toDelete); 
        if (updateTarget) await db.scans.update(updateTarget.id, { quantity: updateTarget.qty, synced: 0 }); 
        await updateSessionStatsInternal(sessionId); 
    });
  }
};