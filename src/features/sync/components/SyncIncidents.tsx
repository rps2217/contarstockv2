/**
 * SyncIncidents - Componente para mostrar incidentes de sincronización
 */

import React from 'react';
import { AlertTriangle, Clock, XCircle } from 'lucide-react';
import { formatTimeHHMMSS, formatDateShort } from '@/lib/date';

interface Incident {
  table: string;
  error: string;
  time: number;
}

interface SyncIncidentsProps {
  incidents: Incident[];
  onClear?: () => void;
  className?: string;
}

export const SyncIncidents: React.FC<SyncIncidentsProps> = ({
  incidents,
  onClear,
  className = '',
}) => {

  if (incidents.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <XCircle className="w-12 h-12 mx-auto mb-2 text-green-500 opacity-50" />
        <p>No hay incidentes</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Incidentes ({incidents.length})
        </h3>
        {onClear && (
          <button
            onClick={onClear}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Limpiar todos
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {incidents.map((incident, index) => (
          <div
            key={`${incident.table}-${incident.time}-${index}`}
            className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-red-700 dark:text-red-400 truncate">
                    {incident.table}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-red-500/70">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeHHMMSS(incident.time)}</span>
                  </div>
                </div>
                <p className="text-sm text-red-600 dark:text-red-300 mt-1 break-words">
                  {incident.error}
                </p>
                <p className="text-xs text-red-400/60 mt-1">
                  {formatDateShort(incident.time)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SyncIncidents;
