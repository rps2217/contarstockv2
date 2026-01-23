import React, { useMemo, useState, useEffect, useRef, memo } from 'react';
import { Product } from '../../types';
import { Pencil, Trash2, Package, Cloud, CloudOff } from 'lucide-react';

// --- VIRTUALIZADOR INTERNO ESTABLE ---
const SmartWindow = ({ items, itemHeight, renderRow, data }: any) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);

    useEffect(() => {
        const updateHeight = () => { if (containerRef.current) setContainerHeight(containerRef.current.offsetHeight); };
        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, []);

    const onScroll = (e: any) => setScrollTop(e.currentTarget.scrollTop);

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
    const endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + 2);
    const visibleItems = items.slice(startIndex, endIndex);
    const totalHeight = items.length * itemHeight;

    return (
        <div ref={containerRef} onScroll={onScroll} className="h-full w-full overflow-y-auto no-scrollbar relative">
            <div style={{ height: totalHeight, width: '100%', pointerEvents: 'none' }} />
            <div className="absolute top-0 left-0 w-full" style={{ transform: `translateY(${startIndex * itemHeight}px)` }}>
                {visibleItems.map((item: any, idx: number) => (
                    <div key={item.barcode} style={{ height: itemHeight }}>
                        {renderRow({ index: startIndex + idx, data })}
                    </div>
                ))}
            </div>
        </div>
    );
};

interface ProductListProps {
  products?: Product[];
  onEdit: (product: Product) => void;
  onDelete: (barcode: string) => void;
  onDeleteAll: () => void;
  hasFilter: boolean;
}

// Added missing 'memo' import to the React import list and added this memo wrapper for performance
const Row = memo(({ index, data }: any) => {
    const p = data.items[index];
    if (!p) return null;
    const { isMobile, onEdit, onDelete } = data;

    if (isMobile) {
        return (
            <div className="px-4 py-2 h-full">
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-5 h-full flex flex-col justify-between active:scale-[0.98] transition-all overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-30">
                        {p.syncStatus === 'synced' ? <Cloud className="w-4 h-4 text-emerald-500" /> : <CloudOff className="w-4 h-4 text-amber-500" />}
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-2 mb-1.5">
                             <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-widest border border-slate-200">{p.category || 'GENERAL'}</span>
                        </div>
                        <h3 className="font-black text-slate-900 text-sm leading-[1.2] line-clamp-2 uppercase tracking-tight">{p.name}</h3>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                        <span className="font-mono text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">{p.barcode}</span>
                        <div className="flex gap-2">
                            <button onClick={() => onEdit(p)} className="p-3 bg-slate-50 text-slate-500 hover:text-blue-600 rounded-xl transition-all border border-slate-100"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => onDelete(p.barcode)} className="p-3 bg-slate-50 text-slate-500 hover:text-rose-600 rounded-xl transition-all border border-slate-100"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center border-b border-slate-100 hover:bg-indigo-50/30 transition-colors px-6 bg-white text-sm group h-full">
            <div className="w-40 shrink-0 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${p.syncStatus === 'synced' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="font-mono text-slate-600 font-bold bg-slate-50 px-2 py-1 rounded border border-slate-200 truncate flex-1 text-center">{p.barcode}</span>
            </div>
            <div className="flex-1 font-black text-slate-800 truncate px-8 leading-relaxed">{p.name}</div>
            <div className="w-40 shrink-0 text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.category || '-'}</div>
            <div className="w-40 shrink-0 text-xs text-slate-500 italic truncate">{p.supplier || '-'}</div>
            <div className="w-24 shrink-0 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(p)} className="p-2.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => onDelete(p.barcode)} className="p-2.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
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

  if (!products || products.length === 0) {
    return (
      <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-16 text-center h-full flex flex-col items-center justify-center shadow-inner">
        <Package className="w-20 h-20 mx-auto text-slate-100 mb-6" />
        <p className="text-slate-400 font-black uppercase tracking-widest text-sm">{hasFilter ? 'Sin coincidencias' : 'Catálogo Vacío'}</p>
        {!hasFilter && (
            <button onClick={onDeleteAll} className="mt-8 text-rose-500 font-black text-[10px] uppercase tracking-[0.2em] hover:underline underline-offset-4">Resetear Base Local</button>
        )}
      </div>
    );
  }

  const itemHeight = isMobile ? 140 : 64;

  return (
    <div className="h-full flex flex-col bg-slate-50 md:bg-white md:rounded-[2.5rem] md:border md:border-slate-200 shadow-xl overflow-hidden">
        <div className="hidden md:flex bg-slate-50/80 border-b border-slate-100 px-8 py-4 shrink-0">
            <div className="w-40 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">EAN / SKU</div>
            <div className="flex-1 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-8">Descripción de Producto</div>
            <div className="w-40 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Familia</div>
            <div className="w-40 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Proveedor</div>
            <div className="w-24 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Acciones</div>
        </div>

        <div className="flex-1 min-h-0">
            <SmartWindow 
                items={products}
                itemHeight={itemHeight}
                renderRow={Row}
                data={{ items: products, isMobile, onEdit, onDelete }}
            />
        </div>
    </div>
  );
};
