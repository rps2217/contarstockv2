"use client";
/**
 * SyncIndicator - Indicador visual de estado de sincronización
 * 
 * Muestra:
 * - Estado de conexión (online/offline)
 * - Cantidad de pendientes
 * - Última sincronización
 * - Toast de notificaciones
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSyncStore } from '@/store/useSyncStore';
import { toast } from 'sonner';

interface SyncIndicatorProps {
  variant?: 'icon' | 'badge' | 'full';
  showToast?: boolean;
  className?: string;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  variant = 'icon',
  showToast = true,
  className,
}) => {
  const {
    isSupabaseConnected,
    isSyncing,
    pendingItems,
    lastSyncTime,
    syncError,
  } = useSyncStore();

  const [prevPending, setPrevPending] = useState(pendingItems);
  const [prevSyncing, setPrevSyncing] = useState(isSyncing);

  // Toast cuando cambia el estado de sync
  useEffect(() => {
    if (!showToast) return;

    // Sync completado
    if (prevSyncing && !isSyncing && pendingItems === 0) {
      toast.success('Sincronización completa', {
        description: 'Todos los datos están actualizados',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
        duration: 3000,
      });
    }

    // Sync con pendientes
    if (prevSyncing && !isSyncing && pendingItems > 0) {
      toast.info('Sincronización parcial', {
        description: `${pendingItems} elemento${pendingItems !== 1 ? 's' : ''} pendiente${pendingItems !== 1 ? 's' : ''} de subir`,
        icon: <Cloud className="w-5 h-5 text-blue-500" />,
        duration: 4000,
      });
    }

    // Error de sync
    if (syncError) {
      toast.error('Error de sincronización', {
        description: syncError,
        icon: <AlertCircle className="w-5 h-5 text-rose-500" />,
        duration: 5000,
      });
    }

    setPrevSyncing(isSyncing);
  }, [isSyncing, pendingItems, syncError, showToast]);

  // Toast cuando llegan nuevos pendientes
  useEffect(() => {
    if (!showToast) return;
    
    if (pendingItems > prevPending && pendingItems > 0) {
      const newItems = pendingItems - prevPending;
      toast.info(`${newItems} nuevo${newItems !== 1 ? 's' : ''} pendiente${newItems !== 1 ? 's' : ''} de sincronizar`, {
        icon: <Cloud className="w-5 h-5 text-blue-500" />,
        duration: 2000,
      });
    }
    
    setPrevPending(pendingItems);
  }, [pendingItems, prevPending, showToast]);

  // Formatear tiempo relativo
  const formatLastSync = () => {
    if (!lastSyncTime) return 'Nunca';
    const diff = Date.now() - lastSyncTime;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${Math.floor(hours / 24)}d`;
  };

  // Variante icono (para sidebar)
  if (variant === 'icon') {
    const getIcon = () => {
      if (!isSupabaseConnected) return <CloudOff className="w-4 h-4 text-rose-500" />;
      if (isSyncing) return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      if (syncError) return <AlertCircle className="w-4 h-4 text-rose-500" />;
      if (pendingItems > 0) return <Cloud className="w-4 h-4 text-amber-500" />;
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    };

    const getBadge = () => {
      if (pendingItems > 0 && !isSyncing) {
        return (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full">
            {pendingItems > 9 ? '9+' : pendingItems}
          </span>
        );
      }
      return null;
    };

    return (
      <div className={cn('relative', className)}>
        {getIcon()}
        {getBadge()}
      </div>
    );
  }

  // Variante badge (para navbar)
  if (variant === 'badge') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="relative">
          {isSyncing ? (
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          ) : isSupabaseConnected ? (
            <Cloud className={cn(
              'w-4 h-4',
              pendingItems > 0 ? 'text-amber-500' : 'text-emerald-500'
            )} />
          ) : (
            <CloudOff className="w-4 h-4 text-rose-500" />
          )}
          {pendingItems > 0 && !isSyncing && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-3.5 h-3.5 bg-amber-500 text-white text-[8px] font-bold rounded-full">
              {pendingItems > 9 ? '9+' : pendingItems}
            </span>
          )}
        </div>
        {pendingItems > 0 && !isSyncing && (
          <span className="text-xs text-amber-500 font-medium">
            {pendingItems}
          </span>
        )}
      </div>
    );
  }

  // Variante full (para settings o panel)
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl border border-subtle bg-surface',
      className
    )}>
      {/* Estado de conexión */}
      <div className="flex items-center gap-2">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          isSupabaseConnected ? 'bg-emerald-500/20' : 'bg-rose-500/20'
        )}>
          {isSupabaseConnected ? (
            <Cloud className="w-4 h-4 text-emerald-500" />
          ) : (
            <CloudOff className="w-4 h-4 text-rose-500" />
          )}
        </div>
        <div>
          <p className={cn(
            'text-sm font-medium',
            isSupabaseConnected ? 'text-emerald-500' : 'text-rose-500'
          )}>
            {isSupabaseConnected ? 'Conectado' : 'Sin conexión'}
          </p>
          <p className="text-xs text-muted">
            {isSyncing ? 'Sincronizando...' : formatLastSync()}
          </p>
        </div>
      </div>

      {/* Separador */}
      <div className="w-px h-8 bg-subtle" />

      {/* Pendientes */}
      <div className="flex items-center gap-2">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          pendingItems > 0 ? 'bg-amber-500/20' : 'bg-emerald-500/20'
        )}>
          {pendingItems > 0 ? (
            <AlertCircle className="w-4 h-4 text-amber-500" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          )}
        </div>
        <div>
          <p className={cn(
            'text-sm font-medium',
            pendingItems > 0 ? 'text-amber-500' : 'text-emerald-500'
          )}>
            {pendingItems} pendiente{pendingItems !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-muted">
            {pendingItems > 0 ? 'Por sincronizar' : 'Todo al día'}
          </p>
        </div>
      </div>

      {/* Spinner de sync */}
      <AnimatePresence>
        {isSyncing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="ml-auto"
          >
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error indicator */}
      {syncError && (
        <div className="ml-auto flex items-center gap-2 text-rose-500">
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs">Error</span>
        </div>
      )}
    </div>
  );
};

// Mini indicador para usar en el header
export const SyncStatusDot: React.FC<{ className?: string }> = ({ className }) => {
  const { isSupabaseConnected, pendingItems, isSyncing, syncError } = useSyncStore();

  const getColor = () => {
    if (!isSupabaseConnected || syncError) return 'bg-rose-500';
    if (isSyncing) return 'bg-blue-500 animate-pulse';
    if (pendingItems > 0) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <span className={cn('inline-block w-2 h-2 rounded-full', getColor(), className)} />
  );
};

export default SyncIndicator;