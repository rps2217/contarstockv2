
import React, { useState, useEffect, memo, useCallback } from 'react';
import { Wifi, WifiOff, Battery, BatteryWarning, HardDrive, Cloud, RefreshCw, Zap, Database, Activity, AlertTriangle } from 'lucide-react';
import { useSyncStore } from '@/stores';
import { pullBatch } from '../services/cloud/BatchSyncService';
import { useNavigate } from 'react-router-dom';
import { SystemRepository } from '../repositories/SystemRepository';
import { getGlobalPendingCount } from '@/services/sync';

// ============================================================================
// COMPONENTE MEMOIZADO
// ============================================================================

const SystemStatusInner: React.FC = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const [storageCritical, setStorageCritical] = useState(false);
  const [integrityAlert, setIntegrityAlert] = useState(false);
  const [anomalyCount, setAnomalyCount] = useState(0);
  
  const { 
    isSyncing, 
    latencyMs, 
    pendingItems, 
    setLatency, 
    setPendingItems, 
    setSupabaseConnected, 
    isSupabaseConnected, 
    syncError,
    conflicts,
    incidents 
  } = useSyncStore();

  useEffect(() => {
    const checkMetrics = async () => {
      // 1. Integridad y Anomalías
      const integrity = await SystemRepository.checkIntegrity();
      const anomalies = await SystemRepository.detectAnomalies(200); // Umbral de 200 unidades
      setIntegrityAlert(integrity.orphanScans > 0);
      setAnomalyCount(anomalies.length);

      if (!navigator.onLine) {
        setLatency(null);
        setSupabaseConnected(false);
        return;
      }

      // 2. Medir Latencia
      const start = performance.now();
      try {
        const res: any = await pullBatch('CONFIG_SISTEMA');
        if (res.isOffline || res.success === false) {
          setLatency(null);
          setSupabaseConnected(false);
        } else {
          const end = performance.now();
          setLatency(Math.round(end - start));
          setSupabaseConnected(true);
        }
      } catch (e) {
        setLatency(null);
        setSupabaseConnected(false);
      }

      // 3. Contar Pendientes (Global de transacciones)
      try {
        const totalPending = await getGlobalPendingCount();
        setPendingItems(totalPending);
      } catch {}
    };

    checkMetrics();
    const interval = setInterval(checkMetrics, 15000);
    return () => clearInterval(interval);
  }, [isOnline]);

  useEffect(() => {
  const handleOnline = () => { setIsOnline(true); setShowBackOnline(true); setTimeout(() => setShowBackOnline(false), 3000); };
  const handleOffline = () => setIsOnline(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  if ('getBattery' in navigator) {
  (navigator as any).getBattery().then((b: any) => {
  const update = () => { setBatteryLevel(b.level * 100); setIsCharging(b.charging); };
  update();
  b.addEventListener('levelchange', update);
  b.addEventListener('chargingchange', update);
  });
  }

  const checkStorage = async () => {
  if (navigator.storage && navigator.storage.estimate) {
  try {
  const { usage, quota } = await navigator.storage.estimate();
  if (usage && quota && (usage / quota) > 0.85) setStorageCritical(true);
  } catch (e) {}
  }
  };
  checkStorage();
  const storageInterval = setInterval(checkStorage, 60000);

  return () => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  clearInterval(storageInterval);
  };
  }, []);

  const alerts = [];

  if (integrityAlert) {
    alerts.push(
      <div key="integrity" className="bg-rose-900/60 backdrop-blur-md text-white px-3 py-1.5 text-[9px] font-bold flex items-center gap-2 rounded-lg border border-rose-500/30">
        <AlertTriangle className="w-3 h-3 text-rose-400" />
        <span className="uppercase tracking-wider">Integridad: Registros Huérfanos</span>
      </div>
    );
  }

  if (anomalyCount > 0) {
    alerts.push(
      <div key="anomaly" className="bg-amber-900/60 backdrop-blur-md text-white px-3 py-1.5 text-[9px] font-bold flex items-center gap-2 rounded-lg border border-amber-500/30">
        <Zap className="w-3 h-3 text-amber-400" />
        <span className="uppercase tracking-wider">{anomalyCount} Anomalías Detectadas</span>
      </div>
    );
  }

  if (syncError) {
    alerts.push(
      <div key="sync-error" className="bg-rose-600/80 text-white px-3 py-1.5 text-[9px] font-bold flex items-center gap-2 rounded-lg">
        <RefreshCw className="w-3 h-3" />
        <span className="uppercase tracking-wider">Error Sinc: {syncError}</span>
      </div>
    );
  }

  if (isSyncing) {
    alerts.push(
      <div key="sync" className="bg-blue-600/80 text-white px-3 py-1.5 text-[9px] font-bold flex items-center gap-2 rounded-lg">
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span className="uppercase tracking-wider">Sincronizando...</span>
      </div>
    );
  }

  if (pendingItems > 0 && !isSyncing) {
    alerts.push(
      <div 
        key="pending" 
        onClick={() => navigate('/sync')}
        className="bg-amber-500/80 text-white px-3 py-1.5 text-[9px] font-bold flex items-center gap-2 rounded-lg cursor-pointer pointer-events-auto"
      >
        <Database className="w-3 h-3" />
        <span className="uppercase tracking-wider">{pendingItems} Pendientes</span>
      </div>
    );
  }

  if (isOnline && isSupabaseConnected && latencyMs !== null) {
    const latencyColor = latencyMs < 150 ? 'text-emerald-400' : latencyMs < 400 ? 'text-amber-400' : 'text-rose-400';
    alerts.push(
      <div key="latency" className="bg-slate-900/60 backdrop-blur-md text-white px-3 py-1.5 text-[9px] font-bold flex items-center gap-3 rounded-lg border border-white/5">
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black/20 rounded-md">
          <Activity className={`w-3 h-3 ${latencyColor}`} />
          <span className="uppercase tracking-wider">LAT: <span className={latencyColor}>{latencyMs}MS</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <Cloud className="w-3 h-3 text-sky-400" />
          <span className="uppercase tracking-wider text-sky-400">Cloud Active</span>
        </div>
      </div>
    );
  }

  if (!isOnline) {
    alerts.push(
      <div key="net" className="bg-rose-900/80 text-white px-3 py-1.5 text-[9px] font-bold flex items-center gap-2 rounded-lg">
        <WifiOff className="w-3 h-3" />
        <span className="uppercase tracking-wider">Modo Local</span>
      </div>
    );
  } else if (showBackOnline) {
    alerts.push(
      <div key="net-back" className="bg-emerald-600 px-3 py-1.5 text-[9px] font-bold flex items-center gap-2 rounded-lg animate-in slide-in-from-top-full">
        <Wifi className="w-3 h-3" />
        <span className="uppercase tracking-wider">Online</span>
      </div>
    );
  }

  if (batteryLevel !== null && batteryLevel < 20 && !isCharging) {
    alerts.push(
      <div key="batt" className="bg-amber-500 text-black px-3 py-1.5 text-[9px] font-bold flex items-center gap-2 rounded-lg">
        <BatteryWarning className="w-3 h-3" />
        <span className="uppercase tracking-wider">Batería {batteryLevel.toFixed(0)}%</span>
      </div>
    );
  }

  if (storageCritical) {
    alerts.push(
      <div key="store" className="bg-rose-950 text-white px-3 py-1.5 text-[9px] font-bold flex items-center gap-2 rounded-lg">
        <HardDrive className="w-3 h-3" />
        <span className="uppercase tracking-wider">Memoria Crítica</span>
      </div>
    );
  }

  if (alerts.length === 0) return null;

  return (
    <div className="w-full p-2 flex flex-wrap gap-2 pointer-events-auto select-none overflow-x-auto no-scrollbar">
      {alerts}
    </div>
  );
};

// ============================================================================
// EXPORT MEMOIZADO
// ============================================================================

export const SystemStatus = memo(SystemStatusInner);

