
import React, { useState, useEffect, memo, useMemo } from 'react';
import { Product } from '../../types';
import { Pencil, Trash2, Package, Cloud, CloudOff, ChevronRight } from 'lucide-react';
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
            <div className="px-3 py-1 h-full">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 h-full flex items-stretch overflow-hidden active:scale-[0.98] transition-all">
                    {/* Indicador de Sincronización Lateral */}
                    <div className={`w-1.5 shrink-0 ${p.syncStatus === 'synced' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    
                    {/* Contenido Principal */}
                    <div className="flex-1 min-w-0 p-3 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1">
                             <span className="text-[7px] font-black bg-slate-100 dark:bg-white/5 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-widest border border-slate-200 dark:border-white/10">
                                {p.category || 'GENERAL'}
                             </span>
                             {p.syncStatus === 'synced' ? 
                                <Cloud className="w-3 h-3 text-emerald-500/50" /> : 
                                <CloudOff className="w-3 h-3 text-amber-500/50" />
                             }
                        </div>
                        <h3 className="font-black text-slate-900 dark:text-slate-100 text-xs uppercase leading-tight truncate">
                            {p.name}
                        </h3>
                        <div className="mt-1.5 flex items-center">
                            <span className="font-mono text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-500/20 tracking-wider">
                                {p.barcode}
                            </span>
                        </div>
                    </div>

                    {/* Acciones Laterales (Zona de Pulgar) */}
                    <div className="flex border-l border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                        <button 
                            onClick={() => onEdit(p)} 
                            className="w-14 flex items-center justify-center text-slate-400 active:text-blue-600 active:bg-blue-50 transition-colors"
                        >
                            <Pencil className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => onDelete(p.barcode)} 
                            className="w-14 flex items-center justify-center text-slate-300 active:text-rose-600 active:bg-rose-50 transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center border-b border-slate-100 dark:border-white/5 hover:bg-indigo-50/30 transition-colors px-6 bg-white dark:bg-slate-900 text-sm group h-full">
            <div className="w-40 shrink-0 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${p.syncStatus === 'synced' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="font-mono text-slate-600 dark:text-slate-400 font-bold bg-slate-50 dark:bg-black/40 px-2 py-1 rounded border border-slate-200 dark:border-white/10 truncate flex-1 text-center">{p.barcode}</span>
            </div>
            <div className="flex-1 font-black text-slate-800 dark:text-slate-200 truncate px-8 leading-relaxed">{p.name}</div>
            <div className="w-40 shrink-0 text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.category || '-'}</div>
            <div className="w-40 shrink-0 text-xs text-slate-500 italic truncate">{p.supplier || '-'}</div>
            <div className="w-24 shrink-0 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(p)} className="p-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => onDelete(p.barcode)} className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
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
  
  // Altura reducida para mobile: de 140 a 90 para mayor densidad de datos
  const itemHeight = isMobile ? 90 : 64;

  if (!products || products.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-4 border-slate-100 dark:border-white/5 p-16 text-center h-full flex flex-col items-center justify-center shadow-inner">
        <Package className="w-20 h-20 mx-auto text-slate-100 dark:text-slate-800 mb-6" />
        <p className="text-slate-400 font-black uppercase tracking-widest text-sm">{hasFilter ? 'Sin coincidencias' : 'Catálogo Vacío'}</p>
        {!hasFilter && (
            <button onClick={onDeleteAll} className="mt-8 text-rose-500 font-black text-[10px] uppercase tracking-[0.2em] hover:underline underline-offset-4">Resetear Base Local</button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-transparent md:bg-white md:dark:bg-slate-900 md:rounded-[2.5rem] md:border md:border-slate-200 md:dark:border-white/5 shadow-xl overflow-hidden">
        <div className="hidden md:flex bg-slate-50/80 dark:bg-black/50 border-b border-slate-100 dark:border-white/5 px-8 py-4 shrink-0">
            <div className="w-40 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">EAN / SKU</div>
            <div className="flex-1 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-8">Descripción de Producto</div>
            <div className="w-40 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Familia</div>
            <div className="w-40 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Proveedor</div>
            <div className="w-24 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Acciones</div>
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
