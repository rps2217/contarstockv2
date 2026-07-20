/**
 * =============================================================================
 * EXPIRY KANBAN CARD - Tarjeta para vista Kanban
 * =============================================================================
 *
 * Componente de tarjeta para la vista Kanban de vencimientos.
 *
 * @module ExpiryPage/expiryKanbanCard
 */

import React from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, MapPin, RefreshCw } from 'lucide-react';
import { ExpiryRecord } from '@/features/expiry/hooks/useExpiry';
import { cn } from '@/lib/utils';
import { getExpiryDateColor } from './expiryHelpers';

interface KanbanCardProps {
  record: ExpiryRecord;
  onClick: () => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ record, onClick }) => {
  const dateColors = getExpiryDateColor(record.daysLeft);
  const day = record.expiryDateObj ? record.expiryDateObj.getDate() : 1;
  const month = record.expiryDateObj ? record.expiryDateObj.getMonth() + 1 : record.mm;
  const year = record.expiryDateObj ? record.expiryDateObj.getFullYear() : record.yyyy;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full bg-surface border border-subtle rounded-xl p-3 text-left hover:bg-elevated hover:border-blue-500/30 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-primary truncate">{record.productName}</p>
          <p className="text-xs text-muted font-mono">{record.barcode}</p>
        </div>
        {record.quantity > 1 && (
          <span className="shrink-0 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full">
            {record.quantity}
          </span>
        )}
      </div>

      <div
        className={cn(
          'flex items-center gap-2 rounded-lg p-2 mb-2',
          dateColors.bg,
          dateColors.border
        )}
      >
        <CalendarClock className={cn('w-4 h-4 shrink-0', dateColors.text)} />
        <div>
          <p className={cn('text-sm font-bold', dateColors.text)}>
            {String(day).padStart(2, '0')}/{String(month).padStart(2, '0')}/{year}
          </p>
          <p className="text-xs text-muted">
            {record.daysLeft < 0
              ? `Venció hace ${Math.abs(record.daysLeft)} días`
              : record.daysLeft === 0
                ? 'Vence hoy'
                : `${record.daysLeft} días`}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        {record.location && (
          <span className="flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            {record.location}
          </span>
        )}
        {record.hasCanje && (
          <span className="flex items-center gap-1 text-emerald-500">
            <RefreshCw className="w-3 h-3" />
            Canje
          </span>
        )}
      </div>
    </motion.button>
  );
};
