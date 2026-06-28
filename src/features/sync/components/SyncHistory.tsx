/**
 * SyncHistory - Componente para mostrar historial de sincronización
 */

import React from 'react';
import { Clock, Database } from 'lucide-react';
import { SyncStatusBadge } from './SyncStatusBadge';
import { formatTimeAgo } from '@/lib/date';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TableSyncInfo {
  tableName: string;
  displayName: string;
  lastSync?: number;
  recordCount?: number;
  status: 'synced' | 'pending' | 'error' | 'never';
}

interface SyncHistoryProps {
  tables: TableSyncInfo[];
  lastSyncTime?: number | null;
  className?: string;
}

export const SyncHistory: React.FC<SyncHistoryProps> = ({
  tables,
  lastSyncTime,
  className = '',
}) => {
  // Formateador específico para el historial con formato localized
  const formatSyncDate = (timestamp?: number | null): string => {
    if (!timestamp) return 'Nunca';
    return format(new Date(timestamp), "dd 'de' MMM, HH:mm", { locale: es });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Resumen general */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Última sincronización general
            </p>
            <p className="font-medium text-gray-900 dark:text-white">
              {formatSyncDate(lastSyncTime)}
            </p>
          </div>
          <div className="ml-auto">
            <SyncStatusBadge 
              status={lastSyncTime ? 'synced' : 'never'} 
              size="md"
            />
          </div>
        </div>
        {lastSyncTime && (
          <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
            {formatTimeAgo(lastSyncTime)}
          </p>
        )}
      </div>

      {/* Tablas */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Estado por tabla
        </h3>
        <div className="grid gap-2">
          {tables.map((table) => (
            <div
              key={table.tableName}
              className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <SyncStatusBadge 
                  status={table.status} 
                  size="sm" 
                  showLabel={false}
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {table.displayName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {table.tableName}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {table.recordCount !== undefined && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {table.recordCount} registros
                  </p>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{formatSyncDate(table.lastSync)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SyncHistory;
