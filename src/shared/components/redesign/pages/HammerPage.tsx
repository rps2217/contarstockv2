import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Hammer, Package, Trash2, RefreshCw, Check, X,
  AlertTriangle, TrendingUp, Settings, Download, Scan, Keyboard,
  Cloud, CloudOff, Volume2, VolumeX, Play,
  FileSpreadsheet, BarChart3, MapPin, Zap, RotateCcw, Printer,
  HardDrive, Loader2, Eye, ShoppingCart, Calendar, 
  ChevronRight, Package2, ListChecks, Wifi, WifiOff, ArrowLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { logger } from '@/services/logger'

import { useHammerLogic, HammerItem } from '@/features/hammer/hooks/useHammerLogic'
import { useLocationManager } from '@/shared/hooks/useLocationManager'
import { useHIDScanner } from '@/hooks/useHIDScanner'
import { useAppStore } from '@/stores'
import { migrateMassiveToMaster, importManifestFromCloud, importExpectedOrderFromCloud, importLocalExpectedOrderToHammer, migrateHammerManifestToExpectedOrders } from '@/services/hammerSync'
import { exportHammerToExcel } from '@/services/export'
import { thermalPrinter } from '@/core/hardware/ThermalPrinterEngine'
import { HammerDbRepository } from '@/repositories/HammerDbRepository'
import { ExpectedOrderRepository } from '@/repositories/ExpectedOrderRepository'
import type { ExpectedOrder } from '@/types'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { LocationSelectorModal } from '@/shared/components/ui/LocationSelectorModal'
import { formatTimeAgo } from '@/lib/date'
import { TestModeExpiryModal } from '@/features/counting/components/TestModeExpiryModal'

// Importar modal de inicio unificado
import { StartCountingModal, type StartCountingConfig } from '@/features/counting/components/StartCountingModal'
import { useCountingEngine } from '@/features/counting/hooks/useCountingEngine'

// Importar componentes compartidos
import { HorizontalStatCard } from '@/shared/components/ui/HorizontalStatCard'
import { SearchInput } from '@/shared/components/ui/SearchInput'


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
  registerExpiry: boolean
  onToggleRegisterExpiry: () => void
}

