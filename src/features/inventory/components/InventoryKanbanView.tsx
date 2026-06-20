import React, { useMemo, useState } from 'react';
import { 
  Package, 
  Tags, 
  AlertTriangle, 
  CheckCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Building2,
  Zap
} from 'lucide-react';
import { ProductWithPolicy } from '../../product/types';

interface InventoryKanbanViewProps {
  products: ProductWithPolicy[];
  onItemClick?: (product: ProductWithPolicy) => void;
}

type GroupBy = 'category' | 'policy' | 'sync';

interface KanbanGroup {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: ProductWithPolicy[];
}

const PolicyBadge: React.FC<{ hasExchange?: boolean; days?: number }> = ({ hasExchange, days }) => {
  if (days === undefined) return null;
  
  return (
    <span className={`inline-flex items-center gap-0.5 text-[8px] font-black px-1 py-0.5 rounded border ${
      hasExchange 
        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
        : 'bg-amber-500/20 text-amber-500 border-amber-500/30'
    }`}>
      {hasExchange ? <RotateCcw className="w-2.5 h-2.5" /> : <Package className="w-2.5 h-2.5" />}
      {days}D
    </span>
  );
};

const KanbanCard: React.FC<{
  product: ProductWithPolicy;
  onClick?: () => void;
}> = ({ product, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors text-left active:scale-[0.98]"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-white truncate max-w-[120px]">
          {product.name.slice(0, 20)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[8px] text-slate-500">
        <span className="font-mono">{product.barcode.slice(-8)}</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        {product.category && (
          <span className="text-[7px] font-medium px-1 py-0.5 rounded bg-slate-700/50 text-slate-400">
            {product.category.slice(0, 8)}
          </span>
        )}
        <PolicyBadge hasExchange={product.hasExchange} days={product.withdrawalDays} />
      </div>
      {product.supplier && (
        <div className="mt-1 flex items-center gap-1 text-[7px] text-slate-500">
          <Building2 className="w-2.5 h-2.5" />
          <span className="truncate">{product.supplier.slice(0, 12)}</span>
        </div>
      )}
    </button>
  );
};

export const InventoryKanbanView: React.FC<InventoryKanbanViewProps> = ({
  products,
  onItemClick,
}) => {
  const [groupBy, setGroupBy] = useState<GroupBy>('category');
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(
    new Set(['category_1', 'sin_categoria', 'sin_politica'])
  );

  const toggleColumn = (id: string) => {
    setExpandedColumns(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const columns = useMemo(() => {
    const groups = new Map<string, { title: string; icon: React.ReactNode; items: ProductWithPolicy[] }>();

    products.forEach(p => {
      let key: string;
      let title: string;
      let icon: React.ReactNode;
      
      if (groupBy === 'category') {
        key = `cat_${p.category || 'sin_categoria'}`;
        title = p.category || 'SIN CATEGORÍA';
        icon = <Tags className="w-3 h-3" />;
      } else if (groupBy === 'policy') {
        if (p.withdrawalDays === undefined) {
          key = 'sin_politica';
          title = 'SIN POLÍTICA';
          icon = <AlertTriangle className="w-3 h-3" />;
        } else if (p.hasExchange) {
          key = 'con_canje';
          title = 'CON CANJE';
          icon = <RotateCcw className="w-3 h-3" />;
        } else {
          key = 'sin_canje';
          title = 'SIN CANJE';
          icon = <Package className="w-3 h-3" />;
        }
      } else {
        // sync
        key = `sync_${p.syncStatus || 'pending'}`;
        title = p.syncStatus === 'synced' ? 'SINCRONIZADOS' 
          : p.syncStatus === 'error' ? 'CON ERRORES' 
          : 'PENDIENTES';
        icon = p.syncStatus === 'synced' 
          ? <CheckCircle className="w-3 h-3" /> 
          : p.syncStatus === 'error'
            ? <AlertTriangle className="w-3 h-3" />
            : <Package className="w-3 h-3" />;
      }

      if (!groups.has(key)) {
        groups.set(key, { title, icon, items: [] } as any);
      }
      groups.get(key)!.items.push(p);
    });

    // Sort groups by count
    const sortedGroups: Array<{ id: string; title: string; icon: React.ReactNode; items: ProductWithPolicy[] }> = 
      Array.from(groups.entries())
        .map(([key, data]) => ({ id: key, ...data }))
        .sort((a, b) => b.items.length - a.items.length);

    return sortedGroups;
  }, [products, groupBy]);

  const colorForColumn = (id: string) => {
    if (id.includes('sin_categoria') || id === 'sin_politica' || id.includes('error')) {
      return {
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
      };
    }
    if (id.includes('canje') || id.includes('synced')) {
      return {
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
      };
    }
    return {
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
    };
  };

  return (
    <div className="p-4">
      {/* Controls */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-slate-400">
            Total: <span className="text-white">{products.length}</span>
          </span>
        </div>
        <div className="flex gap-1">
          {[
            { id: 'category', label: 'Categoría' },
            { id: 'policy', label: 'Política' },
            { id: 'sync', label: 'Sync' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setGroupBy(opt.id as GroupBy)}
              className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors ${
                groupBy === opt.id 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.slice(0, 8).map(col => {
          const colors = colorForColumn(col.id);
          const isExpanded = expandedColumns.has(col.id);
          
          return (
            <div 
              key={col.id}
              className={`flex-1 min-w-[180px] max-w-[240px] rounded-xl border ${colors.borderColor} ${colors.bgColor} overflow-hidden`}
            >
              {/* Header */}
              <button
                onClick={() => toggleColumn(col.id)}
                className={`w-full p-2 flex items-center justify-between ${colors.bgColor} border-b ${colors.borderColor}`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={colors.color}>{col.icon}</span>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${colors.color}`}>
                    {String(col.title).slice(0, 12)}
                  </span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-800 text-white`}>
                    {(col as any).items?.length || 0}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className={`w-3 h-3 ${colors.color}`} />
                ) : (
                  <ChevronDown className={`w-3 h-3 ${colors.color}`} />
                )}
              </button>

              {/* Content */}
              {isExpanded && (
                <div className="p-2 space-y-2 max-h-[350px] overflow-y-auto">
                  {(col as any).items?.slice(0, 15).map((p: Product) => (
                    <KanbanCard 
                      key={p.barcode} 
                      product={p} 
                      onClick={() => onItemClick?.(p)}
                    />
                  ))}
                  {(col as any).items?.length > 15 && (
                    <div className="text-center text-[9px] text-slate-500 py-2">
                      +{(col as any).items.length - 15} más
                    </div>
                  )}
                  {(col as any).items?.length === 0 && (
                    <div className="text-center text-[9px] text-slate-500 py-4">
                      Sin elementos
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InventoryKanbanView;
