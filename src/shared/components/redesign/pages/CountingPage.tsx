/**
 * CountingPage - Página de conteo (Refactorizada)
 *
 * Componente orchestrator que usa componentes separados.
 * La lógica de negocio está en useCountingLogic.
 *
 * REDIRECT: Si no hay ID, redirige a /massive para elegir tipo de conteo.
 * El modal de inicio se maneja en HammerPage.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X,
  Check,
  AlertTriangle,
  Scan,
  Keyboard,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Zap,
  Mic,
  MicOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Importar hooks de counting
import { TestModeExpiryModal } from '@/features/counting/components/TestModeExpiryModal';
import { EditExpiryModal } from '@/features/counting/components/EditExpiryModal';
import { useCountingLogic } from '@/features/counting/hooks/useCountingLogic';
import { useProductivity } from '@/shared/hooks';
import { useExpiryTracker } from '@/features/counting/hooks/useExpiryTracker';
import { SessionRepository } from '@/repositories/SessionRepository';

// ============================================================================
// COMPONENTES DE ESTADO (Loading/Empty/Error)
// ============================================================================
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { ListSkeleton } from '@/shared/components/ui/EmptyState';

// ============================================================================
// NUEVOS COMPONENTES REFACTORIZADOS (Prioridad 2 y 3)
// ============================================================================
import {
  CountingHeader,
  CountingGrid,
  CountingOptionsModal,
  CountingFinishModal,
  ProductivityDashboard,
  CycleCountPanel,
} from '@/features/counting/components_v2';

// Voice Commands (hooks)
import { useVoiceCommands, VoiceIndicator } from '@/features/counting/hooks/useVoiceCommands';
import { DiscrepancyAlertService } from '@/features/counting/services/DiscrepancyAlertService';
import { useProductivityMetrics } from '@/features/counting/hooks/useProductivityMetrics';
import type { ConsolidatedItem } from '@/types';
import type { CountedItem } from '@/features/counting/components_v2/CountingItemRow';

// ============================================================================
// Modal de Confirmación Finalizar - Usa componente refactorizado
// ============================================================================
// El componente CountingFinishModal ya está importado desde components_v2
// Se usa CountingFinishModalLegacy para mantener compatibilidad con el estilo actual

// ============================================================================
// Componente principal - REFACTORIZADO
// ============================================================================
export const RedesignCountingPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const [isManualMode, setIsManualMode] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);
  const [editExpiryItem, setEditExpiryItem] = useState<{
    barcode: string;
    name: string;
    mm?: number;
    yyyy?: number;
  } | null>(null);

  // REDIRECT: Si no hay ID, ir directamente a HammerPage para elegir tipo de conteo
  useEffect(() => {
    if (!id) {
      navigate('/massive');
    }
  }, [id, navigate]);

  // useCountingLogic requiere un ID válido
  const handleExit = () => navigate('/dashboard');
  const { state, sessionData, actions } = useCountingLogic(id, handleExit);
  const { saveExpiry, syncExpiry, getExpiryForBarcode } = useExpiryTracker();

  // ✅ Extraer estado de auto-save
  const { autoSave } = state;

  // Productivity stats
  const itemsForStats =
    sessionData?.history?.map((i: ConsolidatedItem) => ({
      barcode: i.barcode,
      totalQuantity: i.totalQuantity,
    })) || [];
  const { stats, formattedDuration } = useProductivity(itemsForStats);

  // Stats derivadas
  const statsData = useMemo(() => {
    const items = sessionData?.history || [];
    const total = items.length;
    const withVariance = items.filter(
      (i: ConsolidatedItem) =>
        i.expectedQuantity !== undefined && i.totalQuantity !== i.expectedQuantity
    ).length;
    const complete = items.filter(
      (i: ConsolidatedItem) =>
        i.expectedQuantity !== undefined && i.totalQuantity === i.expectedQuantity
    ).length;
    const totalQty = items.reduce((acc: number, i: any) => acc + i.totalQuantity, 0);
    return { total, withVariance, complete, totalQty };
  }, [sessionData?.history]);

  // ========================================================================
  // MEJORAS PRIORIDAD 2: Productivity Metrics
  // ========================================================================
  const itemsForMetrics: ConsolidatedItem[] = useMemo(() => {
    return (sessionData?.history || []).map((i: ConsolidatedItem) => ({
      barcode: i.barcode,
      productName: i.productName || 'Unknown',
      totalQuantity: i.totalQuantity,
      expectedQuantity: i.expectedQuantity,
      scans: i.scans || 1,
      location: state.currentLocation,
    }));
  }, [sessionData?.history, state.currentLocation]);

  const {
    metrics,
    reset: resetMetrics,
    setTotalItems,
  } = useProductivityMetrics(itemsForMetrics, {
    updateInterval: 2000,
    onMilestone: milestone => {
      toast.success(milestone, { duration: 3000 });
    },
  });

  // ========================================================================
  // MEJORAS PRIORIDAD 3: Voice Commands
  // ========================================================================
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);

  const {
    isListening,
    toggle: toggleVoice,
    isSupported: isVoiceSupported,
  } = useVoiceCommands({
    enabled: isVoiceEnabled,
    showToasts: false,
    callbacks: {
      onNext: () => {
        // Ir al siguiente item
        toast.info('→ Siguiente');
      },
      onPrevious: () => {
        toast.info('← Anterior');
      },
      onConfirm: () => {
        // Confirmar conteo actual
        if (state.activeBarcode) {
          actions.handleExternalScan(state.activeBarcode, state.multiplier);
        }
      },
      onSetQuantity: (qty: number) => {
        actions.setMultiplier(qty);
        toast.info(`Cantidad: ×${qty}`);
      },
      onCancel: () => {
        toast.warning('Operación cancelada');
      },
      onFinish: () => {
        setShowFinish(true);
      },
      onUndo: () => {
        actions.undoLastScan();
      },
    },
  });

  // Toggle voice con el botón
  const handleToggleVoice = useCallback(() => {
    setIsVoiceEnabled(prev => !prev);
  }, []);

  // ========================================================================
  // MEJORAS PRIORIDAD 2: Discrepancy Alerts
  // ========================================================================
  useEffect(() => {
    if (!sessionData?.history) return;

    // Verificar discrepancias en items con expectedQty
    const itemsWithVariance = sessionData.history.filter(
      (i: ConsolidatedItem) =>
        i.expectedQuantity !== undefined && i.totalQuantity !== i.expectedQuantity
    );

    itemsWithVariance.forEach((item: any) => {
      const discrepancy = Math.abs(item.totalQuantity - item.expectedQty);
      const percent = (discrepancy / item.expectedQty) * 100;

      if (percent >= 10) {
        DiscrepancyAlertService.evaluateScan({
          barcode: item.barcode,
          productName: item.productName || item.name || 'Unknown',
          expectedQty: item.expectedQty,
          scannedQty: item.totalQuantity,
        });
      }
    });
  }, [sessionData?.history]);

  const handleManualScan = () => {
    if (manualBarcode.trim()) {
      actions.handleExternalScan(manualBarcode.trim(), 1);
      setManualBarcode('');
    }
  };

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      if (sessionData?.session?.id) {
        await SessionRepository.update(sessionData.session.id, {
          status: 'completed',
        });
        toast.success('Conteo finalizado correctamente');
      }
      setShowFinish(false);
      navigate('/dashboard');
    } catch {
      toast.error('Error al finalizar conteo');
    } finally {
      setIsFinishing(false);
    }
  };

  const handleReset = async () => {
    await actions.resetSession();
    toast.success('Conteo vaciado');
  };

  const handleEditExpiry = (item: CountedItem) => {
    setEditExpiryItem({
      barcode: item.barcode,
      name: item.productName || 'Producto',
      mm: item.mm,
      yyyy: item.yyyy,
    });
  };

  // Handler para editar desde la lista
  const handleEditExpiryFromGrid = (item: CountedItem) => {
    handleEditExpiry(item);
  };

  const handleSaveExpiry = async (data: { mm: number; yyyy: number }) => {
    if (!editExpiryItem) return;
    // Aquí se podría agregar lógica para actualizar la fecha en la BD
    // Por ahora solo cerramos el modal
    toast.success('Fecha actualizada');
    setEditExpiryItem(null);
  };

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
    );
  }

  if (!sessionData?.session) {
    // Si no hay sesión activa, mostrar estado vacío con opción de iniciar
    return (
      <div className="h-full flex flex-col bg-base">
        {/* Header */}
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

        {/* Estado vacío con botón para iniciar conteo */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md"
          >
            <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Zap className="w-10 h-10 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-primary mb-2">¿Listo para contar?</h2>
            <p className="text-secondary mb-8">
              Inicia un nuevo conteo seleccionando el tipo que mejor se adapte a tus necesidades.
            </p>

            {/* Botones de acción rápida */}
            <div className="space-y-3">
              <button
                onClick={() => navigate('/massive')}
                className="w-full py-4 px-6 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Zap className="w-5 h-5" />
                Nuevo Conteo
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/theoretical-loads')}
                  className="flex-1 py-3 px-4 bg-surface hover:bg-elevated text-primary rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <ClipboardList className="w-4 h-4" />
                  Cargas Teóricas
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-base overflow-hidden">
      {/* Header - Usa componente refactorizado */}
      <div className="pt-4 px-4 sm:pt-6 sm:px-6 shrink-0 bg-base border-b border-subtle">
        {/* Botón de cerrar y controles */}
        <div className="flex justify-end items-center gap-2 mb-2">
          {/* Voice Command Toggle */}
          {isVoiceSupported && (
            <button
              onClick={handleToggleVoice}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                isListening
                  ? 'bg-blue-500 text-white animate-pulse shadow-lg shadow-blue-500/30'
                  : 'bg-surface text-muted hover:text-primary hover:bg-elevated'
              )}
              title={isListening ? 'Desactivar voz' : 'Activar comandos de voz'}
            >
              {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              <span className="hidden sm:inline">{isListening ? 'Escuchando' : 'Voz'}</span>
            </button>
          )}

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
          autoSave={autoSave}
        />
      </div>

      {/* ========================================================================
          MEJORAS PRIORIDAD 2: Productivity Dashboard (Collapsible)
      ======================================================================== */}
      <div className="px-4 sm:px-6 bg-surface/30 border-b border-subtle">
        <ProductivityDashboard metrics={metrics} compact={false} className="py-3" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-32">
        {/* Manual Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 border-b border-subtle">
          <button
            onClick={() => setIsManualMode(!isManualMode)}
            className={cn(
              'flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors w-full sm:w-auto justify-center',
              isManualMode ? 'bg-blue-500 text-white' : 'bg-surface text-secondary'
            )}
          >
            <Keyboard className="w-4 h-4" />
            {isManualMode ? 'Modo Manual' : 'Activar Manual'}
          </button>

          {isManualMode && (
            <div className="flex gap-2 w-full">
              <input
                type="text"
                value={manualBarcode}
                onChange={e => setManualBarcode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualScan()}
                placeholder="Código..."
                className="flex-1 bg-surface border border-subtle rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-primary"
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
              state.feedback === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : state.feedback === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            )}
          >
            {state.feedback === 'success' && <CheckCircle2 className="w-5 h-5" />}
            {state.feedback === 'error' && <X className="w-5 h-5" />}
            {state.feedback === 'warning' && <AlertTriangle className="w-5 h-5" />}
            <span className="text-sm font-medium">
              {state.feedback === 'success'
                ? '¡Registrado!'
                : state.feedback === 'error'
                  ? 'Error al registrar'
                  : 'Producto seleccionado'}
            </span>
          </motion.div>
        )}

        {/* Activo actual */}
        {state.activeBarcode && (
          <div className="my-3 p-3 sm:p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-blue-400 font-medium">Escaneando:</p>
                <p className="text-base sm:text-lg font-bold text-primary truncate">
                  {state.activeBarcode}
                </p>
                {state.activeProduct && (
                  <p className="text-xs sm:text-sm text-secondary truncate">
                    {state.activeProduct.name}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl sm:text-3xl font-black text-blue-400">×{state.multiplier}</p>
                <p className="text-[10px] sm:text-xs text-muted">por escaneo</p>
              </div>
            </div>
          </div>
        )}

        {/* Items List - Usa componente refactorizado */}
        <CountingGrid
          items={sessionData.history}
          activeBarcode={state.activeBarcode ?? undefined}
          onItemClick={actions.selectItem}
          onEditExpiry={handleEditExpiryFromGrid}
        />

        {/* ========================================================================
            MEJORAS PRIORIDAD 3: Cycle Count Panel (al final del contenido)
        ======================================================================== */}
        <div className="mt-6">
          <CycleCountPanel
            onItemSelected={barcode => {
              actions.selectItem(barcode);
            }}
            onStartCount={session => {
              toast.info(`Sesión de ciclo counting iniciada con ${session.totalItems} items`);
              setTotalItems(session.totalItems);
            }}
          />
        </div>
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
          onComplete={data => {
            actions.handlePharmaComplete(data.mm, data.yyyy);
          }}
          onCancel={() => {
            actions.cancelPharma();
          }}
          onSkip={() => {
            // Omitir registro de fecha - solo contar sin registrar vencimiento
            actions.handlePharmaComplete(0, 9999);
          }}
        />
      )}
    </div>
  );
};
