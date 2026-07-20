/**
 * EntityCards - Variantes especializadas de DataCard para cada tipo de entidad
 *
 * Proporciona cards pre-configuradas para:
 * - ProductCard: Productos de inventario
 * - CustomerCard: Clientes
 * - SupplierCard: Proveedores
 * - ReceptionCard: Recepciones
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, Pencil, Trash2, Eye, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// ProductCard
// ============================================================================
interface ProductCardProps {
  product: {
    id: string;
    name?: string;
    sku?: string;
    barcode?: string;
    stock?: number;
    minStock?: number;
    price?: number;
    syncStatus?: 'synced' | 'pending' | 'error';
  };
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  index?: number;
}

export const ProductCard: React.FC<ProductCardProps> = memo(
  ({ product, onEdit, onDelete, isDeleting = false, index = 0 }) => {
    const stockStatus =
      product.stock !== undefined && product.minStock !== undefined
        ? product.stock === 0
          ? 'out'
          : product.stock < product.minStock
            ? 'low'
            : 'ok'
        : null;

    const statusColors = {
      ok: 'text-emerald-500',
      low: 'text-amber-500',
      out: 'text-rose-500',
    };

    const statusBg = {
      ok: 'bg-emerald-500/10',
      low: 'bg-amber-500/10',
      out: 'bg-rose-500/10',
    };

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03, duration: 0.2 }}
        className="bg-surface border border-subtle rounded-xl overflow-hidden"
      >
        <div className="p-4 flex items-start gap-3">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <span className="text-xl">📦</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-primary truncate flex-1">
                {product.name || product.barcode || 'Sin nombre'}
              </h3>
              {stockStatus && (
                <span
                  className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    statusBg[stockStatus],
                    statusColors[stockStatus]
                  )}
                >
                  {stockStatus === 'out'
                    ? 'Sin stock'
                    : stockStatus === 'low'
                      ? 'Bajo stock'
                      : 'OK'}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              {product.sku && <span>SKU: {product.sku}</span>}
              {product.stock !== undefined && <span>Stock: {product.stock}</span>}
              {product.price !== undefined && <span>${product.price.toFixed(0)}</span>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          className="border-t border-subtle flex"
          role="group"
          aria-label="Acciones del producto"
        >
          <button
            onClick={onEdit}
            disabled={isDeleting}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-xs transition-colors border-l border-subtle hover:text-blue-500 hover:bg-elevated"
            aria-label={`Editar producto ${product.name}`}
          >
            <Pencil className="w-4 h-4" aria-hidden="true" />
            <span>Editar</span>
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-xs transition-colors border-l border-subtle hover:text-rose-500 hover:bg-elevated"
            aria-label={`Eliminar producto ${product.name}`}
            aria-busy={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            )}
            <span>Eliminar</span>
          </button>
        </div>
      </motion.div>
    );
  }
);

ProductCard.displayName = 'ProductCard';

// ============================================================================
// CustomerCard
// ============================================================================
interface CustomerCardProps {
  customer: {
    id: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    syncStatus?: 'synced' | 'pending' | 'error';
  };
  onClick: () => void;
  index?: number;
}

export const CustomerCard: React.FC<CustomerCardProps> = memo(
  ({ customer, onClick, index = 0 }) => {
    const syncStatusColor =
      customer.syncStatus === 'synced'
        ? 'text-emerald-500'
        : customer.syncStatus === 'pending'
          ? 'text-amber-500'
          : 'text-rose-500';

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03, duration: 0.2 }}
        onClick={onClick}
        className="flex items-center gap-3 p-3 hover:bg-elevated transition-colors group cursor-pointer rounded-xl"
      >
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
          <span className="text-lg">👤</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-primary truncate">
              {customer.firstName} {customer.lastName}
            </p>
            {customer.syncStatus && (
              <span className={cn('text-[10px] font-medium', syncStatusColor)}>
                {customer.syncStatus === 'synced'
                  ? '●'
                  : customer.syncStatus === 'pending'
                    ? '○'
                    : '⚠'}
              </span>
            )}
          </div>
          {customer.phone && (
            <span className="text-xs text-secondary flex items-center gap-1">
              📞 {customer.phone}
            </span>
          )}
        </div>
      </motion.div>
    );
  }
);

CustomerCard.displayName = 'CustomerCard';

// ============================================================================
// SupplierCard
// ============================================================================
interface SupplierCardProps {
  supplier: {
    id: string;
    name?: string;
    rut?: string;
    phone?: string;
    email?: string;
    address?: string;
    syncStatus?: 'synced' | 'pending' | 'error';
  };
  onClick: () => void;
  index?: number;
}

export const SupplierCard: React.FC<SupplierCardProps> = memo(
  ({ supplier, onClick, index = 0 }) => {
    const syncStatusColor =
      supplier.syncStatus === 'synced'
        ? 'text-emerald-500'
        : supplier.syncStatus === 'pending'
          ? 'text-amber-500'
          : 'text-rose-500';

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03, duration: 0.2 }}
        onClick={onClick}
        className="flex items-center gap-3 p-3 hover:bg-elevated transition-colors group cursor-pointer rounded-xl"
      >
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
          <span className="text-lg">🚚</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-primary truncate">
              {supplier.name || 'Sin nombre'}
            </p>
            {supplier.rut && <span className="text-xs text-muted">{supplier.rut}</span>}
          </div>
          {supplier.phone && (
            <span className="text-xs text-secondary flex items-center gap-1">
              📞 {supplier.phone}
            </span>
          )}
        </div>
      </motion.div>
    );
  }
);

SupplierCard.displayName = 'SupplierCard';

// ============================================================================
// ReceptionCard
// ============================================================================
interface ReceptionCardProps {
  reception: {
    id: string;
    supplierName?: string;
    documentNumber?: string;
    receivedAt: number;
    items: { barcode: string; name?: string; quantity: number }[];
    status: 'pending' | 'in-progress' | 'completed';
    syncStatus?: 'synced' | 'pending' | 'error';
  };
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  index?: number;
}

const statusConfig = {
  pending: { bg: 'bg-amber-500/20', text: 'text-amber-500', label: 'Pendiente' },
  'in-progress': { bg: 'bg-blue-500/20', text: 'text-blue-500', label: 'En Progreso' },
  completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-500', label: 'Completado' },
};

export const ReceptionCard: React.FC<ReceptionCardProps> = memo(
  ({ reception, onView, onEdit, onDelete, index = 0 }) => {
    const status = statusConfig[reception.status];
    const date = reception.receivedAt
      ? new Date(reception.receivedAt).toLocaleDateString('es-CL')
      : '-';
    const time = reception.receivedAt
      ? new Date(reception.receivedAt).toLocaleTimeString('es-CL', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03, duration: 0.2 }}
        className="bg-surface border border-subtle rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <span className="text-xl">📥</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-primary truncate flex-1">
                {reception.supplierName || 'Proveedor'}
              </h3>
              <span
                className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded-full',
                  status.bg,
                  status.text
                )}
              >
                {status.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              {reception.documentNumber && <span>Doc: {reception.documentNumber}</span>}
              <span>📦 {reception.items.length} items</span>
              <span>📅 {date}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          className="border-t border-subtle flex"
          role="group"
          aria-label="Acciones de recepción"
        >
          <button
            onClick={onView}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-xs transition-colors border-l border-subtle hover:text-blue-500 hover:bg-elevated"
            aria-label={`Ver recepción ${reception.documentNumber || ''}`}
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
            <span>Ver</span>
          </button>
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-xs transition-colors border-l border-subtle hover:text-blue-500 hover:bg-elevated"
            aria-label={`Editar recepción ${reception.documentNumber || ''}`}
          >
            <Pencil className="w-4 h-4" aria-hidden="true" />
            <span>Editar</span>
          </button>
          <button
            onClick={onDelete}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-xs transition-colors border-l border-subtle hover:text-rose-500 hover:bg-elevated"
            aria-label={`Eliminar recepción ${reception.documentNumber || ''}`}
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            <span>Eliminar</span>
          </button>
        </div>
      </motion.div>
    );
  }
);

ReceptionCard.displayName = 'ReceptionCard';

export default {
  ProductCard,
  CustomerCard,
  SupplierCard,
  ReceptionCard,
};
