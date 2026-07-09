import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Truck, Plus, Phone, Mail, MapPin,
  Edit2, Trash2, ChevronRight, Package, X, RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers'
import { Provider } from '@/types'
import { toast } from 'sonner'
import { HorizontalStatCard } from '@/shared/components/ui/HorizontalStatCard'
import { SearchInput } from '@/shared/components/ui/SearchInput'
import { FAB } from '@/shared/components/ui/FAB'
import { EmptyState } from '@/shared/components/ui/EmptyState'

// ============================================================================
// Componentes
// ============================================================================
const SupplierRow = ({ supplier, onClick }: { supplier: Provider; onClick: () => void }) => (
  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
    className="flex items-center gap-4 p-4 bg-surface hover:bg-elevated rounded-xl transition-colors cursor-pointer"
    onClick={onClick}>
    <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
      <Truck className="w-6 h-6 text-amber-500" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-primary truncate">{supplier.name}</p>
      <div className="flex flex-wrap items-center gap-3 mt-1">
        {supplier.rut && <span className="text-xs text-muted font-mono">{supplier.rut}</span>}
        {supplier.phone && (
          <span className="text-xs text-secondary flex items-center gap-1">
            <Phone className="w-3 h-3" />{supplier.phone}
          </span>
        )}
        {supplier.email && (
          <span className="text-xs text-secondary flex items-center gap-1">
            <Mail className="w-3 h-3" />{supplier.email}
          </span>
        )}
      </div>
    </div>
    <div className="flex items-center gap-2">
      <span className={cn(
        'px-2 py-1 rounded-full text-xs font-medium',
        (supplier as any).hasCanje ? 'bg-emerald-500/20 text-emerald-500' : 'bg-muted/20 text-muted'
      )}>
        {(supplier as any).hasCanje ? 'Con Canje' : 'Sin Canje'}
      </span>
      <ChevronRight className="w-4 h-4 text-muted" />
    </div>
  </motion.div>
)

// ============================================================================
// Modal de Detalle
// ============================================================================
const SupplierDetailModal = ({ 
  supplier, 
  onClose,
  onEdit,
  onDelete 
}: { 
  supplier: Provider | null; 
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  if (!supplier) return null

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-base border border-subtle rounded-t-3xl sm:rounded-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Truck className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">{supplier.name}</p>
              <p className="text-xs text-muted font-mono">{supplier.rut}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-elevated rounded-xl">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface rounded-xl p-3">
              <p className="text-xs text-muted mb-1">Teléfono</p>
              <p className="text-sm font-semibold text-primary">{supplier.phone || 'N/A'}</p>
            </div>
            <div className="bg-surface rounded-xl p-3">
              <p className="text-xs text-muted mb-1">Email</p>
              <p className="text-sm font-semibold text-primary truncate">{supplier.email || 'N/A'}</p>
            </div>
          </div>

          {supplier.address && (
            <div className="bg-surface rounded-xl p-3">
              <p className="text-xs text-muted mb-1">Dirección</p>
              <p className="text-sm text-secondary">{supplier.address}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-subtle">
            <span className="text-xs text-muted">Tipo</span>
            <span className={cn(
              'px-2 py-1 rounded-full text-xs font-medium',
              (supplier as any).hasCanje ? 'bg-emerald-500/20 text-emerald-500' : 'bg-muted/20 text-muted'
            )}>
              {(supplier as any).hasCanje ? 'Con Canje' : 'Sin Canje'}
            </span>
          </div>
        </div>

        <div className="p-4 border-t border-subtle flex gap-3">
          <button onClick={onDelete}
            className="flex-1 py-3 bg-rose-500/20 text-rose-400 rounded-xl font-medium hover:bg-rose-500/30 transition-colors flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" />
            Eliminar
          </button>
          <button onClick={onEdit}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition-colors flex items-center justify-center gap-2">
            <Edit2 className="w-4 h-4" />
            Editar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================================================
// Componente principal
// ============================================================================
export const RedesignSuppliersPage: React.FC = () => {
  const { filteredSuppliers, stats, isLoading, isSyncing, ui, actions } = useSuppliers()
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = useMemo(() => {
    if (!searchQuery) return filteredSuppliers
    const q = searchQuery.toLowerCase()
    return filteredSuppliers.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.rut?.includes(q) ||
      s.email?.toLowerCase().includes(q)
    )
  }, [filteredSuppliers, searchQuery])

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-base">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-muted mt-4">Cargando proveedores...</p>
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
              <Truck className="w-8 h-8 text-orange-500" />
              Proveedores
            </h1>
            <p className="text-secondary text-sm mt-2">Gestión de proveedores y distribuidores.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={actions.syncSuppliers} disabled={isSyncing}
              className="flex items-center gap-2 bg-surface hover:bg-elevated border border-subtle text-primary px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
              <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
            </button>
            <button onClick={actions.openCreate}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
              <Plus className="w-4 h-4" />
              Nuevo
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <HorizontalStatCard icon={Truck} label="Total" value={stats.total} />
          <HorizontalStatCard icon={Package} label="Con Canje" value={stats.withExchange} color="text-emerald-500" />
          <HorizontalStatCard icon={X} label="Sin Canje" value={stats.withoutExchange} color="text-muted" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {/* Search */}
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar por nombre, RUT o email..."
          />

          {/* List */}
          <div className="flex flex-col gap-2">
            {filtered.length === 0 ? (
              <EmptyState
                icon={Truck}
                title={searchQuery ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}
                description={!searchQuery ? 'Agrega tu primer proveedor para comenzar' : undefined}
                action={!searchQuery ? { label: 'Agregar proveedor', onClick: actions.openCreate } : undefined}
              />
            ) : (
              filtered.map(supplier => (
                <SupplierRow
                  key={supplier.rut}
                  supplier={supplier}
                  onClick={() => actions.openDetail(supplier)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {ui.isDetailModalOpen && ui.selectedProvider && (
          <SupplierDetailModal
            supplier={ui.selectedProvider}
            onClose={actions.closeDetail}
            onEdit={() => {
              actions.openEdit(ui.selectedProvider)
              actions.closeDetail()
            }}
            onDelete={() => {
              if (confirm('¿Eliminar este proveedor?')) {
                actions.deleteSupplier(ui.selectedProvider!.rut)
                actions.closeDetail()
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* FAB para móvil */}
      <FAB onClick={actions.openCreate} visible={true} color="bg-amber-600 hover:bg-amber-500" label="Agregar proveedor" />
    </div>
  )
}
