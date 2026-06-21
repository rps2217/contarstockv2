import React, { useState, useEffect, useRef } from 'react';
import { WifiOff, Wifi, RefreshCw, Cloud, CloudOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useSyncStore } from '@/stores';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type BannerStatus = 'offline' | 'syncing' | 'synced' | 'pending' | 'error';

export const EnhancedOfflineBanner: React.FC = () => {
  const isOnline = useNetworkStatus();
  const { isSyncing, lastSyncTime, pendingItems, syncError } = useSyncStore();
  const [dismissedPending, setDismissedPending] = useState(false);
  const [pendingStartTime, setPendingStartTime] = useState<number | null>(null);
  const prevPendingCountRef = useRef<number>(0);

  // Contar items pendientes de sync
  const pendingCount = useLiveQuery(async () => {
    try {
      const scans = await db.scans.where('syncStatus').equals('pending').count();
      const sessions = await db.sessions.where('syncStatus').equals('pending').count();
      const dynamic = await db.dynamic_data.where('syncStatus').anyOf(['pending', 'error']).count();
      return scans + sessions + dynamic;
    } catch {
      return 0;
    }
  }, [], 0);

  // Detectar cuando aparecen nuevos cambios pendientes
  useEffect(() => {
    if (pendingCount > 0 && prevPendingCountRef.current === 0) {
      // Nuevos cambios pendientes detectados - mostrar banner
      setDismissedPending(false);
      setPendingStartTime(Date.now());
    } else if (pendingCount === 0) {
      // No hay pendientes - resetear estado
      setDismissedPending(false);
      setPendingStartTime(null);
    }
    prevPendingCountRef.current = pendingCount;
  }, [pendingCount]);

  // Auto-dismiss del banner pending después de 8 segundos
  useEffect(() => {
    if (pendingStartTime && !dismissedPending) {
      const timer = setTimeout(() => {
        setDismissedPending(true);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [pendingStartTime, dismissedPending]);

  // Determinar estado del banner
  const getStatus = (): BannerStatus => {
    if (!isOnline) return 'offline';
    if (syncError) return 'error';
    if (isSyncing) return 'syncing';
    if (pendingCount > 0 && !dismissedPending) return 'pending';
    return 'synced';
  };

  const status = getStatus();

  // No renderizar si está synced y ya mostró el pending
  if (status === 'synced' && dismissedPending && pendingCount > 0) {
    // Mostrar indicador sutil en lugar del banner completo
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed top-0 right-4 z-[2000] py-1 px-2"
      >
        <div className="flex items-center gap-1.5 bg-amber-500/20 backdrop-blur-sm rounded-full px-3 py-1 border border-amber-500/30">
          <Cloud className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-bold text-amber-400">{pendingCount}</span>
        </div>
      </motion.div>
    );
  }

  // No mostrar nada si está synced y no hay pendientes
  if (status === 'synced' && pendingCount === 0) {
    return null;
  }

  // Configuración por estado
  const config = {
    offline: {
      bg: 'bg-rose-600',
      icon: WifiOff,
      iconColor: 'text-white',
      label: 'Modo Offline',
      sublabel: pendingCount > 0 ? `${pendingCount} cambios pendientes` : 'Sin conexión',
      animate: true
    },
    syncing: {
      bg: 'bg-blue-600',
      icon: RefreshCw,
      iconColor: 'text-white animate-spin',
      label: 'Sincronizando...',
      sublabel: 'Subiendo cambios',
      animate: false
    },
    synced: {
      bg: 'bg-emerald-600',
      icon: CheckCircle,
      iconColor: 'text-white',
      label: 'Sincronizado',
      sublabel: lastSyncTime
        ? `Última sync: hace ${formatDistanceToNow(lastSyncTime, { addSuffix: true, locale: es })}`
        : 'Todo al día',
      animate: false
    },
    pending: {
      bg: 'bg-amber-500',
      icon: Cloud,
      iconColor: 'text-white',
      label: 'Cambios Pendientes',
      sublabel: `${pendingCount} elementos por sincronizar`,
      animate: true
    },
    error: {
      bg: 'bg-rose-600',
      icon: AlertTriangle,
      iconColor: 'text-white',
      label: 'Error de Sincronización',
      sublabel: syncError || 'Revisa tu conexión',
      animate: true
    }
  };

  const currentConfig = config[status];
  const Icon = currentConfig.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-[2000] ${currentConfig.bg} text-white px-3 py-2 shadow-lg`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Icon + Text */}
          <div className="flex items-center gap-2.5">
            <Icon className={`w-4 h-4 ${currentConfig.iconColor} ${currentConfig.animate ? 'animate-pulse' : ''}`} />
            <div className="flex flex-col">
              <span className="text-[11px] font-black uppercase tracking-tight leading-none">{currentConfig.label}</span>
              <span className="text-[9px] font-medium opacity-90 mt-0.5">{currentConfig.sublabel}</span>
            </div>
          </div>

          {/* Right: Status indicators */}
          <div className="flex items-center gap-2">
            {/* Pending indicator */}
            {pendingCount > 0 && status !== 'offline' && (
              <div className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded-full">
                <Cloud className="w-3 h-3" />
                <span className="text-[10px] font-bold">{pendingCount}</span>
              </div>
            )}

            {/* Dismiss button for pending */}
            {status === 'pending' && (
              <button
                onClick={() => setDismissedPending(true)}
                className="w-6 h-6 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                title="Ocultar notificación"
              >
                <span className="text-white text-xs font-bold">×</span>
              </button>
            )}

            {/* Online/Offline indicator */}
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-300' : 'bg-white/50'}`} />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Exportar como componente principal para mantener compatibilidad
export const OfflineBanner = EnhancedOfflineBanner;
