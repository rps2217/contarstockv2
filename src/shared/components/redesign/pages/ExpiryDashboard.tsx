/**
 * ExpiryDashboard - Dashboard de vencimientos
 * 
 * Muestra productos próximos a vencer y vencidos.
 */

import React, { useMemo } from 'react';
import { useExpiryTracker, ExpiryEntry } from '@/features/counting/hooks/useExpiryTracker';
import { motion } from 'framer-motion';
import { Calendar, AlertTriangle, CheckCircle, XCircle, Download, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTHS_ES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const getStatusConfig = (status: ExpiryEntry['status']) => {
  switch (status) {
    case 'expired':
      return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Vencido' };
    case 'warning':
      return { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Por vencer' };
    case 'valid':
      return { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Válido' };
    default:
      return { icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Pendiente' };
  }
};

interface ExpiryCardProps {
  entry: ExpiryEntry;
  onEdit?: (entry: ExpiryEntry) => void;
}

const ExpiryCard: React.FC<ExpiryCardProps> = ({ entry, onEdit }) => {
  const config = getStatusConfig(entry.status);
  const StatusIcon = config.icon;
  const expiryDate = `${MONTHS_ES[entry.mm] || entry.mm}/${entry.yyyy}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-xl border transition-colors',
        config.bg,
        config.border
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-primary truncate">{entry.productName || 'Producto sin nombre'}</p>
          <p className="text-xs text-muted font-mono mt-1">{entry.barcode}</p>
          
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-muted" />
              <span className="text-sm font-medium text-secondary">{expiryDate}</span>
            </div>
            {entry.quantity && (
              <span className="text-xs text-muted">Qty: {entry.quantity}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-lg', config.bg)}>
            <StatusIcon className={cn('w-4 h-4', config.color)} />
            <span className={cn('text-xs font-medium', config.color)}>{config.label}</span>
          </div>
          
          {onEdit && (
            <button
              onClick={() => onEdit(entry)}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Editar
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

interface ExpiryDashboardProps {
  onEditEntry?: (entry: ExpiryEntry) => void;
  onExport?: () => void;
  maxItems?: number;
}

export const ExpiryDashboard: React.FC<ExpiryDashboardProps> = ({
  onEditEntry,
  onExport,
  maxItems
}) => {
  const { useExpirations, useExpiringSoon, useExpired } = useExpiryTracker();
  
  const allExpirations = useExpirations(maxItems);
  const expiringSoon = useExpiringSoon(3);
  const expired = useExpired();

  const stats = useMemo(() => ({
    total: allExpirations?.length || 0,
    expired: expired?.length || 0,
    expiringSoon: expiringSoon?.length || 0,
    valid: (allExpirations?.length || 0) - (expired?.length || 0) - (expiringSoon?.length || 0)
  }), [allExpirations, expired, expiringSoon]);

  const groupedEntries = useMemo(() => {
    const groups: Record<string, ExpiryEntry[]> = {
      expired: [],
      warning: [],
      valid: [],
      pending: []
    };
    
    allExpirations?.forEach(entry => {
      if (entry.status === 'expired') groups.expired.push(entry);
      else if (entry.status === 'warning') groups.warning.push(entry);
      else if (entry.status === 'pending') groups.pending.push(entry);
      else groups.valid.push(entry);
    });
    
    return groups;
  }, [allExpirations]);

  return (
    <div className="space-y-6">
      {/* Header con stats */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-primary">Dashboard de Vencimientos</h2>
        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Exportar</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-surface rounded-xl border border-subtle">
          <div className="flex items-center gap-2 text-muted">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Total</span>
          </div>
          <p className="text-2xl font-bold text-primary mt-1">{stats.total}</p>
        </div>
        
        <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
          <div className="flex items-center gap-2 text-red-400">
            <XCircle className="w-4 h-4" />
            <span className="text-sm">Vencidos</span>
          </div>
          <p className="text-2xl font-bold text-red-400 mt-1">{stats.expired}</p>
        </div>
        
        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">Por vencer</span>
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-1">{stats.expiringSoon}</p>
        </div>
        
        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Válidos</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.valid}</p>
        </div>
      </div>

      {/* Lista de Vencimientos */}
      <div className="space-y-4">
        {/* Vencidos primero */}
        {groupedEntries.expired.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Productos Vencidos ({groupedEntries.expired.length})
            </h3>
            <div className="space-y-2">
              {groupedEntries.expired.map(entry => (
                <ExpiryCard key={entry.id} entry={entry} onEdit={onEditEntry} />
              ))}
            </div>
          </div>
        )}

        {/* Por vencer */}
        {groupedEntries.warning.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Próximos a Vencer ({groupedEntries.warning.length})
            </h3>
            <div className="space-y-2">
              {groupedEntries.warning.map(entry => (
                <ExpiryCard key={entry.id} entry={entry} onEdit={onEditEntry} />
              ))}
            </div>
          </div>
        )}

        {/* Válidos */}
        {groupedEntries.valid.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Válidos ({groupedEntries.valid.length})
            </h3>
            <div className="space-y-2">
              {groupedEntries.valid.map(entry => (
                <ExpiryCard key={entry.id} entry={entry} onEdit={onEditEntry} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {stats.total === 0 && (
          <div className="text-center py-12 text-muted">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No hay registros de vencimiento</p>
            <p className="text-sm mt-1">Los vencimientos se registrarán al escanear productos pharma</p>
          </div>
        )}
      </div>
    </div>
  );
};
