/**
 * Conflict Resolution Helper - Utilidades para UI de conflictos
 */

import type { ConflictResolution } from './types';

/**
 * Opciones de resolución de conflictos disponibles
 */
export const CONFLICT_RESOLUTIONS: Array<{
  value: ConflictResolution;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: 'local_wins',
    label: 'Mantener Local',
    description: 'Usar la versión guardada en este dispositivo',
    icon: '📱',
  },
  {
    value: 'remote_wins',
    label: 'Usar Nube',
    description: 'Reemplazar con la versión de la nube',
    icon: '☁️',
  },
  {
    value: 'merge',
    label: 'Combinar',
    description: 'Fusionar ambos cambios automáticamente',
    icon: '🔀',
  },
  {
    value: 'manual',
    label: 'Elegir Manualmente',
    description: 'Seleccionar campo por campo',
    icon: '✋',
  },
];

/**
 * Obtiene la etiqueta para un tipo de resolución
 */
export function getConflictResolutionLabel(type: ConflictResolution): string {
  const found = CONFLICT_RESOLUTIONS.find(r => r.value === type);
  return found?.label ?? type;
}

/**
 * Obtiene el icono para un tipo de resolución
 */
export function getConflictResolutionIcon(type: ConflictResolution): string {
  const found = CONFLICT_RESOLUTIONS.find(r => r.value === type);
  return found?.icon ?? '❓';
}

/**
 * Formatea los campos en conflicto para display
 */
export function formatConflictFields(
  localValue: Record<string, unknown>,
  remoteValue: Record<string, unknown>
): Array<{
  field: string;
  local: unknown;
  remote: unknown;
  isDifferent: boolean;
}> {
  const allKeys = new Set([
    ...Object.keys(localValue),
    ...Object.keys(remoteValue),
  ]);

  const ignoredFields = new Set([
    'syncStatus',
    'syncError',
    'lastSyncTimestamp',
    'id',
    'updatedAt',
    'createdAt',
  ]);

  return Array.from(allKeys)
    .filter(key => !ignoredFields.has(key))
    .map(field => ({
      field,
      local: localValue[field],
      remote: remoteValue[field],
      isDifferent: JSON.stringify(localValue[field]) !== JSON.stringify(remoteValue[field]),
    }))
    .filter(item => item.isDifferent);
}

/**
 * Compara dos valores para determinar si hay diferencia
 */
export function hasConflict(
  localValue: unknown,
  remoteValue: unknown
): boolean {
  return JSON.stringify(localValue) !== JSON.stringify(remoteValue);
}

/**
 * Genera un diff visual entre dos valores
 */
export function generateDiff(
  localValue: unknown,
  remoteValue: unknown
): { added: string[]; removed: string[]; changed: string[] } {
  const localStr = JSON.stringify(localValue, null, 2);
  const remoteStr = JSON.stringify(remoteValue, null, 2);
  
  // Simple line-by-line diff
  const localLines = localStr.split('\n');
  const remoteLines = remoteStr.split('\n');
  
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  
  const maxLines = Math.max(localLines.length, remoteLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const localLine = localLines[i] ?? '';
    const remoteLine = remoteLines[i] ?? '';
    
    if (!localLines[i] && remoteLines[i]) {
      added.push(remoteLine);
    } else if (localLines[i] && !remoteLines[i]) {
      removed.push(localLine);
    } else if (localLine !== remoteLine) {
      changed.push(`- ${localLine}\n+ ${remoteLine}`);
    }
  }
  
  return { added, removed, changed };
}