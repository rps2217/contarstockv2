import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Cloud, HardDrive, Upload, Trash2, RefreshCw,
  X, Plus, Search, Package, Download, ArrowRight, Loader2,
  CheckCircle2, AlertTriangle, Clock, Database, Layers,
  Play, Zap, Eye, Send, Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { 
  ExpectedOrderRepository,
  type ExpectedOrder 
} from '@/repositories/ExpectedOrderRepository'
import { supabaseSyncService } from '@/services/supabaseSyncService'
import { SoundFX } from '@/services/audio'

// ============================================================================
// TIPOS
// ============================================================================
interface CloudOrder {
  id: string
  erp: string
  name: string
  description?: string
  items?: Array<{ barcode: string; qty: number; name: string }>
  created_at?: string
}

// ============================================================================
// HELPERS
// ============================================================================
const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const formatNumber = (num: number) => {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
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

const TabButton = ({ active, onClick, icon: Icon, label, count, color }: {
  active: boolean; onClick: () => void; icon: React.ElementType; label: string; count: number; color: string
}) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
      active
        ? `bg-${color}/10 text-${color} border border-${color}/30`
        : 'bg-surface text-secondary hover:text-primary border border-subtle'
    )}
    style={active ? {
      backgroundColor: `var(--color-${color}, #3b82f6)15`,
      color: `var(--color-${color}, #3b82f6)`,
      borderColor: `var(--color-${color}, #3b82f6)30`
    } : {}}
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

// ============================================================================
// CARD DE ORDEN LOCAL
// ============================================================================
const LocalOrderCard = ({ 
  order, 
  onImport, 
  onDelete, 
  onStartCount,
  isLoading,
  importingId 
}: {
  order: ExpectedOrder
  onImport: () => void
  onDelete: () => void
  onStartCount: () => void
  isLoading: boolean
  importingId: string | null
}) => {
  const displayName = order.metadata?.internalGuide || order.metadata?.purchaseOrder || order.id
  const skuCount = order.items?.length || 0
  const totalQty = order.items?.reduce((acc, i) => acc + (i.quantity || i.expectedQty || 0), 0) || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-subtle rounded-xl p-4 hover:border-emerald-500/30 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
          <HardDrive className="w-6 h-6 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary truncate">{displayName}</p>
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
      
      {/* Acciones */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-subtle">
        <button
          onClick={onStartCount}
          disabled={isLoading}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
        >
          {isLoading && importingId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
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

// ============================================================================
// CARD DE ORDEN EN LA NUBE
// ============================================================================
const CloudOrderCard = ({ 
  order, 
  onImport, 
  isLoading 
}: {
  order: CloudOrder
  onImport: () => void
  isLoading: boolean
}) => {
  const skuCount = order.items?.length || 0
  const totalQty = order.items?.reduce((acc, i) => acc + (i.qty || 0), 0) || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-subtle rounded-xl p-4 hover:border-indigo-500/30 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
          <Cloud className="w-6 h-6 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-primary truncate">{order.erp || order.id}</p>
            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[10px] font-bold">
              NUBE
            </span>
          </div>
          {order.name && (
            <p className="text-xs text-secondary mt-0.5 truncate">{order.name}</p>
          )}
          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" /> {skuCount} SKUs
            </span>
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3" /> {totalQty} unidades
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-subtle">
        <button
          onClick={onImport}
          disabled={isLoading}
          className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
        >
          {isLoading && importingId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Descargar
        </button>
      </div>
    </motion.div>
  )
}

// ============================================================================
// MODAL DE CONFIRMACIÓN
// ============================================================================
const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description,
  confirmText = 'Confirmar',
  loading = false,
  variant = 'default'
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  title: string
  description: string
  confirmText?: string
  loading?: boolean
  variant?: 'default' | 'danger' | 'warning'
}) => {
  if (!isOpen) return null

  const variantStyles = {
    default: 'bg-blue-600 hover:bg-blue-500',
    danger: 'bg-rose-600 hover:bg-rose-500',
    warning: 'bg-amber-600 hover:bg-amber-500'
  }

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
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
            variant === 'danger' ? 'bg-rose-500/10' : 
            variant === 'warning' ? 'bg-amber-500/10' : 'bg-blue-500/10'
          )}>
            {variant === 'danger' ? (
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            ) : variant === 'warning' ? (
              <Database className="w-8 h-8 text-amber-500" />
            ) : (
              <Download className="w-8 h-8 text-blue-500" />
            )}
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
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex-1 py-3 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50',
              variantStyles[variant]
            )}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {confirmText}
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

