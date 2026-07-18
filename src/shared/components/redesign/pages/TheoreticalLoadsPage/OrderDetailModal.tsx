/**
 * OrderDetailModal - Modal para ver detalles de una orden teórica
 */

import React from 'react';
import { motion } from 'framer-motion';
import { X, ShoppingCart, Cloud, Calendar, Trash2, Play } from 'lucide-react';
import type { ExpectedOrder } from '@/types';
import { formatDetailDateTime } from '@/lib/date';

export interface OrderDetailModalProps {
  isOpen: boolean;
  order: ExpectedOrder | null;
  onClose: () => void;
  onDelete: () => void;
  onStartCount?: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  order,
  onClose,
  onDelete,
  onStartCount,
}) => {
  if (!isOpen || !order) return null;

  const skuCount = order.items?.length || 0;
  const totalQty =
    order.items?.reduce((acc, i) => acc + (i.expectedQty || i.quantity || 0), 0) || 0;
  const displayName = order.metadata?.internalGuide || order.metadata?.purchaseOrder || order.id;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-base border border-subtle rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-subtle shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary">{displayName}</h3>
                <p className="text-xs text-muted font-mono">{order.id}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg transition-colors">
              <X className="w-5 h-5 text-muted" />
            </button>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {order.metadata?.documentType && (
              <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold">
                {order.metadata.documentType}
              </span>
            )}
            {order._syncedFromCloud && (
              <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-semibold flex items-center gap-1">
                <Cloud className="w-3 h-3" /> Sincronizado
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-500/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-blue-500">{skuCount}</p>
              <p className="text-xs text-muted mt-1">SKUs</p>
            </div>
            <div className="bg-amber-500/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-amber-500">{totalQty.toLocaleString()}</p>
              <p className="text-xs text-muted mt-1">Unidades</p>
            </div>
          </div>

          {/* Info */}
          <div className="bg-surface rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase text-muted tracking-wider">Información</h4>
            <div className="space-y-2">
              {order.metadata?.purchaseOrder && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Orden de Compra</span>
                  <span className="text-primary font-mono">{order.metadata.purchaseOrder}</span>
                </div>
              )}
              {order.metadata?.date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Fecha</span>
                  <span className="text-primary">{order.metadata.date}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Importado
                </span>
                <span className="text-primary">{formatDetailDateTime(order.importedAt)}</span>
              </div>
            </div>
          </div>

          {/* Preview Items */}
          {order.items && order.items.length > 0 && (
            <div className="bg-surface rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase text-muted tracking-wider">
                Preview (primeros 5)
              </h4>
              <div className="space-y-2">
                {order.items.slice(0, 5).map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm bg-black/20 rounded-lg px-3 py-2"
                  >
                    <span className="text-secondary truncate flex-1">
                      {item.name || item.barcode}
                    </span>
                    <span className="text-muted ml-2 font-mono">
                      {item.expectedQty || item.quantity} und
                    </span>
                  </div>
                ))}
                {order.items.length > 5 && (
                  <p className="text-xs text-muted text-center pt-1">
                    + {order.items.length - 5} productos más...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-subtle shrink-0">
          <div className="flex gap-3">
            {onStartCount && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onStartCount}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Iniciar Conteo
              </motion.button>
            )}
            <button
              onClick={onDelete}
              className="px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="px-4 py-3 bg-surface hover:bg-elevated text-primary rounded-xl font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default OrderDetailModal;
