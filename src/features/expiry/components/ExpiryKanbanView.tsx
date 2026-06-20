import React, { useMemo, useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Download, 
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Package,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { ExpiryItem } from '../hooks/useExpiryDatabase';
import { ExpiryStatus } from '../domain/expiryEngine';

interface ExpiryKanbanViewProps {
  items: ExpiryItem[];
  onItemClick?: (item: ExpiryItem) => void;
}

interface StatusConfig {
  id: ExpiryStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeColor: string;
}

const STATUS_CONFIGS: Record<ExpiryStatus, StatusConfig> = {
  [ExpiryStatus.EXPIRED]: {
    id: ExpiryStatus.EXPIRED,
    title: 'VENCIDO',
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    badgeColor: 'bg-rose-500',
  },
  [ExpiryStatus.CRITICAL]: {
    id: ExpiryStatus.CRITICAL,
    title: 'CRÍTICO',
    icon: <ShieldAlert className="w-4 h-4" />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    badgeColor: 'bg-amber-500',
  },
  [ExpiryStatus.WITHDRAWAL]: {
    id: ExpiryStatus.WITHDRAWAL,
    title: 'RETIRAR',
    icon: <Download className="w-4 h-4" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    badgeColor: 'bg-orange-500',
  },
  [ExpiryStatus.NEXT_EXPIRY]: {
    id: ExpiryStatus.NEXT_EXPIRY,
    title: 'PRÓXIMO',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    badgeColor: 'bg-blue-500',
  },
  [ExpiryStatus.SAFE]: {
    id: ExpiryStatus.SAFE,
    title: 'VIGENTE',
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    badgeColor: 'bg-emerald-500',
  },
};

const KanbanColumn: React.FC<{
  config: StatusConfig;
  items: ExpiryItem[];
  isExpanded: boolean;
  onToggle: () => void;
  onItemClick?: (item: ExpiryItem) => void;
}> = ({ config, items, isExpanded, onToggle, onItemClick }) => {
  const [showActions, setShowActions] = useState(false);
  
  const hasActions = 
    config.id === ExpiryStatus.EXPIRED || 
    config.id === ExpiryStatus.CRITICAL || 
    config.id === ExpiryStatus.WITHDRAWAL ||
    config.id === ExpiryStatus.NEXT_EXPIRY;

  const canjeCount = items.filter(i => i.hasCanje).length;
  const mermaCount = items.filter(i => !i.hasCanje).length;

  return (
    <div className={`flex-1 min-w-[200px] max-w-[280px] rounded-xl border ${config.borderColor} ${config.bgColor} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className={`w-full p-3 flex items-center justify-between ${config.bgColor} border-b ${config.borderColor}`}
      >
        <div className="flex items-center gap-2">
          <span className={config.color}>{config.icon}</span>
          <span className={`text-xs font-black uppercase tracking-wider ${config.color}`}>
            {config.title}
          </span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${config.badgeColor} text-white`}>
            {items.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className={`w-4 h-4 ${config.color}`} />
        ) : (
          <ChevronDown className={`w-4 h-4 ${config.color}`} />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <>
          <div className="p-2 space-y-2 max-h-[400px] overflow-y-auto">
            {items.slice(0, 20).map((item) => (
              <KanbanCard 
                key={item.id} 
                item={item} 
                config={config}
                onClick={() => onItemClick?.(item)}
              />
            ))}
            {items.length > 20 && (
              <div className="text-center text-[10px] text-slate-500 py-2">
                +{items.length - 20} más
              </div>
            )}
            {items.length === 0 && (
              <div className="text-center text-[10px] text-slate-500 py-4">
                Sin elementos
              </div>
            )}
          </div>

          {/* Bulk Actions */}
          {hasActions && items.length > 0 && (
            <div className={`p-2 border-t ${config.borderColor}`}>
              <button
                onClick={() => setShowActions(!showActions)}
                className={`w-full text-[10px] font-bold uppercase tracking-wider ${config.color} flex items-center justify-center gap-1 py-1`}
              >
                <Zap className="w-3 h-3" />
                Acciones Rápidas
              </button>
              
              {showActions && (
                <div className="mt-2 space-y-1">
                  {(config.id === ExpiryStatus.EXPIRED || config.id === ExpiryStatus.CRITICAL) ? (
                    <>
                      <ActionButton 
                        icon={<RotateCcw className="w-3 h-3" />}
                        label="Solicitar Canje"
                        color="emerald"
                        count={canjeCount}
                      />
                      <ActionButton 
                        icon={<Package className="w-3 h-3" />}
                        label="Generar Merma"
                        color="amber"
                        count={mermaCount}
                      />
                    </>
                  ) : (
                    <>
                      <ActionButton 
                        icon={<Zap className="w-3 h-3" />}
                        label="Impulso Ventas"
                        color="blue"
                        count={canjeCount}
                      />
                      <ActionButton 
                        icon={<Package className="w-3 h-3" />}
                        label="Plan Drenaje"
                        color="orange"
                        count={mermaCount}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const KanbanCard: React.FC<{
  item: ExpiryItem;
  config: StatusConfig;
  onClick?: () => void;
}> = ({ item, config, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full p-2 rounded-lg bg-slate-900/50 border ${config.borderColor} hover:opacity-80 transition-opacity text-left active:scale-[0.98]`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-white truncate max-w-[100px]">
          {item.productName.slice(0, 15)}
        </span>
        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${config.badgeColor} text-white`}>
          {item.daysLeft > 0 ? item.daysLeft : '0'}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[8px] text-slate-500">
        <span className="font-mono">{item.barcode.slice(-6)}</span>
        {item.withdrawalDays !== undefined && (
          <span className={item.hasCanje ? 'text-emerald-500' : 'text-amber-500'}>
            {item.withdrawalDays}D
          </span>
        )}
      </div>
      {item.withdrawalDate && (
        <div className="mt-1 text-[8px] text-slate-400">
          Retiro: {format(item.withdrawalDate, 'dd/MM')}
        </div>
      )}
    </button>
  );
};

const ActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  color: string;
  count: number;
}> = ({ icon, label, color, count }) => {
  const colorClasses: Record<string, string> = {
    emerald: 'text-emerald-400 hover:bg-emerald-500/20',
    amber: 'text-amber-400 hover:bg-amber-500/20',
    blue: 'text-blue-400 hover:bg-blue-500/20',
    orange: 'text-orange-400 hover:bg-orange-500/20',
  };
  
  return (
    <button 
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg ${colorClasses[color] || ''} text-[9px] font-bold uppercase tracking-wider transition-colors`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      <span className="bg-white/10 px-1.5 py-0.5 rounded text-[8px]">{count}</span>
    </button>
  );
};

export const ExpiryKanbanView: React.FC<ExpiryKanbanViewProps> = ({
  items,
  onItemClick,
}) => {
  const [expandedColumns, setExpandedColumns] = useState<Set<ExpiryStatus>>(
    new Set([ExpiryStatus.EXPIRED, ExpiryStatus.CRITICAL])
  );

  const toggleColumn = (status: ExpiryStatus) => {
    setExpandedColumns(prev => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const columns = useMemo(() => {
    const statusOrder = [
      ExpiryStatus.EXPIRED,
      ExpiryStatus.CRITICAL,
      ExpiryStatus.WITHDRAWAL,
      ExpiryStatus.NEXT_EXPIRY,
      ExpiryStatus.SAFE,
    ];

    return statusOrder.map(status => ({
      ...STATUS_CONFIGS[status],
      items: items.filter(item => item.status === status),
    }));
  }, [items]);

  const totals = useMemo(() => ({
    urgent: items.filter(i => 
      i.status === ExpiryStatus.EXPIRED || 
      i.status === ExpiryStatus.CRITICAL
    ).length,
    total: items.length,
  }), [items]);

  return (
    <div className="p-4">
      {/* Summary */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-slate-400">
            Total: <span className="text-white">{totals.total}</span>
          </span>
          {totals.urgent > 0 && (
            <span className="text-sm font-bold text-rose-400">
              Urgentes: <span className="text-rose-300">{totals.urgent}</span>
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Vista Kanban
        </span>
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map(column => (
          <KanbanColumn
            key={column.id}
            config={column}
            items={column.items}
            isExpanded={expandedColumns.has(column.id)}
            onToggle={() => toggleColumn(column.id)}
            onItemClick={onItemClick}
          />
        ))}
      </div>
    </div>
  );
};

export default ExpiryKanbanView;
