/**
 * =============================================================================
 * THEORETICAL LOADS CARDS - Componentes de tarjetas para TheoreticalLoadsPage
 * =============================================================================
 *
 * Componentes de tarjetas para órdenes locales y manifiestos en la nube.
 *
 * @module TheoreticalLoadsPage/theoreticalLoadsCards
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  HardDrive,
  Package,
  Layers,
  Calendar,
  Eye,
  Play,
  Send,
  Printer,
  Trash2,
  Loader2,
  FileText,
  Cloud,
  ArrowRight,
} from 'lucide-react';
import type { ExpectedOrder, ExpectedItem } from '@/types';
import type { ErpManifest } from '@/services/erpService';
import { cn } from '@/lib/utils';

// ============================================================================
// LOCAL ORDER CARD
// ============================================================================

interface LocalOrderCardProps {
  order: ExpectedOrder;
  onImport: () => void;
  onDelete: () => void;
  onStartCount: () => void;
  onPrint: () => void;
  onViewDetail: () => void;
  isLoading: boolean;
  importingId: string | null;
}

export const LocalOrderCard: React.FC<LocalOrderCardProps> = ({
  order,
  onImport,
  onDelete,
  onStartCount,
  onPrint,
  onViewDetail,
  isLoading,
  importingId,
}) => {
  const displayName = order.metadata?.internalGuide || order.metadata?.purchaseOrder || order.id;
  const skuCount = order.items?.length || 0;
  const totalQty =
    order.items?.reduce((acc, i) => acc + (i.quantity || i.expectedQty || 0), 0) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-surface border border-subtle rounded-xl p-4 hover:border-emerald-500/30 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
          <HardDrive className="w-6 h-6 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <button onClick={onViewDetail} className="text-left hover:opacity-80 transition-opacity">
            <p className="text-sm font-semibold text-primary truncate flex items-center gap-2">
              {displayName}
              <Eye className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100" />
            </p>
          </button>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" /> {skuCount} SKUs
            </span>
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3" /> {totalQty} unidades
            </span>
            {order.metadata?.date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {order.metadata.date}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-subtle">
        <button
          onClick={onStartCount}
          disabled={isLoading}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
        >
          {isLoading && importingId === order.id ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          Iniciar Conteo
        </button>
        <button
          onClick={onImport}
          disabled={isLoading}
          className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
          title="Enviar a Modo Ráfaga"
        >
          <Send className="w-3.5 h-3.5" />
          Enviar
        </button>
        <button
          onClick={onPrint}
          disabled={isLoading}
          className="px-3 py-2 hover:bg-purple-500/10 text-purple-500 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
          title="Imprimir ticket térmico"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          disabled={isLoading}
          className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

// ============================================================================
// CLOUD MANIFEST CARD (Original con ErpManifest)
// ============================================================================

interface CloudManifestCardProps {
  manifest: ErpManifest;
  onImport: () => void;
  isLoading: boolean;
  importingId: string | null;
}

export const CloudManifestCard: React.FC<CloudManifestCardProps> = ({
  manifest,
  onImport,
  isLoading,
  importingId,
}) => {
  const skuCount = manifest.items?.length || 0;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onImport}
      disabled={isLoading}
      className="w-full text-left bg-surface/60 hover:bg-surface border border-white/5 hover:border-indigo-500/20 p-3.5 rounded-xl flex items-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
    >
      <div className="w-9 h-9 bg-indigo-500/10 rounded-lg flex items-center justify-center shrink-0 border border-indigo-500/10">
        {isLoading && importingId === manifest.id ? (
          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
        ) : (
          <FileText className="w-4 h-4 text-indigo-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-white truncate">
            {manifest.id}
          </span>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest shrink-0',
              manifest.status === 'completed'
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-indigo-500/10 text-indigo-400'
            )}
          >
            {manifest.status === 'completed' ? 'COMPLETADO' : 'PENDIENTE'}
          </span>
        </div>
        <p className="text-[8px] font-black text-slate-500 uppercase tracking-tight mt-0.5 truncate">
          {manifest.description || 'Sin descripción adicional'}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[8px] text-muted flex items-center gap-1">
            <Package className="w-3 h-3" /> {skuCount} SKUs
          </span>
          <span className="text-[8px] text-muted flex items-center gap-1">
            <Layers className="w-3 h-3" /> {manifest.expectedTrays} bandejas
          </span>
        </div>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0" />
    </motion.button>
  );
};
