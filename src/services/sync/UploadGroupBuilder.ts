/**
 * UploadGroupBuilder - Construye grupos de upload para sincronización
 * 
 * Extraído de syncManager.ts para reducir complejidad y mejorar mantenibilidad.
 */

import { db } from '../../db';
import { CountingSession } from '../../types';

export interface UploadGroup {
  erpOrder: string;
  sessionCount: number;
  totalUnits: number;
  sessionIds: string[];
  logisticsLabels: string[];
  type: 'inventory' | 'reception' | 'products' | 'orphans' | 'dynamic';
  sessionType?: string;
}

const UPLOAD_BATCH_SIZE = 500;

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
 * Determina el tipo de grupo basado en la sesión
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
  return UPLOAD_BATCH_SIZE;
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
