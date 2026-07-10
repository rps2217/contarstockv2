"use client";
/**
 * Audit Export - Exportar logs de auditoría a Excel/CSV
 * 
 * Funcionalidad inspirada en AppSheet Audit History export.
 * Permite exportar logs con filtros avanzados.
 */

import { AuditLog, AuditAction, AuditSeverity } from '@/stores';
import type { AuditFilters } from '@/store/useAuditStore';

// =============================================================================
// TIPOS
// =============================================================================

export interface AuditExportOptions {
  /** Formato de exportación */
  format: 'xlsx' | 'csv';
  /** Incluir detalles completos */
  includeDetails?: boolean;
  /** Incluir datos antiguos/nuevos */
  includeChanges?: boolean;
  /** Nombre del archivo */
  filename?: string;
  /** Fecha de inicio del filtro */
  startDate?: Date;
  /** Fecha de fin del filtro */
  endDate?: Date;
}

/**
 * Fila de exportación
 */
interface ExportRow {
  ID: string | number;
  Timestamp: string;
  Date: string;
  Time: string;
  User: string;
  Action: string;
  Table: string;
  Record: string;
  Severity: string;
  Details: string;
  OldValue?: string;
  NewValue?: string;
  Duration?: string;
}

// =============================================================================
// HELPERS DE FORMATEO
// =============================================================================

/**
 * Formatea fecha para Excel
 */
