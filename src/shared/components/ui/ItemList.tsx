/**
 * ItemList - Componente reutilizable para listas de productos
 * 
 * Características:
 * - Lista de items con SKU, nombre, cantidad
 * - Edición inline
 * - Remover items
 * - Totales
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, Edit3, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { ThemeType } from './FormField';

export interface ItemData {
  barcode: string;
  productName: string;
  quantity: number;
  providerName?: string;
  unitPrice?: number;
  [key: string]: unknown;
}

export interface ItemListProps {
  items: ItemData[];
  onRemove?: (index: number) => void;
  onEdit?: (index: number, field: string, value: string | number) => void;
  editable?: boolean;
  removable?: boolean;
  showTotals?: boolean;
  theme?: ThemeType;
  title?: string;
  emptyText?: string;
  itemRenderer?: (item: ItemData, index: number) => React.ReactNode;
  keyField?: keyof ItemData;
}

export const ItemList: React.FC<ItemListProps> = ({
  items,
  onRemove,
  onEdit,
  editable = false,
  removable = true,
  showTotals = true,
  theme = 'dark',
  title = 'Productos agregados',
  emptyText = 'No hay productos agregados',
  itemRenderer,
  keyField = 'barcode',
}) => {
  const isDark = theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark';
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editQty, setEditQty] = React.useState<number>(0);

  // Calcular totales
  const totals = React.useMemo(() => {
    const totalItems = items.length;
    const totalUnits = items.reduce((acc, item) => acc + (item.quantity || 0), 0);
    const totalValue = items.reduce((acc, item) => acc + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
    return { totalItems, totalUnits, totalValue };
  }, [items]);

  const startEdit = (index: number, currentQty: number) => {
    setEditingIndex(index);
    setEditQty(currentQty);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditQty(0);
  };

  const saveEdit = (index: number) => {
    onEdit?.(index, 'quantity', editQty);
    setEditingIndex(null);
  };

  if (items.length === 0) {
    return (
      <div className={`p-6 rounded-2xl border border-dashed ${
        isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
      }`}>
        <p className={`text-center text-xs font-bold ${isDark ? 'text-slate-500' : 'text-muted'}`}>
          {emptyText}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-muted' : 'text-slate-500'}`}>
          {title}
        </h3>
        <span className={`text-[10px] font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
          {items.length} {items.length === 1 ? 'producto' : 'productos'}
        </span>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <motion.div
            layout
            key={`${item[keyField]}-${index}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`group flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
              isDark 
                ? 'bg-black/20 border-white/5 hover:border-white/10' 
                : 'bg-white border-slate-100 hover:border-slate-200'
            }`}
          >
            {/* Index badge */}
            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0 ${
              isDark ? 'bg-white/10 text-muted' : 'bg-slate-100 text-slate-500'
            }`}>
              {index + 1}
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {itemRenderer ? (
                itemRenderer(item, index)
              ) : (
                <>
                  <p className={`text-[10px] font-black uppercase truncate ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    {item.productName}
                  </p>
                  <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                    {item.barcode}
                    {item.providerName && ` • ${item.providerName}`}
                  </p>
                </>
              )}
            </div>

            {/* Quantity */}
            <div className="shrink-0">
              {editingIndex === index ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={editQty}
                    onChange={(e) => setEditQty(parseInt(e.target.value) || 0)}
                    className={`w-16 px-2 py-1 rounded-lg text-center text-sm font-black ${
                      isDark 
                        ? 'bg-surface border border-white/10 text-white' 
                        : 'bg-slate-50 border border-slate-200 text-slate-800'
                    }`}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => saveEdit(index)}
                    className="p-1 rounded-lg bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="p-1 rounded-lg bg-rose-500/20 text-rose-500 hover:bg-rose-500/30"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-lg text-xs font-black ${
                    isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {item.quantity} UNID
                  </span>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => startEdit(index, item.quantity)}
                      className="p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit3 className={`w-3.5 h-3.5 ${isDark ? 'text-muted' : 'text-slate-500'}`} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            {(removable || editable) && (
              <div className="shrink-0 flex items-center gap-1">
                {removable && onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="p-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Totals */}
      {showTotals && items.length > 0 && (
        <div className={`p-4 rounded-xl border-2 ${
          isDark ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className={`text-[9px] font-black uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                SKUs
              </p>
              <p className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {totals.totalItems}
              </p>
            </div>
            <div className="text-center">
              <p className={`text-[9px] font-black uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                Unidades
              </p>
              <p className={`text-lg font-black ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                {totals.totalUnits.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemList;