const ToolsSheet: React.FC<ToolsSheetProps> = ({
  isOpen, onClose, location, onChangeLocation, onImport, onSync,
  onExport, onPrint, onReset, onStartTestCounting, isSyncing, autoSyncEnabled, 
  onToggleAutoSync, isVoiceEnabled, onToggleVoice, hasManifestItems,
  registerExpiry, onToggleRegisterExpiry
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

              {/* Toggle de Registro de Vencimiento */}
              <div className="flex items-center justify-between p-4 bg-surface rounded-xl">
                <div className="flex items-center gap-3">
                  <Calendar className={cn('w-5 h-5', registerExpiry ? 'text-amber-500' : 'text-muted')} />
                  <div>
                    <p className="font-medium text-primary">Registrar Vencimiento</p>
                    <p className="text-xs text-muted">Solicitar fecha de caducidad</p>
                  </div>
                </div>
                <button
                  onClick={onToggleRegisterExpiry}
                  className={cn(
                    'w-12 h-7 rounded-full transition-colors relative',
                    registerExpiry ? 'bg-amber-500' : 'bg-subtle'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full bg-white transition-transform absolute top-1',
                    registerExpiry ? 'translate-x-6' : 'translate-x-1'
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
// Modal de Importacion con seleccion de ordenes locales - VERSIÓN MEJORADA
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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  // Obtener cargas teoricas locales
  const localOrders = useLiveQuery(() => 
    db.expectedOrders.orderBy('importedAt').reverse().limit(50).toArray()
  ) || []

  // Filtrar órdenes por búsqueda
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return localOrders
    const query = searchQuery.toLowerCase()
    return localOrders.filter(order => {
      const name = order.metadata?.internalGuide || order.metadata?.purchaseOrder || order.id
      return name.toLowerCase().includes(query)
    })
  }, [localOrders, searchQuery])

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null
    return localOrders.find(o => o.id === selectedOrderId) || null
  }, [selectedOrderId, localOrders])

  const handleImportLocal = async (orderId: string) => {
    setIsLoading(true)
    try {
      await onImportLocal(orderId)
      toast.success('Carga teórica importada correctamente')
      onClose()
    } catch (error) {
      toast.error('Error al importar la carga teórica')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId === selectedOrderId ? null : orderId)
  }

  if (!isOpen) return null

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 bg-base rounded-2xl border border-subtle max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-subtle">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-primary flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-amber-500" />
              </div>
              Importar Carga Teórica
            </h3>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-surface rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-surface rounded-xl">
            <button
              onClick={() => { setActiveTab('import'); setSelectedOrderId(null); }}
              className={cn(
                'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all',
                activeTab === 'import' 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'text-secondary hover:text-primary'
              )}
            >
              Nueva Importación
            </button>
            <button
              onClick={() => setActiveTab('local')}
              className={cn(
                'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2',
                activeTab === 'local' 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'text-secondary hover:text-primary'
              )}
            >
              <HardDrive className="w-4 h-4" />
              Locales
              {localOrders.length > 0 && (
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                  activeTab === 'local' ? 'bg-white/20' : 'bg-primary/10'
                )}>
                  {localOrders.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* Opción: Stock General */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => { onImportStock(); onClose(); }}
                className="w-full p-4 bg-surface hover:bg-elevated rounded-2xl border border-white/5 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                    <BarChart3 className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-primary">Stock General</h4>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase">
                        Nube
                      </span>
                    </div>
                    <p className="text-sm text-muted">Última planilla de stock total sincronizada desde la nube</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Package2 className="w-3 h-3" /> Todos los productos
                      </span>
                      <span className="flex items-center gap-1">
                        <Wifi className="w-3 h-3" /> Requiere conexión
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted group-hover:text-primary transition-colors" />
                </div>
              </motion.button>

              {/* Opción: Órdenes desde Nube */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => { onImportCloud(); onClose(); }}
                className="w-full p-4 bg-surface hover:bg-elevated rounded-2xl border border-white/5 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                    <Cloud className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-primary">Órdenes desde Nube</h4>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase">
                        ERP
                      </span>
                    </div>
                    <p className="text-sm text-muted">Cargas teóricas guardadas en Supabase desde el ERP</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <ListChecks className="w-3 h-3" /> Órdenes de compra
                      </span>
                      <span className="flex items-center gap-1">
                        <Wifi className="w-3 h-3" /> Requiere conexión
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted group-hover:text-primary transition-colors" />
                </div>
              </motion.button>

              {/* Opción: Ver Órdenes Locales */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setActiveTab('local')}
                className="w-full p-4 bg-surface hover:bg-elevated rounded-2xl border border-white/5 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                    <HardDrive className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-primary">Órdenes Locales</h4>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase">
                        Offline
                      </span>
                    </div>
                    <p className="text-sm text-muted">Seleccionar una carga teórica guardada en el dispositivo</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Package2 className="w-3 h-3" /> {localOrders.length} órdenes guardadas
                      </span>
                      <span className="flex items-center gap-1">
                        <WifiOff className="w-3 h-3" /> Sin conexión requerida
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted group-hover:text-primary transition-colors" />
                </div>
              </motion.button>
            </div>
          )}

          {activeTab === 'local' && (
            <div className="space-y-4">
              {/* Campo de búsqueda */}
              {localOrders.length > 0 && (
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Buscar por nombre u orden..."
                  iconSize="sm"
                />
              )}

              {/* Lista de órdenes */}
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 -mr-1">
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <HardDrive className="w-16 h-16 text-muted/30 mx-auto mb-4" />
                    {searchQuery ? (
                      <>
                        <p className="text-muted font-medium">No se encontraron órdenes</p>
                        <p className="text-xs text-muted/70 mt-1">Intenta con otro término de búsqueda</p>
                      </>
                    ) : (
                      <>
                        <p className="text-muted font-medium">No hay cargas teóricas guardadas</p>
                        <p className="text-xs text-muted/70 mt-1">Ve a Cargas Teóricas para crear una</p>
                      </>
                    )}
                  </div>
                ) : (
                  filteredOrders.map((order, index) => {
                    const skuCount = order.items?.length || 0
                    const totalQty = order.items?.reduce((acc, i) => acc + (i.quantity || i.expectedQty || 0), 0) || 0
                    const displayName = order.metadata?.internalGuide || order.metadata?.purchaseOrder || order.id
                    const isSelected = selectedOrderId === order.id
                    const isSynced = order._syncedFromCloud

                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <button
                          onClick={() => handleSelectOrder(order.id)}
                          className={cn(
                            'w-full p-4 rounded-xl border transition-all text-left',
                            isSelected 
                              ? 'bg-primary/5 border-primary/30' 
                              : 'bg-surface border-white/5 hover:bg-elevated hover:border-white/10'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                              isSelected ? 'bg-primary/20' : 'bg-emerald-500/10'
                            )}>
                              <ShoppingCart className={cn('w-5 h-5', isSelected ? 'text-primary' : 'text-emerald-500')} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-primary truncate">{displayName}</p>
                              <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                                <span className="flex items-center gap-1">
                                  <Package2 className="w-3 h-3" /> {skuCount} SKUs
                                </span>
                                <span>·</span>
                                <span>{totalQty.toLocaleString()} unidades</span>
                                <span>·</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> {formatTimeAgo(order.importedAt)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isSynced && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-bold uppercase">
                                  Sinc
                                </span>
                              )}
                              <ChevronRight className={cn(
                                'w-4 h-4 transition-transform',
                                isSelected ? 'text-primary rotate-90' : 'text-muted'
                              )} />
                            </div>
                          </div>

                          {/* Preview de items cuando está seleccionado */}
                          <AnimatePresence>
                            {isSelected && order.items && order.items.length > 0 && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-3 pt-3 border-t border-subtle">
                                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">
                                    Preview (primeros 3 items)
                                  </p>
                                  <div className="space-y-1.5">
                                    {order.items.slice(0, 3).map((item, i) => (
                                      <div key={i} className="flex items-center justify-between text-xs bg-black/20 rounded-lg px-3 py-2">
                                        <span className="text-secondary truncate flex-1">{item.name || item.barcode}</span>
                                        <span className="text-muted ml-2">{item.expectedQty || item.quantity} und</span>
                                      </div>
                                    ))}
                                    {order.items.length > 3 && (
                                      <p className="text-[10px] text-muted text-center pt-1">
                                        + {order.items.length - 3} más...
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </button>
                      </motion.div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Preview del orden seleccionado */}
          <AnimatePresence>
            {selectedOrder && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl"
              >
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                  Listo para importar
                </p>
                <p className="text-sm text-primary font-medium">
                  {selectedOrder.metadata?.internalGuide || selectedOrder.metadata?.purchaseOrder || selectedOrder.id}
                </p>
                <p className="text-xs text-muted mt-1">
                  {selectedOrder.items?.length || 0} SKUs ·{' '}
                  {(selectedOrder.items?.reduce((acc, i) => acc + (i.quantity || i.expectedQty || 0), 0) || 0).toLocaleString()} unidades
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-subtle">
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 py-3 bg-surface hover:bg-elevated rounded-xl text-secondary font-medium transition-colors"
            >
              Cancelar
            </button>
            {activeTab === 'local' && selectedOrderId && (
              <motion.button
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={() => handleImportLocal(selectedOrderId)}
                disabled={isLoading}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 rounded-xl text-white font-bold transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Importar
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  )
}

// ============================================================================
// Componente principal
// ============================================================================

// Generar ID único simple sin depender de funciones externas en el módulo
const generateSimpleId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `HM-${timestamp}${random}`.toUpperCase();
};

export const RedesignHammerPage: React.FC = () => {
  const navigate = useNavigate()
  const params = useParams()
  
  // Hook del motor de conteo
  const { startCounting, isStarting } = useCountingEngine()
  
  // Modal de inicio unificado

  // Ref para evitar que el modal se reabra durante navegación
  const isNavigatingRef = useRef(false);

  const [showStartModal, setShowStartModal] = useState(false)
  
  // Estado para saber si debemos omitir el modal (viene de StartCountingModal)
  const [skipModal, setSkipModal] = useState(false)
  
  // Generar un batchId único si no se proporciona uno, para evitar recuperar datos de sesiones anteriores
  const [effectiveBatchId] = useState(() => {
    const paramBatchId = params.batchId;
    if (paramBatchId && paramBatchId !== 'CORE' && paramBatchId.trim() !== '') {
      return paramBatchId;
    }
    // Generar un nuevo batchId único usando función simple
    return generateSimpleId();
  });
  
  // Si el batchId proporcionado es 'CORE' o está vacío, redirigir a uno nuevo
  useEffect(() => {
    if (params.batchId === 'CORE' || !params.batchId || params.batchId.trim() === '') {
      // Actualizar la URL con el nuevo batchId sin recargar la página
      window.history.replaceState(null, '', `/massive/${effectiveBatchId}`);
    }
  }, [params.batchId, effectiveBatchId]);

  // Ref para rastrear si el usuario ya interactuó con el modal
  const userInteractedWithModalRef = useRef(false);

  // Mostrar modal de inicio cuando no hay batchId o es nuevo (y no viene de navegación previa)
  useEffect(() => {
    // Verificar si skipModal está en la URL (viene de StartCountingModal)
    const urlParams = new URLSearchParams(window.location.search);
    const shouldSkipModal = urlParams.get('skipModal') === 'true';
    
    if (shouldSkipModal) {
      // Marcar que debemos omitir el modal
      setSkipModal(true);
      // Limpiar el parámetro de la URL
      window.history.replaceState(null, '', window.location.pathname);
      return; // No mostrar el modal
    }

    // No mostrar modal si el usuario ya interactuó con él (eligió una opción)
    if (userInteractedWithModalRef.current) {
      return;
    }

    // Mostrar modal si:
    // 1. NO estamos omitiéndolo
    // 2. La URL es /massive (sin batchId) O el batchId coincide con el efectivo
    // 3. Es una sesión nueva sin datos
    if (!skipModal && (!params.batchId || params.batchId === effectiveBatchId)) {
      HammerDbRepository.getBatchCounts(effectiveBatchId)
        .then(counts => {
          if (counts.scans === 0 && counts.manifests === 0) {
            setShowStartModal(true);
          }
        })
        .catch(err => {
          logger.error('HammerPage', 'Error checking batch counts', { error: String(err) });
        });
    }
  }, [effectiveBatchId, params.batchId, skipModal]);

  // Manejar inicio desde el modal
  const handleStartFromModal = async (config: StartCountingConfig) => {
    // Marcar que el usuario interactuó para evitar que el modal se reabra
    userInteractedWithModalRef.current = true;
    isNavigatingRef.current = true;
    
    try {
      if (config.mode === 'blind') {
        // Modo ciego - ya estamos aquí, simplemente continuar
        setShowStartModal(false);
      } else {
        // Modo teórico - redirigir a counting
        setShowStartModal(false);
        await startCounting(config);
      }
    } finally {
      // Resetear después de un delay para permitir re-abrir el modal si es necesario
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 1000);
    }
  };

  const { settings, updateSetting } = useAppStore()

  const { state, actions } = useHammerLogic(effectiveBatchId)
  const locManager = useLocationManager(`hammer_loc_${effectiveBatchId}`)

  const [isManualMode, setIsManualMode] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [isToolsOpen, setIsToolsOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)
  
  // Modal de sesión existente - también guarda los conteos para mostrar al usuario
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [sessionCounts, setSessionCounts] = useState({ 
    scans: 0, 
    manifests: 0,
    totalScannedUnits: 0,
    totalExpectedUnits: 0,
    lastScanTimestamp: null as number | null
  })

  // Verificar si hay datos existentes al cargar y auto-descartar carga teórica antigua
  useEffect(() => {
    const checkExistingSession = async () => {
      // Usar getBatchSessionInfo para obtener información más detallada
      const sessionInfo = await HammerDbRepository.getBatchSessionInfo(effectiveBatchId);
      
      // Si no hay datos, no mostrar modal
      if (!sessionInfo.hasData) {
        return;
      }

      // Auto-descartar carga teórica si:
      // 1. La sesión tiene más de 24 horas
      // 2. Tiene manifests pero NO tiene escaneos (nunca se usó)
      // 3. Tiene manifests con más de 7 días
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const sessionAge = sessionInfo.lastScanTimestamp 
        ? now - sessionInfo.lastScanTimestamp 
        : ONE_DAY_MS; // Si no hay escaneos, considerar como 1 día

      const hasOldManifests = sessionInfo.manifests > 0 && (
        sessionAge > ONE_DAY_MS || 
        (sessionInfo.scans === 0 && sessionInfo.manifests > 0)
      );

      // Si tiene manifests sin escaneos (sesión nunca usada) o manifests muy antiguos
      if (sessionInfo.manifests > 0 && sessionInfo.scans === 0) {
        // Descartar automáticamente los manifests que nunca se usaron
        await HammerDbRepository.deleteBlindManifestsByBatch(effectiveBatchId);
        toast.info('Carga teórica antigua descartada automáticamente');
        setSessionCounts({
          scans: 0,
          manifests: 0,
          totalScannedUnits: 0,
          totalExpectedUnits: 0,
          lastScanTimestamp: null
        });
        return;
      }

      // Si tiene manifests antiguos con escaneos, ofrecer descartarlos
      if (hasOldManifests && sessionInfo.scans > 0) {
        // Actualizar los counts
        setSessionCounts({
          scans: sessionInfo.scans,
          manifests: sessionInfo.manifests,
          totalScannedUnits: sessionInfo.totalScannedUnits,
          totalExpectedUnits: sessionInfo.totalExpectedUnits,
          lastScanTimestamp: sessionInfo.lastScanTimestamp
        });
        setShowSessionModal(true);
        return;
      }

      // Si tiene solo escaneos (sin carga teórica), no mostrar modal de manifests
      if (sessionInfo.scans > 0 && sessionInfo.manifests === 0) {
        setSessionCounts({
          scans: sessionInfo.scans,
          manifests: 0,
          totalScannedUnits: sessionInfo.totalScannedUnits,
          totalExpectedUnits: 0,
          lastScanTimestamp: sessionInfo.lastScanTimestamp
        });
        setShowSessionModal(true);
        return;
      }

      // Si tiene ambos, mostrar modal con toda la información
      setSessionCounts({
        scans: sessionInfo.scans,
        manifests: sessionInfo.manifests,
        totalScannedUnits: sessionInfo.totalScannedUnits,
        totalExpectedUnits: sessionInfo.totalExpectedUnits,
        lastScanTimestamp: sessionInfo.lastScanTimestamp
      });
      setShowSessionModal(true);
    };
    checkExistingSession();
  }, [effectiveBatchId]) // Solo al montar

  // Alias para mantener compatibilidad con el resto del código
  const batchId = effectiveBatchId;

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
    try {
      // 1. Eliminar todos los escaneos
      await HammerDbRepository.deleteBlindScansByBatch(batchId)
      
      // 2. ELIMINAR también la carga teórica (manifests)
      // Esto es lo que faltaba - los manifests nunca se eliminaban
      await HammerDbRepository.deleteBlindManifestsByBatch(batchId)
      
      // 3. Recargar la página para reiniciar todo desde cero
      window.location.reload()
    } catch (error) {
      console.error('Error al limpiar sesión:', error)
      toast.error('Error al limpiar sesión')
    }
  }

  // Limpiar solo la carga teórica (manifests) pero mantener los escaneos
  const handleClearTheoreticalOnly = async () => {
    try {
      await HammerDbRepository.deleteBlindManifestsByBatch(batchId)
      setShowSessionModal(false)
      toast.success('Carga teórica eliminada. Los escaneos se mantienen.')
    } catch (error) {
      console.error('Error al limpiar carga teórica:', error)
      toast.error('Error al limpiar carga teórica')
    }
  }

  // Empezar nueva sesión con ID único (para no reutilizar datos)
  const handleNewSessionWithNewId = () => {
    // Generar un nuevo batchId único
    const newBatchId = generateSimpleId()
    
    // Guardar en localStorage para que el router lo use
    localStorage.setItem('hammer_last_batch', newBatchId)
    
    // Navegar a la nueva sesión
    navigate(`/massive/${newBatchId}`)
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
          <HorizontalStatCard icon={Package} label="SKUs" value={stats.total} />
          <HorizontalStatCard icon={Check} label="OK" value={stats.complete} color="text-emerald-500" />
          <HorizontalStatCard icon={AlertTriangle} label="Variacion" value={stats.withVariance} color="text-amber-500" />
          <HorizontalStatCard icon={TrendingUp} label="Unidades" value={stats.totalQty} color="text-blue-500" />
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
        registerExpiry={state.registerExpiry}
        onToggleRegisterExpiry={actions.toggleRegisterExpiry}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportStock={() => importManifestFromCloud(batchId)}
        onImportCloud={() => importExpectedOrderFromCloud(batchId, '')}
        onImportLocal={handleImportLocal}
      />

      {locManager.isModalOpen && (
        <LocationSelectorModal
          isOpen={true}
          onClose={() => locManager.closeModal?.()}
          currentLocation={locManager.location || 'ZONA-A'}
          onSelect={(loc) => {
            locManager.setLocation?.(loc)
            locManager.closeModal?.()
          }}
        />
      )}

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
              className="bg-base border border-subtle rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-lg font-bold text-primary mb-2 text-center flex items-center justify-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Sesión Anterior Detectada
              </h3>
              
              {/* Detalle de lo que hay guardado */}
              <div className="bg-surface rounded-xl p-4 mb-4 space-y-3">
                {/* Sección de Escaneos */}
                {sessionCounts.scans > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scan className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-secondary">Escaneos</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-500">{sessionCounts.scans} SKUs</span>
                      <span className="text-xs text-muted ml-2">({sessionCounts.totalScannedUnits} unidades)</span>
                    </div>
                  </div>
                )}
                
                {/* Sección de Carga Teórica */}
                {sessionCounts.manifests > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                      <span className="text-sm text-secondary">Carga Teórica</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-500">{sessionCounts.manifests} SKUs</span>
                      <span className="text-xs text-muted ml-2">({sessionCounts.totalExpectedUnits} unidades)</span>
                    </div>
                  </div>
                )}

                {/* Información de última actividad */}
                {sessionCounts.lastScanTimestamp && (
                  <div className="text-xs text-muted text-center pt-2 border-t border-subtle">
                    Última actividad: hace {formatTimeAgo(sessionCounts.lastScanTimestamp)}
                  </div>
                )}
              </div>
              
              {/* Mensaje explicativo */}
              <p className="text-sm text-muted text-center mb-4">
                {sessionCounts.scans > 0 && sessionCounts.manifests > 0
                  ? 'Esta sesión tiene escaneos y carga teórica. ¿Qué deseas hacer?'
                  : sessionCounts.scans > 0
                    ? 'Esta sesión tiene escaneos guardados. ¿Deseas continuar?'
                    : '¿Deseas usar esta carga teórica para el conteo?'}
              </p>
              
              <div className="space-y-3">
                {/* Opción principal: Continuar con lo que hay */}
                <button
                  onClick={handleContinueSession}
                  className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Continuar con esta sesión
                </button>
                
                {/* Opción para limpiar solo la carga teórica pero mantener escaneos */}
                {sessionCounts.manifests > 0 && sessionCounts.scans > 0 && (
                  <button
                    onClick={handleClearTheoreticalOnly}
                    className="w-full py-3 px-4 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                    Descartar carga teórica (mantener {sessionCounts.scans} escaneos)
                  </button>
                )}

                {/* Opción para importar carga teórica si no tiene */}
                {sessionCounts.manifests === 0 && sessionCounts.scans > 0 && (
                  <button
                    onClick={() => {
                      setShowSessionModal(false);
                      setIsImportModalOpen(true);
                    }}
                    className="w-full py-3 px-4 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Importar carga teórica
                  </button>
                )}
                
                {/* Limpiar todo */}
                {sessionCounts.scans > 0 && (
                  <button
                    onClick={handleNewSession}
                    className="w-full py-3 px-4 bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    Limpiar todo y empezar de nuevo
                  </button>
                )}
                
                {/* Nueva sesión con nuevo lote */}
                <button
                  onClick={handleNewSessionWithNewId}
                  className="w-full py-3 px-4 bg-surface hover:bg-elevated text-secondary font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Hammer className="w-5 h-5" />
                  Nueva sesión (lote nuevo)
                </button>
                
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-3 px-4 text-muted font-medium rounded-xl transition-colors"
                >
                  Volver al inicio
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Fecha de Vencimiento (Hammer) */}
      {state.awaitingExpiry && (
        <TestModeExpiryModal
          barcode={state.awaitingExpiry.barcode}
          productName={state.awaitingExpiry.name}
          onComplete={(data) => {
            actions.handleExpiryComplete(data.mm, data.yyyy)
          }}
          onCancel={() => {
            actions.handleExpiryCancel()
          }}
          onSkip={() => {
            // Omitir - continuar sin registrar vencimiento
            actions.handleExpiryComplete(0, 9999)
          }}
        />
      )}

      {/* Modal de Inicio Unificado */}
      <StartCountingModal
        isOpen={showStartModal}
        onClose={() => setShowStartModal(false)}
        onStart={handleStartFromModal}
      />
    </div>
  )
}