function formatDate(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  return d.toLocaleDateString('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Formatea hora para Excel
 */
function formatTime(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  return d.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Formatea timestamp completo
 */
function formatTimestamp(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  return d.toLocaleString('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Obtiene etiqueta legible para acción
 */
function getActionLabel(action: AuditAction): string {
  const labels: Record<AuditAction, string> = {
    create: 'Crear',
    update: 'Actualizar',
    delete: 'Eliminar',
    read: 'Leer',
    sync: 'Sincronizar',
    error: 'Error',
    login: 'Login',
    logout: 'Logout',
    export: 'Exportar',
    import: 'Importar',
    approve: 'Aprobar',
    reject: 'Rechazar',
    submit: 'Enviar',
    cancel: 'Cancelar',
    custom: 'Personalizada',
    permission_change: 'Cambio de permisos',
    settings_change: 'Cambio de configuración',
  };
  return labels[action] || action;
}

/**
 * Obtiene etiqueta legible para severidad
 */
function getSeverityLabel(severity: AuditSeverity): string {
  const labels: Record<AuditSeverity, string> = {
    info: 'Info',
    warning: 'Advertencia',
    error: 'Error',
    critical: 'Crítico',
    success: 'Éxito',
  };
  return labels[severity] || severity;
}

/**
 * Formatea datos cambiantes para exportación
 */
function formatChanges(changes?: Record<string, { old: any; new: any }>): string {
  if (!changes) return '';
  
  return Object.entries(changes)
    .map(([field, { old: oldVal, new: newVal }]) => {
      const oldStr = oldVal === undefined || oldVal === null ? '(vacío)' : String(oldVal);
      const newStr = newVal === undefined || newVal === null ? '(vacío)' : String(newVal);
      return `${field}: ${oldStr} → ${newStr}`;
    })
    .join('; ');
}

/**
 * Formatea detalles adicionales
 */
function formatDetails(
  details?: string | Record<string, any>
): string {
  if (!details) return '';
  
  if (typeof details === 'string') return details;
  
  return JSON.stringify(details, null, 2);
}

// =============================================================================
// TRANSFORMACIÓN DE DATOS
// =============================================================================

/**
 * Transforma un log de auditoría a fila de exportación
 */
function transformToExportRow(log: AuditLog, options: AuditExportOptions): ExportRow {
  const timestamp = typeof log.timestamp === 'number' 
    ? log.timestamp 
    : new Date(log.timestamp).getTime();
  
  const baseRow: ExportRow = {
    ID: log.id || 0,
    Timestamp: formatTimestamp(timestamp),
    Date: formatDate(timestamp),
    Time: formatTime(timestamp),
    User: log.userId || 'Sistema',
    Action: getActionLabel(log.action),
    Table: log.entityType || '-',
    Record: log.entityId || '-',
    Severity: getSeverityLabel(log.severity || 'info'),
    Details: formatDetails(log.description),
  };

  // Incluir cambios si está habilitado
  if (options.includeChanges && log.changes) {
    baseRow.OldValue = formatChanges(log.changes as Record<string, { old: any; new: any }> | undefined);
    baseRow.NewValue = '';
  }

  return baseRow;
}

// =============================================================================
// EXPORTACIÓN CSV
// =============================================================================

/**
 * Genera contenido CSV
 */
function generateCSV(rows: ExportRow[], headers: string[]): string {
  const escape = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const headerRow = headers.map(escape).join(',');
  const dataRows = rows.map(row => 
    headers.map(h => escape(String(row[h as keyof ExportRow] || ''))).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Descarga CSV
 */
async function downloadCSV(content: string, filename: string): Promise<void> {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// =============================================================================
// EXPORTACIÓN XLSX (usando SheetJS/xlsx)
// =============================================================================

/**
 * Genera y descarga Excel
 */
async function downloadXLSX(rows: ExportRow[], filename: string): Promise<void> {
  // Dynamic import para no cargar xlsx si no es necesario
  const XLSX = await import('xlsx');
  
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Auditoría');
  
  // Ajustar anchos de columna
  const colWidths = [
    { wch: 8 },   // ID
    { wch: 20 },  // Timestamp
    { wch: 12 },  // Date
    { wch: 10 },  // Time
    { wch: 15 },  // User
    { wch: 12 },  // Action
    { wch: 15 },  // Table
    { wch: 25 },  // Record
    { wch: 10 },  // Severity
    { wch: 40 },  // Details
  ];
  ws['!cols'] = colWidths;

  const xlsxFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, xlsxFilename);
}

// =============================================================================
// FUNCIÓN PRINCIPAL DE EXPORTACIÓN
// =============================================================================

/**
 * Exporta logs de auditoría a archivo
 */
export async function exportAuditLogs(
  logs: AuditLog[],
  options: AuditExportOptions = { format: 'xlsx' }
): Promise<void> {
  const {
    format = 'xlsx',
    includeChanges = false,
    includeDetails = true,
    filename = `audit_export_${formatDate(new Date())}`,
    startDate,
    endDate,
  } = options;

  // Filtrar por fechas si se especificaron
  let filteredLogs = logs;
  
  if (startDate) {
    const start = startDate.getTime();
    filteredLogs = filteredLogs.filter(log => {
      const ts = typeof log.timestamp === 'number' ? log.timestamp : new Date(log.timestamp).getTime();
      return ts >= start;
    });
  }
  
  if (endDate) {
    const end = endDate.getTime();
    filteredLogs = filteredLogs.filter(log => {
      const ts = typeof log.timestamp === 'number' ? log.timestamp : new Date(log.timestamp).getTime();
      return ts <= end;
    });
  }

  // Transformar a filas de exportación
  const rows: ExportRow[] = filteredLogs.map(log => 
    transformToExportRow(log, { ...options, includeChanges })
  );

  if (rows.length === 0) {
    throw new Error('No hay registros para exportar');
  }

  // Exportar según formato
  if (format === 'csv') {
    const headers = includeChanges
      ? ['ID', 'Timestamp', 'Date', 'Time', 'User', 'Action', 'Table', 'Record', 'Severity', 'Details', 'OldValue']
      : ['ID', 'Timestamp', 'Date', 'Time', 'User', 'Action', 'Table', 'Record', 'Severity', 'Details'];
    
    const csvContent = generateCSV(rows, headers);
    await downloadCSV(csvContent, filename);
  } else {
    await downloadXLSX(rows, filename);
  }
}

/**
 * Genera un resumen de auditoría
 */
export function generateAuditSummary(
  logs: AuditLog[]
): AuditSummary {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;

  const today = logs.filter(log => {
    const ts = typeof log.timestamp === 'number' ? log.timestamp : new Date(log.timestamp).getTime();
    return ts >= now - oneDay;
  });

  const thisWeek = logs.filter(log => {
    const ts = typeof log.timestamp === 'number' ? log.timestamp : new Date(log.timestamp).getTime();
    return ts >= now - oneWeek;
  });

  // Contar por acción
  const byAction = logs.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Contar por severidad
  const bySeverity = logs.reduce((acc, log) => {
    const sev = log.severity || 'info';
    acc[sev] = (acc[sev] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Contar por tabla
  const byTable = logs.reduce((acc, log) => {
    const table = log.entityType || 'unknown';
    acc[table] = (acc[table] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Errores recientes
  const recentErrors = logs.filter(log => 
    log.severity === 'error' || log.severity === 'critical'
  ).slice(0, 10);

  return {
    totalLogs: logs.length,
    todayCount: today.length,
    thisWeekCount: thisWeek.length,
    byAction,
    bySeverity,
    byTable,
    recentErrors,
    oldestLog: logs.length > 0 ? logs[logs.length - 1].timestamp : null,
    newestLog: logs.length > 0 ? logs[0].timestamp : null,
  };
}

export interface AuditSummary {
  totalLogs: number;
  todayCount: number;
  thisWeekCount: number;
  byAction: Record<string, number>;
  bySeverity: Record<string, number>;
  byTable: Record<string, number>;
  recentErrors: AuditLog[];
  oldestLog: number | Date | null;
  newestLog: number | Date | null;
}

// =============================================================================
// HOOK PARA COMPONENTE
// =============================================================================

import { useState, useCallback } from 'react';

/**
 * Hook para manejar exportación de auditoría
 */
export function useAuditExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportLogs = useCallback(async (
    logs: AuditLog[],
    options?: Partial<AuditExportOptions>
  ) => {
    setIsExporting(true);
    setError(null);

    try {
      await exportAuditLogs(logs, {
        format: 'xlsx',
        includeDetails: true,
        includeChanges: false,
        ...options,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al exportar');
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportCSV = useCallback(async (
    logs: AuditLog[],
    options?: Partial<AuditExportOptions>
  ) => {
    setIsExporting(true);
    setError(null);

    try {
      await exportAuditLogs(logs, {
        format: 'csv',
        includeDetails: true,
        ...options,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al exportar');
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    exportLogs,
    exportCSV,
    isExporting,
    error,
    clearError: () => setError(null),
  };
}
