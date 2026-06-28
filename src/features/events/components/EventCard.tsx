/**
 * EventCard - Card de evento simplificado (patrón Expiry)
 */

import React, { memo } from 'react';
import { Package, Trash2, FileText, MapPin, Clock, Eye } from 'lucide-react';
import { 
  EventRecord, 
  getEventStatusLabel,
  getEventStatusConfig,
  formatEventDate 
} from '../hooks/useEvents';

interface EventCardProps {
  record: EventRecord;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  onViewDetail: (record: EventRecord) => void;
  isSelected: boolean;
}

export const EventCard: React.FC<EventCardProps> = memo(({
  record,
  onDelete,
  onSelect,
  onViewDetail,
  isSelected
}) => {
  const config = getEventStatusConfig(record.status);
  const statusLabel = getEventStatusLabel(record.status);

  return (
    <div 
      className={`
        relative p-4 rounded-2xl border transition-all cursor-pointer
        ${isSelected 
          ? 'bg-blue-500/10 border-blue-500/30' 
          : `${config.bg} ${config.border} hover:border-white/20`
        }
      `}
      onClick={() => onSelect(record.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${config.color}`} />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[9px] font-mono text-slate-500">
          <Clock className="w-3 h-3" />
          <span>{formatEventDate(record.timestamp)}</span>
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
            <p className="text-xs font-mono text-slate-400">
              {record.barcode}
            </p>
          </div>
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap gap-2 text-[10px]">
          {record.frc && (
            <span className="flex items-center gap-1 text-slate-500">
              <FileText className="w-3 h-3" />
              FRC: {record.frc}
            </span>
          )}
          {record.destino && (
            <span className="flex items-center gap-1 text-amber-400">
              <MapPin className="w-3 h-3" />
              {record.destino}
            </span>
          )}
        </div>

        {record.observaciones && (
          <p className="text-[10px] font-medium text-slate-500 italic truncate">
            {record.observaciones}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
        <button
          onClick={(e) => { e.stopPropagation(); onViewDetail(record); }}
          className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          <Eye className="w-3 h-3" />
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
});

EventCard.displayName = 'EventCard';

export default EventCard;
