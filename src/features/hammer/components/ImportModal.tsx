import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileSpreadsheet, X, BarChart3, Cloud, HardDrive,
  ChevronRight, Wifi, WifiOff, Package2, ListChecks,
  ShoppingCart, Calendar, Download, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { formatTimeAgo } from '@/lib/date'
import { SearchInput } from '@/shared/components/ui/SearchInput'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportStock: () => void
  onImportCloud: () => void
  onImportLocal: (orderId: string) => void
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportStock,
  onImportCloud,
  onImportLocal
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
    } catch {
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
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
              {/* Stock General */}
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

              {/* Órdenes desde Nube */}
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

              {/* Órdenes Locales */}
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
              {localOrders.length > 0 && (
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Buscar por nombre u orden..."
                  iconSize="sm"
                />
              )}

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
                  filteredOrders.map((order) => {
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
