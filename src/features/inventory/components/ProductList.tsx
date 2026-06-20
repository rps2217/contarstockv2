
import React, { useState, useEffect, memo, useMemo } from 'react';
import { Product } from '../../../types';
import { Pencil, Trash2, Package, Cloud, CloudOff, Tag, Loader2, AlertTriangle, Printer, CheckSquare, Square, Expand } from 'lucide-react';
import { VirtualList } from '../../../shared/components/ui/VirtualList';
import { Badge, Card, Button } from '../../../shared/components/ui';

interface ProductListProps {
  products?: Product[];
  onEdit: (product: Product) => void;
  onDelete: (barcode: string) => void;
  onDeleteAll: () => void;
  onPrint: (product: Product) => void;
  onViewDetail?: (product: Product) => void;
  hasFilter: boolean;
  selectedIds?: Set<string>;
  onSelect?: (barcode: string) => void;
  onSelectAll?: () => void;
}

const getSyncStatusColor = (status?: string) => {
  switch (status) {
    case 'synced': return 'bg-emerald-500';
    case 'pending': return 'bg-sky-500';
    case 'error': return 'bg-rose-500';
    default: return 'bg-amber-500';
  }
};

const getSyncStatusIcon = (status?: string) => {
  switch (status) {
    case 'synced': return <Cloud className="w-3 h-3 text-emerald-500/40" />;
    case 'pending': return <Loader2 className="w-3 h-3 text-sky-500/40 animate-spin" />;
    case 'error': return <AlertTriangle className="w-3 h-3 text-rose-500/40" />;
    default: return <CloudOff className="w-3 h-3 text-amber-500/40" />;
  }
};

