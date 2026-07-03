import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarClock, Plus, Search, ChevronRight, Skull, AlertTriangle,
  PackageX, Clock, ShieldCheck, MapPin, RefreshCw, Package, AlertCircle,
  X, Trash2, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// IMPORTAR HOOK FUNCIONAL DE features/expiry
import { useExpiry, ExpiryRecord, ExpiryStatus } from '@/features/expiry/hooks/useExpiry'

// IMPORTAR MODAL REAL DE CAPTURA
import { ExpiryCaptureModal, ExpiryFormData } from '@/features/expiry/components/ExpiryCaptureModal'

// Tipos y constantes de UI
type UxExpiryStatus = 'expired' | 'critical' | 'withdrawal' | 'next' | 'safe'

const mapStatus = (status: ExpiryStatus): UxExpiryStatus => {
  switch (status) {
    case ExpiryStatus.EXPIRED: return 'expired'
    case ExpiryStatus.CRITICAL: return 'critical'
    case ExpiryStatus.WITHDRAWAL: return 'withdrawal'
    case ExpiryStatus.NEXT_EXPIRY: return 'next'
    default: return 'safe'
  }
}

const STATUS_META: Record<UxExpiryStatus, { label: string; icon: React.ElementType; text: string; bg: string; border: string; dot: string }> = {
  expired: { label: 'Vencido', icon: Skull, text: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30', dot: 'bg-rose-500' },
  critical: { label: 'Crítico', icon: AlertTriangle, text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  withdrawal: { label: 'A retirar', icon: PackageX, text: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-500' },
  next: { label: 'Próximo', icon: Clock, text: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-500' },
  safe: { label: 'Vigente', icon: ShieldCheck, text: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
}

const STATUS_ORDER: UxExpiryStatus[] = ['expired', 'critical', 'withdrawal', 'next', 'safe']
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const FILTERS = [
  { value: 'all' as const, label: 'Todos' },
  { value: 'expired' as const, label: 'Vencidos' },
  { value: 'critical' as const, label: 'Críticos' },
  { value: 'withdrawal' as const, label: 'A retirar' },
  { value: 'next' as const, label: 'Próximos' },
  { value: 'safe' as const, label: 'Vigentes' },
]

// Componentes de UI
const SummaryCard = ({ status, count, total }: { status: UxExpiryStatus; count: number; total: number }) => {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className={cn('bg-surface border border-subtle rounded-2xl p-4 flex flex-col gap-3 min-w-[140px]')}>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', meta.bg, meta.border)}>
        <Icon className={cn('w-5 h-5', meta.text)} />
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-primary">{count}</p>
          <p className="text-xs text-muted">{percentage}%</p>
        </div>
        <p className="text-xs text-muted mt-1">{meta.label}</p>
      </div>
    </motion.div>
  )
}

const RecordRow = ({ record, onClick }: { record: ExpiryRecord; onClick?: () => void }) => {
  const status = mapStatus(record.status)
  const meta = STATUS_META[status]
  const daysText = record.daysLeft < 0 ? `Venció hace ${Math.abs(record.daysLeft)} días` : record.daysLeft === 0 ? 'Vence hoy' : `Faltan ${record.daysLeft} días`
  const expiryMonth = record.expiryDateObj ? record.expiryDateObj.getMonth() + 1 : record.mm
  const expiryYear = record.expiryDateObj ? record.expiryDateObj.getFullYear() : record.yyyy
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-3 hover:bg-elevated transition-colors group rounded-xl cursor-pointer"
      onClick={onClick}>
      <div className={cn('w-1.5 h-12 rounded-full shrink-0', meta.dot)} />
      <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center shrink-0">
        <Package className="w-5 h-5 text-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary truncate">{record.productName || 'Producto sin nombre'}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
          <span className="text-xs text-muted font-mono">{record.barcode || 'Sin código'}</span>
          {record.location && <span className="text-xs text-secondary flex items-center gap-1"><MapPin className="w-3 h-3" />{record.location}</span>}
        </div>
      </div>
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-sm font-semibold text-primary">{MONTHS[expiryMonth - 1]} {expiryYear}</p>
        <p className="text-xs text-muted">{record.quantity} un.</p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1 w-28">
        <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full border', meta.bg, meta.border, meta.text)}>{meta.label}</span>
        <span className="text-[11px] text-secondary">{daysText}</span>
      </div>
    </motion.div>
  )
}

const Section = ({ status, records, isOpen, onToggle, onRecordClick }: { 
  status: UxExpiryStatus; 
  records: ExpiryRecord[]; 
  isOpen: boolean; 
  onToggle: () => void;
  onRecordClick: (record: ExpiryRecord) => void;
}) => {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <div className={cn('bg-surface border border-subtle rounded-2xl overflow-hidden', records.length === 0 && 'opacity-60')}>
      <button onClick={onToggle} disabled={records.length === 0}
        className={cn('w-full px-4 py-3 flex items-center justify-between hover:bg-elevated transition-colors', records.length === 0 && 'cursor-not-allowed')}>
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center border', meta.bg, meta.border)}>
            <Icon className={cn('w-4 h-4', meta.text)} />
          </div>
          <div className="text-left">
            <span className="text-sm font-semibold text-primary">{meta.label}</span>
            <span className="text-xs text-muted ml-2 font-mono">{records.length} registros</span>
          </div>
        </div>
        {records.length > 0 && (
          <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="w-4 h-4 text-muted" />
          </motion.div>
        )}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && records.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="divide-y divide-subtle border-t border-subtle px-2 py-2">
              {records.slice(0, 20).map((r) => <RecordRow key={r.id} record={r} onClick={() => onRecordClick(r)} />)}
              {records.length > 20 && <p className="text-center py-3 text-xs text-muted">Mostrando 20 de {records.length}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Componente principal - USA useExpiry DE features/expiry
export const RedesignExpiryPage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | UxExpiryStatus>('all')
  const [openSections, setOpenSections] = useState<Record<UxExpiryStatus, boolean>>({
    expired: true, critical: true, withdrawal: true, next: false, safe: false,
  })
  const [showCaptureModal, setShowCaptureModal] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  // USAR HOOK FUNCIONAL DE features/expiry
  const { records: allRecords, filteredRecords, stats, isLoading, isSyncing, filters, actions, selectedIds, selectedRecord, setSelectedRecord } = useExpiry()

  // Handler para click en registro
  const handleRecordClick = (record: ExpiryRecord) => {
    if (isSelectionMode) {
      actions.toggleSelection(record.id)
    } else {
      setSelectedRecord(record)
    }
  }

  // Toggle modo selección
  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      actions.clearSelection()
    }
    setIsSelectionMode(!isSelectionMode)
  }

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    await actions.bulkDelete(Array.from(selectedIds))
    setIsSelectionMode(false)
    actions.clearSelection()
  }

  // Calcular estadísticas
  const counts = useMemo(() => ({
    expired: stats.expired,
    critical: stats.critical,
    withdrawal: stats.withdrawal,
    next: stats.nextExpiry,
    safe: stats.safe,
  }), [stats])

  // Agrupar por estado
  const grouped = useMemo(() => {
    const g: Record<UxExpiryStatus, ExpiryRecord[]> = { expired: [], critical: [], withdrawal: [], next: [], safe: [] }
    filteredRecords.forEach((r) => {
      const status = mapStatus(r.status)
      g[status].push(r)
    })
    Object.keys(g).forEach((key) => {
      g[key as UxExpiryStatus].sort((a, b) => a.daysLeft - b.daysLeft)
    })
    return g
  }, [filteredRecords])

  const totalRecords = allRecords.length
  const urgentCount = counts.expired + counts.critical + counts.withdrawal
  const visibleStatuses = filter === 'all' ? STATUS_ORDER : [filter as UxExpiryStatus]

  const handleFilterClick = (value: string) => {
    if (value === 'all') {
      actions.setSelectedStatuses([])
      setFilter('all')
    } else {
      const statusMap: Record<string, ExpiryStatus> = {
        'expired': ExpiryStatus.EXPIRED,
        'critical': ExpiryStatus.CRITICAL,
        'withdrawal': ExpiryStatus.WITHDRAWAL,
        'next': ExpiryStatus.NEXT_EXPIRY,
        'safe': ExpiryStatus.SAFE,
      }
      const mappedStatus = statusMap[value]
      if (mappedStatus) {
        actions.setSelectedStatuses([mappedStatus])
        setFilter(value as UxExpiryStatus)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-base">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted mt-4">Cargando vencimientos...</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-base">
      <div className="pt-8 px-4 sm:px-6 lg:px-8 shrink-0">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <CalendarClock className="w-8 h-8 text-blue-500" />
              Vencimientos
              {urgentCount > 0 && (
                <span className="flex items-center gap-1 text-sm font-normal text-rose-500 bg-rose-500/10 px-2 py-1 rounded-full">
                  <AlertCircle className="w-4 h-4" />
                  {urgentCount} urgente{urgentCount !== 1 ? 's' : ''}
                </span>
              )}
            </h1>
            <p className="text-secondary text-sm mt-2">Controla la caducidad de tus productos y planifica retiros.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {/* Modo selección */}
            {isSelectionMode ? (
              <>
                <button onClick={handleBulkDelete} disabled={selectedIds.size === 0}
                  className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Eliminar ({selectedIds.size})</span>
                </button>
                <button onClick={toggleSelectionMode}
                  className="flex items-center gap-2 bg-surface hover:bg-elevated border border-subtle text-primary px-3 py-2 rounded-xl text-sm font-medium transition-colors">
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Cancelar</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={toggleSelectionMode}
                  className="flex items-center gap-2 bg-surface hover:bg-elevated border border-subtle text-primary px-3 py-2 rounded-xl text-sm font-medium transition-colors">
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">Seleccionar</span>
                </button>
                <button onClick={actions.syncRecords} disabled={isSyncing}
                  className="flex items-center gap-2 bg-surface hover:bg-elevated border border-subtle text-primary px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                  <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
                  <span className="hidden sm:inline">{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
                </button>
                <button onClick={() => setShowCaptureModal(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
                  <Plus className="w-4 h-4" /><span className="hidden sm:inline">Registrar</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto flex flex-col gap-5">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {STATUS_ORDER.map((s) => <SummaryCard key={s} status={s} count={counts[s]} total={totalRecords} />)}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input type="text" value={filters?.searchQuery || ''} onChange={(e) => actions.setSearchQuery(e.target.value)}
                placeholder="Buscar por producto, código o ubicación..."
                className="w-full bg-surface border border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm text-primary focus:outline-none focus:border-blue-500 transition-all" />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {FILTERS.map((f) => (
                <button key={f.value} onClick={() => handleFilterClick(f.value)}
                  className={cn('px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors shrink-0',
                    filter === f.value ? 'bg-blue-600 text-white' : 'bg-surface text-secondary hover:bg-elevated hover:text-primary border border-subtle')}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {urgentCount > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-rose-500">{urgentCount} producto{urgentCount !== 1 ? 's' : ''} requieren atención inmediata</p>
                <p className="text-xs text-secondary mt-0.5">
                  {counts.expired > 0 && `${counts.expired} vencidos`}{counts.expired > 0 && counts.critical > 0 && ', '}{counts.critical > 0 && `${counts.critical} en estado crítico`}
                </p>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface border border-subtle rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-primary">{totalRecords}</p><p className="text-xs text-muted">Total</p>
            </div>
            <div className="bg-surface border border-subtle rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-rose-500">{counts.expired}</p><p className="text-xs text-muted">Vencidos</p>
            </div>
            <div className="bg-surface border border-subtle rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-amber-500">{counts.critical + counts.withdrawal}</p><p className="text-xs text-muted">A retirar</p>
            </div>
            <div className="bg-surface border border-subtle rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-emerald-500">{counts.next + counts.safe}</p><p className="text-xs text-muted">Vigentes</p>
            </div>
          </div>

          {allRecords.length === 0 ? (
            <div className="bg-surface border border-subtle rounded-2xl p-8 text-center">
              <CalendarClock className="w-12 h-12 text-muted mx-auto mb-4" />
              <p className="text-sm text-muted">No hay registros de vencimientos</p>
              <p className="text-xs text-muted mt-1">Comienza agregando fechas de vencimiento</p>
            </div>
          ) : (
            visibleStatuses.map((s) => (
              <Section key={s} status={s} records={grouped[s]}
                isOpen={filter !== 'all' ? true : openSections[s]}
                onToggle={() => setOpenSections((prev) => ({ ...prev, [s]: !prev[s] }))}
                onRecordClick={handleRecordClick} />
            ))
          )}
        </div>
      </div>

      {/* Modal de Detalle */}
      <AnimatePresence>
        {selectedRecord && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setSelectedRecord(null)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-base border border-subtle rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-subtle flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const status = mapStatus(selectedRecord.status)
                    const meta = STATUS_META[status]
                    const Icon = meta.icon
                    return (
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', meta.bg, meta.border)}>
                        <Icon className={cn('w-5 h-5', meta.text)} />
                      </div>
                    )
                  })()}
                  <div>
                    <p className="text-sm font-semibold text-primary">{selectedRecord.productName}</p>
                    <p className="text-xs text-muted font-mono">{selectedRecord.barcode}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-elevated rounded-xl">
                  <X className="w-5 h-5 text-muted" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
                {/* Estado */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Estado</span>
                  {(() => {
                    const status = mapStatus(selectedRecord.status)
                    const meta = STATUS_META[status]
                    const daysText = selectedRecord.daysLeft < 0 
                      ? `Venció hace ${Math.abs(selectedRecord.daysLeft)} días` 
                      : selectedRecord.daysLeft === 0 
                        ? 'Vence hoy' 
                        : `Faltan ${selectedRecord.daysLeft} días`
                    return (
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', meta.bg, meta.border, meta.text)}>
                          {meta.label}
                        </span>
                        <span className="text-xs text-secondary">{daysText}</span>
                      </div>
                    )
                  })()}
                </div>

                {/* Detalles */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-xs text-muted mb-1">Fecha Vencimiento</p>
                    <p className="text-sm font-semibold text-primary">
                      {MONTHS[selectedRecord.mm - 1]} {selectedRecord.yyyy}
                    </p>
                  </div>
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-xs text-muted mb-1">Cantidad</p>
                    <p className="text-sm font-semibold text-primary">{selectedRecord.quantity} unidades</p>
                  </div>
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-xs text-muted mb-1">Proveedor</p>
                    <p className="text-sm font-semibold text-primary truncate">{selectedRecord.providerName}</p>
                  </div>
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-xs text-muted mb-1">Ubicación</p>
                    <p className="text-sm font-semibold text-primary truncate">{selectedRecord.location}</p>
                  </div>
                </div>

                {/* Observaciones */}
                {selectedRecord.observaciones && (
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-xs text-muted mb-1">Observaciones</p>
                    <p className="text-sm text-secondary">{selectedRecord.observaciones}</p>
                  </div>
                )}

                {/* Sincronización */}
                <div className="flex items-center justify-between pt-2 border-t border-subtle">
                  <span className="text-xs text-muted">Sincronización</span>
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    selectedRecord.syncStatus === 'synced' ? 'bg-emerald-500/20 text-emerald-400' :
                    selectedRecord.syncStatus === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-rose-500/20 text-rose-400'
                  )}>
                    {selectedRecord.syncStatus === 'synced' ? 'Sincronizado' :
                     selectedRecord.syncStatus === 'pending' ? 'Pendiente' : 'Error'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-subtle flex gap-3">
                <button 
                  onClick={() => {
                    toast.success('Registro eliminado')
                    actions.deleteRecord(selectedRecord.id)
                    setSelectedRecord(null)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-rose-500/20 text-rose-400 rounded-xl font-medium hover:bg-rose-500/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-400 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Captura - Usando componente real */}
      <ExpiryCaptureModal
        isOpen={showCaptureModal}
        onClose={() => setShowCaptureModal(false)}
        onSubmit={async (data: ExpiryFormData) => {
          const id = await actions.createRecord({
            barcode: data.barcode,
            productName: data.productName,
            mm: data.mm,
            yyyy: data.yyyy,
            quantity: data.quantity,
            location: data.location,
            observaciones: data.observaciones,
            hasCanje: data.hasCanje,
            withdrawalDays: data.withdrawalDays,
          })
          
          if (id) {
            toast.success('Vencimiento registrado correctamente')
          }
        }}
        theme="dark"
      />

      {/* FAB flotante para móvil */}
      {!isSelectionMode && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setShowCaptureModal(true)}
          className="fixed bottom-24 right-6 md:hidden w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-900/30 flex items-center justify-center hover:bg-blue-500 transition-colors z-40"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}
    </div>
  )
}
