/**
 * Compatibilidad para uploadBatch con UploadGroup
 * 
 * Convierte UploadGroup al formato esperado por uploadBatch
 */

import { db } from '@/db';
import { uploadBatch } from './unified';
import type { UploadGroup } from './UploadGroupBuilder';

/**
 * Convierte un UploadGroup a formato de upload
 */
async function convertUploadGroupToBatch(group: UploadGroup): Promise<{ type: string; data: Record<string, unknown>[] }> {
  const tableName = mapGroupTypeToTable(group.type);
  
  // Obtener datos de las sesiones
  const sessions = await db.sessions
    .where('id')
    .anyOf(group.sessionIds)
    .toArray();
  
  // Obtener scans de las sesiones
  const scans = await db.scans
    .where('sessionId')
    .anyOf(group.sessionIds)
    .toArray();
  
  // Combinar datos según el tipo
  let data: Record<string, unknown>[] = [];
  
  switch (group.type) {
    case 'inventory':
    case 'reception':
      data = sessions.map(s => ({
        id: s.id,
        status: s.status,
        erpOrder: s.erpOrder,
        createdAt: s.createdAt,
        timestamp: s.createdAt,
      }));
      break;
    case 'products':
      data = scans.map(s => ({
        id: s.id,
        sessionId: s.sessionId,
        barcode: s.barcode,
        quantity: s.quantity,
        timestamp: s.timestamp,
      }));
      break;
    default:
      data = [
        ...sessions.map(s => ({ ...s, _type: 'session' })),
        ...scans.map(s => ({ ...s, _type: 'scan' })),
      ];
  }
  
  return { type: tableName, data };
}

function mapGroupTypeToTable(type: string): string {
  const mapping: Record<string, string> = {
    'inventory': 'INVENTARIO',
    'reception': 'RECEPCION',
    'products': 'PRODUCTOS',
    'orphans': 'ORPHANS',
    'dynamic': 'DYNAMIC',
  };
  return mapping[type] || type;
}

/**
 * Upload un grupo de datos usando el motor unificado
 * Compatible con UploadGroup
 */
export async function uploadGroupCompat(
  group: UploadGroup,
  onProgress?: (message: string) => void
): Promise<{ success: boolean; uploaded: number }> {
  try {
    const batchData = await convertUploadGroupToBatch(group);
    return uploadBatch(batchData, onProgress);
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    onProgress?.(`Error: ${err}`);
    return { success: false, uploaded: 0 };
  }
}

export default uploadGroupCompat;
