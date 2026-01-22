
import React, { useMemo } from 'react';
import { Product } from '../../types';
import { Pencil, Trash2, Package, Cloud, CloudOff, Layers, AlertCircle, SearchX } from 'lucide-react';
import * as ReactWindow from 'react-window';
import * as AutoSizerModule from 'react-virtualized-auto-sizer';

// Extracción segura para esm.sh
const FixedSizeList = (ReactWindow as any).FixedSizeList || (ReactWindow as any).default?.FixedSizeList || (ReactWindow as any).default;
const AutoSizer = (AutoSizerModule as any).AutoSizer || (AutoSizerModule as any).default?.AutoSizer || (AutoSizerModule as any).default;

interface ProductListProps {
  products?: Product[];
  onEdit: (product: Product) => void;
  onDelete: (barcode: string) => void;
  onDeleteAll: () => void;
  hasFilter: boolean;
}

const Row: React.FC<any> = ({ index, style, data }) => {
    const p = data.items[index];
    if (!p) return null;
    const { onEdit, onDelete } = data;

    return (
        <div style={style} className="px-4 py-1.5">
            <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-slate-200 dark:border-white/5 p-4 h-full flex items-center justify-between group active:scale-[0.98] transition-all overflow-hidden relative">
                
                <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] font-black bg-slate-100 dark:bg-white/5 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-widest border border-slate-200 dark:border-white/10">
                            {p.category || 'GENERAL'}
                        </span>
                        {p.syncStatus === 'synced' ? (
                            <Cloud className="w-3 h-3 text-emerald-500" />
                        ) : (
                            <CloudOff className="w-3 h-3 text-amber-500" />
                        )}
                    </div>
                    <h3 className="font-black text-slate-900 dark:text-white text-sm leading-tight line-clamp-1 uppercase tracking-tight">
                        {p.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-3">
                        <span className="font-mono text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-500/20">
                            {p.barcode}
                        </span>
                        {p.supplier && (
                            <span className="text-[9px] text-slate-400 font-bold truncate max-w-[100px]">
                                {p.supplier}
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="flex gap-2 shrink-0">
                    <button 
                        onClick={() => onEdit(p)} 
                        className="p-3 bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-blue-600 rounded-xl transition-all border border-slate-100 dark:border-white/10"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => onDelete(p.barcode)} 
                        className="p-3 bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-red-600 rounded-xl transition-all border border-slate-100 dark:border-white/10"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ProductList: React.FC<ProductListProps> = ({ products = [], onEdit, onDelete, onDeleteAll, hasFilter }) => {
    
    const isReady = !!FixedSizeList && !!AutoSizer;

    if (products.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-slate-900/50 rounded-[3rem] border-4 border-dashed border-slate-100 dark:border-white/5">
                <SearchX className="w-16 h-16 text-slate-200 mb-4" />
                <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">Sin Coincidencias</h3>
                <p className="text-slate-300 text-xs mt-2 font-bold uppercase tracking-widest">Ajuste los filtros o importe el maestro</p>
            </div>
        );
    }

    // Fallback si la librería falla
    if (!isReady) {
        return (
            <div className="h-full overflow-y-auto space-y-2 no-scrollbar pb-24">
                {products.map((p, idx) => (
                    <div key={p.barcode} className="h-24">
                        <Row index={idx} style={{}} data={{ items: products, onEdit, onDelete }} />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col relative">
            <div className="flex-1 min-h-0">
                <AutoSizer>
                    {({ height, width }: any) => (
                        <FixedSizeList
                            height={height}
                            width={width}
                            itemCount={products.length}
                            itemSize={96}
                            itemData={{ items: products, onEdit, onDelete }}
                            className="no-scrollbar"
                        >
                            {Row}
                        </FixedSizeList>
                    )}
                </AutoSizer>
            </div>
            
            {/* Acciones de Lote */}
            {!hasFilter && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xs px-4">
                    <button 
                        onClick={onDeleteAll}
                        className="w-full bg-rose-50 text-rose-600 border border-rose-100 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-rose-200/50 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" /> Vaciar Catálogo Master
                    </button>
                </div>
            )}
        </div>
    );
};
