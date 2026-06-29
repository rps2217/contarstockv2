/**
 * IndustrialScannerList - Lista optimizada para uso industrial
 * 
 * Características:
 * - Feedback visual inmediato para cada scan
 * - Indicadores de estado claros
 * - Diseño denso para máxima información
 */

import React, { memo, useCallback } from 'react';
import { 
  Check, 
  AlertTriangle, 
  Minus, 
  Plus, 
  Edit3,
  Barcode,
  TrendingUp,
  TrendingDown,
  MinusCircle,
  Target
} from 'lucide-react';

interface IndustrialItem {
  barcode: string;
  name: string;
  totalQuantity: number;
  expectedQty?: number;
  lastTimestamp: number;
}

interface IndustrialScannerListProps {
  items: IndustrialItem[];
  activeBarcode: string | null;
  onSelectItem: (barcode: string) => void;
  onEditQuantity: (barcode: string) => void;
  searchQuery?: string;
}

const getVarianceIndicator = (actual: number, expected?: number) => {
  if (expected === undefined) return null;
  
  const diff = actual - expected;
  const percentage = expected > 0 ? (diff / expected) * 100 : 0;
  
  if (diff === 0) {
    return { 
      icon: <Check className="w-3 h-3" />, 
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      label: 'OK'
    };
  }
  
  if (diff > 0) {
    return { 
      icon: <TrendingUp className="w-3 h-3" />, 
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      label: `+${diff} (+${percentage.toFixed(0)}%)`
    };
  }
  
  return { 
    icon: <TrendingDown className="w-3 h-3" />, 
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    label: `${diff} (${percentage.toFixed(0)}%)`
  };
};

const IndustrialItemRow = memo(({
  item,
  isActive,
  onSelect,
  onEdit
}: {
  item: IndustrialItem;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) => {
  const variance = getVarianceIndicator(item.totalQuantity, item.expectedQty);
  const hasVariance = variance !== null;
  
  return (
    <div
      onClick={onSelect}
      className={`
        relative flex items-center gap-4 px-4 py-3 cursor-pointer transition-all duration-150
        ${isActive 
          ? 'bg-blue-500/10 border-l-4 border-l-blue-400' 
          : 'bg-surface hover:bg-elevated border-l-4 border-l-transparent'
        }
      `}
    >
      {/* Status indicator */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
        isActive 
          ? 'bg-blue-500/20 text-blue-400' 
          : hasVariance 
            ? variance.bgColor + ' ' + variance.color
            : 'bg-elevated text-muted'
      }`}>
        {hasVariance ? variance.icon : <Barcode className="w-4 h-4" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-secondary'}`}>
            {item.name}
          </span>
          {hasVariance && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${variance.bgColor} ${variance.color}`}>
              {variance.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-mono text-slate-500">{item.barcode}</span>
        </div>
      </div>

      {/* Quantity */}
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-1">
          <span className={`text-xl font-black font-mono ${
            isActive ? 'text-white' : hasVariance ? variance.color : 'text-emerald-400'
          }`}>
            {item.totalQuantity}
          </span>
          {item.expectedQty !== undefined && (
            <span className="text-xs text-slate-500 font-mono">
              / {item.expectedQty}
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-500 uppercase">Cantidad</span>
      </div>

      {/* Edit button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="w-8 h-8 rounded-lg bg-elevated hover:bg-slate-700 flex items-center justify-center transition-colors"
      >
        <Edit3 className="w-3.5 h-3.5 text-muted" />
      </button>
    </div>
  );
});

IndustrialItemRow.displayName = 'IndustrialItemRow';

export const IndustrialScannerList: React.FC<IndustrialScannerListProps> = memo(({
  items,
  activeBarcode,
  onSelectItem,
  onEditQuantity,
  searchQuery = ''
}) => {
  const filteredItems = React.useMemo(() => {
    if (!searchQuery) return items;
    
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.barcode.toLowerCase().includes(query) ||
      item.name.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const renderEmptyState = useCallback(() => (
    <div className="flex-1 flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 rounded-2xl bg-elevated/50 flex items-center justify-center mb-4">
        <Barcode className="w-10 h-10 text-slate-600" />
      </div>
      <p className="text-sm font-bold text-muted mb-1">
        {searchQuery ? 'Sin resultados' : 'Sin escaneos'}
      </p>
      <p className="text-xs text-slate-500">
        {searchQuery ? 'Intenta con otro término' : 'Comienza a escanear códigos'}
      </p>
    </div>
  ), [searchQuery]);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-base">
      {/* Header Stats */}
      <div className="px-4 py-3 bg-surface/50 border-b border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-bold text-white">{filteredItems.length}</span>
              <span className="text-xs text-slate-500">items</span>
            </div>
            <div className="w-px h-4 bg-slate-700" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-emerald-400">
                {filteredItems.reduce((acc, i) => acc + i.totalQuantity, 0)}
              </span>
              <span className="text-xs text-slate-500">unidades totales</span>
            </div>
          </div>
          {searchQuery && (
            <span className="text-xs text-slate-500">
              Filtrado: "{searchQuery}"
            </span>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="divide-y divide-slate-800/50">
            {filteredItems.map((item) => (
              <IndustrialItemRow
                key={item.barcode}
                item={item}
                isActive={item.barcode === activeBarcode}
                onSelect={() => onSelectItem(item.barcode)}
                onEdit={() => onEditQuantity(item.barcode)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

IndustrialScannerList.displayName = 'IndustrialScannerList';
