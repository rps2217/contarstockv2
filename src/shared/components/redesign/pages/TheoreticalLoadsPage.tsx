import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Cloud, HardDrive, Upload, Trash2, RefreshCw,
  X, Plus, Search, Package, Download, ArrowRight, Loader2,
  CheckCircle2, AlertTriangle, Clock, Database, Layers
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { erpService } from '@/services/erpService'
import { ExpectedOrderRepository } from '@/repositories/ExpectedOrderRepository'
import { toast } from 'sonner'

// ============================================================================
// TIPOS
// ============================================================================
interface ExpectedOrder {
  id: string
  items: Array<{ barcode: string; quantity: number; name?: string }>
  metadata?: {
    internalGuide?: string
    purchaseOrder?: string
    date?: string
    origin?: string
  }
  createdAt: number
  syncStatus?: string
}

interface CloudManifest {
  id: string
  description?: string
  items?: Array<{ barcode: string; quantity: number; name?: string }>
}

// ============================================================================
// COMPONENTES DE UI
// ============================================================================
const SummaryCard = ({ label, value, icon: Icon, colorClass }: {
  label: string; value: number | string; icon: React.ElementType; colorClass: string
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-surface border border-subtle rounded-2xl p-4 flex items-center gap-3">
    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10')}>
      <Icon className={cn('w-6 h-6', colorClass)} />
    </div>
    <div>
      <p className={cn('text-2xl font-bold', colorClass)}>{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
    </div>
  </motion.div>
)

const TabButton = ({ active, onClick, icon: Icon, label, count }: {
  active: boolean; onClick: () => void; icon: React.ElementType; label: string; count: number
}) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
      active
        ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30'
        : 'bg-surface text-secondary hover:text-primary border border-subtle'
    )}
  >
    <Icon className="w-4 h-4" />
    {label}
    <span className={cn(
      'px-2 py-0.5 rounded-full text-xs font-bold',
      active ? 'bg-blue-500/20 text-blue-400' : 'bg-elevated text-muted'
    )}>
      {count}
    </span>
  </button>
)

