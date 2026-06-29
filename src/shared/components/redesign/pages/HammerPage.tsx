import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Hammer, Package, Plus, Minus, Trash2, RefreshCw, Check, X, 
  AlertTriangle, TrendingUp, Settings, Download, Scan, Keyboard
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Importar hooks funcionales de features/hammer
import { useHammerLogic, HammerItem } from '@/features/hammer/hooks/useHammerLogic'
import { useLocationManager } from '@/shared/hooks/useLocationManager'

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

const ItemRow = ({ item, onRemove, isActive }: { 
  item: HammerItem; onRemove: (barcode: string) => void; isActive: boolean 
}) => {
  const diff = item.expectedQty !== undefined ? item.totalQuantity - item.expectedQty : 0
  const diffColor = diff === 0 ? 'text-emerald-500' : diff > 0 ? 'text-blue-500' : 'text-rose-500'

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl transition-all',
        isActive ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-surface hover:bg-elevated'
      )}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary truncate">{item.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted font-mono">{item.barcode}</span>
          {item.loc && <span className="text-xs text-secondary">{item.loc}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-16 text-center">
          <p className="text-lg font-bold text-primary">{item.totalQuantity}</p>
          {item.expectedQty !== undefined && (
            <p className={cn('text-xs font-mono', diffColor)}>
              {diff > 0 ? '+' : ''}{diff}
            </p>
          )}
        </div>
      </div>
      <button onClick={() => onRemove(item.barcode)}
        className="w-8 h-8 rounded-lg hover:bg-rose-500/20 flex items-center justify-center transition-colors">
        <Trash2 className="w-4 h-4 text-rose-500" />
      </button>
    </motion.div>
  )
}

// ============================================================================
// Componente principal
// ============================================================================
export const RedesignHammerPage: React.FC = () => {
  const navigate = useNavigate()
  const { batchId = 'CORE' } = useParams()
  
  // Hook funcional de features/hammer
  const { state, actions } = useHammerLogic(batchId)
  const locManager = useLocationManager(`hammer_loc_${batchId}`)

  // Estados locales
  const [isManualMode, setIsManualMode] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')

  // Stats derivadas
  const stats = useMemo(() => {
    const items = state.items || []
    const total = items.length
    const withVariance = items.filter(i => i.expectedQty !== undefined && i.totalQuantity !== i.expectedQty).length
    const complete = items.filter(i => i.expectedQty !== undefined && i.totalQuantity === i.expectedQty).length
    const totalQty = items.reduce((acc, i) => acc + i.totalQuantity, 0)
    return { total, withVariance, complete, totalQty }
  }, [state.items])

  const handleManualScan = () => {
    if (manualBarcode.trim()) {
      actions.registerScan(manualBarcode.trim())
      setManualBarcode('')
    }
  }

  if (!state.items) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-base">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-muted mt-4">Cargando modo hammer...</p>
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
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Hammer className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">Modo Hammer</h1>
              <p className="text-xs text-muted">Batch: {batchId}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => locManager.openModal?.()}
              className="px-3 py-1.5 rounded-lg bg-surface border border-subtle text-sm font-medium">
              📍 {locManager.location || 'ZONA-A'}
            </button>
            <button onClick={() => actions.syncToCloud?.()}
              disabled={state.isSyncing}
              className={cn(
                'p-2 rounded-lg transition-colors',
                state.isSyncing ? 'bg-blue-500 text-white' : 'bg-surface hover:bg-elevated'
              )}>
              <RefreshCw className={cn('w-5 h-5', state.isSyncing && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <StatCard icon={Package} label="Items" value={stats.total} color="text-primary" />
          <StatCard icon={Check} label="Completos" value={stats.complete} color="text-emerald-500" />
          <StatCard icon={AlertTriangle} label="Variación" value={stats.withVariance} color="text-amber-500" />
          <StatCard icon={TrendingUp} label="Total" value={stats.totalQty} color="text-blue-500" />
        </div>

        {/* Sync Status */}
        {state.pendingWrites > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-500 mb-3">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>{state.pendingWrites} escrituras pendientes</span>
          </div>
        )}
        {state.syncError && (
          <div className="flex items-center gap-2 text-sm text-rose-500 mb-3">
            <AlertTriangle className="w-4 h-4" />
            <span>{state.syncError}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-32">
        {/* Manual Mode Toggle */}
        <div className="flex items-center gap-3 py-3 border-b border-subtle">
          <button
            onClick={() => setIsManualMode(!isManualMode)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              isManualMode ? 'bg-blue-500 text-white' : 'bg-surface text-secondary hover:text-primary'
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
                placeholder="Ingresa código de barras..."
                className="flex-1 bg-surface border border-subtle rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button onClick={handleManualScan}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl font-medium">
                <Scan className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="flex flex-col gap-2 py-3">
          {state.items.length === 0 ? (
            <div className="text-center py-12">
              <Hammer className="w-12 h-12 text-muted mx-auto mb-4" />
              <p className="text-muted">No hay productos escaneados</p>
              <p className="text-xs text-muted mt-1">Escanea códigos de barras o usa el modo manual</p>
            </div>
          ) : (
            state.items.map((item) => (
              <ItemRow
                key={item.barcode}
                item={item}
                isActive={state.activeBarcode === item.barcode}
                onRemove={actions.removeItem}
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
            Herramientas
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-surface rounded-xl font-medium">
            <Download className="w-5 h-5" />
            Importar
          </button>
          <button disabled={state.items.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-xl font-medium disabled:opacity-50">
            <Check className="w-5 h-5" />
            Finalizar
          </button>
        </div>
      </div>
    </div>
  )
}
