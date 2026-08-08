import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Hammer,
  Package,
  Trash2,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  TrendingUp,
  Settings,
  Download,
  Scan,
  Keyboard,
  Cloud,
  CloudOff,
  Volume2,
  VolumeX,
  Play,
  FileSpreadsheet,
  BarChart3,
  MapPin,
  Zap,
  RotateCcw,
  Printer,
  HardDrive,
  Loader2,
  Eye,
  ShoppingCart,
  Calendar,
  ChevronRight,
  Package2,
  ListChecks,
  Wifi,
  WifiOff,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { logger } from '@/services/logger';

import { useHammerLogic, HammerItem } from '@/features/hammer/hooks/useHammerLogic';
import { useLocationManager } from '@/shared/hooks/useLocationManager';
import { useHIDScanner } from '@/hooks/useHIDScanner';
import { useAppStore } from '@/stores';
import {
  migrateMassiveToMaster,
  importManifestFromCloud,
  importExpectedOrderFromCloud,
  importLocalExpectedOrderToHammer,
  migrateHammerManifestToExpectedOrders,
} from '@/services/hammerSync';
import { exportHammerToExcel } from '@/services/export';
import { thermalPrinter } from '@/core/hardware/ThermalPrinterEngine';
import { HammerDbRepository } from '@/repositories/HammerDbRepository';
import { ExpectedOrderRepository } from '@/repositories/ExpectedOrderRepository';
import type { ExpectedOrder } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { LocationSelectorModal } from '@/shared/components/ui/LocationSelectorModal';
import { formatTimeAgo } from '@/lib/date';
import { TestModeExpiryModal } from '@/features/counting/components/TestModeExpiryModal';

// Importar modal de inicio unificado
import {
  StartCountingModal,
  type StartCountingConfig,
} from '@/features/counting/components/StartCountingModal';
import { useCountingEngine } from '@/features/counting/hooks/useCountingEngine';

// Importar componentes compartidos
import { HorizontalStatCard } from '@/shared/components/ui/HorizontalStatCard';
import { SearchInput } from '@/shared/components/ui/SearchInput';

