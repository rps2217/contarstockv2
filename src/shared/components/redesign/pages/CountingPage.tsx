import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ClipboardList, Package, Plus, Minus, Trash2, RefreshCw, Check, X,
  AlertTriangle, Clock, MapPin, User, BarChart3, Settings, Scan,
  Keyboard, Camera, CheckCircle2, XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Importar hooks de counting
import { useCountingLogic } from '@/features/counting/hooks/useCountingLogic'
import { useProductivity } from '@/shared/hooks'

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

const ItemRow = ({ item, isActive }: { 
  item: { barcode: string; productName?: string; totalQuantity: number; expectedQty?: number }; 
  isActive: boolean 
}) => {
  const diff = item.expectedQty !== undefined ? item.totalQuantity - item.expectedQty : null
  const diffColor = diff === 0 ? 'text-emerald-500' : diff !== null && diff > 0 ? 'text-blue-500' : diff !== null ? 'text-rose-500' : 'text-muted'

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl transition-all',
        isActive ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-surface hover:bg-elevated'
      )}>
      <div className={cn('w-1.5 h-12 rounded-full shrink-0', isActive ? 'bg-blue-500' : 'bg-subtle')} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary truncate">
          {item.productName || 'Cargando...'}
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
// Componente principal
// ============================================================================
export const RedesignCountingPage: React.FC = () => {
  const navigate = useNavigate()
  const { sessionId } = useParams<{ sessionId?: string }>()
  
  const [isManualMode, setIsManualMode] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')

  // Hook de counting
  const handleExit = () => navigate('/dashboard')
  const { state, actions } = useCountingLogic(sessionId, handleExit)

  // Productivity stats
  const itemsForStats = state?.consolidatedHistory?.map(i => ({
    barcode: i.barcode,
    totalQuantity: i.totalQuantity
  })) || []
  const { stats, formattedDuration } = useProductivity(itemsForStats)

  // Stats derivadas
  const statsData = useMemo(() => {
    const items = state?.consolidatedHistory || []
    const total = items.length
    const withVariance = items.filter(i => i.expectedQty !== undefined && i.totalQuantity !== i.expectedQty).length
    const complete = items.filter(i => i.expectedQty !== undefined && i.totalQuantity === i.expectedQty).length
    const totalQty = items.reduce((acc, i) => acc + i.totalQuantity, 0)
    return { total, withVariance, complete, totalQty }
  }, [state?.consolidatedHistory])

  const handleManualScan = () => {
    if (manualBarcode.trim()) {
      actions.handleExternalScan(manualBarcode.trim(), 1)
      setManualBarcode('')
    }
  }

  if (!state?.session) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-base">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-muted mt-4">Cargando conteo...</p>
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
                {state.session.erpOrder || 'Sin orden'} • {state.session.location}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-mono">{formattedDuration}</span>
            <button
              onClick={actions.undoLastScan}
              className="p-2 rounded-lg bg-surface hover:bg-elevated">
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
            <button onClick={() => actions.setMultiplier(Math.max(1, state.engine.multiplier - 1))}
              className="w-8 h-8 rounded bg-elevated hover:bg-rose-500/20 flex items-center justify-center">
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-bold">{state.engine.multiplier}</span>
            <button onClick={() => actions.setMultiplier(state.engine.multiplier + 1)}
              className="w-8 h-8 rounded bg-elevated hover:bg-emerald-500/20 flex items-center justify-center">
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
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
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
                className="flex-1 bg-surface border border-subtle rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button onClick={handleManualScan}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl">
                <Scan className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="flex flex-col gap-2 py-3">
          {statsData.total === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="w-12 h-12 text-muted mx-auto mb-4" />
              <p className="text-muted">No hay productos escaneados</p>
              <p className="text-xs text-muted mt-1">Escanea códigos para comenzar</p>
            </div>
          ) : (
            state.consolidatedHistory?.map((item) => (
              <ItemRow
                key={item.barcode}
                item={item}
                isActive={state.engine.activeBarcode === item.barcode}
              />
            ))
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-base/95 backdrop-blur-xl border-t border-subtle p-4">
        <div className="flex gap-3">
          <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-surface rounded-xl font-medium">
            <Settings className="w-5 h-5" />
            Opciones
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-xl font-medium">
            <Check className="w-5 h-5" />
            Finalizar
          </button>
        </div>
      </div>
    </div>
  )
}
