
import React, { useMemo, useRef, useEffect } from 'react';
import { Product } from '../../types';
import { Pencil, Trash2, Package, Cloud, CloudOff, AlertTriangle } from 'lucide-react';
// Fix: Use more resilient import pattern for react-window and AutoSizer due to type resolution issues in this environment
import * as ReactWindow from 'react-window';
import * as AutoSizerModule from 'react-virtualized-auto-sizer';

const FixedSizeList = (ReactWindow as any).FixedSizeList || (ReactWindow as any).default?.FixedSizeList;
const AutoSizer = (AutoSizerModule as any).default || AutoSizerModule;

interface ProductListProps {
  products?: Product[];
  onEdit: (product: Product) => void;
  onDelete: (barcode: string) => void;
  onDeleteAll: () => void;
  hasFilter: boolean;
}

const Row = ({ index, style, data }: { index: number; style: React.CSSProperties; data: { isMobile: boolean; items: Product[]; onEdit: (p: Product) => void; onDelete: (id: string) => void } }) => {
    const p = data.items[index];
    const { isMobile, onEdit, onDelete } = data;

    if (isMobile) {
        return (
            <div style={style} className="px-3 py-1.5">
                <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 p-4 h-full flex flex-col justify-between active:scale-[0.98] transition-all overflow-hidden relative group">
                    {/* Sync Indicator sutil */}
                    <div className="absolute top-0 right-0 p-3 opacity-20">
                        {p.syncStatus === 'synced' ? <Cloud className="w-3 h-3 text-emerald-500" /> : <CloudOff className="w-3 h-3 text-amber-500" />}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                             <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-widest">{p.category || 'Sin Cat.'}</span>
                        </div>
                        <h3 className="font-black text-slate-900 text-sm leading-tight line-clamp-2 uppercase tracking-tight">{p.name}</h3>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                        <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50/50 px-2 py-1 rounded-lg border border-blue-100">{p.barcode}</span>
                        <div className="flex gap-1">
                            <button onClick={() => onEdit(p)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => onDelete(p.barcode)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={style} className="flex items-center border-b border-slate-100 hover:bg-indigo-50/30 transition-colors px-6 bg-white text-sm group">
            <div className="w-40 shrink-0 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${p.syncStatus === 'synced' ? 'bg-emerald-400' : 'bg-amber-400'}`} title={p.syncStatus} />
                <span className="font-mono text-slate-600 font-bold bg-slate-50 px-2 py-1 rounded border border-slate-200 truncate flex-1 text-center">{p.barcode}</span>
            </div>
            <div className="flex-1 font-bold text-slate-800 truncate px-6">{p.name}</div>
            <div className="w-40 shrink-0 text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.category || '-'}</div>
            <div className="w-40 shrink-0 text-xs text-slate-500 italic truncate">{p.supplier || '-'}</div>
            <div className="w-24 shrink-0 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(p)} className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => onDelete(p.barcode)} className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </div>
        </div>
    );
};

export const ProductList: React.FC<ProductListProps> = ({ products, onEdit, onDelete, onDeleteAll, hasFilter }) => {
  const listRef = useRef<any>(null);
  const itemData = useMemo(() => ({ items: products || [], onEdit, onDelete, isMobile: false }), [products, onEdit, onDelete]);

  if (!products || products.length === 0) {
    return (
      <div className="bg-white rounded-[3rem] border-2 border-slate-100 p-16 text-center h-full flex flex-col items-center justify-center shadow-inner">
        <Package className="w-20 h-20 mx-auto text-slate-200 mb-6" />
        <p className="text-slate-400 font-black uppercase tracking-widest text-sm">{hasFilter ? 'Sin coincidencias' : 'Catálogo Vacío'}</p>
        {!hasFilter && (
            <button onClick={onDeleteAll} className="mt-8 text-rose-500 font-black text-[10px] uppercase tracking-[0.2em] hover:underline underline-offset-4">Resetear Base Local</button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 md:bg-white md:rounded-[2.5rem] md:border md:border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="hidden md:flex bg-slate-50/50 border-b border-slate-100 px-6 py-4 shrink-0">
            <div className="w-40 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Firma Digital</div>
            <div className="flex-1 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-6">Descripción SKU</div>
            <div className="w-40 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Familia</div>
            <div className="w-40 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Proveedor</div>
            <div className="w-24 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Edición</div>
        </div>

        <div className="flex-1 min-h-0">
            <AutoSizer>
                {({ height, width }: { height: number; width: number }) => {
                    const isMobile = width < 768; 
                    const itemSize = isMobile ? 130 : 64; 
                    return (
                        <FixedSizeList
                            ref={listRef}
                            height={height}
                            width={width}
                            itemCount={products.length}
                            itemSize={itemSize}
                            itemData={{ ...itemData, isMobile }}
                            className="no-scrollbar"
                        >
                            {Row}
                        </FixedSizeList>
                    );
                }}
            </AutoSizer>
        </div>
    </div>
  );
};
