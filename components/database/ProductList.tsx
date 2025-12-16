
import React, { useMemo, useRef, useEffect } from 'react';
import { Product } from '../../types';
import { Pencil, Trash2, Package, Globe, Factory, AlertTriangle } from 'lucide-react';
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

interface ProductListProps {
  products?: Product[];
  onEdit: (product: Product) => void;
  onDelete: (barcode: string) => void;
  onDeleteAll: () => void;
  hasFilter: boolean;
}

// --- ROW COMPONENT (EXTRACTED FOR PERFORMANCE) ---
// Defined outside to guarantee referential stability and prevent re-mounting
const Row = ({ index, style, data }: { index: number; style: React.CSSProperties; data: { isMobile: boolean; items: Product[]; onEdit: (p: Product) => void; onDelete: (id: string) => void } }) => {
    const p = data.items[index];
    const { isMobile, onEdit, onDelete } = data;

    // MOBILE CARD ROW (Optimized for Readability)
    if (isMobile) {
        return (
            <div style={style} className="px-2 py-1.5">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex justify-between items-start h-full active:bg-slate-50 transition-colors">
                    <div className="flex-1 mr-3 min-w-0 flex flex-col justify-center h-full">
                        {/* Name on top, bold, slightly larger */}
                        <div className="font-bold text-slate-900 leading-tight text-sm line-clamp-2 mb-1.5">
                            {p.name}
                        </div>
                        {/* Metadata row */}
                        <div className="flex items-center flex-wrap gap-2">
                            <span className="font-mono text-[11px] font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0 tracking-tight">
                                {p.barcode}
                            </span>
                            {p.category && (
                                <span className="text-[9px] font-bold text-blue-600 uppercase bg-blue-50 px-1.5 py-0.5 rounded truncate max-w-[100px] border border-blue-100">
                                    {p.category}
                                </span>
                            )}
                        </div>
                    </div>
                    
                    {/* Actions Column */}
                    <div className="flex flex-col gap-1 shrink-0 h-full justify-center border-l border-slate-100 pl-2">
                        <button onClick={() => onEdit(p)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 active:scale-95 transition-all">
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDelete(p.barcode)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 active:scale-95 transition-all">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // DESKTOP TABLE ROW
    return (
        <div style={style} className="flex items-center border-b border-slate-100 hover:bg-blue-50/50 transition-colors px-6 bg-white text-sm group">
            <div className="w-40 shrink-0 flex items-center gap-2">
                <span className="font-mono text-slate-600 font-bold bg-slate-50 px-2 py-1 rounded border border-slate-200 truncate w-full block text-center group-hover:border-blue-200 group-hover:text-blue-700 transition-colors">
                    {p.barcode}
                </span>
            </div>
            <div className="flex-1 font-medium text-slate-700 truncate px-4" title={p.name}>{p.name}</div>
            <div className="w-40 shrink-0 truncate text-slate-500">
                {p.category || '-'}
            </div>
            <div className="w-40 shrink-0 truncate text-slate-500">
                {p.supplier || '-'}
            </div>
            <div className="w-24 shrink-0 text-right flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onEdit(p)}
                    className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-all"
                    title="Editar"
                >
                    <Pencil className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onDelete(p.barcode)}
                    className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all"
                    title="Eliminar"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export const ProductList: React.FC<ProductListProps> = ({
  products,
  onEdit,
  onDelete,
  onDeleteAll,
  hasFilter
}) => {
  const listRef = useRef<FixedSizeList>(null);

  // Memoize item data to prevent unnecessary re-renders inside FixedSizeList
  const itemData = useMemo(() => ({
      items: products || [],
      onEdit,
      onDelete,
      isMobile: false // Placeholder, overwritten inside AutoSizer
  }), [products, onEdit, onDelete]);

  useEffect(() => {
    if (listRef.current) {
        listRef.current.scrollTo(0);
    }
  }, [hasFilter, products?.length]);

  if (!products || products.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center h-full flex flex-col items-center justify-center">
        <Package className="w-16 h-16 mx-auto text-slate-200 mb-4" />
        <p className="text-slate-400 font-medium italic text-lg">
          {hasFilter ? 'No se encontraron resultados.' : 'Base de datos vacía.'}
        </p>
        
        {!hasFilter && (
            <div className="mt-8 border border-red-200 bg-red-50/50 rounded-xl p-4 max-w-sm">
                <h3 className="text-red-900 font-bold text-sm mb-2 flex items-center gap-2 justify-center"><AlertTriangle className="w-4 h-4"/> Zona de Peligro</h3>
                <button
                    onClick={onDeleteAll}
                    className="text-red-600 hover:text-red-800 text-xs font-bold underline"
                >
                    Forzar vaciado de base de datos
                </button>
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 md:bg-white md:rounded-2xl md:border md:border-slate-200 shadow-sm overflow-hidden">
        {/* DESKTOP HEADER */}
        <div className="hidden md:flex bg-slate-50 border-b border-slate-200 px-6 py-3 shrink-0">
            <div className="w-40 text-[10px] font-bold text-slate-500 uppercase tracking-wider">CODIGO</div>
            <div className="flex-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4">DESCRIPCION</div>
            <div className="w-40 text-[10px] font-bold text-slate-500 uppercase tracking-wider">MUNDO</div>
            <div className="w-40 text-[10px] font-bold text-slate-500 uppercase tracking-wider">PROVEEDOR</div>
            <div className="w-24 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">ACCIONES</div>
        </div>

        {/* VIRTUALIZED LIST */}
        <div className="flex-1 min-h-0 relative">
            <AutoSizer>
                {({ height, width }) => {
                    if (!height || !width) return null;
                    
                    const isMobile = width < 768; 
                    // Adjusted height for the new mobile card design
                    const itemSize = isMobile ? 100 : 52; 
                    
                    const currentItemData = { ...itemData, isMobile };

                    return (
                        <FixedSizeList
                            ref={listRef}
                            height={height}
                            width={width}
                            itemCount={products.length}
                            itemSize={itemSize}
                            itemData={currentItemData}
                            className="no-scrollbar"
                        >
                            {Row}
                        </FixedSizeList>
                    );
                }}
            </AutoSizer>
        </div>

        {/* FOOTER */}
        <div className="bg-slate-50 border-t border-slate-200 p-2 text-center shrink-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {products.length.toLocaleString()} items
            </span>
        </div>
    </div>
  );
};
