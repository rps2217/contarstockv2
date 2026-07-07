import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Hammer, Package, Trash2, RefreshCw, Check, X,
  AlertTriangle, TrendingUp, Settings, Download, Scan, Keyboard,
  Cloud, CloudOff, Volume2, VolumeX, Play,
  FileSpreadsheet, BarChart3, MapPin, Zap, RotateCcw, Printer,
  HardDrive, Loader2, Eye, ShoppingCart
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

import { useHammerLogic, HammerItem } from '@/features/hammer/hooks/useHammerLogic'
import { useLocationManager } from '@/shared/hooks/useLocationManager'
import { useHIDScanner } from '@/hooks/useHIDScanner'
import { useAppStore } from '@/stores'
import { migrateMassiveToMaster, importManifestFromCloud, importExpectedOrderFromCloud, importLocalExpectedOrderToHammer, migrateHammerManifestToExpectedOrders } from '@/services/massiveSync'
import { exportHammerToExcel } from '@/services/export'
import { thermalPrinter } from '@/core/hardware/ThermalPrinterEngine'
import { ExpectedOrderRepository } from '@/repositories/ExpectedOrderRepository'
import type { ExpectedOrder } from '@/types'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { LocationSelectorModal } from '@/shared/components/ui/LocationSelectorModal'

// ============================================================================
// Componentes de UI
// ============================================================================
const StatCard = ({ icon: Icon, label, value, color = 'text-primary', subtext }: {
  icon: React.ElementType; label: string; value: string | number; color?: string; subtext?: string
}) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.9 }} 
    animate={{ opacity: 1, scale: 1 }}
    className="bg-surface border border-subtle rounded-xl p-3 flex items-center gap-3"
  >
    <div className={cn('w-10 h-10 rounded-lg bg-elevated flex items-center justify-center shrink-0')}>
      <Icon className={cn('w-5 h-5', color)} />
    </div>
    <div className="min-w-0">
      <p className={cn('text-lg font-bold', color)}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
      {subtext && <p className="text-[10px] text-muted/70">{subtext}</p>}
    </div>
  </motion.div>
)

const ToolItem = ({ icon: Icon, iconColor, iconBg, title, description, onClick, badge, variant = 'default' }: {
  icon: React.ElementType; iconColor: string; iconBg: string; title: string; description: string; onClick: () => void; badge?: string; variant?: 'default' | 'danger'
}) => (
  <button 
    onClick={onClick}
    className={cn(
      'w-full flex items-center gap-4 p-4 rounded-xl transition-colors text-left',
      variant === 'danger' ? 'bg-rose-500/10 hover:bg-rose-500/20' : 'bg-surface hover:bg-elevated'
    )}
  >
    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
      <Icon className={cn('w-5 h-5', iconColor)} />
    </div>
    <div className="flex-1 min-w-0">
      <p className={cn('font-medium', variant === 'danger' ? 'text-rose-500' : 'text-primary')}>{title}</p>
      <p className="text-sm text-muted truncate">{description}</p>
    </div>
    {badge && <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded">{badge}</span>}
  </button>
)

const ItemRow = ({ item, onRemove, onSelect, isActive }: {
  item: HammerItem; onRemove: (barcode: string) => void; onSelect: (barcode: string) => void; isActive: boolean
}) => {
  const diff = item.expectedQty !== undefined ? item.totalQuantity - item.expectedQty : 0
  const diffColor = diff === 0 ? 'text-emerald-500' : diff > 0 ? 'text-blue-500' : 'text-rose-500'
  const diffLabel = diff === 0 ? 'OK' : diff > 0 ? `+${diff}` : `${diff}`

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer',
        isActive ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-surface hover:bg-elevated border border-transparent'
      )}
      onClick={() => onSelect(item.barcode)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary truncate">{item.name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-muted font-mono bg-elevated px-1.5 py-0.5 rounded">{item.barcode}</span>
          {item.loc && (
            <span className="text-xs text-secondary bg-elevated px-1.5 py-0.5 rounded flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {item.loc}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {item.expectedQty !== undefined && (
          <div className="text-right">
            <span className="text-[10px] text-muted">ESP</span>
            <p className="text-sm font-mono text-muted">{item.expectedQty}</p>
          </div>
        )}
        <div className="w-14 text-center bg-elevated rounded-lg py-1">
          <p className="text-xl font-bold text-primary">{item.totalQuantity}</p>
          {item.expectedQty !== undefined && (
            <p className={cn('text-xs font-mono', diffColor)}>{diffLabel}</p>
          )}
        </div>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); onRemove(item.barcode); }}
        className="w-8 h-8 rounded-lg hover:bg-rose-500/20 flex items-center justify-center transition-colors shrink-0"
      >
        <Trash2 className="w-4 h-4 text-rose-500" />
      </button>
    </motion.div>
  )
}

