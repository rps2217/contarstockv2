/**
 * ReceptionCard - Tarjeta de presentación de una recepción
 */

import React from 'react';
import { motion } from 'framer-motion';
import { PackageCheck, Clock, Package, Eye, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Reception {
  id: string;
  supplierName?: string;
  supplierRut?: string;
  documentNumber?: string;
  documentType?: string;
  receivedBy?: string;
  location?: string;
  receivedAt: number;
  items: { barcode: string; name?: string; quantity: number; expiry?: string }[];
  observations?: string;
  status: 'pending' | 'in-progress' | 'completed';
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface ReceptionCardProps {
  reception: Reception;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const statusConfig = {
  pending: { bg: 'bg-amber-500/20', text: 'text-amber-500', label: 'Pendiente', icon: Clock },
  'in-progress': {
    bg: 'bg-blue-500/20',
    text: 'text-blue-500',
    label: 'En Progreso',
    icon: Package,
  },
  completed: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-500',
    label: 'Completado',
    icon: CheckCircle2,
  },
};

export const ReceptionCard: React.FC<ReceptionCardProps> = ({
  reception,
  onView,
  onEdit,
  onDelete,
}) => {
  const status = statusConfig[reception.status];
  const StatusIcon = status.icon;
  const date = reception.receivedAt
    ? new Date(reception.receivedAt).toLocaleDateString('es-CL')
    : '-';
  const time = reception.receivedAt
    ? new Date(reception.receivedAt).toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-surface border border-subtle rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
          <PackageCheck className="w-6 h-6 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-primary truncate flex-1">
              {reception.supplierName || 'Recepción sin proveedor'}
            </h3>
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0',
                status.bg,
                status.text
              )}
            >
              {status.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {reception.documentNumber && (
              <span className="font-mono">{reception.documentNumber}</span>
            )}
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              {reception.items?.length || 0}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {date} {time}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-subtle flex">
        <button
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-xs text-muted hover:text-primary hover:bg-elevated transition-colors"
        >
          <Eye className="w-4 h-4" />
          Ver
        </button>
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-xs text-muted hover:text-amber-500 hover:bg-elevated transition-colors border-l border-subtle"
        >
          <Pencil className="w-4 h-4" />
          Editar
        </button>
        <button
          onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-xs text-muted hover:text-rose-500 hover:bg-elevated transition-colors border-l border-subtle"
        >
          <Trash2 className="w-4 h-4" />
          Eliminar
        </button>
      </div>
    </motion.div>
  );
};

export default ReceptionCard;
