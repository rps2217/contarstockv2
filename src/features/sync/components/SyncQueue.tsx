/**
 * SyncQueue - Componente para mostrar cola de sincronización pendiente
 */

import React from 'react';
import { Clock, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { SyncStatusBadge } from './SyncStatusBadge';

interface QueueItem {
  id: string;
  table: string;
  action: 'pending' | 'pending_delete' | 'error';
  data?: Record<string, unknown>;
  timestamp: number;
  retryCount?: number;
}

interface SyncQueueProps {
  items: QueueItem[];
  onRetry?: (item: QueueItem) => void;
  onDelete?: (item: QueueItem) => void;
  className?: string;
}

export const SyncQueue: React.FC<SyncQueueProps> = ({
  items,
  onRetry,
  onDelete,
  className = '',
}) => {
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'pending_delete':
        return <Trash2 className="w-4 h-4 text-red-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActionLabel = (action: string): string => {
    switch (action) {
      case 'pending':
        return 'Pendiente';
      case 'pending_delete':
        return 'Eliminar';
      case 'error':
        return 'Error';
      default:
        return action;
    }
  };

  if (items.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500 opacity-50" />
        <p>No hay elementos pendientes</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
        >
          <div className="flex items-center gap-3">
            {getActionIcon(item.action)}
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {item.table}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{formatTime(item.timestamp)}</span>
                <span>•</span>
                <span className={`
                  ${item.action === 'error' ? 'text-red-500' : ''}
                  ${item.action === 'pending' ? 'text-yellow-500' : ''}
                `}>
                  {getActionLabel(item.action)}
                </span>
                {item.retryCount !== undefined && item.retryCount > 0 && (
                  <>
                    <span>•</span>
                    <span>{item.retryCount} reintentos</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SyncStatusBadge 
              status={item.action === 'error' ? 'error' : 'pending'} 
              size="sm" 
              showLabel={false}
            />
            {item.action === 'error' && onRetry && (
              <button
                onClick={() => onRetry(item)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                title="Reintentar"
              >
                <Clock className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(item)}
                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SyncQueue;
