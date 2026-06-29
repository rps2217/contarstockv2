/**
 * ExpiryItemCard - Card de vencimiento simplificado
 */

import React, { memo } from 'react';
import { Package, Trash2, Calendar, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { ExpiryRecord, ExpiryStatus, formatExpiryDate, getStatusLabel } from '../hooks/useExpiry';

interface ExpiryItemCardProps {
  record: ExpiryRecord;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  onViewDetail: (record: ExpiryRecord) => void;
  isSelected: boolean;
}

const getStatusConfig = (status?: ExpiryStatus) => {
  switch (status) {
    case ExpiryStatus.EXPIRED:
      return {
        color: 'bg-red-500',
        bg: 'bg-red-500/10 border-red-500/30',
        text: 'text-red-400',
        icon: AlertTriangle
      };
    case ExpiryStatus.CRITICAL:
      return {
        color: 'bg-amber-500',
        bg: 'bg-amber-500/10 border-amber-500/30',
        text: 'text-amber-400',
        icon: AlertTriangle
      };
    case ExpiryStatus.WITHDRAWAL:
      return {
        color: 'bg-orange-500',
        bg: 'bg-orange-500/10 border-orange-500/30',
        text: 'text-orange-400',
        icon: Calendar
      };
    case ExpiryStatus.NEXT_EXPIRY:
      return {
        color: 'bg-yellow-500',
        bg: 'bg-yellow-500/10 border-yellow-500/30',
        text: 'text-yellow-400',
        icon: Calendar
      };
    default:
      return {
        color: 'bg-emerald-500',
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        text: 'text-emerald-400',
        icon: CheckCircle2
      };
  }
};

export const ExpiryItemCard: React.FC<ExpiryItemCardProps> = ({
  record,
  onDelete,
  onSelect,
  onViewDetail,
  isSelected
}) => {
  const config = getStatusConfig(record.status);
  const StatusIcon = config.icon;

  const daysLeft = record.daysLeft ?? 0;
  const daysText = daysLeft < 0 
    ? `Venció hace ${Math.abs(daysLeft)} días`
    : daysLeft === 0 
      ? 'Vence hoy'
      : `${daysLeft} días`;

  return (
    <div 
      className={`
        relative p-4 rounded-2xl border transition-all cursor-pointer
        ${isSelected 
          ? 'bg-blue-500/10 border-blue-500/30' 
          : `${config.bg} hover:border-white/20`
        }
      `}
      onClick={() => onSelect(record.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${config.color}`} />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted">
            {getStatusLabel(record.status)}
          </span>
          {record.hasCanje && (
            <span className="px-1.5 py-0.5 text-[8px] font-black uppercase bg-purple-500/20 text-purple-400 rounded">
              CANJE
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[9px] font-mono text-slate-500">
          <RefreshCw className="w-3 h-3" />
          <span>{formatExpiryDate(record.mm, record.yyyy)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <Package className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black uppercase tracking-tight truncate">
              {record.productName || 'Sin producto'}
            </p>
            <p className="text-xs font-mono text-muted">
              {record.barcode}
            </p>
          </div>
        </div>

        <div className={`text-xs font-bold ${config.text} flex items-center gap-1`}>
          <StatusIcon className="w-3 h-3" />
          <span>{daysText}</span>
        </div>

        {record.quantity > 1 && (
          <p className="text-[10px] font-mono text-slate-500">
            {record.quantity} unidades
          </p>
        )}

        {record.location && record.location !== 'N/A' && (
          <p className="text-[10px] font-medium text-slate-500">
            📍 {record.location}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
        <button
          onClick={(e) => { e.stopPropagation(); onViewDetail(record); }}
          className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
        >
          Ver Detalle
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(record.id); }}
          className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default memo(ExpiryItemCard);
