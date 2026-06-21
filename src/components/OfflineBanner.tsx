import React, { useState, useEffect } from 'react';
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
  
  // Contar items pendientes de sync
  const pendingCount = useLiveQuery(async () => {
    const scans = await db.scans.where('syncStatus').equals('pending').count();
    const sessions = await db.sessions.where('syncStatus').equals('pending').count();
    const dynamic = await db.dynamic_data.where('syncStatus').anyOf(['pending', 'error']).count();
    return scans + sessions + dynamic;
  }, [], 0);

  // Determinar estado del banner
  const getStatus = (): BannerStatus => {
    if (!isOnline) return 'offline';
    if (syncError) return 'error';
    if (isSyncing) return 'syncing';
    if (pendingCount > 0) return 'pending';
    return 'synced';
  };

  const status = getStatus();

  // Configuración por estado
  const config = {
    offline: {
      bg: 'bg-rose-600',
      icon: WifiOff,
      iconColor: 'text-white',
      label: 'Modo Offline',
      sublabel: `${pendingCount} cambios pendientes`,
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
      animate: false
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
