
import React, { useState, useEffect, memo, useMemo } from 'react';
import { Product } from '../../types';
import { Pencil, Trash2, Package, Cloud, CloudOff, ChevronRight, Tag } from 'lucide-react';
import { VirtualList } from '../common/VirtualList';

interface ProductListProps {
  products?: Product[];
  onEdit: (product: Product) => void;
  onDelete: (barcode: string) => void;
  onDeleteAll: () => void;
  hasFilter: boolean;
}

const Row = memo(({ index, data }: any) => {
    const p = data.items[index];
    if (!p) return null;
    const { isMobile, onEdit, onDelete } = data;

    if (isMobile) {
        return (
            <div className="px-2 py-1 h-full">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-white/5 h-full flex items-stretch overflow-hidden shadow-sm active:bg-slate-50 dark:active:bg-white/5 transition-colors">
                    {/* Barra de Estado Lateral - Comunicación No Verbal */}
                    <div className={`w-2 shrink-0 ${p.syncStatus === 'synced' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    
                    {/* Información de Producto */}
                    <div className="flex-1 min-w-0 p-3 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1">
                             <span className="text-[7px] font-black bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md uppercase tracking-widest border border-slate-200 dark:border-white/5">
                                {p.category || 'GRAL'}
                             </span>
                             {p.syncStatus === 'synced' ? 
                                <Cloud className="w-3 h-3 text-emerald-500/40" /> : 
                                <CloudOff className="w-3 h-3 text-amber-500/40" />
                             }
                        </div>
                        <h3 className="font-black text-slate-900 dark:text-slate-100 text-[13px] uppercase leading-tight truncate">
                            {p.name}
                        </h3>
                        <div className="mt-1 flex items-center gap-1.5">
                            <Tag className="w-3 h-3 text-blue-500" />
                            <span className="font-mono text-[11px] font-black text-blue-600 dark:text-blue-400 tracking-wider">
                                {p.barcode}
                            </span>
                        </div>
                    </div>

                    {/* Zona de Acciones (Optimizada para Pulgar Derecho) */}
                    <div className="flex bg-slate-50 dark:bg-white/5 border-l border-slate-100 dark:border-white/5">
                        <button 
                            onClick={() => onEdit(p)} 
                            className="w-14 flex items-center justify-center text-slate-400 dark:text-slate-500 active:text-blue-600 active:bg-blue-50 dark:active:bg-blue-900/20 transition-all border-r border-slate-100 dark:border-white/5"
                        >
                            <Pencil className="w-5 h-5 stroke-[2.5px]" />
                        </button>
                        <button 
                            onClick={() => onDelete(p.barcode)} 
                            className="w-14 flex items-center justify-center text-slate-300 dark:text-slate-600 active:text-rose-600 active:bg-rose-50 dark:active:bg-rose-900/20 transition-all"
                        >
                            <Trash2 className="w-5 h-5 stroke-[2.5px]" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors px-6 bg-white dark:bg-slate-900 text-sm h-full group">
            <div className="w-40 shrink-0 flex items-center gap-3 font-mono font-bold text-slate-600 dark:text-slate-400">
                <div className={`w-2 h-2 rounded-full ${p.syncStatus === 'synced' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {p.barcode}
            </div>
            <div className="flex-1 font-black text-slate-800 dark:text-slate-200 truncate px-4">{p.name}</div>
            <div className="w-32 shrink-0 text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.category || '-'}</div>
            <div className="w-24 shrink-0 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(p)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-lg"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => onDelete(p.barcode)} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </div>
        </div>
    );
});

export const ProductList: React.FC<ProductListProps> = ({ products, onEdit, onDelete, onDeleteAll, hasFilter }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  const rowData = useMemo(() => ({ isMobile, onEdit, onDelete }), [isMobile, onEdit, onDelete]);
  const itemHeight = isMobile ? 84 : 60;

  if (!products || products.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-4 border-slate-100 dark:border-white/5 p-12 text-center h-full flex flex-col items-center justify-center">
        <Package className="w-16 h-16 mx-auto text-slate-100 dark:text-slate-800 mb-6" />
        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">{hasFilter ? 'Sin Resultados' : 'Base Vacía'}</p>
        {!hasFilter && (
            <button onClick={onDeleteAll} className="mt-8 text-rose-500 font-black text-[10px] uppercase tracking-[0.2em] border-b-2 border-rose-500/20 pb-1">Resetear Local</button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-transparent md:bg-white md:dark:bg-slate-900 md:rounded-[2.5rem] md:border md:border-slate-200 md:dark:border-white/5 overflow-hidden">
        <div className="hidden md:flex bg-slate-50 dark:bg-black/40 border-b border-slate-100 dark:border-white/5 px-8 py-4 shrink-0">
            <div className="w-40 text-[9px] font-black text-slate-400 uppercase tracking-widest">EAN/SKU</div>
            <div className="flex-1 text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Descripción</div>
            <div className="w-32 text-[9px] font-black text-slate-400 uppercase tracking-widest">Familia</div>
            <div className="w-24 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Acción</div>
        </div>

        <div className="flex-1 min-h-0">
            <VirtualList 
                items={products}
                itemHeight={itemHeight}
                renderRow={Row}
                rowData={rowData}
                className="no-scrollbar"
            />
        </div>
    </div>
  );
};