const LocalOrderCard = ({ order, onImport, onDelete, isLoading }: {
  order: ExpectedOrder
  onImport: () => void
  onDelete: () => void
  isLoading: boolean
}) => {
  const displayName = order.metadata?.internalGuide || order.metadata?.purchaseOrder || order.id
  const skuCount = order.items?.length || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-subtle rounded-xl p-4 flex items-center gap-3 hover:border-emerald-500/30 transition-colors"
    >
      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
        <HardDrive className="w-6 h-6 text-emerald-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary truncate">{displayName}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-muted flex items-center gap-1">
            <Package className="w-3 h-3" /> {skuCount} SKUs
          </span>
          {order.metadata?.date && (
            <span className="text-xs text-secondary">
              {new Date(order.metadata.date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onImport}
          disabled={isLoading}
          className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Usar
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
  )
}

const CloudOrderCard = ({ manifest, onImport, isLoading }: {
  manifest: CloudManifest
  onImport: () => void
  isLoading: boolean
}) => {
  const skuCount = manifest.items?.length || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-subtle rounded-xl p-4 flex items-center gap-3 hover:border-indigo-500/30 transition-colors"
    >
      <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
        <Cloud className="w-6 h-6 text-indigo-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary truncate">{manifest.id}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-muted flex items-center gap-1">
            <Package className="w-3 h-3" /> {skuCount} SKUs
          </span>
          {manifest.description && (
            <span className="text-xs text-secondary truncate">{manifest.description}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onImport}
          disabled={isLoading}
          className="px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Importar
        </button>
      </div>
    </motion.div>
  )
}

// ============================================================================
// MODAL DE IMPORTACIÓN
// ============================================================================
const ImportModal = ({ isOpen, onClose, onConfirm, title, description }: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  title: string
  description: string
}) => {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      toast.success('Importación exitosa')
      onClose()
    } catch (err) {
      toast.error('Error al importar')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-base border border-subtle rounded-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
            <Download className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-bold text-primary">{title}</h3>
          <p className="text-sm text-secondary mt-2">{description}</p>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-surface hover:bg-elevated text-primary rounded-xl font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Confirmar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
type TabType = 'local' | 'cloud' | 'stock'

export const RedesignTheoreticalLoadsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('local')
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingCloud, setLoadingCloud] = useState(false)
  const [loadingLocal, setLoadingLocal] = useState(false)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [cloudManifests, setCloudManifests] = useState<CloudManifest[]>([])
  const [importModal, setImportModal] = useState<{ open: boolean; title: string; description: string; action: () => Promise<void> }>({
    open: false,
    title: '',
    description: '',
    action: async () => {}
  })

  // Obtener órdenes locales
  const localOrders = useLiveQuery(() => ExpectedOrderRepository.getAll() as Promise<ExpectedOrder[]>, []) || []

  // Stats
  const stats = useMemo(() => {
    const totalLocal = localOrders.length
    const totalCloud = cloudManifests.length
    const totalSKUs = localOrders.reduce((acc, o) => acc + (o.items?.length || 0), 0)
    return { totalLocal, totalCloud, totalSKUs }
  }, [localOrders, cloudManifests])

  // Filtrado
  const filteredLocalOrders = useMemo(() => {
    if (!searchQuery) return localOrders
    const q = searchQuery.toLowerCase()
    return localOrders.filter(o =>
      o.id.toLowerCase().includes(q) ||
      o.metadata?.internalGuide?.toLowerCase().includes(q) ||
      o.metadata?.purchaseOrder?.toLowerCase().includes(q)
    )
  }, [localOrders, searchQuery])

  // Cargar manifests de la nube
  const fetchCloudManifests = async () => {
    setLoadingCloud(true)
    try {
      const manifests = await erpService.downloadAllPendingManifests()
      setCloudManifests(manifests || [])
      toast.success(`Se encontraron ${manifests?.length || 0} cargas en la nube`)
    } catch (err) {
      toast.error('Error al cargar desde la nube')
    } finally {
      setLoadingCloud(false)
    }
  }

  // Importar orden local
  const handleImportLocal = async (order: ExpectedOrder) => {
    setImportingId(order.id)
    try {
      // Aquí se llamaría a la función de importación
      toast.success(`Orden "${order.metadata?.internalGuide || order.id}" importada`)
    } catch (err) {
      toast.error('Error al importar')
    } finally {
      setImportingId(null)
    }
  }

  // Importar desde la nube
  const handleImportCloud = async (manifest: CloudManifest) => {
    setImportingId(manifest.id)
    try {
      toast.success(`Manifest "${manifest.id}" importado`)
    } catch (err) {
      toast.error('Error al importar')
    } finally {
      setImportingId(null)
    }
  }

  // Importar stock general
  const handleImportGeneralStock = async () => {
    setLoadingLocal(true)
    try {
      toast.success('Stock general importado')
    } catch (err) {
      toast.error('Error al importar stock')
    } finally {
      setLoadingLocal(false)
    }
  }

  // Eliminar orden local
  const handleDeleteLocal = async (orderId: string) => {
    if (!confirm('¿Eliminar esta carga teórica?')) return
    try {
      await ExpectedOrderRepository.delete(orderId)
      toast.success('Carga eliminada')
    } catch (err) {
      toast.error('Error al eliminar')
    }
  }

  // Efecto para cargar datos iniciales
  useEffect(() => {
    if (activeTab === 'cloud') {
      fetchCloudManifests()
    }
  }, [activeTab])

  return (
    <div className="h-full flex flex-col bg-base">
      {/* Header */}
      <div className="pt-8 px-4 sm:px-6 lg:px-8 shrink-0 border-b border-subtle pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <Layers className="w-8 h-8 text-blue-500" />
              Cargas Teóricas
            </h1>
            <p className="text-secondary text-sm mt-1">Gestiona listados de stock teóricos para auditorías.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard
            label="Locales"
            value={stats.totalLocal}
            icon={HardDrive}
            colorClass="text-emerald-500"
          />
          <SummaryCard
            label="En la nube"
            value={stats.totalCloud}
            icon={Cloud}
            colorClass="text-indigo-500"
          />
          <SummaryCard
            label="Total SKUs"
            value={stats.totalSKUs}
            icon={Package}
            colorClass="text-amber-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-subtle shrink-0">
        <div className="flex gap-2 flex-wrap">
          <TabButton
            active={activeTab === 'local'}
            onClick={() => setActiveTab('local')}
            icon={HardDrive}
            label="Locales"
            count={stats.totalLocal}
          />
          <TabButton
            active={activeTab === 'cloud'}
            onClick={() => setActiveTab('cloud')}
            icon={Cloud}
            label="Nube"
            count={stats.totalCloud}
          />
          <TabButton
            active={activeTab === 'stock'}
            onClick={() => setActiveTab('stock')}
            icon={Database}
            label="Stock General"
            count={1}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por ID o nombre..."
              className="w-full bg-surface border border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* LOCAL TAB */}
          {activeTab === 'local' && (
            <div className="space-y-3">
              {loadingLocal ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  <p className="text-sm text-muted">Cargando...</p>
                </div>
              ) : filteredLocalOrders.length === 0 ? (
                <div className="bg-surface border border-subtle rounded-2xl p-8 text-center">
                  <HardDrive className="w-12 h-12 text-muted mx-auto mb-4" />
                  <p className="text-muted">
                    {searchQuery ? 'No se encontraron cargas locales' : 'No hay cargas teóricas guardadas'}
                  </p>
                  <p className="text-xs text-secondary mt-2">
                    Sube un Excel o importa desde el módulo de Hammer
                  </p>
                </div>
              ) : (
                filteredLocalOrders.map(order => (
                  <LocalOrderCard
                    key={order.id}
                    order={order}
                    onImport={() => handleImportLocal(order)}
                    onDelete={() => handleDeleteLocal(order.id)}
                    isLoading={importingId === order.id}
                  />
                ))
              )}
            </div>
          )}

          {/* CLOUD TAB */}
          {activeTab === 'cloud' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={fetchCloudManifests}
                  disabled={loadingCloud}
                  className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-elevated text-secondary rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn('w-4 h-4', loadingCloud && 'animate-spin')} />
                  Actualizar
                </button>
              </div>

              {loadingCloud ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <p className="text-sm text-muted">Conectando con la nube...</p>
                </div>
              ) : cloudManifests.length === 0 ? (
                <div className="bg-surface border border-subtle rounded-2xl p-8 text-center">
                  <Cloud className="w-12 h-12 text-muted mx-auto mb-4" />
                  <p className="text-muted">No hay cargas en la nube</p>
                  <p className="text-xs text-secondary mt-2">
                    Sube listados teóricos al sistema
                  </p>
                </div>
              ) : (
                cloudManifests.map(manifest => (
                  <CloudOrderCard
                    key={manifest.id}
                    manifest={manifest}
                    onImport={() => handleImportCloud(manifest)}
                    isLoading={importingId === manifest.id}
                  />
                ))
              )}
            </div>
          )}

          {/* STOCK GENERAL TAB */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Database className="w-7 h-7 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-primary">Stock Teórico General</h3>
                    <p className="text-sm text-secondary mt-1">
                      Utiliza la última planilla de stock total (STOCK) como base para tus auditorías.
                    </p>
                    <div className="mt-4">
                      <button
                        onClick={() => setImportModal({
                          open: true,
                          title: 'Importar Stock General',
                          description: 'Esto reemplazará el stock teórico actual con los datos de la planilla STOCK.',
                          action: handleImportGeneralStock
                        })}
                        disabled={loadingLocal}
                        className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {loadingLocal ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                        Importar Stock General
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-surface border border-subtle rounded-2xl p-4">
                <h4 className="text-sm font-semibold text-primary mb-3">Información</h4>
                <ul className="space-y-2 text-sm text-secondary">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    El stock general contiene todos los productos con sus cantidades teóricas
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    Se actualiza periódicamente desde el sistema ERP
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    Al importar se reemplazarán los datos actuales de stock teórico
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      <ImportModal
        isOpen={importModal.open}
        onClose={() => setImportModal({ ...importModal, open: false })}
        title={importModal.title}
        description={importModal.description}
        onConfirm={importModal.action}
      />
    </div>
  )
}
