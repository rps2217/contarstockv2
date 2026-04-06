
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Battery, BatteryWarning, HardDrive, Cloud, RefreshCw, Zap, Database, Activity } from 'lucide-react';
import { useSyncStore } from '../store/useSyncStore';
import { db } from '../db';
import { firebaseSyncService } from '../services/firebaseSyncService';

export const SystemStatus: React.FC = () => {
 const [isOnline, setIsOnline] = useState(navigator.onLine);
 const [showBackOnline, setShowBackOnline] = useState(false);
 const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
 const [isCharging, setIsCharging] = useState(false);
 const [storageCritical, setStorageCritical] = useState(false);
 
 const { isSyncing, latencyMs, pendingItems, setLatency, setPendingItems, setFirestoreConnected, isFirestoreConnected, syncError } = useSyncStore();

 useEffect(() => {
   const checkMetrics = async () => {
     if (!navigator.onLine) {
       setLatency(null);
       setFirestoreConnected(false);
       return;
     }

     // 1. Medir Latencia
     const start = performance.now();
     try {
       await firebaseSyncService.pullBatch('CONFIG_SISTEMA');
       const end = performance.now();
       setLatency(Math.round(end - start));
       setFirestoreConnected(true);
     } catch (e) {
       setLatency(null);
       setFirestoreConnected(false);
     }

     // 2. Contar Pendientes
     try {
       const unsyncedScans = await db.scans.where('synced').equals(0).count();
       const pendingDynamic = await db.dynamic_data.where('syncStatus').equals('pending').count();
       setPendingItems(unsyncedScans + pendingDynamic);
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

 if (syncError) {
  alerts.push(
  <div key="sync-error" className="bg-rose-600 text-white px-4 py-1 text-[9px] font-black flex items-center justify-center gap-2 border-b border-rose-700 shadow-lg">
  <RefreshCw className="w-3 h-3" />
  <span className="uppercase tracking-widest">Error de Sincronización: {syncError}</span>
  </div>
  );
 }

 if (isSyncing) {
  alerts.push(
  <div key="sync" className="bg-indigo-600 text-white px-4 py-1 text-[9px] font-black flex items-center justify-center gap-2 border-b border-indigo-700 shadow-lg">
  <RefreshCw className="w-3 h-3 animate-spin" />
  <span className="uppercase tracking-widest">Sincronizando con Nube...</span>
  </div>
  );
 }

 if (pendingItems > 0 && !isSyncing) {
  alerts.push(
  <div key="pending" className="bg-amber-600 text-white px-4 py-1 text-[9px] font-black flex items-center justify-center gap-2 border-b border-amber-700 shadow-lg">
  <Database className="w-3 h-3" />
  <span className="uppercase tracking-widest">{pendingItems} Registros Pendientes de Subida</span>
  </div>
  );
 }

 if (isOnline && isFirestoreConnected && latencyMs !== null) {
  const latencyColor = latencyMs < 150 ? 'text-emerald-400' : latencyMs < 400 ? 'text-amber-400' : 'text-rose-400';
  alerts.push(
  <div key="latency" className="bg-slate-900 text-white px-4 py-1 text-[9px] font-black flex items-center justify-center gap-3 border-b border-white/5">
  <div className="flex items-center gap-1.5">
  <Activity className={`w-3 h-3 ${latencyColor}`} />
  <span className="uppercase tracking-widest">Latencia Cloud: <span className={latencyColor}>{latencyMs}ms</span></span>
  </div>
  <div className="w-px h-2 bg-white/10"></div>
  <div className="flex items-center gap-1.5">
  <Cloud className="w-3 h-3 text-sky-400" />
  <span className="uppercase tracking-widest text-sky-400">Firestore Live</span>
  </div>
  </div>
  );
 }

 if (!isOnline) {
 alerts.push(
 <div key="net" className="bg-rose-700 text-white px-4 py-1 text-[9px] font-black flex items-center justify-center gap-2 border-b border-rose-800">
 <WifiOff className="w-3 h-3" />
 <span className="uppercase tracking-widest">Modo Local - Sin Red</span>
 </div>
 );
 } else if (showBackOnline) {
 alerts.push(
 <div key="net-back" className="bg-emerald-600 text-white px-4 py-1 text-[9px] font-black flex items-center justify-center gap-2 animate-in slide-in-from-top-full duration-500">
 <Wifi className="w-3 h-3" />
 <span className="uppercase tracking-widest">Conexión Restaurada</span>
 </div>
 );
 }

 if (batteryLevel !== null && batteryLevel < 20 && !isCharging) {
 alerts.push(
 <div key="batt" className="bg-amber-500 text-black px-4 py-1 text-[9px] font-black flex items-center justify-center gap-2 border-b border-amber-600">
 <BatteryWarning className="w-3 h-3" />
 <span className="uppercase tracking-widest">Batería al {batteryLevel.toFixed(0)}% - Conecte PDA</span>
 </div>
 );
 }

 if (storageCritical) {
 alerts.push(
 <div key="store" className="bg-rose-900 text-white px-4 py-1 text-[9px] font-black flex items-center justify-center gap-2 border-b border-black">
 <HardDrive className="w-3 h-3" />
 <span className="uppercase tracking-widest">Memoria Crítica - Vacíe Base Local</span>
 </div>
 );
 }

 if (alerts.length === 0) return null;

 return (
 <div className="w-full flex flex-col pointer-events-none select-none">
 {alerts}
 </div>
 );
};

// Forced GitHub sync
