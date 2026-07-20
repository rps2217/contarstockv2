import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { logger } from '@/services/logger';

import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Cloud,
  HardDrive,
  Upload,
  Trash2,
  RefreshCw,
  Search,
  Package,
  Download,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Database,
  Layers,
  Play,
  Send,
  Calendar,
  Clock,
  ArrowRight,
  Printer,
  Eye,
  ShoppingCart,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  MapPin,
  Zap,
  Scan,
  ClipboardCheck,
  ChevronRight,
  Package2,
  Wifi,
  WifiOff,
  ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/shared/utils/common';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ExpectedOrderRepository } from '@/repositories/ExpectedOrderRepository';
import type { ExpectedOrder, ExpectedItem } from '@/types';
import { erpService, type ErpManifest } from '@/services/erpService';
import { SoundFX } from '@/services/audio';
import { thermalPrinter } from '@/core/hardware/ThermalPrinterEngine';
import { formatDetailDateTime } from '@/lib/date';
import { NewOrderForm } from '../components/NewOrderForm';
import { OrderDetailModal } from './TheoreticalLoadsPage/OrderDetailModal';
import { LocalOrderCard, CloudManifestCard } from './TheoreticalLoadsPage/theoreticalLoadsCards';

// ============================================================================
// HELPERS (formatNumber imported from @/shared/utils/common)

// ============================================================================
// COMPONENTES DE UI
// ============================================================================
const SummaryCard = ({
  label,
  value,
  icon: Icon,
  colorClass,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  colorClass: string;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-surface border border-subtle rounded-2xl p-4 flex items-center gap-3"
  >
    <div
      className={cn(
        'w-12 h-12 rounded-xl flex items-center justify-center',
        colorClass.replace('text-', 'bg-') + '/10'
      )}
    >
      <Icon className={cn('w-6 h-6', colorClass)} />
    </div>
    <div>
      <p className={cn('text-2xl font-bold', colorClass)}>{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
    </div>
  </motion.div>
);

const TabButton = ({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  count: number;
  color: string;
}) => {
  const colorMap: Record<string, string> = {
    emerald: 'emerald-500',
    indigo: 'indigo-500',
    amber: 'amber-500',
  };
  const c = colorMap[color] || 'blue-500';

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
        active
          ? `bg-${c}/10 text-${c} border border-${c}/30`
          : 'bg-surface text-secondary hover:text-primary border border-subtle'
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
      <span
        className={cn(
          'px-2 py-0.5 rounded-full text-xs font-bold',
          active ? `bg-${c}/20 text-${c.replace('-500', '-400')}` : 'bg-elevated text-muted'
        )}
      >
        {count}
      </span>
    </button>
  );
};

// ============================================================================
// MODAL DE CONFIRMACIÓN
// ============================================================================
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  loading = false,
  variant = 'default',
  icon: CustomIcon,
  extraInfo,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  loading?: boolean;
  variant?: 'default' | 'danger' | 'warning' | 'success';
  icon?: React.ElementType;
  extraInfo?: React.ReactNode;
}) => {
  if (!isOpen) return null;

  const variantConfig = {
    default: {
      bg: 'bg-blue-500/10',
      icon: 'text-blue-500',
      btn: 'bg-blue-600 hover:bg-blue-500',
      Icon: CustomIcon || Download,
    },
    danger: {
      bg: 'bg-rose-500/10',
      icon: 'text-rose-500',
      btn: 'bg-rose-600 hover:bg-rose-500',
      Icon: CustomIcon || AlertTriangle,
    },
    warning: {
      bg: 'bg-amber-500/10',
      icon: 'text-amber-500',
      btn: 'bg-amber-600 hover:bg-amber-500',
      Icon: CustomIcon || Database,
    },
    success: {
      bg: 'bg-emerald-500/10',
      icon: 'text-emerald-500',
      btn: 'bg-emerald-600 hover:bg-emerald-500',
      Icon: CustomIcon || CheckCircle2,
    },
  };

  const config = variantConfig[variant];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-base border border-subtle rounded-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4',
              config.bg
            )}
          >
            <config.Icon className={cn('w-8 h-8', config.icon)} />
          </motion.div>
          <h3 className="text-xl font-bold text-primary">{title}</h3>
          <p className="text-sm text-secondary mt-2 leading-relaxed">{description}</p>

          {extraInfo && <div className="mt-4 p-3 bg-surface rounded-xl">{extraInfo}</div>}
        </div>

        <div className="flex gap-3 p-4 pt-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-surface hover:bg-elevated text-primary rounded-xl font-medium transition-colors"
          >
            Cancelar
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex-1 py-3 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50',
              config.btn
            )}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : confirmText}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
