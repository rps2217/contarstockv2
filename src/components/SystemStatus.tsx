
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Battery, BatteryWarning, HardDrive, Cloud, RefreshCw, Zap, Database, Activity, AlertTriangle } from 'lucide-react';
import { useSyncStore } from '../store/useSyncStore';
import { supabaseSyncService } from '../services/supabaseSyncService';
import { useNavigate } from 'react-router-dom';
import { SystemRepository } from '../repositories/SystemRepository';
import { ScanRepository } from '../repositories/ScanRepository';

export const SystemStatus: React.FC = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const [storageCritical, setStorageCritical] = useState(false);
  const [integrityAlert, setIntegrityAlert] = useState(false);
  const [anomalyCount, setAnomalyCount] = useState(0);
  
  const { isSyncing, latencyMs, pendingItems, setLatency, setPendingItems, setSupabaseConnected, isSupabaseConnected, syncError } = useSyncStore();

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
        await supabaseSyncService.pullBatch('CONFIG_SISTEMA');
        const end = performance.now();
        setLatency(Math.round(end - start));
        setSupabaseConnected(true);
      } catch (e) {
        setLatency(null);
        setSupabaseConnected(false);
      }

      // 3. Contar Pendientes (Usando repositorios)
      try {
        const unsyncedScans = await ScanRepository.getPendingSyncCount();
        setPendingItems(unsyncedScans);
      } catch (e) {}
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
      <div key="integrity" className="bg-rose-900/80 backdrop-blur-md text-white px-4 py-3 text-[10px] font-black flex items-center gap-3 border border-rose-500/50">
        <AlertTriangle className="w-4 h-4 text-rose-400" />
        <span className="uppercase tracking-widest italic">Base de Datos Comprometida: Registros Huérfanos</span>
      </div>
    );
  }

  if (anomalyCount > 0) {
    alerts.push(
      <div key="anomaly" className="bg-amber-900/80 backdrop-blur-md text-white px-4 py-3 text-[10px] font-black flex items-center gap-3 border border-amber-500/50">
        <Zap className="w-4 h-4 text-amber-400" />
        <span className="uppercase tracking-widest">{anomalyCount} Anomalías de Cantidad Detectadas</span>
      </div>
    );
  }

  if (syncError) {
    alerts.push(
      <div key="sync-error" className="bg-rose-600 text-white px-4 py-3 text-[10px] font-black flex items-center gap-3 shadow-lg">
        <RefreshCw className="w-4 h-4" />
        <span className="uppercase tracking-widest">Error de Sincronización: {syncError}</span>
      </div>
    );
  }

  if (isSyncing) {
    alerts.push(
      <div key="sync" className="bg-blue-600 text-white px-4 py-3 text-[10px] font-black flex items-center gap-3 shadow-lg">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="uppercase tracking-widest">Sincronizando con Nube...</span>
      </div>
    );
  }

  if (pendingItems > 0 && !isSyncing) {
    alerts.push(
      <div 
        key="pending" 
        onClick={() => navigate('/sync')}
        className="bg-amber-500 text-white px-4 py-3 text-[10px] font-black flex items-center gap-3 shadow-lg cursor-pointer hover:bg-amber-600 transition-colors pointer-events-auto"
      >
        <Database className="w-4 h-4" />
        <span className="uppercase tracking-widest">{pendingItems} Registros Pendientes</span>
      </div>
    );
  }

  if (isOnline && isSupabaseConnected && latencyMs !== null) {
    const latencyColor = latencyMs < 150 ? 'text-emerald-400' : latencyMs < 400 ? 'text-amber-400' : 'text-rose-400';
    alerts.push(
      <div key="latency" className="bg-slate-800 text-white px-4 py-3 text-[10px] font-black flex flex-col gap-2 border border-white/5">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${latencyColor}`} />
          <span className="uppercase tracking-widest">Latencia: <span className={latencyColor}>{latencyMs}ms</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-sky-400" />
          <span className="uppercase tracking-widest text-sky-400">Cloud Engine Active</span>
        </div>
      </div>
    );
  }

  if (!isOnline) {
    alerts.push(
      <div key="net" className="bg-rose-900 text-white px-4 py-3 text-[10px] font-black flex items-center gap-3">
        <WifiOff className="w-4 h-4" />
        <span className="uppercase tracking-widest">Modo Local - Sin Red</span>
      </div>
    );
  } else if (showBackOnline) {
    alerts.push(
      <div key="net-back" className="bg-emerald-600 text-white px-4 py-3 text-[10px] font-black flex items-center gap-3 animate-in slide-in-from-top-full duration-500">
        <Wifi className="w-4 h-4" />
        <span className="uppercase tracking-widest">Conexión Restaurada</span>
      </div>
    );
  }

  if (batteryLevel !== null && batteryLevel < 20 && !isCharging) {
    alerts.push(
      <div key="batt" className="bg-amber-500 text-black px-4 py-3 text-[10px] font-black flex items-center gap-3">
        <BatteryWarning className="w-4 h-4" />
        <span className="uppercase tracking-widest">Batería al {batteryLevel.toFixed(0)}% - Conecte PDA</span>
      </div>
    );
  }

  if (storageCritical) {
    alerts.push(
      <div key="store" className="bg-rose-950 text-white px-4 py-3 text-[10px] font-black flex items-center gap-3">
        <HardDrive className="w-4 h-4" />
        <span className="uppercase tracking-widest">Memoria Crítica - Vacíe Base Local</span>
      </div>
    );
  }

  if (alerts.length === 0) return null;

  return (
    <div className="w-full p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 pointer-events-auto select-none">
      {alerts.map((alert, idx) => (
        <div key={idx} className="overflow-hidden rounded-2xl shadow-sm">
          {alert}
        </div>
      ))}
    </div>
  );
};

// Forced GitHub sync