// ============================================================================
// Sheet de Herramientas
// ============================================================================
interface ToolsSheetProps {
  isOpen: boolean
  onClose: () => void
  location: string
  onChangeLocation: () => void
  onImport: () => void
  onSync: () => void
  onExport: () => void
  onPrint: () => void
  onReset: () => void
  onStartTestCounting: () => void
  isSyncing: boolean
  autoSyncEnabled: boolean
  onToggleAutoSync: () => void
  isVoiceEnabled: boolean
  onToggleVoice: () => void
  hasManifestItems: boolean
}

const ToolsSheet: React.FC<ToolsSheetProps> = ({
  isOpen, onClose, location, onChangeLocation, onImport, onSync,
  onExport, onPrint, onReset, onStartTestCounting, isSyncing, autoSyncEnabled, 
  onToggleAutoSync, isVoiceEnabled, onToggleVoice, hasManifestItems
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-base rounded-t-3xl border-t border-subtle p-6 max-h-[70vh] overflow-y-auto"
          >
            <div className="w-12 h-1 bg-subtle rounded-full mx-auto mb-6" />
            
            <h3 className="text-lg font-bold text-primary mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Herramientas
            </h3>

            <div className="space-y-3">
              <ToolItem
                icon={MapPin}
                iconColor="text-blue-500"
                iconBg="bg-blue-500/10"
                title="Ubicacion"
                description={location}
                onClick={onChangeLocation}
                badge="Cambiar"
              />

              <ToolItem
                icon={FileSpreadsheet}
                iconColor="text-amber-500"
                iconBg="bg-amber-500/10"
                title="Importar Carga Teorica"
                description="Stock general, orden de nube o local"
                onClick={() => { onImport(); onClose(); }}
              />

              <ToolItem
                icon={Download}
                iconColor="text-emerald-500"
                iconBg="bg-emerald-500/10"
                title="Exportar a Excel"
                description="Descarga resumen en archivo .xlsx"
                onClick={() => { onExport(); onClose(); toast.success('Exportando...'); }}
              />

              <ToolItem
                icon={Printer}
                iconColor="text-purple-500"
                iconBg="bg-purple-500/10"
                title="Imprimir Ticket"
                description="Imprime ticket con TEORICO vs REAL"
                onClick={() => { onPrint(); onClose(); }}
              />

              {hasManifestItems && (
                <ToolItem
                  icon={Play}
                  iconColor="text-purple-500"
                  iconBg="bg-purple-500/10"
                  title="Iniciar Conteo de Prueba"
                  description="Crear sesion de conteo con items cargados"
                  onClick={() => { onStartTestCounting(); onClose(); }}
                />
              )}

              <ToolItem
                icon={Cloud}
                iconColor={isSyncing ? 'text-blue-500' : autoSyncEnabled ? 'text-emerald-500' : 'text-muted'}
                iconBg={autoSyncEnabled ? 'bg-emerald-500/10' : 'bg-subtle'}
                title={isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
                description="Subir datos a la nube"
                onClick={() => { onSync(); onClose(); }}
              />

              <div className="flex items-center justify-between p-4 bg-surface rounded-xl">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="font-medium text-primary">Auto-Sync</p>
                    <p className="text-xs text-muted">Sincronizar en segundo plano</p>
                  </div>
                </div>
                <button
                  onClick={onToggleAutoSync}
                  className={cn(
                    'w-12 h-7 rounded-full transition-colors relative',
                    autoSyncEnabled ? 'bg-blue-500' : 'bg-subtle'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full bg-white transition-transform absolute top-1',
                    autoSyncEnabled ? 'translate-x-6' : 'translate-x-1'
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface rounded-xl">
                <div className="flex items-center gap-3">
                  {isVoiceEnabled ? <Volume2 className="w-5 h-5 text-blue-500" /> : <VolumeX className="w-5 h-5 text-muted" />}
                  <div>
                    <p className="font-medium text-primary">Voz</p>
                    <p className="text-xs text-muted">Confirmacion por voz</p>
                  </div>
                </div>
                <button
                  onClick={onToggleVoice}
                  className={cn(
                    'w-12 h-7 rounded-full transition-colors relative',
                    isVoiceEnabled ? 'bg-blue-500' : 'bg-subtle'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full bg-white transition-transform absolute top-1',
                    isVoiceEnabled ? 'translate-x-6' : 'translate-x-1'
                  )} />
                </button>
              </div>

              <ToolItem
                icon={RotateCcw}
                iconColor="text-rose-500"
                iconBg="bg-rose-500/20"
                title="Reiniciar Sesion"
                description="Eliminar todos los escaneos"
                onClick={() => {
                  if (confirm('Eliminar todos los escaneos de esta sesion?')) {
                    onReset()
                    onClose()
                  }
                }}
                variant="danger"
              />
            </div>

            <button 
              onClick={onClose}
              className="w-full mt-6 py-3 bg-surface rounded-xl text-muted font-medium"
            >
              Cerrar
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// Modal de Importacion con seleccion de ordenes locales
// ============================================================================
interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportStock: () => void
  onImportCloud: () => void
  onImportLocal: (orderId: string) => void
}

const ImportModal: React.FC<ImportModalProps> = ({
  isOpen, onClose, onImportStock, onImportCloud, onImportLocal
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'local'>('import')
  const [isLoading, setIsLoading] = useState(false)

  // Obtener cargas teoricas locales
  const localOrders = useLiveQuery(() => 
    db.expectedOrders.orderBy('importedAt').reverse().limit(20).toArray()
  ) || []

  const handleImportLocal = async (orderId: string) => {
    setIsLoading(true)
    try {
      await onImportLocal(orderId)
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 bg-base rounded-2xl border border-subtle p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
      >
        <h3 className="text-lg font-bold text-primary mb-6 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-amber-500" />
          Importar Carga Teorica
        </h3>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('import')}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'import' ? 'bg-blue-500 text-white' : 'bg-surface text-secondary'
            )}
          >
            Importar
          </button>
          <button
            onClick={() => setActiveTab('local')}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'local' ? 'bg-blue-500 text-white' : 'bg-surface text-secondary'
            )}
          >
            Locales ({localOrders.length})
          </button>
        </div>

        {activeTab === 'import' && (
          <div className="space-y-3">
            <ToolItem
              icon={BarChart3}
              iconColor="text-amber-500"
              iconBg="bg-amber-500/10"
              title="Stock General"
              description="Ultima planilla de stock total desde la nube"
              onClick={() => { onImportStock(); onClose(); }}
            />

            <ToolItem
              icon={Cloud}
              iconColor="text-blue-500"
              iconBg="bg-blue-500/10"
              title="Ordenes desde Nube"
              description="Cargas teoricas guardadas en Supabase"
              onClick={() => { onImportCloud(); onClose(); }}
            />

            <ToolItem
              icon={HardDrive}
              iconColor="text-emerald-500"
              iconBg="bg-emerald-500/10"
              title="Ver Ordenes Locales"
              description="Seleccionar una carga teorica guardada"
              onClick={() => setActiveTab('local')}
            />
          </div>
        )}

        {activeTab === 'local' && (
          <div className="space-y-2">
            {localOrders.length === 0 ? (
              <div className="text-center py-8">
                <HardDrive className="w-12 h-12 text-muted mx-auto mb-3" />
                <p className="text-sm text-muted">No hay cargas teoricas guardadas</p>
                <p className="text-xs text-muted mt-1">Ve a Cargas Teoricas para crear una</p>
              </div>
            ) : (
              localOrders.map(order => {
                const skuCount = order.items?.length || 0
                const totalQty = order.items?.reduce((acc, i) => acc + (i.quantity || i.expectedQty || 0), 0) || 0
                const displayName = order.metadata?.internalGuide || order.metadata?.purchaseOrder || order.id
                
                return (
                  <button
                    key={order.id}
                    onClick={() => handleImportLocal(order.id)}
                    disabled={isLoading}
                    className="w-full flex items-center gap-3 p-3 bg-surface hover:bg-elevated rounded-xl transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <ShoppingCart className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary truncate">{displayName}</p>
                      <p className="text-xs text-muted">{skuCount} SKUs · {totalQty} unidades</p>
                    </div>
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 text-muted animate-spin" />
                    ) : (
                      <Eye className="w-5 h-5 text-muted" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        )}

        <button 
          onClick={onClose}
          className="w-full mt-6 py-3 bg-surface rounded-xl text-muted font-medium"
        >
          Cancelar
        </button>
      </motion.div>
    </>
  )
}

// ============================================================================
// Componente principal
// ============================================================================
export const RedesignHammerPage: React.FC = () => {
  const navigate = useNavigate()
  const { batchId = 'CORE' } = useParams()
  const { settings, updateSetting } = useAppStore()

  const { state, actions } = useHammerLogic(batchId)
  const locManager = useLocationManager(`hammer_loc_${batchId}`)

  const [isManualMode, setIsManualMode] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [isToolsOpen, setIsToolsOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)
  
  // Modal de sesión existente
  const [showSessionModal, setShowSessionModal] = useState(false)

  // Verificar si hay datos existentes al cargar
  useEffect(() => {
    // Solo mostrar si hay items existentes
    if (state.items && state.items.length > 0) {
      setShowSessionModal(true)
    }
  }, []) // Solo al montar

  // HID Scanner
  useHIDScanner({
    onScan: (barcode) => {
      actions.registerScan(barcode)
    },
    isEnabled: !isMigrating && !isToolsOpen && !isImportModalOpen && !showSessionModal,
    maxLatency: 40
  })

  // Sync location
  useEffect(() => {
    if (locManager.location) {
      actions.setCurrentLocation(locManager.location)
    }
  }, [locManager.location])

  // Keyboard shortcuts
  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (e.key.toLowerCase() === 'm' && e.altKey) {
        e.preventDefault()
        setIsManualMode(prev => !prev)
      } else if (e.key.toLowerCase() === 's' && e.altKey) {
        e.preventDefault()
        actions.syncToCloud()
      }
    }

    window.addEventListener('keydown', handleShortcuts)
    return () => window.removeEventListener('keydown', handleShortcuts)
  }, [actions])

  // Continuar con la sesión existente
  const handleContinueSession = () => {
    setShowSessionModal(false)
  }

  // Empezar nueva sesión (limpiar datos)
  const handleNewSession = async () => {
    await actions.removeItem('ALL') // Eliminar todos los items
    setShowSessionModal(false)
    toast.success('Sesión limpiada')
  }

  const handleManualScan = () => {
    if (manualBarcode.trim()) {
      actions.registerScan(manualBarcode.trim())
      setManualBarcode('')
      toast.success('Escaneado')
    }
  }

  const handleFinalize = async () => {
    if (!state.items.length || isMigrating) return
    if (!confirm('Cerrar auditoria y consolidar registros?')) return
    
    setIsMigrating(true)
    try {
      await migrateMassiveToMaster(batchId)
      toast.success('Auditoria finalizada')
      navigate('/reports?type=hammer')
    } catch (err) {
      toast.error('Error al finalizar')
      setIsMigrating(false)
    }
  }

  const handleStartTestCounting = async () => {
    if (state.items.length === 0) {
      toast.error('Primero importa una carga teorica')
      return
    }
    try {
      const sessionId = await migrateHammerManifestToExpectedOrders(batchId)
      toast.success('Conteo de prueba iniciado')
      navigate(`/counting/${sessionId}`)
    } catch (err) {
      toast.error('Error al iniciar conteo')
    }
  }

  const handleExport = () => {
    exportHammerToExcel(batchId, state.items)
    toast.success('Exportando...')
  }

  const handleImportLocal = async (orderId: string) => {
    try {
      await importLocalExpectedOrderToHammer(batchId, orderId)
      toast.success('Carga teorica importada')
    } catch (err: any) {
      toast.error(err.message || 'Error al importar')
    }
  }

  const handlePrintTicket = () => {
    if (state.items.length === 0) {
      toast.error('No hay items para imprimir')
      return
    }

    // Crear un objeto ExpectedOrder con los items del hammer
    const hammerOrder: ExpectedOrder = {
      id: `HAMMER-${batchId}-${Date.now()}`,
      internalId: `HAMMER-${batchId}`,
      items: state.items.map(item => ({
        barcode: item.barcode,
        name: item.name,
        expectedQty: item.expectedQty || 0,
        quantity: item.totalQuantity,
        location: item.loc || ''
      })),
      totalExpectedUnits: state.items.reduce((sum, i) => sum + i.totalQuantity, 0),
      totalExpectedSKUs: state.items.length,
      importedAt: Date.now(),
      metadata: {
        documentType: 'CONTEO HAMMER',
        internalGuide: `Lote ${batchId}`,
        purchaseOrder: locManager.location || 'ZONA-A',
        date: new Date().toLocaleDateString()
      }
    }

    thermalPrinter.printHammerTicket(hammerOrder)
    toast.success('Imprimiendo ticket...')
  }

  // Stats
  const stats = useMemo(() => {
    const items = state.items || []
    const total = items.length
    const withExpected = items.filter(i => i.expectedQty !== undefined)
    const complete = withExpected.filter(i => i.totalQuantity === i.expectedQty).length
    const withVariance = withExpected.filter(i => i.totalQuantity !== i.expectedQty).length
    const totalQty = items.reduce((acc, i) => acc + i.totalQuantity, 0)
    return { total, complete, withVariance, totalQty, hasExpected: withExpected.length > 0 }
  }, [state.items])

  if (!state.items) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-base">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-muted mt-4">Cargando modo hammer...</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-base overflow-hidden">
      {/* Header */}
      <div className="pt-4 px-4 sm:px-6 shrink-0 bg-base border-b border-subtle">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 rounded-lg hover:bg-surface transition-colors">
              <X className="w-5 h-5 text-muted" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Hammer className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-primary">Modo Rafaga</h1>
              <p className="text-xs text-muted font-mono">{batchId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => locManager.openModal?.()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-subtle text-sm font-medium hover:bg-elevated transition-colors"
            >
              <MapPin className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">{locManager.location || 'ZONA-A'}</span>
            </button>

            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              state.autoSyncEnabled ? 'bg-emerald-500/10' : 'bg-subtle'
            )}>
              {state.autoSyncEnabled ? (
                <Cloud className="w-4 h-4 text-emerald-500" />
              ) : (
                <CloudOff className="w-4 h-4 text-muted" />
              )}
            </div>

            <button 
              onClick={() => actions.syncToCloud()}
              disabled={state.isSyncing}
              className={cn(
                'p-2 rounded-lg transition-colors',
                state.isSyncing ? 'bg-blue-500 text-white' : 'bg-surface hover:bg-elevated'
              )}
            >
              <RefreshCw className={cn('w-5 h-5', state.isSyncing && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <StatCard icon={Package} label="SKUs" value={stats.total} />
          <StatCard icon={Check} label="OK" value={stats.complete} color="text-emerald-500" />
          <StatCard icon={AlertTriangle} label="Variacion" value={stats.withVariance} color="text-amber-500" />
          <StatCard icon={TrendingUp} label="Unidades" value={stats.totalQty} color="text-blue-500" />
        </div>

        {/* Progress */}
        {stats.hasExpected && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Progreso</span>
              <span className="font-mono">{stats.complete}/{stats.total} OK</span>
            </div>
            <div className="h-2 bg-elevated rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${stats.total > 0 ? (stats.complete / stats.total) * 100 : 0}%` }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
          </div>
        )}

        {/* Status */}
        {state.pendingWrites > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-sm text-amber-500 mb-2"
          >
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>{state.pendingWrites} escrituras pendientes</span>
          </motion.div>
        )}
        {state.syncError && (
          <div className="flex items-center gap-2 text-sm text-rose-500 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{state.syncError}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-28">
        {/* Manual Mode */}
        <div className="flex items-center gap-3 py-3 border-b border-subtle">
          <button
            onClick={() => setIsManualMode(!isManualMode)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              isManualMode ? 'bg-blue-500 text-white' : 'bg-surface text-secondary hover:text-primary'
            )}
          >
            <Keyboard className="w-4 h-4" />
            {isManualMode ? 'Modo Manual' : 'Activar Manual'}
          </button>

          {isManualMode && (
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualScan()}
                placeholder="Ingresa codigo..."
                className="flex-1 bg-surface border border-default rounded-xl px-4 py-2 text-sm font-mono text-primary focus:outline-none focus:border-[var(--accent)]"
                autoFocus
              />
              <button 
                onClick={handleManualScan}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl font-medium"
              >
                <Scan className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="flex flex-col gap-2 py-3">
          {state.items.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 rounded-full bg-elevated flex items-center justify-center mx-auto mb-4">
                <Hammer className="w-10 h-10 text-muted" />
              </div>
              <p className="text-lg font-medium text-primary mb-2">Sin escaneos</p>
              <p className="text-sm text-muted max-w-xs mx-auto">
                Escanea codigos de barras con tu dispositivo o activa el modo manual para ingresar codigos.
              </p>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium"
              >
                Importar Carga Teorica
              </button>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {state.items.map((item) => (
                <ItemRow
                  key={item.barcode}
                  item={item}
                  isActive={state.activeBarcode === item.barcode}
                  onRemove={actions.removeItem}
                  onSelect={actions.selectItem}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-base/95 backdrop-blur-xl border-t border-subtle p-4">
        <div className="flex gap-2">
          <button 
            onClick={() => setIsToolsOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-surface rounded-xl font-medium hover:bg-elevated transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span className="hidden sm:inline">Herramientas</span>
          </button>
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-surface rounded-xl font-medium hover:bg-elevated transition-colors"
          >
            <Download className="w-5 h-5" />
            <span className="hidden sm:inline">Importar</span>
          </button>
          <button 
            onClick={handleExport}
            disabled={state.items.length === 0}
            className="flex items-center justify-center px-4 py-3 bg-surface rounded-xl hover:bg-elevated transition-colors disabled:opacity-50"
          >
            <Printer className="w-5 h-5" />
          </button>
          <button 
            onClick={handleFinalize}
            disabled={state.items.length === 0 || isMigrating}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-xl font-medium disabled:opacity-50"
          >
            {isMigrating ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            <span className="hidden sm:inline">Finalizar</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <ToolsSheet
        isOpen={isToolsOpen}
        onClose={() => setIsToolsOpen(false)}
        location={locManager.location || 'ZONA-A'}
        onChangeLocation={() => locManager.openModal?.()}
        onImport={() => setIsImportModalOpen(true)}
        onSync={() => actions.syncToCloud()}
        onExport={handleExport}
        onPrint={handlePrintTicket}
        onReset={() => actions.removeItem('ALL')}
        onStartTestCounting={handleStartTestCounting}
        isSyncing={state.isSyncing}
        autoSyncEnabled={state.autoSyncEnabled}
        onToggleAutoSync={actions.toggleAutoSync}
        isVoiceEnabled={settings.ttsEnabled}
        onToggleVoice={() => updateSetting('ttsEnabled', !settings.ttsEnabled)}
        hasManifestItems={stats.hasExpected}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportStock={() => importManifestFromCloud(batchId)}
        onImportCloud={() => importExpectedOrderFromCloud(batchId, '')}
        onImportLocal={handleImportLocal}
      />

      <LocationSelectorModal
        isOpen={locManager.isModalOpen || false}
        onClose={() => locManager.closeModal?.()}
        currentLocation={locManager.location || 'ZONA-A'}
        onSelect={(loc) => {
          locManager.setLocation?.(loc)
          locManager.closeModal?.()
        }}
      />

      {/* Modal de Sesión Existente */}
      <AnimatePresence>
        {showSessionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-base border border-subtle rounded-2xl p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-bold text-primary mb-2 text-center">
                Sesión Anterior Detectada
              </h3>
              <p className="text-sm text-muted text-center mb-6">
                Hay <span className="font-bold text-primary">{state.items.length}</span> productos contados previamente. ¿Qué deseas hacer?
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={handleContinueSession}
                  className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Continuar con esta sesión
                </button>
                
                <button
                  onClick={handleNewSession}
                  className="w-full py-3 px-4 bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Empezar nueva sesión
                </button>
                
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-3 px-4 bg-surface hover:bg-elevated text-muted font-medium rounded-xl transition-colors"
                >
                  Volver al inicio
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
