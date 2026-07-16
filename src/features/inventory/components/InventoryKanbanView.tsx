import React, { useMemo, useState } from 'react';
import { 
  Package, 
  Tags, 
  AlertTriangle, 
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  RotateCcw,
  Building2,
  Barcode
} from 'lucide-react';
import { ProductWithPolicy } from '../../product/types';

interface InventoryKanbanViewProps {
  products: ProductWithPolicy[];
  onItemClick?: (product: ProductWithPolicy) => void;
}

type GroupBy = 'category' | 'policy' | 'sync';

/** Tipo para grupo del kanban */
interface KanbanGroup {
  title: string;
  icon: React.ReactNode;
  items: ProductWithPolicy[];
}

// ============================================================================
// MOBILE LIST VIEW - Simple, touch-friendly
// ============================================================================
const MobileProductItem: React.FC<{
  product: ProductWithPolicy;
  onClick?: () => void;
  showGroup?: boolean;
  groupColor?: string;
}> = React.memo(({ product, onClick, showGroup, groupColor }) => {
  return (
    <button
      onClick={onClick}
      className="w-full p-3 rounded-xl bg-surface border border-subtle hover:bg-elevated transition-colors text-left active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${groupColor || 'bg-blue-500/10'}`}>
          <Package className={`w-5 h-5 ${groupColor ? 'text-current' : 'text-blue-400'}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary truncate">
            {product.name || 'Sin nombre'}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-muted">
              <Barcode className="w-3 h-3" />
              <span className="font-mono text-[10px]">{product.barcode}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {product.category && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-elevated text-secondary">
                {product.category}
              </span>
            )}
            {product.withdrawalDays !== undefined && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                product.hasExchange 
                  ? 'bg-emerald-500/15 text-emerald-400' 
                  : 'bg-amber-500/15 text-amber-400'
              }`}>
                {product.hasExchange ? 'Canje' : 'Sin canje'} • {product.withdrawalDays}D
              </span>
            )}
          </div>
        </div>
        
        <ChevronRight className="w-5 h-5 text-muted shrink-0" />
      </div>
    </button>
  );
});

const PolicyBadge: React.FC<{ hasExchange?: boolean; days?: number }> = React.memo(({ hasExchange, days }) => {
  if (days === undefined) return null;
  
  return (
    <span className={`inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded border ${
      hasExchange 
        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
        : 'bg-amber-500/20 text-amber-500 border-amber-500/30'
    }`}>
      {hasExchange ? <RotateCcw className="w-3 h-3" /> : <Package className="w-3 h-3" />}
      {days}D
    </span>
  );
});

// ============================================================================
// DESKTOP KANBAN VIEW
// ============================================================================

const KanbanCard: React.FC<{
  product: ProductWithPolicy;
  onClick?: () => void;
}> = React.memo(({ product, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full p-2 rounded-lg bg-elevated/50 border border-subtle/50 hover:border-slate-600 transition-colors text-left active:scale-[0.98]"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-white truncate max-w-[140px]">
          {product.name?.slice(0, 25) || 'Sin nombre'}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[9px] text-slate-500">
        <span className="font-mono">{product.barcode.slice(-8)}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
        {product.category && (
          <span className="text-[8px] font-medium px-1.5 py-0.5 rounded bg-slate-700/50 text-muted">
            {product.category.slice(0, 10)}
          </span>
        )}
        <PolicyBadge hasExchange={product.hasExchange} days={product.withdrawalDays} />
      </div>
    </button>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const InventoryKanbanView: React.FC<InventoryKanbanViewProps> = ({
  products,
  onItemClick,
}) => {
  const [groupBy, setGroupBy] = useState<GroupBy>('category');
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(
    new Set(['category_1', 'sin_categoria', 'sin_politica'])
  );
  
  // Mobile detection
  const [isMobile, setIsMobile] = React.useState(
    typeof window !== 'undefined' && window.innerWidth < 768
  );
  
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        groups.set(key, { title, icon, items: [] as ProductWithPolicy[] });
      }
      groups.get(key)!.items.push(p);
    });

    const sortedGroups: Array<{ id: string; title: string; icon: React.ReactNode; items: ProductWithPolicy[] }> = 
      Array.from(groups.entries())
        .map(([key, data]) => ({ id: key, ...data }))
        .sort((a, b) => b.items.length - a.items.length);

    return sortedGroups;
  }, [products, groupBy]);

  const colorForColumn = (id: string) => {
    if (id.includes('sin_categoria') || id === 'sin_politica' || id.includes('error')) {
      return { color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', groupBg: 'bg-amber-500/10' };
    }
    if (id.includes('canje') || id.includes('synced')) {
      return { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', groupBg: 'bg-emerald-500/10' };
    }
    return { color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', groupBg: 'bg-blue-500/10' };
  };

  // ============================================================================
  // MOBILE: Simple list grouped
  // ============================================================================
  if (isMobile) {
    return (
      <div className="p-4 space-y-4">
        {/* Mobile Controls */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-muted">
            Total: <span className="text-white">{products.length}</span>
          </span>
          <div className="flex gap-1">
            {[
              { id: 'category', label: 'Categoría' },
              { id: 'policy', label: 'Política' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setGroupBy(opt.id as GroupBy)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  groupBy === opt.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-surface text-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile grouped list */}
        {columns.slice(0, 5).map(col => {
          const colors = colorForColumn(col.id);
          const isExpanded = expandedColumns.has(col.id);
          
          return (
            <div key={col.id} className="space-y-2">
              {/* Group Header */}
              <button
                onClick={() => toggleColumn(col.id)}
                className={`w-full p-3 rounded-xl ${colors.bgColor} border ${colors.borderColor} flex items-center justify-between`}
              >
                <div className="flex items-center gap-2">
                  <span className={colors.color}>{col.icon}</span>
                  <span className={`text-sm font-bold uppercase ${colors.color}`}>
                    {String(col.title).slice(0, 15)}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-surface text-white">
                    {col.items.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className={`w-5 h-5 ${colors.color}`} />
                ) : (
                  <ChevronDown className={`w-5 h-5 ${colors.color}`} />
                )}
              </button>

              {/* Items */}
              {isExpanded && (
                <div className="space-y-2 pl-2">
                  {col.items.slice(0, 20).map(p => (
                    <MobileProductItem
                      key={p.barcode}
                      product={p}
                      onClick={() => onItemClick?.(p)}
                      groupColor={colors.color.replace('text-', 'text-')}
                    />
                  ))}
                  {col.items.length > 20 && (
                    <p className="text-center text-xs text-muted py-2">
                      +{col.items.length - 20} más
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        
        {columns.length === 0 && (
          <p className="text-center text-sm text-muted py-8">
            Sin productos para mostrar
          </p>
        )}
      </div>
    );
  }

  // ============================================================================
  // DESKTOP: Kanban columns
  // ============================================================================
  return (
    <div className="p-4">
      {/* Controls */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-muted">
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
                  : 'bg-elevated text-muted hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.slice(0, 8).map((col: KanbanGroup & { id: string }) => {
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
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full bg-elevated text-white`}>
                    {col.items?.length || 0}
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
                  {col.items?.slice(0, 15).map((p: ProductWithPolicy) => (
                    <KanbanCard 
                      key={p.barcode} 
                      product={p} 
                      onClick={() => onItemClick?.(p)}
                    />
                  ))}
                  {col.items?.length > 15 && (
                    <div className="text-center text-[9px] text-slate-500 py-2">
                      +{col.items.length - 15} más
                    </div>
                  )}
                  {col.items?.length === 0 && (
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