// Importar componentes de Hammer extraídos
import { ToolItem, ItemRow, ToolsSheet, ImportModal } from '@/features/hammer/components';
import { HammerHeader } from './HammerPage/HammerHeader';

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
  const navigate = useNavigate();
  const params = useParams();

  // Hook del motor de conteo
  const { startCounting, isStarting } = useCountingEngine();

  // Modal de inicio unificado

  // Ref para evitar que el modal se reabra durante navegación
  const isNavigatingRef = useRef(false);

  const [showStartModal, setShowStartModal] = useState(false);

  // Estado para saber si debemos omitir el modal (viene de StartCountingModal)
  const [skipModal, setSkipModal] = useState(false);

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

  const { settings, updateSetting } = useAppStore();

  const { state, actions } = useHammerLogic(effectiveBatchId);
  const locManager = useLocationManager(`hammer_loc_${effectiveBatchId}`);

  const [isManualMode, setIsManualMode] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // Modal de sesión existente - también guarda los conteos para mostrar al usuario
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionCounts, setSessionCounts] = useState({
    scans: 0,
    manifests: 0,
    totalScannedUnits: 0,
    totalExpectedUnits: 0,
    lastScanTimestamp: null as number | null,
  });

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

      const hasOldManifests =
        sessionInfo.manifests > 0 &&
        (sessionAge > ONE_DAY_MS || (sessionInfo.scans === 0 && sessionInfo.manifests > 0));

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
          lastScanTimestamp: null,
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
          lastScanTimestamp: sessionInfo.lastScanTimestamp,
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
          lastScanTimestamp: sessionInfo.lastScanTimestamp,
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
        lastScanTimestamp: sessionInfo.lastScanTimestamp,
      });
      setShowSessionModal(true);
    };
    checkExistingSession();
  }, [effectiveBatchId]); // Solo al montar

  // Alias para mantener compatibilidad con el resto del código
  const batchId = effectiveBatchId;

  // HID Scanner
  useHIDScanner({
    onScan: barcode => {
      actions.registerScan(barcode);
    },
    isEnabled: !isMigrating && !isToolsOpen && !isImportModalOpen && !showSessionModal,
    maxLatency: 40,
  });

  // Sync location
  useEffect(() => {
    if (locManager.location) {
      actions.setCurrentLocation(locManager.location);
    }
  }, [locManager.location]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key.toLowerCase() === 'm' && e.altKey) {
        e.preventDefault();
        setIsManualMode(prev => !prev);
      } else if (e.key.toLowerCase() === 's' && e.altKey) {
        e.preventDefault();
        actions.syncToCloud();
      }
    };

    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [actions]);

  // Continuar con la sesión existente
  const handleContinueSession = () => {
    setShowSessionModal(false);
  };

  // Empezar nueva sesión (limpiar datos)
  const handleNewSession = async () => {
    try {
      // 1. Eliminar todos los escaneos
      await HammerDbRepository.deleteBlindScansByBatch(batchId);

      // 2. ELIMINAR también la carga teórica (manifests)
      // Esto es lo que faltaba - los manifests nunca se eliminaban
      await HammerDbRepository.deleteBlindManifestsByBatch(batchId);

      // 3. Recargar la página para reiniciar todo desde cero
      window.location.reload();
    } catch (error) {
      logger.error(
        'HammerPage',
        'Error al limpiar sesión',
        error instanceof Error ? error.message : String(error)
      );
      toast.error('Error al limpiar sesión');
    }
  };

  // Limpiar solo la carga teórica (manifests) pero mantener los escaneos
  const handleClearTheoreticalOnly = async () => {
    try {
      await HammerDbRepository.deleteBlindManifestsByBatch(batchId);
      setShowSessionModal(false);
      toast.success('Carga teórica eliminada. Los escaneos se mantienen.');
    } catch (error) {
      logger.error(
        'HammerPage',
        'Error al limpiar carga teórica',
        error instanceof Error ? error.message : String(error)
      );
      toast.error('Error al limpiar carga teórica');
    }
  };

  // Empezar nueva sesión con ID único (para no reutilizar datos)
  const handleNewSessionWithNewId = () => {
    // Generar un nuevo batchId único
    const newBatchId = generateSimpleId();

    // Guardar en localStorage para que el router lo use
    localStorage.setItem('hammer_last_batch', newBatchId);

    // Navegar a la nueva sesión
    navigate(`/massive/${newBatchId}`);
  };

  const handleManualScan = () => {
    if (manualBarcode.trim()) {
      actions.registerScan(manualBarcode.trim());
      setManualBarcode('');
      toast.success('Escaneado');
    }
  };

  const handleFinalize = async () => {
    if (!state.items.length || isMigrating) return;
    if (!confirm('Cerrar auditoria y consolidar registros?')) return;

    setIsMigrating(true);
    try {
      await migrateMassiveToMaster(batchId);
      toast.success('Auditoria finalizada');
      navigate('/reports?type=hammer');
    } catch (err) {
      toast.error('Error al finalizar');
      setIsMigrating(false);
    }
  };

  const handleStartTestCounting = async () => {
    if (state.items.length === 0) {
      toast.error('Primero importa una carga teorica');
      return;
    }
    try {
      const sessionId = await migrateHammerManifestToExpectedOrders(batchId);
      toast.success('Conteo de prueba iniciado');
      navigate(`/counting/${sessionId}`);
    } catch (err) {
      toast.error('Error al iniciar conteo');
    }
  };

  const handleExport = () => {
    exportHammerToExcel(batchId, state.items);
    toast.success('Exportando...');
  };

  const handleImportLocal = async (orderId: string) => {
    try {
      await importLocalExpectedOrderToHammer(batchId, orderId);
      toast.success('Carga teorica importada');
    } catch (err: any) {
      toast.error(err.message || 'Error al importar');
    }
  };

  const handlePrintTicket = () => {
    if (state.items.length === 0) {
      toast.error('No hay items para imprimir');
      return;
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
        location: item.loc || '',
      })),
      totalExpectedUnits: state.items.reduce((sum, i) => sum + i.totalQuantity, 0),
      totalExpectedSKUs: state.items.length,
      importedAt: Date.now(),
      metadata: {
        documentType: 'CONTEO HAMMER',
        internalGuide: `Lote ${batchId}`,
        purchaseOrder: locManager.location || 'ZONA-A',
        date: new Date().toLocaleDateString(),
      },
    };

    thermalPrinter.printHammerTicket(hammerOrder);
    toast.success('Imprimiendo ticket...');
  };

  // Stats
  const stats = useMemo(() => {
    const items = state.items || [];
    const total = items.length;
    const withExpected = items.filter(i => i.expectedQty !== undefined);
    const complete = withExpected.filter(i => i.totalQuantity === i.expectedQty).length;
    const withVariance = withExpected.filter(i => i.totalQuantity !== i.expectedQty).length;
    const totalQty = items.reduce((acc, i) => acc + i.totalQuantity, 0);
    return { total, complete, withVariance, totalQty, hasExpected: withExpected.length > 0 };
  }, [state.items]);

  if (!state.items) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-base">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-muted mt-4">Cargando modo hammer...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-base overflow-hidden">
      {/* Header */}
      <HammerHeader
        batchId={batchId}
        onBack={() => navigate('/dashboard')}
        location={locManager.location}
        onOpenLocation={() => locManager.openModal?.()}
        autoSyncEnabled={state.autoSyncEnabled}
        isSyncing={state.isSyncing}
        pendingWrites={state.pendingWrites}
        syncError={state.syncError}
        onSync={() => actions.syncToCloud()}
        stats={stats}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-28">
        {/* Manual Mode */}
        <div className="flex items-center gap-3 py-3 border-b border-subtle">
          <button
            onClick={() => setIsManualMode(!isManualMode)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              isManualMode
                ? 'bg-blue-500 text-white'
                : 'bg-surface text-secondary hover:text-primary'
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
                onChange={e => setManualBarcode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualScan()}
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 rounded-full bg-elevated flex items-center justify-center mx-auto mb-4">
                <Hammer className="w-10 h-10 text-muted" />
              </div>
              <p className="text-lg font-medium text-primary mb-2">Sin escaneos</p>
              <p className="text-sm text-muted max-w-xs mx-auto">
                Escanea codigos de barras con tu dispositivo o activa el modo manual para ingresar
                codigos.
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
              {state.items.map(item => (
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
          onSelect={loc => {
            locManager.setLocation?.(loc);
            locManager.closeModal?.();
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
                      <span className="text-xs text-muted ml-2">
                        ({sessionCounts.totalScannedUnits} unidades)
                      </span>
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
                      <span className="font-bold text-amber-500">
                        {sessionCounts.manifests} SKUs
                      </span>
                      <span className="text-xs text-muted ml-2">
                        ({sessionCounts.totalExpectedUnits} unidades)
                      </span>
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
          onComplete={data => {
            actions.handleExpiryComplete(data.mm, data.yyyy);
          }}
          onCancel={() => {
            actions.handleExpiryCancel();
          }}
          onSkip={() => {
            // Omitir - continuar sin registrar vencimiento
            actions.handleExpiryComplete(0, 9999);
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
  );
};
