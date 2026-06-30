import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Cloud, HardDrive, Upload, Trash2, RefreshCw,
  Search, Package, Download, Loader2,
  CheckCircle2, AlertTriangle, Database, Layers,
  Play, Send, Calendar, Clock, ArrowRight, Printer,
  Eye, ShoppingCart, X, Plus, ChevronDown, ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { 
  ExpectedOrderRepository,
  type ExpectedOrder,
  type ExpectedItem
} from '@/repositories/ExpectedOrderRepository'
import { erpService, type ErpManifest } from '@/services/erpService'
import { SoundFX } from '@/services/audio'
import { thermalPrinter } from '@/core/hardware/ThermalPrinterEngine'
import { formatDetailDateTime } from '@/lib/date'
import { NewOrderForm } from '../components/NewOrderForm'

// ============================================================================
// HELPERS
// ============================================================================
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
    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', colorClass.replace('text-', 'bg-') + '/10')}>
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
}) => {
  const colorMap: Record<string, string> = {
    emerald: 'emerald-500',
    indigo: 'indigo-500', 
    amber: 'amber-500'
  }
  const c = colorMap[color] || 'blue-500'
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
        active
          ? `bg-${c}/10 text-${c} border border-${c}/30`
          : 'bg-surface text-secondary hover:text-primary border border-subtle'
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
      <span className={cn(
        'px-2 py-0.5 rounded-full text-xs font-bold',
        active ? `bg-${c}/20 text-${c.replace('-500', '-400')}` : 'bg-elevated text-muted'
      )}>
        {count}
      </span>
    </button>
  )
}

// ============================================================================
// CARD DE ORDEN LOCAL
// ============================================================================
const LocalOrderCard = ({ 
  order, 
  onImport, 
  onDelete, 
  onStartCount,
  onPrint,
  onViewDetail,
  isLoading,
  importingId 
}: {
  order: ExpectedOrder
  onImport: () => void
  onDelete: () => void
  onStartCount: () => void
  onPrint: () => void
  onViewDetail: () => void
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
  )
}

// ============================================================================
// CARD DE MANIFESTO EN LA NUBE (estilo original)
// ============================================================================
const CloudManifestCard = ({ 
  manifest, 
  onImport, 
  isLoading,
  importingId
}: {
  manifest: ErpManifest
  onImport: () => void
  isLoading: boolean
  importingId: string | null
}) => {
  const skuCount = manifest.items?.length || 0

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
          <span className="text-xs font-black uppercase tracking-wider text-white truncate">{manifest.id}</span>
          <span className={cn(
            'px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest shrink-0',
            manifest.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'
          )}>
            {manifest.status === 'completed' ? 'COMPLETADO' : 'PENDIENTE'}
          </span>
        </div>
        <p className="text-[8px] font-black text-slate-500 uppercase tracking-tight mt-0.5 truncate">
          {manifest.description || "Sin descripción adicional"}
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
  )
}

