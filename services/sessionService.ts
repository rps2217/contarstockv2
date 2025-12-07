
import { db } from '../db';
import { ScanRecord } from '../types';
import { generateUUID, sanitizeBarcode } from './utils';

// --- STATS ---
export const updateSessionStats = async (sessionId: string) => {
  const scans = await db.scans.where('sessionId').equals(sessionId).toArray();
  const totalUnits = scans.reduce((acc, s) => acc + s.quantity, 0);
  const uniqueSkus = new Set(scans.map(s => s.barcode)).size;
  await db.sessions.update(sessionId, { totalUnits, totalSKUs: uniqueSkus });
};

// --- SCANS READ ---

export const getUnsyncedScans = async (erpOrder: string): Promise<ScanRecord[]> => {
    // 1. Get all sessions for this ERP order
    const sessions = await db.sessions.where('erpOrder').equals(erpOrder).toArray();
    const sessionIds = sessions.map(s => s.id);
    
    if (sessionIds.length === 0) return [];

    // 2. Get all scans for these sessions that are not marked as synced
    const scans = await db.scans.where('sessionId').anyOf(sessionIds).toArray();
    
    // Filter out already synced scans (synced === 1)
    return scans.filter(s => !s.synced || s.synced === 0);
};

// --- SCANS WRITE ---

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
