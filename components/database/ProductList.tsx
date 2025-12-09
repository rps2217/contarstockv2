
import React, { useMemo } from 'react';
import { Product } from '../../types';
import { Pencil, Trash2, Package, Globe, Factory, AlertTriangle } from 'lucide-react';
import * as ReactWindow from 'react-window';
import AutoSizerPkg from 'react-virtualized-auto-sizer';

// --- ROBUST IMPORT LOGIC ---
// Handle various bundler/environment structures (ESM vs CJS vs Browser Globals)
const FixedSizeList = (ReactWindow as any).FixedSizeList || (ReactWindow as any).default?.FixedSizeList || (ReactWindow as any).default;
const AutoSizer = (AutoSizerPkg as any).default || (AutoSizerPkg as any).AutoSizer || AutoSizerPkg;

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

    // MOBILE CARD
    if (isMobile) {
        return (
            <div style={style} className="p-2">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-start h-full">
                    <div className="flex-1 mr-4 overflow-hidden">
                        <div className="font-bold text-slate-900 leading-tight mb-1.5 flex items-center gap-2 truncate">
                            {p.name}
                            {p.syncStatus && p.syncStatus !== 'synced' && (
                                <span className={`w-2 h-2 rounded-full shrink-0 ${p.syncStatus === 'add' ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="text-blue-600 font-mono text-xs font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{p.barcode}</div>
                            {p.category && <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide bg-slate-50 px-1.5 py-0.5 rounded truncate max-w-[100px]">{p.category}</div>}
                        </div>
                        {p.supplier && (
                            <div className="text-xs text-slate-500 flex items-center gap-1 truncate">
                                <Factory className="w-3 h-3" /> {p.supplier}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                        <button onClick={() => onEdit(p)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg">
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDelete(p.barcode)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // DESKTOP ROW
    return (
        <div style={style} className="flex items-center border-b border-slate-100 hover:bg-blue-50/30 transition-colors px-6 bg-white">
            <div className="w-40 shrink-0 flex items-center gap-2">
                <div className="font-mono text-blue-600 font-bold bg-blue-50 inline-block px-2.5 py-1 rounded-md text-xs border border-blue-100">
                    {p.barcode}
                </div>
                {p.syncStatus && p.syncStatus !== 'synced' && (
                    <span
                    className={`w-2 h-2 rounded-full ${p.syncStatus === 'add' ? 'bg-green-500' : 'bg-orange-500'}`}
                    title={p.syncStatus === 'add' ? 'Nuevo (No sincronizado)' : 'Modificado (No sincronizado)'}
                    ></span>
                )}
            </div>
            <div className="flex-1 font-medium text-slate-700 truncate pr-4">{p.name}</div>
            <div className="w-40 shrink-0">
                {p.category ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wide truncate max-w-full">
                        <Globe className="w-3 h-3" /> {p.category}
                    </span>
                ) : (
                    <span className="text-slate-300 text-xs">-</span>
                )}
            </div>
            <div className="w-40 shrink-0">
                <div className="text-xs text-slate-600 truncate" title={p.supplier}>
                    {p.supplier || '-'}
                </div>
            </div>
            <div className="w-24 shrink-0 text-right">
                <div className="flex items-center justify-end gap-1">
                    <button
                        onClick={() => onEdit(p)}
                        className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-all"
                        title="Editar"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onDelete(p.barcode)}
                        className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all"
                        title="Eliminar"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
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
  // Memoize item data to prevent unnecessary re-renders inside FixedSizeList
  // This object is passed as the "data" prop to the Row component
  const itemData = useMemo(() => ({
      items: products || [],
      onEdit,
      onDelete,
      // Note: isMobile will be injected by the AutoSizer render prop closure below, 
      // but we prepare the base structure here.
      isMobile: false 
  }), [products, onEdit, onDelete]);

  if (!products || products.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center h-full flex flex-col items-center justify-center">
        <Package className="w-16 h-16 mx-auto text-slate-200 mb-4" />
        <p className="text-slate-400 font-medium italic text-lg">
          {hasFilter ? 'No se encontraron resultados.' : 'Base de datos vacía.'}
        </p>
        
        {/* DANGER ZONE (Empty State) */}
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

  // --- FALLBACK MODE ---
  // If virtualization libraries failed to load, render a standard list to prevent crashing.
  const isVirtualizationReady = !!FixedSizeList && !!AutoSizer;

  if (!isVirtualizationReady) {
      return (
        <div className="h-full flex flex-col">
            {/* Standard Header */}
            <div className="hidden md:flex bg-slate-50/80 border-b border-slate-200 px-6 py-4 rounded-t-2xl">
                <div className="w-40 text-xs font-bold text-slate-500 uppercase tracking-wider">CODIGO</div>
                <div className="flex-1 text-xs font-bold text-slate-500 uppercase tracking-wider">DESCRIPCION</div>
                <div className="w-24 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">ACCIONES</div>
            </div>
            {/* Simple List Implementation */}
            <div className="flex-1 overflow-y-auto bg-white p-4">
                <div className="mb-2 bg-yellow-50 text-yellow-800 text-xs p-2 rounded border border-yellow-100">
                    Modo de compatibilidad activo (Virtualización desactivada).
                </div>
                {products.map(p => (
                    <div key={p.barcode} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-2 flex flex-col md:flex-row md:items-center gap-2">
                        <div className="w-40 font-mono text-blue-600 font-bold text-sm">{p.barcode}</div>
                        <div className="flex-1 font-bold text-slate-800">{p.name}</div>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => onEdit(p)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => onDelete(p.barcode)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      );
  }

  return (
    <div className="h-full flex flex-col">
        {/* DESKTOP HEADER (Sticky outside virtual list) */}
        <div className="hidden md:flex bg-slate-50/80 border-b border-slate-200 px-6 py-4 rounded-t-2xl">
            <div className="w-40 text-xs font-bold text-slate-500 uppercase tracking-wider">CODIGO</div>
            <div className="flex-1 text-xs font-bold text-slate-500 uppercase tracking-wider">DESCRIPCION</div>
            <div className="w-40 text-xs font-bold text-slate-500 uppercase tracking-wider">MUNDO</div>
            <div className="w-40 text-xs font-bold text-slate-500 uppercase tracking-wider">PROVEEDOR</div>
            <div className="w-24 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</div>
        </div>

        <div className="flex-1 bg-white md:rounded-b-2xl md:border-x md:border-b md:border-slate-200 overflow-hidden relative">
            <AutoSizer>
                {({ height, width }) => {
                    if (!height || !width) return null;
                    
                    const isMobile = width < 768; 
                    const itemSize = isMobile ? 130 : 60; // Card height vs Row height
                    
                    // Inject mobile state into itemData
                    // We construct a new object here, but relying on the outer useMemo for heavy items
                    const currentItemData = { ...itemData, isMobile };

                    return (
                        <FixedSizeList
                            height={height}
                            width={width}
                            itemCount={products.length}
                            itemSize={itemSize}
                            itemData={currentItemData}
                        >
                            {Row}
                        </FixedSizeList>
                    );
                }}
            </AutoSizer>
        </div>

        {/* Footer info */}
        <div className="text-center py-2 text-xs text-slate-400 bg-slate-50">
            {products.length} registros cargados
            { !hasFilter && products.length > 0 && (
                <span className="mx-2 text-slate-300">|</span>
            )}
            { !hasFilter && products.length > 0 && (
                <button onClick={onDeleteAll} className="text-red-400 hover:text-red-600 hover:underline">
                    Borrar Todo
                </button>
            )}
        </div>
    </div>
  );
};