// ============================================================================
// MODAL DE DETALLE DE ORDEN
// ============================================================================
const OrderDetailModal = ({
  isOpen,
  onClose,
  order,
  onDelete
}: {
  isOpen: boolean
  onClose: () => void
  order: ExpectedOrder | null
  onDelete: () => void
}) => {
  if (!isOpen || !order) return null

  const skuCount = order.items?.length || 0
  const totalQty = order.items?.reduce((acc, i) => acc + (i.expectedQty || i.quantity || 0), 0) || 0

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-base border border-subtle rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-subtle flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-primary">{order.metadata?.documentType || 'Carga Teorica'}</h3>
              <p className="text-xs text-muted font-mono">{order.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-surface rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-black uppercase text-muted tracking-widest">Informacion</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted text-xs">Tipo</span>
                <p className="font-medium">{order.metadata?.documentType || 'Picking List'}</p>
              </div>
              <div>
                <span className="text-muted text-xs">Orden Compra</span>
                <p className="font-medium font-mono">{order.metadata?.purchaseOrder || '---'}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-500/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-500">{skuCount}</p>
              <p className="text-xs text-muted">SKUs</p>
            </div>
            <div className="bg-amber-500/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-amber-500">{totalQty}</p>
              <p className="text-xs text-muted">Unidades</p>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-subtle flex gap-3 shrink-0">
          <button onClick={onDelete} className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl font-medium text-sm transition-colors">Eliminar</button>
          <button onClick={onClose} className="flex-1 py-3 bg-surface hover:bg-elevated text-primary rounded-xl font-medium text-sm transition-colors">Cerrar</button>
        </div>
      </motion.div>
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
type TabType = 'local' | 'cloud' | 'stock' | 'new'

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
  const [error, setError] = useState<string | null>(null)
  const [cloudManifests, setCloudManifests] = useState<ErpManifest[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [itemSearchQuery, setItemSearchQuery] = useState('')
  const [detailModal, setDetailModal] = useState<{
    open: boolean
    order: ExpectedOrder | null
  }>({
    open: false,
    order: null
  })
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

  // =========================================================================
  // FUNCIONES DE IMPORTACIÓN
  // =========================================================================

  // Importar orden local al modo ráfaga (Hammer)
  const importLocalToHammer = useCallback(async (orderId: string) => {
    setLoadingLocal(true)
    try {
      const { importLocalExpectedOrderToHammer } = await import('@/services/massiveSync')
      const count = await importLocalExpectedOrderToHammer(batchId, orderId)
      SoundFX.play('success')
      toast.success(`${count} SKUs enviados al modo ráfaga`)
      navigate(`/massive/${batchId}`)
    } catch (err: any) {
      SoundFX.play('error')
      setError(err.message || 'Error al importar')
      toast.error(err.message || 'Error al importar')
    } finally {
      setLoadingLocal(false)
    }
  }, [batchId, navigate])

  // Importar orden desde la nube (usando erpService)
  const importFromCloud = useCallback(async (manifestId: string) => {
    setImportingId(manifestId)
    setLoadingCloud(true)
    try {
      const { importExpectedOrderFromCloud } = await import('@/services/massiveSync')
      const count = await importExpectedOrderFromCloud(batchId, manifestId)
      SoundFX.play('success')
      toast.success(`${count} SKUs descargados desde la nube`)
      navigate(`/massive/${batchId}`)
    } catch (err: any) {
      SoundFX.play('error')
      setError(err.message || `Error al importar orden ${manifestId}`)
      toast.error(err.message || 'Error al importar')
    } finally {
      setImportingId(null)
      setLoadingCloud(false)
    }
  }, [batchId, navigate])

  // Importar stock general
  const importGeneralStock = useCallback(async () => {
    setLoadingLocal(true)
    try {
      const { importManifestFromCloud } = await import('@/services/massiveSync')
      const count = await importManifestFromCloud(batchId)
      SoundFX.play('success')
      toast.success(`${count} SKUs del stock general importados`)
      navigate(`/massive/${batchId}`)
    } catch (err: any) {
      SoundFX.play('error')
      setError(err.message || 'Error al importar stock general')
      toast.error(err.message || 'Error al importar stock')
    } finally {
      setLoadingLocal(false)
    }
  }, [batchId, navigate])

  // Iniciar conteo desde orden local
  const startCountFromLocal = useCallback(async (order: ExpectedOrder) => {
    setImportingId(order.id)
    setLoadingLocal(true)
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
      setLoadingLocal(false)
    }
  }, [batchId, navigate])

  // Eliminar orden local
  const deleteLocalOrder = useCallback(async (orderId: string) => {
    try {
      await ExpectedOrderRepository.delete(orderId)
      SoundFX.play('success')
      toast.success('Carga eliminada')
    } catch (err) {
      toast.error('Error al eliminar')
    }
  }, [])

  // Cargar manifiestos desde la nube (usando erpService.downloadAllPendingManifests)
  const fetchCloudManifests = useCallback(async () => {
    setLoadingCloud(true)
    setError(null)
    try {
      console.log("[TheoreticalLoads] Obteniendo cargas desde la nube...")
      const manifests = await erpService.downloadAllPendingManifests()
      console.log("[TheoreticalLoads] Manifiestos recibidos:", manifests)
      setCloudManifests(manifests || [])
      if (manifests && manifests.length > 0) {
        toast.success(`Se encontraron ${manifests.length} cargas en la nube`)
      } else {
        toast.info("No hay cargas teoricas disponibles en la nube")
      }
    } catch (err: any) {
      console.error("[TheoreticalLoads] Error:", err)
      setError("No se pudieron obtener las cargas de la nube")
      toast.error(err.message || "Error al cargar desde la nube")
      setCloudManifests([])
    } finally {
      setLoadingCloud(false)
    }
  }, [])

  // Efecto para cargar datos iniciales de la nube
  useEffect(() => {
    if (activeTab === 'cloud') {
      fetchCloudManifests()
    }
  }, [activeTab, fetchCloudManifests])

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

  // Imprimir ticket de carga teórica
  const handlePrintOrder = (order: ExpectedOrder) => {
    SoundFX.play('increment')
    thermalPrinter.printExpectedOrder(order)
    toast.success('Ticket enviado a imprimir')
  }

  // Ver detalle de orden
  const handleViewDetail = (order: ExpectedOrder) => {
    setDetailModal({ open: true, order })
  }

  // Eliminar desde modal de detalle
  const handleDeleteFromDetail = () => {
    if (detailModal.order) {
      setConfirmModal({
        open: true,
        title: 'Eliminar Carga Teórica',
        description: `¿Eliminar "${detailModal.order.id}"? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        variant: 'danger',
        action: async () => {
          await deleteLocalOrder(detailModal.order!.id)
          setDetailModal({ open: false, order: null })
        }
      })
    }
  }

  const handleImportCloud = (manifestId: string) => {
    setConfirmModal({
      open: true,
      title: 'Descargar desde la Nube',
      description: 'Esta carga se descargará y estará disponible en modo ráfaga.',
      confirmText: 'Descargar',
      variant: 'default',
      action: () => importFromCloud(manifestId)
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

  const handleRefreshCloud = () => {
    fetchCloudManifests()
  }

  const handleRefreshLocal = () => {
    // useLiveQuery se encarga de actualizar
    toast.success('Lista local actualizada')
  }

  // Descargar órdenes desde la nube (Tabla PEDIDOS)
  const downloadFromCloud = useCallback(async () => {
    if (!navigator.onLine) {
      toast.warning("Sin conexión a internet.")
      return
    }
    setIsSyncing(true)
    try {
      const result = await ExpectedOrderRepository.downloadFromCloud()
      if (result.success) {
        toast.success(`Se descargaron ${result.orders.length} cargas desde la nube`)
      } else {
        toast.error(result.error || 'Error al descargar')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error de conexión')
    } finally {
      setIsSyncing(false)
    }
  }, [])

  // Subir todas las órdenes locales a la nube
  const syncAllToCloud = useCallback(async () => {
    if (!navigator.onLine) {
      toast.warning("Sin conexión a internet.")
      return
    }
    if (localOrders.length === 0) {
      toast.warning("No hay órdenes locales para sincronizar")
      return
    }
    setIsSyncing(true)
    try {
      let uploaded = 0
      let errors = 0
      for (const order of localOrders) {
        const result = await ExpectedOrderRepository.uploadToCloud(order)
        if (result.success) uploaded++
        else errors++
      }
      if (errors === 0) {
        toast.success(`Se sincronizaron ${uploaded} cargas a la nube`)
      } else {
        toast.warning(`Sincronizados: ${uploaded}, Errores: ${errors}`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Error de sincronización')
    } finally {
      setIsSyncing(false)
    }
  }, [localOrders])

  // Toggle expansión de orden
  const toggleExpandOrder = useCallback((orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId)
    setItemSearchQuery('')
  }, [])

  // Órden expandida actualmente
  const expandedOrder = useMemo(() => {
    return localOrders.find(o => o.id === expandedOrderId) || null
  }, [expandedOrderId, localOrders])

  // Filtrar items de orden expandida
  const filteredExpandedItems = useMemo(() => {
    if (!expandedOrder) return []
    if (!itemSearchQuery.trim()) return expandedOrder.items
    const term = itemSearchQuery.toLowerCase()
    return expandedOrder.items.filter(item =>
      item.barcode.toLowerCase().includes(term) ||
      item.name.toLowerCase().includes(term)
    )
  }, [expandedOrder, itemSearchQuery])

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
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={downloadFromCloud}
              disabled={isSyncing}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
              title="Descargar desde la nube"
            >
              {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span className="hidden sm:inline">Desde Nube</span>
            </button>
            <button
              onClick={syncAllToCloud}
              disabled={isSyncing || localOrders.length === 0}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
              title="Subir a la nube"
            >
              {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span className="hidden sm:inline">A Nube ({localOrders.length})</span>
            </button>
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
          <TabButton
            active={activeTab === 'new'}
            onClick={() => setActiveTab('new')}
            icon={Plus}
            label="Nueva"
            color="emerald"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl text-center uppercase tracking-wider">
              {error}
            </div>
          )}

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

          {/* ========== TAB LOCAL (estilo original) ========== */}
          {activeTab === 'local' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" /> 
                  Cargas Teóricas del Dispositivo (Locales)
                </h3>
                
                <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1 no-scrollbar">
                  {filteredLocalOrders.length === 0 ? (
                    <div className="py-6 bg-surface/40 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-center">
                      <HardDrive className="w-7 h-7 text-slate-700 mb-2" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Sin cargas locales guardadas</span>
                      <p className="text-[8px] font-bold text-slate-600 uppercase mt-1">Sube excel o pega en el panel de "Carga Teórica"</p>
                    </div>
                  ) : (
                    filteredLocalOrders.map(order => (
                      <LocalOrderCard
                        key={order.id}
                        order={order}
                        onImport={() => handleImportLocal(order.id)}
                        onDelete={() => handleDeleteLocal(order.id)}
                        onStartCount={() => handleStartCount(order)}
                        onPrint={() => handlePrintOrder(order)}
                        onViewDetail={() => handleViewDetail(order)}
                        isLoading={loadingLocal}
                        importingId={importingId}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========== TAB NUBE (estilo original) ========== */}
          {activeTab === 'cloud' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-indigo-400" /> 
                  Cargas Teóricas de la Nube
                </h3>
                <button
                  onClick={handleRefreshCloud}
                  disabled={loadingCloud}
                  className="p-1 hover:bg-white/5 rounded-lg text-muted active:scale-95 transition-all"
                  title="Actualizar listado"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', loadingCloud && 'animate-spin text-indigo-400')} />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1 no-scrollbar">
                {loadingCloud ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Buscando en la nube...</span>
                  </div>
                ) : cloudManifests.length === 0 ? (
                  <div className="py-8 bg-surface/50 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-center">
                    <FileText className="w-8 h-8 text-slate-600 mb-2" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">No hay cargas en la nube</span>
                    <p className="text-[8px] font-bold text-slate-600 uppercase mt-1">Guarda listados teóricos en "Carga Teórica"</p>
                  </div>
                ) : (
                  cloudManifests.map((manifest) => (
                    <CloudManifestCard
                      key={manifest.id}
                      manifest={manifest}
                      onImport={() => handleImportCloud(manifest.id)}
                      isLoading={loadingCloud}
                      importingId={importingId}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========== TAB STOCK GENERAL (estilo original) ========== */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Base de Datos General</h3>
                <button
                  disabled={loadingLocal}
                  onClick={handleImportStock}
                  className="w-full text-left bg-surface hover:bg-slate-850 border border-white/5 hover:border-amber-500/30 p-4 rounded-2xl flex items-center gap-4 transition-all active:scale-[0.98] group disabled:opacity-50"
                >
                  <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0 border border-amber-500/20">
                    {loadingLocal ? (
                      <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                    ) : (
                      <Database className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">Stock Teorico General</h4>
                    <p className="text-[9px] font-bold text-muted uppercase mt-0.5 tracking-tight">Utilizar ultima planilla de stock total (STOCK)</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
                </button>
              </div>

              <div className="text-center pt-2">
                <p className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.2em]">Selecciona un listado a sincronizar</p>
              </div>
            </div>
          )}

          {/* ========== TAB NUEVA CARGA (formulario de importacion) ========== */}
          {activeTab === 'new' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  Nueva Carga Teorica
                </h3>
                <button
                  onClick={() => setActiveTab('local')}
                  className="px-3 py-1.5 bg-surface hover:bg-elevated text-muted text-xs rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
              <NewOrderForm
                onSaved={() => setActiveTab('local')}
                onCancel={() => setActiveTab('local')}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalle de Orden */}
      <OrderDetailModal
        isOpen={detailModal.open}
        onClose={() => setDetailModal({ open: false, order: null })}
        order={detailModal.order}
        onDelete={handleDeleteFromDetail}
      />

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
