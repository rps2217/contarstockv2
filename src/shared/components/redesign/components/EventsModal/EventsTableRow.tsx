/**
 * =============================================================================
 * EVENTS TABLE ROW - Fila de tabla de eventos
 * =============================================================================
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { CheckSquare, Square, Edit2, Trash2, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { formatEventDate, STATUS_OPTIONS } from './eventsConstants';
import type { InventoryEvent } from '@/db';

interface EventsTableRowProps {
  event: InventoryEvent;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onEdit: (event: InventoryEvent) => void;
  onDelete: (id: number) => void;
}

export const EventsTableRow: React.FC<EventsTableRowProps> = ({
  event,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
}) => {
  const statusInfo = STATUS_OPTIONS.find(s => s.value === event.status);

  return (
    <tr className={cn('transition-colors', isSelected ? 'bg-blue-500/10' : 'hover:bg-base/50')}>
      {/* Checkbox de selección */}
      <td className="w-10 sm:w-12 px-2 sm:px-4 py-2 sm:py-3">
        <button
          onClick={() => event.id !== undefined && onToggleSelect(event.id)}
          className="flex items-center justify-center w-5 h-5 rounded transition-colors hover:bg-elevated"
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-blue-400" />
          ) : (
            <Square className="w-4 h-4 text-muted" />
          )}
        </button>
      </td>

      {/* FRC */}
      <td className="px-2 sm:px-4 py-2 sm:py-3">
        <span className="text-xs sm:text-sm font-mono text-primary truncate block max-w-[60px] sm:max-w-none">
          {event.frcNumber || '-'}
        </span>
      </td>

      {/* Producto */}
      <td className="px-2 sm:px-4 py-2 sm:py-3">
        <span className="text-xs sm:text-sm text-primary line-clamp-1 block max-w-[80px] sm:max-w-[200px]">
          {event.productName || '-'}
        </span>
      </td>

      {/* Barras */}
      <td className="px-2 sm:px-4 py-2 sm:py-3 hidden sm:table-cell">
        <span className="text-xs sm:text-sm font-mono text-secondary truncate block max-w-[80px]">
          {event.barcode || '-'}
        </span>
      </td>

      {/* Lote */}
      <td className="px-2 sm:px-4 py-2 sm:py-3 hidden md:table-cell">
        <span className="text-xs sm:text-sm text-secondary truncate block max-w-[60px]">
          {event.batch || '-'}
        </span>
      </td>

      {/* Vencimiento */}
      <td className="px-2 sm:px-4 py-2 sm:py-3 hidden lg:table-cell">
        <span className="text-xs sm:text-sm text-secondary">{event.expiryDate || '-'}</span>
      </td>

      {/* Estado */}
      <td className="px-2 sm:px-4 py-2 sm:py-3">
        <span
          className={cn(
            'text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap',
            event.status === 'pending' && 'bg-amber-500/20 text-amber-500',
            event.status === 'destined' && 'bg-blue-500/20 text-blue-500',
            event.status === 'adjusted' && 'bg-emerald-500/20 text-emerald-500'
          )}
        >
          {statusInfo?.label}
        </span>
      </td>

      {/* Indicador de sincronización */}
      <td className="px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-center">
          {event.syncStatus === 'pending' && (
            <div title="Esperando respaldo">
              <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400 animate-spin" />
            </div>
          )}
          {event.syncStatus === 'synced' && (
            <div title="Respaldado">
              <Cloud className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" />
            </div>
          )}
          {event.syncStatus === 'error' && (
            <div title="Error">
              <CloudOff className="w-3 h-3 sm:w-4 sm:h-4 text-rose-400" />
            </div>
          )}
        </div>
      </td>

      {/* Fecha */}
      <td className="px-2 sm:px-4 py-2 sm:py-3 hidden sm:table-cell">
        <span className="text-[10px] sm:text-sm text-muted">
          {event.createdAt ? formatEventDate(event.createdAt) : '-'}
        </span>
      </td>

      {/* Acciones */}
      <td className="px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center gap-0.5 sm:gap-1">
          <button
            onClick={() => onEdit(event)}
            className="p-1 rounded-lg hover:bg-blue-500/20 transition-colors"
            title="Editar"
          >
            <Edit2 className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
          </button>
          <button
            onClick={() => event.id && onDelete(event.id)}
            className="p-1 rounded-lg hover:bg-rose-500/20 transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-rose-500" />
          </button>
        </div>
      </td>
    </tr>
  );
};
