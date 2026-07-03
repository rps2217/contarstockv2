import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ClipboardList, Package, Plus, Minus, RefreshCw, Check, X,
  AlertTriangle, BarChart3, Settings, Scan, Keyboard, CheckCircle2,
  MapPin
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Importar hooks de counting
import { useCountingLogic } from '@/features/counting/hooks/useCountingLogic'
import { useProductivity } from '@/shared/hooks'
import { SessionRepository } from '@/repositories/SessionRepository'

// ============================================================================
// Componentes de UI
// ============================================================================
const StatCard = ({ icon: Icon, label, value, color = 'text-primary' }: { 
  icon: React.ElementType; label: string; value: string | number; color?: string 
}) => (
  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
    className="bg-surface border border-subtle rounded-xl p-3 flex items-center gap-3">
    <div className={cn('w-10 h-10 rounded-lg bg-elevated flex items-center justify-center')}>
      <Icon className={cn('w-5 h-5', color)} />
    </div>
    <div>
      <p className={cn('text-lg font-bold', color)}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  </motion.div>
)

const ItemRow = ({ item, isActive, onClick }: { 
  item: { barcode: string; productName?: string; totalQuantity: number; expectedQty?: number }; 
  isActive: boolean;
  onClick?: () => void;
}) => {
  const diff = item.expectedQty !== undefined ? item.totalQuantity - item.expectedQty : null
  const diffColor = diff === 0 ? 'text-emerald-500' : diff !== null && diff > 0 ? 'text-blue-500' : diff !== null ? 'text-rose-500' : 'text-muted'

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer',
        isActive ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-surface hover:bg-elevated'
      )}>
      <div className={cn('w-1.5 h-12 rounded-full shrink-0', isActive ? 'bg-blue-500' : 'bg-subtle')} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary truncate">
          {item.productName || 'Producto sin nombre'}
        </p>
        <span className="text-xs text-muted font-mono">{item.barcode}</span>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold text-primary">{item.totalQuantity}</p>
        {diff !== null && (
          <p className={cn('text-xs font-mono', diffColor)}>
            {diff > 0 ? '+' : ''}{diff}
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ============================================================================
// Modal de Opciones
// ============================================================================
const OptionsModal = ({ 
  isOpen, 
  onClose, 
  session,
  actions,
  currentLocation,
  setCurrentLocation,
  onReset
}: { 
  isOpen: boolean; 
  onClose: () => void;
  session: any;
  actions: any;
  currentLocation: string;
  setCurrentLocation: (v: string) => void;
  onReset: () => void;
}) => {
  const locations = ['BODEGA_GRAL', 'BODEGA_2', 'SALA_VENTAS', 'DEPOSITO']
  const erpOrders = ['Sin orden', 'ORD-001', 'ORD-002', 'ORD-003']

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-base border border-subtle rounded-t-3xl w-full max-w-lg max-h-[80vh] overflow-hidden"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-subtle flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary">Opciones de Conteo</h2>
              <button onClick={onClose} className="p-2 hover:bg-surface rounded-xl">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Ubicación */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-primary flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Ubicación
                </label>
                <select
                  value={currentLocation}
                  onChange={(e) => setCurrentLocation(e.target.value)}
                  className="w-full bg-surface border border-subtle rounded-xl px-4 py-3 text-primary"
                >
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>{loc.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              {/* Reset sesión */}
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                <p className="text-sm text-rose-400 mb-3">⚠️ Zona de Peligro</p>
                <button
                  onClick={onReset}
                  className="w-full py-3 bg-rose-500/20 text-rose-400 rounded-xl font-medium hover:bg-rose-500/30 transition-colors"
                >
                  Vaciar conteo actual
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// Modal de Confirmación Finalizar
// ============================================================================
const FinishModal = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  statsData,
  session
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onConfirm: () => void;
  statsData: any;
  session: any;
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
            className="bg-base border border-subtle rounded-2xl w-full max-w-md overflow-hidden"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-primary mb-2">¿Finalizar Conteo?</h2>
              <p className="text-sm text-secondary mb-4">
                Se registrarán <span className="font-bold text-primary">{statsData.total}</span> productos 
                ({statsData.totalQty} unidades) en esta sesión.
              </p>
              
              <div className="bg-surface rounded-xl p-4 mb-4 text-left">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted">Completos:</span>
                  <span className="text-emerald-400 font-bold">{statsData.complete}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted">Con variación:</span>
                  <span className="text-amber-400 font-bold">{statsData.withVariance}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Total unidades:</span>
                  <span className="text-blue-400 font-bold">{statsData.totalQty}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-surface text-secondary rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// Componente principal
// ============================================================================
export const RedesignCountingPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  
  const [isManualMode, setIsManualMode] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [showFinish, setShowFinish] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')

  // Hook de counting
  const handleExit = () => navigate('/dashboard')
  const { state, sessionData, actions } = useCountingLogic(id, handleExit)

  // Productivity stats
  const itemsForStats = sessionData?.history?.map((i: any) => ({
    barcode: i.barcode,
    totalQuantity: i.totalQuantity
  })) || []
  const { stats, formattedDuration } = useProductivity(itemsForStats)

  // Stats derivadas
  const statsData = useMemo(() => {
    const items = sessionData?.history || []
    const total = items.length
    const withVariance = items.filter((i: any) => i.expectedQty !== undefined && i.totalQuantity !== i.expectedQty).length
    const complete = items.filter((i: any) => i.expectedQty !== undefined && i.totalQuantity === i.expectedQty).length
    const totalQty = items.reduce((acc: number, i: any) => acc + i.totalQuantity, 0)
    return { total, withVariance, complete, totalQty }
  }, [sessionData?.history])

  const handleManualScan = () => {
    if (manualBarcode.trim()) {
      actions.handleExternalScan(manualBarcode.trim(), 1)
      setManualBarcode('')
    }
  }

  const handleFinish = async () => {
    try {
      if (sessionData?.session?.id) {
        await SessionRepository.update(sessionData.session.id, {
          status: 'completed'
        })
        toast.success('Conteo finalizado correctamente')
      }
      setShowFinish(false)
      navigate('/dashboard')
    } catch {
      toast.error('Error al finalizar conteo')
    }
  }

  const handleReset = async () => {
    if (window.confirm('¿Estás seguro de vaciar todo el contenido de este conteo?')) {
      await actions.resetSession()
      setShowOptions(false)
      toast.success('Conteo vaciado')
    }
  }

  if (state?.isLoading || !sessionData?.session) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-base">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-muted mt-4">Cargando conteo...</p>
        {!id && (
          <p className="text-xs text-muted mt-2">No hay sesión activa</p>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-base overflow-hidden">
      {/* Header */}
      <div className="pt-6 px-4 sm:px-6 shrink-0 bg-base border-b border-subtle">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 rounded-lg hover:bg-surface">
              <X className="w-5 h-5 text-muted" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">Conteo</h1>
              <p className="text-xs text-muted">
                {sessionData.session?.erpOrder || 'Sin orden'} • {state.currentLocation}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-mono">{formattedDuration}</span>
            <button
              onClick={actions.undoLastScan}
              className="p-2 rounded-lg bg-surface hover:bg-elevated"
              title="Deshacer último"
            >
              <RefreshCw className="w-5 h-5 text-muted" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <StatCard icon={Package} label="Items" value={statsData.total} />
          <StatCard icon={CheckCircle2} label="Completos" value={statsData.complete} color="text-emerald-500" />
          <StatCard icon={AlertTriangle} label="Variación" value={statsData.withVariance} color="text-amber-500" />
          <StatCard icon={BarChart3} label="Total" value={statsData.totalQty} color="text-blue-500" />
        </div>

        {/* Multiplier */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-muted">Cantidad:</span>
          <div className="flex items-center gap-2 bg-surface rounded-lg p-1">
            <button 
              onClick={() => actions.setMultiplier(Math.max(1, state.multiplier - 1))}
              className="w-8 h-8 rounded bg-elevated hover:bg-rose-500/20 flex items-center justify-center transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-bold text-primary">{state.multiplier}</span>
            <button 
              onClick={() => actions.setMultiplier(state.multiplier + 1)}
              className="w-8 h-8 rounded bg-elevated hover:bg-emerald-500/20 flex items-center justify-center transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <span className="text-xs text-muted">{stats.itemsPerMinute}/min</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-32">
        {/* Manual Mode */}
        <div className="flex items-center gap-3 py-3 border-b border-subtle">
          <button onClick={() => setIsManualMode(!isManualMode)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              isManualMode ? 'bg-blue-500 text-white' : 'bg-surface text-secondary'
            )}>
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
                placeholder="Código de barras..."
                className="flex-1 bg-surface border border-subtle rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 text-primary"
                autoFocus
              />
              <button onClick={handleManualScan}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-400 transition-colors">
                <Scan className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
        
        {/* Feedback del Scanner */}
        {state.feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'my-3 p-3 rounded-xl border flex items-center gap-3',
              state.feedback === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
              state.feedback === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
              'bg-amber-500/10 border-amber-500/30 text-amber-400'
            )}
          >
            {state.feedback === 'success' && <CheckCircle2 className="w-5 h-5" />}
            {state.feedback === 'error' && <X className="w-5 h-5" />}
            {state.feedback === 'warning' && <AlertTriangle className="w-5 h-5" />}
            <span className="text-sm font-medium">
              {state.feedback === 'success' ? '¡Registrado!' :
               state.feedback === 'error' ? 'Error al registrar' :
               'Producto seleccionado'}
            </span>
          </motion.div>
        )}
        
        {/* Activo actual */}
        {state.activeBarcode && (
          <div className="my-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-400 font-medium">Escaneando:</p>
                <p className="text-lg font-bold text-primary">{state.activeBarcode}</p>
                {state.activeProduct && (
                  <p className="text-sm text-secondary">{state.activeProduct.name}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-blue-400">×{state.multiplier}</p>
                <p className="text-xs text-muted">por escaneo</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Items List */}
        <div className="flex flex-col gap-2 py-3">
          {statsData.total === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="w-12 h-12 text-muted mx-auto mb-4" />
              <p className="text-muted">No hay productos escaneados</p>
              <p className="text-xs text-muted mt-1">Escanea códigos para comenzar</p>
            </div>
          ) : (
            sessionData.history.map((item: any) => (
              <ItemRow
                key={item.barcode}
                item={item}
                isActive={state.activeBarcode === item.barcode}
                onClick={() => actions.selectItem(item.barcode)}
              />
            ))
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-base/95 backdrop-blur-xl border-t border-subtle p-4">
        <div className="flex gap-3">
          <button 
            onClick={() => setShowOptions(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-surface rounded-xl font-medium text-primary hover:bg-elevated transition-colors"
          >
            <Settings className="w-5 h-5" />
            Opciones
          </button>
          <button 
            onClick={() => setShowFinish(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-400 transition-colors"
          >
            <Check className="w-5 h-5" />
            Finalizar
          </button>
        </div>
      </div>

      {/* Modales */}
      <OptionsModal
        isOpen={showOptions}
        onClose={() => setShowOptions(false)}
        session={sessionData.session}
        actions={actions}
        currentLocation={state.currentLocation}
        setCurrentLocation={actions.setCurrentLocation}
        onReset={handleReset}
      />

      <FinishModal
        isOpen={showFinish}
        onClose={() => setShowFinish(false)}
        onConfirm={handleFinish}
        statsData={statsData}
        session={sessionData.session}
      />
    </div>
  )
}