const Row = memo(({ index, data }: any) => {
  const p = data.items[index];
  if (!p) return null;
  const { isMobile, onEdit, onDelete, onPrint, onViewDetail, selectedIds, onSelect } = data;
  const isSelected = selectedIds?.has(p.barcode);

  if (isMobile) {
    return (
      <div className="px-3 py-1.5 h-full w-full">
        <div className={`h-full flex items-stretch bg-white dark:bg-slate-900 border rounded-2xl shadow-sm transition-all focus-within:ring-2 focus-within:ring-indigo-500/50 ${
          isSelected ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-white/10'
        }`}>
          <div className={`w-1.5 shrink-0 rounded-l-2xl ${getSyncStatusColor(p.syncStatus)}`} />
          
          {onSelect && (
            <button 
              onClick={(e) => { e.stopPropagation(); onSelect(p.barcode); }}
              className={`w-12 shrink-0 flex items-center justify-center border-r border-slate-100 dark:border-white/5 active:bg-slate-50 dark:active:bg-white/5 transition-colors ${
                isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'
              }`}
            >
              {isSelected ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
            </button>
          )}

          <div 
            className="flex-1 min-w-0 p-3 flex flex-col justify-center active:bg-slate-50 dark:active:bg-white/5 cursor-pointer"
            onClick={() => onEdit(p)}
          >
            <div className="flex items-center gap-1.5 mb-1 no-scrollbar overflow-x-auto">
              <span className={`shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                p.syncStatus === 'synced' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
              }`}>
                {p.category || 'GRAL'}
              </span>
              {p.withdrawalDays !== undefined && (
                <span className={`shrink-0 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border whitespace-nowrap ${
                  p.hasExchange 
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' 
                    : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                }`}>
                  {p.withdrawalDays}D {p.hasExchange ? 'CANJE' : 'MERMA'}
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight truncate">
              {p.name}
            </h3>
            <div className="mt-0.5 font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-tight">
              {p.barcode}
            </div>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); onPrint(p); }} 
            className="w-12 shrink-0 flex items-center justify-center text-amber-600 dark:text-amber-500 border-l border-slate-100 dark:border-white/10 active:bg-amber-50 dark:active:bg-amber-500/10 transition-colors"
          >
            <Printer className="w-5 h-5" />
          </button>
          {onViewDetail && (
            <button 
              onClick={(e) => { e.stopPropagation(); onViewDetail(p); }} 
              className="w-12 shrink-0 flex items-center justify-center text-purple-600 dark:text-purple-400 border-l border-slate-100 dark:border-white/10 active:bg-purple-50 dark:active:bg-purple-500/10 transition-colors rounded-r-2xl"
              title="Ver Detalle"
            >
              <Expand className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center border-b border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors px-6 text-sm h-full group cursor-pointer ${
      isSelected ? 'bg-indigo-50/50 dark:bg-indigo-500/10' : 'bg-white dark:bg-slate-900'
    }`} onClick={() => onEdit(p)}>
      {onSelect && (
        <button 
          onClick={(e) => { e.stopPropagation(); onSelect(p.barcode); }}
          className={`mr-4 shrink-0 transition-colors ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'}`}
        >
          {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
        </button>
      )}
      <div className="w-44 shrink-0 flex items-center gap-3 font-mono font-bold text-slate-600 dark:text-slate-400">
        <div className={`w-2 h-2 rounded-full shadow-sm ${getSyncStatusColor(p.syncStatus)}`} />
        {p.barcode}
      </div>
      <div className="flex-1 min-w-0 font-bold text-slate-800 dark:text-slate-200 truncate pr-6">{p.name}</div>
      <div className="w-32 shrink-0">
        <Badge variant={p.syncStatus === 'synced' ? 'muted' : p.syncStatus === 'error' ? 'danger' : 'info'}>{p.category || '-'}</Badge>
      </div>
      <div className="w-36 shrink-0 flex flex-col justify-center">
        {p.withdrawalDays !== undefined ? (
          <div className="flex flex-col">
            <span className={`text-xs font-black uppercase tracking-tight ${p.hasExchange ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>
              {p.withdrawalDays} Días
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
              {p.hasExchange ? 'Con Canje' : 'Sin Canje'}
            </span>
          </div>
        ) : (
          <span className="text-[10px] italic text-slate-400 uppercase font-medium">No asig.</span>
        )}
      </div>
      <div className="w-24 shrink-0 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onViewDetail && (
          <button onClick={(e) => { e.stopPropagation(); onViewDetail(p); }} className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl transition-colors shrink-0" title="Ver Detalle">
            <Expand className="w-5 h-5" />
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onPrint(p); }} className="p-2 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl transition-colors shrink-0" title="Imprimir Código de Barras"><Printer className="w-5 h-5" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(p.barcode); }} className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl transition-colors shrink-0"><Trash2 className="w-5 h-5" /></button>
      </div>
    </div>
  );
});

Row.displayName = 'ProductRow';

export const ProductList: React.FC<ProductListProps> = memo(({ products, onEdit, onDelete, onDeleteAll, onPrint, hasFilter, selectedIds, onSelect, onSelectAll }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const rowData = useMemo(() => ({ isMobile, onEdit, onDelete, onPrint, onViewDetail, selectedIds, onSelect }), [isMobile, onEdit, onDelete, onPrint, onViewDetail, selectedIds, onSelect]);
  const itemHeight = isMobile ? 96 : 64;

  if (!products || products.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 md:p-12 text-center h-full flex flex-col items-center justify-center">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 md:mb-6 shadow-none">
          <Package className="w-8 h-8 md:w-10 md:h-10 text-slate-300 dark:text-slate-600" />
        </div>
        <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-base md:text-lg">
          {hasFilter ? 'No hay resultados' : 'Catálogo Vacío'}
        </h3>
        <p className="text-slate-500 font-medium text-xs md:text-sm mt-2 max-w-[250px]">
          {hasFilter ? 'Intenta con otros términos de búsqueda.' : 'Aún no has agregado productos a tu catálogo.'}
        </p>
        {!hasFilter && (
          <Button variant="ghost" size="sm" onClick={onDeleteAll} className="mt-6 md:mt-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10">
            Resetear Base Local
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-transparent md:bg-white md:dark:bg-slate-900 md:rounded-3xl md:border md:border-slate-200 md:dark:border-white/5 overflow-hidden md:shadow-sm">
      <div className="hidden md:flex bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-6 py-4 shrink-0 items-center sticky top-0 z-10">
        {onSelectAll && (
          <button 
            onClick={onSelectAll}
            className={`mr-4 transition-colors ${selectedIds?.size === products.length && products.length > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'}`}
          >
            {selectedIds?.size === products.length && products.length > 0 ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
          </button>
        )}
        <div className="w-48 text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Código</div>
        <div className="flex-1 text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Descripción del Producto</div>
        <div className="w-32 text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Familia</div>
        <div className="w-36 text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Política</div>
        <div className="w-24 text-right text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pr-4">Acción</div>
      </div>

      <div className="flex-1 min-h-0">
        <VirtualList 
          items={products}
          itemHeight={itemHeight}
          renderRow={Row}
          rowData={rowData}
          className="no-scrollbar md:scrollbar-thin"
        />
      </div>
    </div>
  );
});

