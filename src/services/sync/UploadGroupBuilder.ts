/**
 * UploadGroupBuilder - Construye grupos de upload para sincronizacion
 *
 * Extraido de syncManager.ts para reducir complejidad y mejorar mantenibilidad.
 */

import { db } from '../../db';
import { CountingSession } from '../../types';
import { unifiedSyncEngine } from './unified';

export interface UploadGroup {
  erpOrder: string;
  sessionCount: number;
  totalUnits: number;
  sessionIds: string[];
  logisticsLabels: string[];
  type: 'inventory' | 'reception' | 'products' | 'orphans' | 'dynamic';
  sessionType?: string;
}

/**
 * Agrupa sesiones pendientes por orden ERP
 */
export const getPendingUploadGroups = async (): Promise<UploadGroup[]> => {
  const pendingSessions = await db.sessions
    .where('syncStatus')
    .anyOf(['pending', 'error'])
    .toArray();

  if (pendingSessions.length === 0) {
    return [];
  }

  // Agrupar por erpOrder
  const groupsMap = new Map<string, UploadGroup>();

  for (const session of pendingSessions) {
    const erpOrder = session.erpOrder || 'ORPHANS';

    if (!groupsMap.has(erpOrder)) {
      groupsMap.set(erpOrder, {
        erpOrder,
        sessionCount: 0,
        totalUnits: 0,
        sessionIds: [],
        logisticsLabels: [],
        type: getGroupType(session),
        sessionType: session.sessionType,
      });
    }

    const group = groupsMap.get(erpOrder)!;
    group.sessionCount++;
    group.totalUnits += session.totalUnits || 0;
    group.sessionIds.push(session.id);

    if (session.logisticsLabel) {
      group.logisticsLabels.push(session.logisticsLabel);
    }
  }

  return Array.from(groupsMap.values());
};

/**
 * Alias de getPendingUploadGroups para compatibilidad
 */
export const getPendingGroups = getPendingUploadGroups;

/**
 * Sube un grupo de datos usando el motor unificado
 */
export const uploadGroupCompat = async (
  group: UploadGroup,
  onProgress?: (message: string) => void
): Promise<{ success: boolean; uploaded: number }> => {
  // Obtener sesiones del grupo
  const sessions = await db.sessions
    .where('id')
    .anyOf(group.sessionIds)
    .toArray();

  // Preparar datos para upload - usar campos que existen en CountingSession
  const data = sessions.map(s => ({
    id: s.id,
    erpOrder: s.erpOrder,
    sessionType: s.sessionType,
    createdAt: s.createdAt,
    status: s.status,
    totalUnits: s.totalUnits,
    logisticsLabel: s.logisticsLabel,
    syncStatus: 'synced',
    lastSyncTimestamp: Date.now(),
  }));

  onProgress?.(`Subiendo ${data.length} sesiones...`);

  const result = await unifiedSyncEngine.pushBatch('sessions', data);

  if (result.success) {
    // Marcar sesiones como sincronizadas
    await db.sessions.bulkPut(
      sessions.map(s => ({ ...s, syncStatus: 'synced' as const }))
    );
    onProgress?.(`Upload completado: ${result.uploaded} sesiones`);
  } else {
    onProgress?.(`Error: ${result.errors?.join(', ')}`);
  }

  return {
    success: result.success,
    uploaded: result.uploaded || 0,
  };
};

/**
 * Determina el tipo de grupo basado en la sesion
 */
function getGroupType(session: { erpOrder?: string; sessionType?: string }): UploadGroup['type'] {
  if (!session.erpOrder || session.erpOrder === 'ORPHANS') {
    return 'orphans';
  }

  if (session.sessionType === 'reception') {
    return 'reception';
  }

  if (session.sessionType === 'hammer') {
    return 'inventory';
  }

  return 'inventory';
}

/**
 * Obtiene el batch size configurado
 */
export const getUploadBatchSize = (): number => {
  return 500;
};

/**
 * Filtra grupos por tipo
 */
export const filterGroupsByType = (
  groups: UploadGroup[],
  type: UploadGroup['type']
): UploadGroup[] => {
  return groups.filter(g => g.type === type);
};

/**
 * Ordena grupos por prioridad
 */
export const sortGroupsByPriority = (groups: UploadGroup[]): UploadGroup[] => {
  const priority: Record<UploadGroup['type'], number> = {
    reception: 1,
    inventory: 2,
    dynamic: 3,
    products: 4,
    orphans: 5,
  };

  return [...groups].sort((a, b) => {
    const priorityDiff = priority[a.type] - priority[b.type];
    if (priorityDiff !== 0) return priorityDiff;

    // Dentro de misma prioridad, ordenar por cantidad de unidades (mayor primero)
    return b.totalUnits - a.totalUnits;
  });
};
