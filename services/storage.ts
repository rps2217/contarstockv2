
import { CountingSession } from '../types';
import { db } from '../db';
import { generateUUID, sanitizeBarcode } from './utils';
import * as sessionService from './sessionService'; 
import { getSettings, saveSettings } from './settings';

// Re-export common utilities and settings for UI components (Helper facades are okay for Utils)
export { generateUUID, sanitizeBarcode, getSettings, saveSettings };

// ARCHITECTURE FIX: 
// Removed `export * from './sessionService'` to prevent circular dependencies 
// and force explicit imports in the application layer.

// --- SESSIONS ---

export const createSession = async (erpOrder: string, logisticsLabel: string): Promise<CountingSession> => {
  // Ensure previous sessions are closed
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

// NEW: For Blind Reception
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
        lastSyncTimestamp: 0 // Explicitly 0 to denote not synced to reception table
    };
    await db.sessions.add(newSession);
    return newSession;
};

// NEW: Activate a draft session when starting count
export const activateDraftSession = async (draftSessionId: string, erpOrder: string): Promise<CountingSession> => {
    // CRITICAL FIX: Close any existing active sessions before activating the draft
    // This prevents "Multiple Active Sessions" state which breaks the scanner.
    const activeSessions = await db.sessions.where('status').equals('active').toArray();
    if (activeSessions.length > 0) { 
        await Promise.all(activeSessions.map(s => db.sessions.update(s.id, { status: 'completed' }))); 
    }

    await db.sessions.update(draftSessionId, {
        status: 'active',
        erpOrder: erpOrder.trim(),
        // We do NOT update timestamp, to keep the original reception time
    });
    return (await db.sessions.get(draftSessionId)) as CountingSession;
};

export const closeSession = async (sessionId: string) => { 
    await db.sessions.update(sessionId, { status: 'completed' }); 
    await sessionService.updateSessionStats(sessionId); 
};

export const deleteSession = async (sessionId: string) => { 
    await (db as any).transaction('rw', db.sessions, db.scans, async () => { 
        await db.scans.where('sessionId').equals(sessionId).delete(); 
        await db.sessions.delete(sessionId); 
    }); 
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

// --- ADVANCED EDITING ---

export const deleteSessionItem = async (sessionId: string, barcode: string) => {
  const cleanCode = sanitizeBarcode(barcode); 
  const scans = await db.scans.where('[sessionId+barcode]').equals([sessionId, cleanCode]).toArray();
  if (scans.length > 0) { 
      const ids = scans.map(s => s.id); 
      await db.scans.bulkDelete(ids); 
      await sessionService.updateSessionStats(sessionId); 
  }
};

export const adjustSessionItemQuantity = async (sessionId: string, barcode: string, delta: number) => {
  const cleanCode = sanitizeBarcode(barcode);
  if (delta > 0) { 
      const lastScan = await db.scans.where('[sessionId+barcode]').equals([sessionId, cleanCode]).last(); 
      // Add new scan
      await sessionService.addScan(sessionId, cleanCode, delta, lastScan?.mm, lastScan?.yyyy, 0);
  } else {
    // Remove scans LIFO
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
        await sessionService.updateSessionStats(sessionId); 
    });
  }
};
