/**
 * CountingPage - Página de conteo (Refactorizada)
 * 
 * Componente orchestrator que usa componentes separados.
 * La lógica de negocio está en useCountingLogic.
 */

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import {
  X, Check,
  AlertTriangle, Scan, Keyboard, CheckCircle2, ClipboardList, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Importar hooks de counting
import { TestModeExpiryModal } from '@/features/counting/components/TestModeExpiryModal'
import { EditExpiryModal } from '@/features/counting/components/EditExpiryModal'
import { useCountingLogic } from '@/features/counting/hooks/useCountingLogic'
import { useProductivity } from '@/shared/hooks'
import { SessionRepository } from '@/repositories/SessionRepository'

// ============================================================================
// COMPONENTES DE ESTADO (Loading/Empty/Error)
// ============================================================================
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { ListSkeleton } from '@/shared/components/ui/EmptyState'

// ============================================================================
// NUEVOS COMPONENTES REFACTORIZADOS
// ============================================================================
import {
  CountingHeader,
  CountingGrid,
  CountingOptionsModal,
  CountingFinishModal,
} from '@/features/counting/components_v2'

// ============================================================================
// Modal de Confirmación Finalizar - Usa componente refactorizado
// ============================================================================
// El componente CountingFinishModal ya está importado desde components_v2
// Se usa CountingFinishModalLegacy para mantener compatibilidad con el estilo actual

// ============================================================================
// Componente principal - REFACTORIZADO
// ============================================================================
export const RedesignCountingPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  
  const [isManualMode, setIsManualMode] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [showFinish, setShowFinish] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [isFinishing, setIsFinishing] = useState(false)
  const [editExpiryItem, setEditExpiryItem] = useState<{barcode: string; name: string; mm?: number; yyyy?: number} | null>(null)

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
    setIsFinishing(true)
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
    } finally {
      setIsFinishing(false)
    }
  }

  const handleReset = async () => {
    await actions.resetSession()
    toast.success('Conteo vaciado')
  }

  const handleEditExpiry = (item: any) => {
    setEditExpiryItem({
      barcode: item.barcode,
      name: item.productName || 'Producto',
      mm: item.mm,
      yyyy: item.yyyy
    })
  }

  const handleSaveExpiry = async (data: { mm: number; yyyy: number }) => {
    if (!editExpiryItem) return
    // Aquí se podría agregar lógica para actualizar la fecha en la BD
    // Por ahora solo cerramos el modal
    toast.success('Fecha actualizada')
    setEditExpiryItem(null)
  }

  if (state?.isLoading) {
    return (
      <div className="h-full flex flex-col bg-base">
        {/* Header skeleton */}
        <div className="pt-6 px-4 sm:px-6 shrink-0 bg-base border-b border-subtle">
          <div className="flex justify-end mb-2">
            <div className="w-10 h-10 bg-surface rounded-lg animate-pulse" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-2">
              <div className="w-48 h-6 bg-surface rounded animate-pulse" />
              <div className="w-32 h-4 bg-elevated rounded animate-pulse" />
            </div>
            <div className="flex gap-3">
              <div className="w-16 h-8 bg-surface rounded animate-pulse" />
              <div className="w-20 h-8 bg-surface rounded animate-pulse" />
            </div>
          </div>
        </div>
        {/* Content skeleton */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-32">
          <ListSkeleton count={8} height={80} />
        </div>
      </div>
    )
  }

  if (!sessionData?.session) {
    return (
      <div className="h-full flex flex-col bg-base">
        <div className="pt-6 px-4 sm:px-6 shrink-0 bg-base border-b border-subtle">
          <div className="flex justify-end mb-2">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="p-2 rounded-lg hover:bg-surface transition-colors"
            >
              <X className="w-5 h-5 text-muted" />
            </button>
          </div>
        </div>
        <EmptyState
          icon={ClipboardList}
          title="No hay sesión activa"
          description="Crea una nueva sesión de conteo para comenzar"
          action={{
            label: "Crear sesión",
            onClick: () => navigate('/'),
            variant: 'primary'
          }}
          illustration="no-data"
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-base overflow-hidden">
      {/* Header - Usa componente refactorizado */}
      <div className="pt-6 px-4 sm:px-6 shrink-0 bg-base border-b border-subtle">
        {/* Botón de cerrar */}
        <div className="flex justify-end mb-2">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="p-2 rounded-lg hover:bg-surface transition-colors"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>
        
        {/* Header refactorizado */}
        <CountingHeader
          sessionName={sessionData.session?.erpOrder}
          location={state.currentLocation}
          formattedDuration={formattedDuration}
          stats={statsData}
          itemsPerMinute={stats.itemsPerMinute}
          onUndo={actions.undoLastScan}
          onOpenOptions={() => setShowOptions(true)}
          multiplier={state.multiplier}
          onMultiplierChange={actions.setMultiplier}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-32">
        {/* Manual Mode Toggle */}
        <div className="flex items-center gap-3 py-3 border-b border-subtle">
          <button 
            onClick={() => setIsManualMode(!isManualMode)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              isManualMode ? 'bg-blue-500 text-white' : 'bg-surface text-secondary'
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
                placeholder="Código de barras..."
                className="flex-1 bg-surface border border-subtle rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 text-primary"
                autoFocus
              />
              <button 
                onClick={handleManualScan}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-400 transition-colors"
              >
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
        
        {/* Items List - Usa componente refactorizado */}
        <CountingGrid
          items={sessionData.history}
          activeBarcode={state.activeBarcode}
          onItemClick={actions.selectItem}
        />
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-base/95 backdrop-blur-xl border-t border-subtle p-4">
        <div className="flex gap-3">
          <button 
            onClick={() => setShowOptions(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-surface rounded-xl font-medium text-primary hover:bg-elevated transition-colors"
          >
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

      {/* Modales - Usan componentes refactorizados */}
      <CountingOptionsModal
        isOpen={showOptions}
        onClose={() => setShowOptions(false)}
        currentLocation={state.currentLocation}
        onLocationChange={actions.setCurrentLocation}
        onReset={handleReset}
      />

      <EditExpiryModal
        isOpen={!!editExpiryItem}
        barcode={editExpiryItem?.barcode || ''}
        productName={editExpiryItem?.name || ''}
        currentMm={editExpiryItem?.mm}
        currentYyyy={editExpiryItem?.yyyy}
        onSave={handleSaveExpiry}
        onCancel={() => setEditExpiryItem(null)}
      />

      <CountingFinishModal
        isOpen={showFinish}
        onClose={() => setShowFinish(false)}
        onConfirm={handleFinish}
        stats={statsData}
        sessionName={sessionData.session?.erpOrder}
        isLoading={isFinishing}
      />

      {/* Modal de Fecha de Vencimiento para Productos Pharma */}
      {state.machineState === 'AWAITING_PHARMA' && state.activeBarcode && (
        <TestModeExpiryModal
          barcode={state.activeBarcode}
          productName={state.activeProduct?.name || 'Producto'}
          onComplete={(data) => {
            actions.handlePharmaComplete(data.mm, data.yyyy)
          }}
          onCancel={() => {
            actions.cancelPharma()
          }}
        />
      )}
    </div>
  )
}
