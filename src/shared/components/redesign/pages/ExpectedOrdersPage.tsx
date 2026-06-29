import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ClipboardList, Package, Plus, Search, Upload, FileText, X, Check,
  Clock, AlertCircle, ChevronRight, MoreVertical, Trash2, Edit2, Download
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useExpectedOrders } from '@/features/expected-orders/hooks/useExpectedOrders'
import type { ExpectedOrder } from '@/types'

// ============================================================================
// Componentes de UI
// ============================================================================
const StatCard = ({ label, value, color = 'text-primary' }: { label: string; value: number; color?: string }) => (
  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
    className="bg-surface border border-subtle rounded-xl p-4">
    <p className={cn('text-2xl font-bold', color)}>{value}</p>
    <p className="text-xs text-muted">{label}</p>
  </motion.div>
)

const OrderRow = ({ order, onSelect }: { order: ExpectedOrder; onSelect: () => void }) => {
  const itemCount = order.items?.length || 0
  const totalUnits = order.items?.reduce((acc, i) => acc + i.quantity, 0) || 0
  const createdAt = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
      onClick={onSelect}
      className="flex items-center gap-4 p-4 bg-surface hover:bg-elevated rounded-xl cursor-pointer transition-colors">
      <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
        <FileText className="w-6 h-6 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-primary truncate">
            {order.purchaseOrder || order.internalId || 'Sin descripción'}
          </p>
          <span className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            order.isFulfilled ? 'bg-emerald-500/20 text-emerald-500' : 'bg-blue-500/20 text-blue-500'
          )}>
            {order.isFulfilled ? 'Completado' : 'Pendiente'}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-1">
          <span className="text-xs text-muted">{itemCount} items</span>
          <span className="text-xs text-muted">{totalUnits} unidades</span>
          <span className="text-xs text-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />{createdAt}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-surface transition-colors">
          <MoreVertical className="w-4 h-4 text-muted" />
        </button>
        <ChevronRight className="w-4 h-4 text-muted" />
      </div>
    </motion.div>
  )
}

// ============================================================================
// Componente principal
// ============================================================================
export const RedesignExpectedOrdersPage: React.FC = () => {
  const { savedOrders, actions } = useExpectedOrders()
  const [searchQuery, setSearchQuery] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)

  const filtered = useMemo(() => {
    if (!searchQuery) return savedOrders || []
    const q = searchQuery.toLowerCase()
    return (savedOrders || []).filter(o => 
      o.purchaseOrder?.toLowerCase().includes(q) ||
      o.internalId?.toLowerCase().includes(q) ||
      o.documentType?.toLowerCase().includes(q)
    )
  }, [savedOrders, searchQuery])

  const stats = useMemo(() => {
    const orders = savedOrders || []
    return {
      total: orders.length,
      pending: orders.filter(o => !o.isFulfilled).length,
      completed: orders.filter(o => o.isFulfilled).length,
      totalUnits: orders.reduce((acc, o) => acc + (o.items?.reduce((a, i) => a + i.quantity, 0) || 0), 0)
    }
  }, [savedOrders])

  if (!savedOrders) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-base">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-muted mt-4">Cargando órdenes...</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-base">
      {/* Header */}
      <div className="pt-8 px-4 sm:px-6 lg:px-8 shrink-0">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-amber-500" />
              Órdenes Esperadas
            </h1>
            <p className="text-secondary text-sm mt-2">Gestión de cargas teóricas y órdenes de pedido.</p>
          </div>
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
            <Upload className="w-4 h-4" />
            Importar
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Pendientes" value={stats.pending} color="text-amber-500" />
          <StatCard label="Completadas" value={stats.completed} color="text-emerald-500" />
          <StatCard label="Unidades" value={stats.totalUnits} color="text-blue-500" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por orden, ID o tipo..."
              className="w-full bg-surface border border-subtle rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
          </div>

          {/* List */}
          <div className="flex flex-col gap-2">
            {filtered.length === 0 ? (
              <div className="bg-surface border border-subtle rounded-2xl p-8 text-center">
                <ClipboardList className="w-12 h-12 text-muted mx-auto mb-4" />
                <p className="text-muted">
                  {searchQuery ? 'No se encontraron órdenes' : 'No hay órdenes registradas'}
                </p>
                {!searchQuery && (
                  <button onClick={() => setShowImportModal(true)}
                    className="mt-4 text-blue-500 hover:underline">
                    Importar primera orden
                  </button>
                )}
              </div>
            ) : (
              filtered.map(order => (
                <OrderRow 
                  key={order.id} 
                  order={order}
                  onSelect={() => console.log('Select order:', order.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Import Modal Placeholder */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-base border border-subtle rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-primary">Importar Orden</h2>
              <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-surface rounded-lg">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>
            <div className="border-2 border-dashed border-subtle rounded-xl p-8 text-center">
              <Upload className="w-12 h-12 text-muted mx-auto mb-4" />
              <p className="text-sm text-muted mb-2">Arrastra un archivo CSV o haz clic para seleccionar</p>
              <button className="px-4 py-2 bg-surface border border-subtle rounded-lg text-sm hover:bg-elevated">
                Seleccionar archivo
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