type TabType = 'local' | 'cloud' | 'stock' | 'new';

// Generar batchId único para las operaciones
const generateBatchId = () => {
  return `TL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
};

export const RedesignTheoreticalLoadsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('local');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cloudManifests, setCloudManifests] = useState<ErpManifest[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [detailModal, setDetailModal] = useState<{
    open: boolean;
    order: ExpectedOrder | null;
  }>({
    open: false,
    order: null,
  });
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
    confirmText: string;
    variant: 'default' | 'danger' | 'warning' | 'success';
    icon?: React.ElementType;
    extraInfo?: React.ReactNode;
  }>({
    open: false,
    title: '',
    description: '',
    action: async () => {},
    confirmText: 'Confirmar',
    variant: 'default',
  });

  // BatchId para operaciones
  const [batchId] = useState(() => generateBatchId());

  // Obtener órdenes locales
  const localOrders = useLiveQuery(() => ExpectedOrderRepository.getAll(), []) || [];

  // Stats
  const stats = useMemo(() => {
    const totalLocal = localOrders.length;
    const totalCloud = cloudManifests.length;
    const totalSKUs = localOrders.reduce((acc, o) => acc + (o.items?.length || 0), 0);
    return { totalLocal, totalCloud, totalSKUs };
  }, [localOrders, cloudManifests]);

  // Filtrado
  const filteredLocalOrders = useMemo(() => {
    if (!searchQuery) return localOrders;
    const q = searchQuery.toLowerCase();
    return localOrders.filter(
      o =>
        o.id.toLowerCase().includes(q) ||
        o.metadata?.internalGuide?.toLowerCase().includes(q) ||
        o.metadata?.purchaseOrder?.toLowerCase().includes(q)
    );
  }, [localOrders, searchQuery]);

  // =========================================================================
  // FUNCIONES DE IMPORTACIÓN
  // =========================================================================

  // Importar orden local al modo ráfaga (Hammer)
  const importLocalToHammer = useCallback(
    async (orderId: string) => {
      setLoadingLocal(true);
      try {
        const { importLocalExpectedOrderToHammer } = await import('@/services/hammerSync');
        const count = await importLocalExpectedOrderToHammer(batchId, orderId);
        SoundFX.play('success');
        toast.success(`${count} SKUs enviados al modo ráfaga`);
        navigate(`/massive/${batchId}`);
      } catch (err: unknown) {
        SoundFX.play('error');
        setError((err as Error).message || 'Error al importar');
        toast.error((err as Error).message || 'Error al importar');
      } finally {
        setLoadingLocal(false);
      }
    },
    [batchId, navigate]
  );

  // Importar orden desde la nube (usando erpService)
  const importFromCloud = useCallback(
    async (manifestId: string) => {
      setImportingId(manifestId);
      setLoadingCloud(true);
      try {
        const { importExpectedOrderFromCloud } = await import('@/services/hammerSync');
        const count = await importExpectedOrderFromCloud(batchId, manifestId);
        SoundFX.play('success');
        toast.success(`${count} SKUs descargados desde la nube`);
        navigate(`/massive/${batchId}`);
      } catch (err: unknown) {
        SoundFX.play('error');
        setError((err as Error).message || `Error al importar orden ${manifestId}`);
        toast.error((err as Error).message || 'Error al importar');
      } finally {
        setImportingId(null);
        setLoadingCloud(false);
      }
    },
    [batchId, navigate]
  );

  // Importar stock general
  const importGeneralStock = useCallback(async () => {
    setLoadingLocal(true);
    try {
      const { importManifestFromCloud } = await import('@/services/hammerSync');
      const count = await importManifestFromCloud(batchId);
      SoundFX.play('success');
      toast.success(`${count} SKUs del stock general importados`);
      navigate(`/massive/${batchId}`);
    } catch (err: unknown) {
      SoundFX.play('error');
      setError((err as Error).message || 'Error al importar stock general');
      toast.error((err as Error).message || 'Error al importar stock');
    } finally {
      setLoadingLocal(false);
    }
  }, [batchId, navigate]);

  // Iniciar conteo desde orden local
  const startCountFromLocal = useCallback(
    async (order: ExpectedOrder) => {
      setImportingId(order.id);
      setLoadingLocal(true);
      try {
        const { loadHammerManifestAsTestSession } = await import('@/services/hammerSync');
        const result = await loadHammerManifestAsTestSession(batchId, order.id);
        const sessionId = result.sessionId;
        SoundFX.play('success');
        toast.success('Conteo iniciado');
        navigate(`/counting/${sessionId}`);
      } catch (err: unknown) {
        SoundFX.play('error');
        toast.error((err as Error).message || 'Error al iniciar conteo');
      } finally {
        setImportingId(null);
        setLoadingLocal(false);
      }
    },
    [batchId, navigate]
  );

  // Eliminar orden local
  const deleteLocalOrder = useCallback(async (orderId: string) => {
    try {
      await ExpectedOrderRepository.delete(orderId);
      SoundFX.play('success');
      toast.success('Carga eliminada');
    } catch (err) {
      toast.error('Error al eliminar');
    }
  }, []);

  // Cargar manifiestos desde la nube (usando erpService.downloadAllPendingManifests)
  const fetchCloudManifests = useCallback(async () => {
    setLoadingCloud(true);
    setError(null);
    try {
      logger.info('TheoreticalLoadsPage', 'Obteniendo cargas desde la nube');
      const manifests = await erpService.downloadAllPendingManifests();
      logger.info('TheoreticalLoadsPage', 'Manifiestos recibidos', { count: manifests?.length });
      setCloudManifests(manifests || []);
      if (manifests && manifests.length > 0) {
        toast.success(`Se encontraron ${manifests.length} cargas en la nube`);
      } else {
        toast.info('No hay cargas teoricas disponibles en la nube');
      }
    } catch (err: unknown) {
      logger.error(
        'TheoreticalLoadsPage',
        'Error loading from cloud',
        err instanceof Error ? (err as Error).message : String(err)
      );
      setError('No se pudieron obtener las cargas de la nube');
      toast.error((err as Error).message || 'Error al cargar desde la nube');
      setCloudManifests([]);
    } finally {
      setLoadingCloud(false);
    }
  }, []);

  // Efecto para cargar datos iniciales de la nube
  useEffect(() => {
    if (activeTab === 'cloud') {
      fetchCloudManifests();
    }
  }, [activeTab, fetchCloudManifests]);

  // =========================================================================
  // HANDLERS
  // =========================================================================

  const handleImportLocal = (orderId: string) => {
    setConfirmModal({
      open: true,
      title: 'Enviar a Modo Ráfaga',
      description:
        'Esta carga teórica se enviará al módulo de modo ráfaga para comenzar el conteo.',
      confirmText: 'Enviar',
      variant: 'default',
      action: () => importLocalToHammer(orderId),
    });
  };

  const handleStartCount = (order: ExpectedOrder) => {
    setConfirmModal({
      open: true,
      title: 'Iniciar Conteo de Prueba',
      description: `Se creará una sesión de conteo con ${order.items?.length || 0} SKUs de esta carga teórica.`,
      confirmText: 'Iniciar',
      variant: 'default',
      action: () => startCountFromLocal(order),
    });
  };

  const handleDeleteLocal = (orderId: string) => {
    setConfirmModal({
      open: true,
      title: 'Eliminar Carga Teórica',
      description:
        '¿Estás seguro de eliminar esta carga teórica? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      variant: 'danger',
      action: () => deleteLocalOrder(orderId),
    });
  };

  // Imprimir ticket de carga teórica
  const handlePrintOrder = (order: ExpectedOrder) => {
    SoundFX.play('increment');
    thermalPrinter.printExpectedOrder(order);
    toast.success('Ticket enviado a imprimir');
  };

  // Ver detalle de orden
  const handleViewDetail = (order: ExpectedOrder) => {
    setDetailModal({ open: true, order });
  };

  // Eliminar desde modal de detalle
  const handleDeleteFromDetail = () => {
    if (detailModal.order) {
      setConfirmModal({
        open: true,
        title: 'Eliminar Carga Teórica',
        description: `¿Eliminar "${detailModal.order.id}"? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        variant: 'danger',
        action: async () => {
          await deleteLocalOrder(detailModal.order!.id);
          setDetailModal({ open: false, order: null });
        },
      });
    }
  };

  // Iniciar conteo desde modal de detalle
  const handleStartCountFromDetail = () => {
    if (!detailModal.order) return;

    const order = detailModal.order;
    setConfirmModal({
      open: true,
      title: 'Iniciar Conteo de Prueba',
      description: `Se creará una sesión de conteo con ${order.items?.length || 0} SKUs de esta carga teórica.`,
      confirmText: 'Iniciar',
      variant: 'success',
      icon: Play,
      extraInfo: (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">SKUs a contar</span>
            <span className="text-primary font-bold">{order.items?.length || 0}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Unidades totales</span>
            <span className="text-primary font-bold">
              {order.items?.reduce((acc, i) => acc + (i.expectedQty || i.quantity || 0), 0) || 0}
            </span>
          </div>
        </div>
      ),
      action: () => startCountFromLocal(order),
    });
  };

  const handleImportCloud = (manifestId: string) => {
    setConfirmModal({
      open: true,
      title: 'Descargar desde la Nube',
      description: 'Esta carga se descargará y estará disponible en modo ráfaga.',
      confirmText: 'Descargar',
      variant: 'default',
      action: () => importFromCloud(manifestId),
    });
  };

  const handleImportStock = () => {
    setConfirmModal({
      open: true,
      title: 'Importar Stock General',
      description:
        'Se importará la planilla STOCK completa con todos los productos y cantidades teóricas.',
      confirmText: 'Importar',
      variant: 'warning',
      action: importGeneralStock,
    });
  };

  const handleRefreshCloud = () => {
    fetchCloudManifests();
  };

  const handleRefreshLocal = () => {
    // useLiveQuery se encarga de actualizar
    toast.success('Lista local actualizada');
  };

  // Descargar órdenes desde la nube (Tabla PEDIDOS)
  const downloadFromCloud = useCallback(async () => {
    if (!navigator.onLine) {
      toast.warning('Sin conexión a internet.');
      return;
    }
    setIsSyncing(true);
    try {
      const result = await ExpectedOrderRepository.downloadFromCloud();
      if (result.success) {
        toast.success(`Se descargaron ${result.orders.length} cargas desde la nube`);
      } else {
        toast.error(result.error || 'Error al descargar');
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Error de conexión');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Subir todas las órdenes locales a la nube
  const syncAllToCloud = useCallback(async () => {
    if (!navigator.onLine) {
      toast.warning('Sin conexión a internet.');
      return;
    }
    if (localOrders.length === 0) {
      toast.warning('No hay órdenes locales para sincronizar');
      return;
    }
    setIsSyncing(true);
    try {
      let uploaded = 0;
      let errors = 0;
      for (const order of localOrders) {
        const result = await ExpectedOrderRepository.uploadToCloud(order);
        if (result.success) uploaded++;
        else errors++;
      }
      if (errors === 0) {
        toast.success(`Se sincronizaron ${uploaded} cargas a la nube`);
      } else {
        toast.warning(`Sincronizados: ${uploaded}, Errores: ${errors}`);
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Error de sincronización');
    } finally {
      setIsSyncing(false);
    }
  }, [localOrders]);

  // Toggle expansión de orden
  const toggleExpandOrder = useCallback((orderId: string) => {
    setExpandedOrderId(prev => (prev === orderId ? null : orderId));
    setItemSearchQuery('');
  }, []);

  // Órden expandida actualmente
  const expandedOrder = useMemo(() => {
    return localOrders.find(o => o.id === expandedOrderId) || null;
  }, [expandedOrderId, localOrders]);

  // Filtrar items de orden expandida
  const filteredExpandedItems = useMemo(() => {
    if (!expandedOrder) return [];
    if (!itemSearchQuery.trim()) return expandedOrder.items;
    const term = itemSearchQuery.toLowerCase();
    return expandedOrder.items.filter(
      item => item.barcode.toLowerCase().includes(term) || item.name.toLowerCase().includes(term)
    );
  }, [expandedOrder, itemSearchQuery]);

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div className="h-full flex flex-col bg-base">
      {/* Header */}
      <div className="pt-6 px-4 sm:px-6 lg:px-8 shrink-0 border-b border-subtle pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <Layers className="w-8 h-8 text-blue-500" />
              Cargas Teóricas
            </h1>
            <p className="text-secondary text-sm mt-1">
              Gestiona listados de stock teóricos para auditorías y conteos.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={downloadFromCloud}
              disabled={isSyncing}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
              title="Descargar desde la nube"
            >
              {isSyncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Desde Nube</span>
            </button>
            <button
              onClick={syncAllToCloud}
              disabled={isSyncing || localOrders.length === 0}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
              title="Subir a la nube"
            >
              {isSyncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">A Nube ({localOrders.length})</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard
            label="Locales"
            value={stats.totalLocal}
            icon={HardDrive}
            colorClass="text-emerald-500"
          />
          <SummaryCard
            label="En la nube"
            value={stats.totalCloud}
            icon={Cloud}
            colorClass="text-indigo-500"
          />
          <SummaryCard
            label="Total SKUs"
            value={formatNumber(stats.totalSKUs)}
            icon={Package}
            colorClass="text-amber-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-6 lg:px-8 py-3 border-b border-subtle shrink-0">
        <div className="flex gap-2 flex-wrap">
          <TabButton
            active={activeTab === 'local'}
            onClick={() => setActiveTab('local')}
            icon={HardDrive}
            label="Locales"
            count={stats.totalLocal}
            color="emerald"
          />
          <TabButton
            active={activeTab === 'cloud'}
            onClick={() => setActiveTab('cloud')}
            icon={Cloud}
            label="Nube"
            count={stats.totalCloud}
            color="indigo"
          />
          <TabButton
            active={activeTab === 'stock'}
            onClick={() => setActiveTab('stock')}
            icon={Database}
            label="Stock General"
            count={1}
            color="amber"
          />
          <TabButton
            active={activeTab === 'new'}
            onClick={() => setActiveTab('new')}
            icon={Plus}
            label="Nueva"
            count={0}
            color="emerald"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl text-center uppercase tracking-wider">
              {error}
            </div>
          )}

          {/* Search */}
          {activeTab === 'local' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por ID, guía interna u orden de compra..."
                className="w-full bg-surface border border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* ========== TAB LOCAL (estilo original) ========== */}
          {activeTab === 'local' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  Cargas Teóricas del Dispositivo (Locales)
                </h3>

                <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1 no-scrollbar">
                  {filteredLocalOrders.length === 0 ? (
                    <div className="py-6 bg-surface/40 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-center">
                      <HardDrive className="w-7 h-7 text-slate-700 mb-2" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                        Sin cargas locales guardadas
                      </span>
                      <p className="text-[8px] font-bold text-slate-600 uppercase mt-1">
                        Sube excel o pega en el panel de "Carga Teórica"
                      </p>
                    </div>
                  ) : (
                    filteredLocalOrders.map(order => (
                      <LocalOrderCard
                        key={order.id}
                        order={order}
                        onImport={() => handleImportLocal(order.id)}
                        onDelete={() => handleDeleteLocal(order.id)}
                        onStartCount={() => handleStartCount(order)}
                        onPrint={() => handlePrintOrder(order)}
                        onViewDetail={() => handleViewDetail(order)}
                        isLoading={loadingLocal}
                        importingId={importingId}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========== TAB NUBE (estilo original) ========== */}
          {activeTab === 'cloud' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-indigo-400" />
                  Cargas Teóricas de la Nube
                </h3>
                <button
                  onClick={handleRefreshCloud}
                  disabled={loadingCloud}
                  className="p-1 hover:bg-white/5 rounded-lg text-muted active:scale-95 transition-all"
                  title="Actualizar listado"
                >
                  <RefreshCw
                    className={cn('w-3.5 h-3.5', loadingCloud && 'animate-spin text-indigo-400')}
                  />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1 no-scrollbar">
                {loadingCloud ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                      Buscando en la nube...
                    </span>
                  </div>
                ) : cloudManifests.length === 0 ? (
                  <div className="py-8 bg-surface/50 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-center">
                    <FileText className="w-8 h-8 text-slate-600 mb-2" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                      No hay cargas en la nube
                    </span>
                    <p className="text-[8px] font-bold text-slate-600 uppercase mt-1">
                      Guarda listados teóricos en "Carga Teórica"
                    </p>
                  </div>
                ) : (
                  cloudManifests.map(manifest => (
                    <CloudManifestCard
                      key={manifest.id}
                      manifest={manifest}
                      onImport={() => handleImportCloud(manifest.id)}
                      isLoading={loadingCloud}
                      importingId={importingId}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========== TAB STOCK GENERAL (estilo original) ========== */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                  Base de Datos General
                </h3>
                <button
                  disabled={loadingLocal}
                  onClick={handleImportStock}
                  className="w-full text-left bg-surface hover:bg-slate-850 border border-white/5 hover:border-amber-500/30 p-4 rounded-2xl flex items-center gap-4 transition-all active:scale-[0.98] group disabled:opacity-50"
                >
                  <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0 border border-amber-500/20">
                    {loadingLocal ? (
                      <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                    ) : (
                      <Database className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                      Stock Teorico General
                    </h4>
                    <p className="text-[9px] font-bold text-muted uppercase mt-0.5 tracking-tight">
                      Utilizar ultima planilla de stock total (STOCK)
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
                </button>
              </div>

              <div className="text-center pt-2">
                <p className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.2em]">
                  Selecciona un listado a sincronizar
                </p>
              </div>
            </div>
          )}

          {/* ========== TAB NUEVA CARGA (formulario de importacion) ========== */}
          {activeTab === 'new' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  Nueva Carga Teorica
                </h3>
                <button
                  onClick={() => setActiveTab('local')}
                  className="px-3 py-1.5 bg-surface hover:bg-elevated text-muted text-xs rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
              <NewOrderForm
                onSaved={() => setActiveTab('local')}
                onCancel={() => setActiveTab('local')}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalle de Orden */}
      <OrderDetailModal
        isOpen={detailModal.open}
        onClose={() => setDetailModal({ open: false, order: null })}
        order={detailModal.order}
        onDelete={handleDeleteFromDetail}
        onStartCount={handleStartCountFromDetail}
      />

      {/* Modal de Confirmación */}
      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ ...confirmModal, open: false })}
        onConfirm={async () => {
          await confirmModal.action();
          setConfirmModal({ ...confirmModal, open: false });
        }}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        icon={confirmModal.icon}
        extraInfo={confirmModal.extraInfo}
        loading={loadingLocal || loadingCloud}
      />
    </div>
  );
};