// Generar batchId único para las operaciones
const generateBatchId = () => {
  return `TL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
}

export const RedesignTheoreticalLoadsPage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('local')
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingCloud, setLoadingCloud] = useState(false)
  const [loadingLocal, setLoadingLocal] = useState(false)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [cloudOrders, setCloudOrders] = useState<CloudOrder[]>([])
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    description: string
    action: () => Promise<void>
    confirmText: string
    variant: 'default' | 'danger' | 'warning'
  }>({
    open: false,
    title: '',
    description: '',
    action: async () => {},
    confirmText: 'Confirmar',
    variant: 'default'
  })

  // BatchId para operaciones
  const [batchId] = useState(() => generateBatchId())

  // Obtener órdenes locales
  const localOrders = useLiveQuery(() => ExpectedOrderRepository.getAll(), []) || []

  // Stats
  const stats = useMemo(() => {
    const totalLocal = localOrders.length
    const totalCloud = cloudOrders.length
    const totalSKUs = localOrders.reduce((acc, o) => acc + (o.items?.length || 0), 0)
    return { totalLocal, totalCloud, totalSKUs }
  }, [localOrders, cloudOrders])

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

  // =========================================================================
  // FUNCIONES DE IMPORTACIÓN
  // =========================================================================

  // Importar orden local al modo ráfaga (Hammer)
  const importLocalToHammer = useCallback(async (orderId: string) => {
    const { importLocalExpectedOrderToHammer } = await import('@/services/massiveSync')
    const count = await importLocalExpectedOrderToHammer(batchId, orderId)
    SoundFX.play('success')
    toast.success(`${count} SKUs enviados al modo ráfaga`)
    navigate(`/massive/${batchId}`)
  }, [batchId, navigate])

  // Importar orden desde la nube
  const importFromCloud = useCallback(async (orderId: string) => {
    const { importExpectedOrderFromCloud } = await import('@/services/massiveSync')
    const count = await importExpectedOrderFromCloud(batchId, orderId)
    SoundFX.play('success')
    toast.success(`${count} SKUs descargados desde la nube`)
    navigate(`/massive/${batchId}`)
  }, [batchId, navigate])

  // Importar stock general
  const importGeneralStock = useCallback(async () => {
    const { importManifestFromCloud } = await import('@/services/massiveSync')
    const count = await importManifestFromCloud(batchId)
    SoundFX.play('success')
    toast.success(`${count} SKUs del stock general importados`)
    navigate(`/massive/${batchId}`)
  }, [batchId, navigate])

  // Iniciar conteo desde orden local
  const startCountFromLocal = useCallback(async (order: ExpectedOrder) => {
    setImportingId(order.id)
    try {
      const { startTestCountingFromOrder } = await import('@/services/massiveSync')
      const sessionId = await startTestCountingFromOrder(batchId, order.id)
      SoundFX.play('success')
      toast.success('Conteo iniciado')
      navigate(`/counting/${sessionId}`)
    } catch (err: any) {
      SoundFX.play('error')
      toast.error(err.message || 'Error al iniciar conteo')
    } finally {
      setImportingId(null)
    }
  }, [batchId, navigate])

  // Eliminar orden local
  const deleteLocalOrder = useCallback(async (orderId: string) => {
    await ExpectedOrderRepository.delete(orderId)
    SoundFX.play('success')
    toast.success('Carga eliminada')
  }, [])

  // Cargar órdenes desde la nube (PEDIDOS)
  const fetchCloudOrders = useCallback(async () => {
    setLoadingCloud(true)
    try {
      const { getSettings } = await import('@/services/settings')
      const config = getSettings().cloudConfig
      const tableName = config?.ordersTableName || 'PEDIDOS'
      
      const result = await supabaseSyncService.pullBatch(tableName)
      
      if (!result.success || !result.rows) {
        throw new Error('Error al obtener cargas de la nube')
      }

      // Filtrar y transformar
      const orders: CloudOrder[] = result.rows
        .map((row: any) => {
          const erpId = row.erp || row.id || ''
          if (!erpId) return null
          
          return {
            id: erpId,
            erp: erpId,
            name: row.name || row.descripcion || '',
            description: row.description || row.descripcion || '',
            items: row.items || [],
            created_at: row.created_at || row.fecha || ''
          }
        })
        .filter(Boolean)

      setCloudOrders(orders)
      toast.success(`Se encontraron ${orders.length} cargas en la nube`)
    } catch (err: any) {
      console.error('Error fetchCloudOrders:', err)
      toast.error(err.message || 'Error al cargar desde la nube')
      setCloudOrders([])
    } finally {
      setLoadingCloud(false)
    }
  }, [])

  // Efecto para cargar datos iniciales
  useEffect(() => {
    if (activeTab === 'cloud') {
      fetchCloudOrders()
    }
  }, [activeTab, fetchCloudOrders])

  // =========================================================================
  // HANDLERS
  // =========================================================================

  const handleImportLocal = (orderId: string) => {
    setConfirmModal({
      open: true,
      title: 'Enviar a Modo Ráfaga',
      description: 'Esta carga teórica se enviará al módulo de modo ráfaga para comenzar el conteo.',
      confirmText: 'Enviar',
      variant: 'default',
      action: () => importLocalToHammer(orderId)
    })
  }

  const handleStartCount = (order: ExpectedOrder) => {
    setConfirmModal({
      open: true,
      title: 'Iniciar Conteo de Prueba',
      description: `Se creará una sesión de conteo con ${order.items?.length || 0} SKUs de esta carga teórica.`,
      confirmText: 'Iniciar',
      variant: 'default',
      action: () => startCountFromLocal(order)
    })
  }

  const handleDeleteLocal = (orderId: string) => {
    setConfirmModal({
      open: true,
      title: 'Eliminar Carga Teórica',
      description: '¿Estás seguro de eliminar esta carga teórica? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      variant: 'danger',
      action: () => deleteLocalOrder(orderId)
    })
  }

  const handleImportCloud = (orderId: string) => {
    setConfirmModal({
      open: true,
      title: 'Descargar desde la Nube',
      description: 'Esta carga se descargará y estará disponible en modo ráfaga.',
      confirmText: 'Descargar',
      variant: 'default',
      action: () => importFromCloud(orderId)
    })
  }

  const handleImportStock = () => {
    setConfirmModal({
      open: true,
      title: 'Importar Stock General',
      description: 'Se importará la planilla STOCK completa con todos los productos y cantidades teóricas.',
      confirmText: 'Importar',
      variant: 'warning',
      action: importGeneralStock
    })
  }

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div className="h-full flex flex-col bg-base">
      {/* Header */}
      <div className="pt-6 px-4 sm:px-6 lg:px-8 shrink-0 border-b border-subtle pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <Layers className="w-8 h-8 text-blue-500" />
              Cargas Teóricas
            </h1>
            <p className="text-secondary text-sm mt-1">
              Gestiona listados de stock teóricos para auditorías y conteos.
            </p>
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
            value={formatNumber(stats.totalSKUs)}
            icon={Package}
            colorClass="text-amber-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-6 lg:px-8 py-3 border-b border-subtle shrink-0">
        <div className="flex gap-2 flex-wrap">
          <TabButton
            active={activeTab === 'local'}
            onClick={() => setActiveTab('local')}
            icon={HardDrive}
            label="Locales"
            count={stats.totalLocal}
            color="emerald"
          />
          <TabButton
            active={activeTab === 'cloud'}
            onClick={() => setActiveTab('cloud')}
            icon={Cloud}
            label="Nube"
            count={stats.totalCloud}
            color="indigo"
          />
          <TabButton
            active={activeTab === 'stock'}
            onClick={() => setActiveTab('stock')}
            icon={Database}
            label="Stock General"
            count={1}
            color="amber"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {/* Search */}
          {activeTab === 'local' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por ID, guía interna u orden de compra..."
                className="w-full bg-surface border border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* ========== TAB LOCAL ========== */}
          {activeTab === 'local' && (
            <div className="space-y-3">
              {filteredLocalOrders.length === 0 ? (
                <div className="bg-surface border border-subtle rounded-2xl p-8 text-center">
                  <HardDrive className="w-12 h-12 text-muted mx-auto mb-4" />
                  <p className="text-muted">
                    {searchQuery ? 'No se encontraron cargas locales' : 'No hay cargas teóricas guardadas'}
                  </p>
                  <p className="text-xs text-secondary mt-2">
                    Importa un Excel o descarga desde la nube
                  </p>
                </div>
              ) : (
                filteredLocalOrders.map(order => (
                  <LocalOrderCard
                    key={order.id}
                    order={order}
                    onImport={() => handleImportLocal(order.id)}
                    onDelete={() => handleDeleteLocal(order.id)}
                    onStartCount={() => handleStartCount(order)}
                    isLoading={importingId === order.id}
                    importingId={importingId}
                  />
                ))
              )}
            </div>
          )}

          {/* ========== TAB NUBE ========== */}
          {activeTab === 'cloud' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted">Cargas disponibles en la nube (PEDIDOS)</p>
                <button
                  onClick={fetchCloudOrders}
                  disabled={loadingCloud}
                  className="flex items-center gap-2 px-3 py-1.5 bg-surface hover:bg-elevated text-secondary rounded-lg text-xs transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', loadingCloud && 'animate-spin')} />
                  Actualizar
                </button>
              </div>

              {loadingCloud ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <p className="text-sm text-muted">Conectando con la nube...</p>
                </div>
              ) : cloudOrders.length === 0 ? (
                <div className="bg-surface border border-subtle rounded-2xl p-8 text-center">
                  <Cloud className="w-12 h-12 text-muted mx-auto mb-4" />
                  <p className="text-muted">No hay cargas en la nube</p>
                  <p className="text-xs text-secondary mt-2">
                    Los pedidos deben estar cargados en Supabase (tabla PEDIDOS)
                  </p>
                </div>
              ) : (
                cloudOrders.map(order => (
                  <CloudOrderCard
                    key={order.id}
                    order={order}
                    onImport={() => handleImportCloud(order.id)}
                    isLoading={importingId === order.id}
                  />
                ))
              )}
            </div>
          )}

          {/* ========== TAB STOCK GENERAL ========== */}
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
                      Descarga la planilla STOCK completa con todos los productos del sistema ERP.
                      Ideal para auditorías generales de inventario.
                    </p>
                    <div className="mt-4">
                      <button
                        onClick={handleImportStock}
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
                <h4 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Información
                </h4>
                <ul className="space-y-2.5 text-sm text-secondary">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    Contiene todos los productos con sus cantidades teóricas
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    Se descarga desde la tabla STOCK en Supabase
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    Al importar se reemplazarán los datos actuales en modo ráfaga
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmación */}
      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ ...confirmModal, open: false })}
        onConfirm={async () => {
          await confirmModal.action()
          setConfirmModal({ ...confirmModal, open: false })
        }}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        loading={loadingLocal || loadingCloud}
      />
    </div>
  )
}
