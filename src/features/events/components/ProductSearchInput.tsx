/**
 * ProductSearchInput - Componente de búsqueda de productos
 */

import React from 'react';
import { Search, Loader2, Package, Plus } from 'lucide-react';
import { Product } from '../../../types';

interface Props {
  sku: string;
  onSkuChange: (value: string) => void;
  product: Product | null;
  isSearching: boolean;
  quantity: number;
  onQuantityChange: (value: number) => void;
  onAdd: () => void;
  disabled?: boolean;
  theme: 'dark' | 'light' | 'high-contrast';
  isEditing?: boolean;
}

export const ProductSearchInput: React.FC<Props> = ({
  sku,
  onSkuChange,
  product,
  isSearching,
  quantity,
  onQuantityChange,
  onAdd,
  disabled = false,
  theme,
  isEditing = false,
}) => {
  return (
    <div className={`p-6 rounded-[2rem] border-4 border-black space-y-4 ${
      theme === 'dark' ? 'bg-blue-500/5' : 'bg-blue-50'
    }`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-xs font-black uppercase tracking-widest ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
          {isEditing ? 'Información del Producto' : 'Agregar Productos'}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* SKU Input */}
        <div className="md:col-span-7 space-y-2">
          <div className="relative">
            <input
              type="text"
              value={sku}
              onChange={(e) => onSkuChange(e.target.value)}
              placeholder="SKU / EAN..."
              disabled={isEditing}
              className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border-2 transition-all outline-none ${
                theme === 'dark'
                  ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
                  : 'bg-white border-slate-200 focus:border-blue-500 text-slate-900'
              }`}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {isSearching ? (
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              ) : (
                <Search className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} />
              )}
            </div>
          </div>
        </div>

        {/* Quantity Input */}
        <div className="md:col-span-3 space-y-2">
          <input
            type="number"
            value={quantity}
            onChange={(e) => onQuantityChange(parseInt(e.target.value) || 0)}
            className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border-2 transition-all outline-none ${
              theme === 'dark'
                ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
                : 'bg-white border-slate-200 focus:border-blue-500 text-slate-900'
            }`}
          />
        </div>

        {/* Add Button */}
        {!isEditing && (
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={onAdd}
              disabled={!product || disabled}
              className={`w-full h-full flex items-center justify-center rounded-2xl transition-all ${
                !product || disabled
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                  : 'bg-black text-white hover:bg-slate-800 active:scale-95'
              }`}
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      {/* Product Preview */}
      {product && (
        <div className={`p-3 rounded-xl border-2 flex items-center gap-3 ${
          theme === 'dark' ? 'bg-black/40 border-blue-500/30' : 'bg-white border-blue-200 shadow-sm'
        }`}>
          <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className={`text-[11px] font-black uppercase truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {product.name}
            </p>
            <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">
              {product.barcode} • {product.supplier || 'N/A'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
