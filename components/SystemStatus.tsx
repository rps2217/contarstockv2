
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Battery, BatteryWarning, HardDrive, Cloud, RefreshCw } from 'lucide-react';
import { useSyncStore } from '../store/useSyncStore';

export const SystemStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const [storageCritical, setStorageCritical] = useState(false);
  
  const { isSyncing, pendingItems } = useSyncStore();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBackOnline(true);
      setTimeout(() => setShowBackOnline(false), 3000);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let batteryRef: any = null;
    const updateBattery = () => {
        if (batteryRef) {
            setBatteryLevel(batteryRef.level * 100);
            setIsCharging(batteryRef.charging);
        }
    };

    if ('getBattery' in navigator) {
        (navigator as any).getBattery().then((b: any) => {
            batteryRef = b;
            updateBattery();
            b.addEventListener('levelchange', updateBattery);
            b.addEventListener('chargingchange', updateBattery);
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
      if (batteryRef) {
          batteryRef.removeEventListener('levelchange', updateBattery);
          batteryRef.removeEventListener('chargingchange', updateBattery);
      }
    };
  }, []);

  const alerts = [];

  // --- 1. CLOUD SYNC INDICATOR (SILENT) ---
  if (isSyncing) {
    alerts.push(
        <div key="sync" className="bg-indigo-600 text-white px-4 py-1.5 text-[10px] font-black flex items-center justify-center gap-2 animate-in slide-in-from-top-full">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span className="uppercase tracking-[0.2em]">Sincronización en curso...</span>
        </div>
    );
  }

  // --- 2. NETWORK ---
  if (!isOnline) {
      alerts.push(
          <div key="net" className="bg-slate-900 text-rose-400 px-4 py-1.5 text-[10px] font-black flex items-center justify-center gap-2 border-b border-white/5">
              <WifiOff className="w-3 h-3" />
              <span className="uppercase tracking-[0.2em]">Modo Offline - Datos Seguros</span>
          </div>
      );
  } else if (showBackOnline) {
      alerts.push(
          <div key="net-back" className="bg-emerald-500 text-white px-4 py-1.5 text-[10px] font-black flex items-center justify-center gap-2 animate-in slide-in-from-top-full fade-out duration-1000">
              <Wifi className="w-3 h-3" />
              <span className="uppercase tracking-[0.2em]">Conectado</span>
          </div>
      );
  }

  // --- 3. HARDWARE ALERTS ---
  if (batteryLevel !== null && batteryLevel < 15 && !isCharging) {
      alerts.push(
          <div key="batt" className="bg-amber-500 text-amber-950 px-4 py-1 text-[9px] font-black flex items-center justify-center gap-2">
              <BatteryWarning className="w-3 h-3" />
              <span>BATERÍA BAJA ({batteryLevel.toFixed(0)}%)</span>
          </div>
      );
  }

  if (storageCritical) {
      alerts.push(
          <div key="store" className="bg-rose-600 text-white px-4 py-1 text-[9px] font-black flex items-center justify-center gap-2">
              <HardDrive className="w-3 h-3" />
              <span>MEMORIA CASI LLENA - SINCRONICE PRONTO</span>
          </div>
      );
  }

  if (alerts.length === 0) return null;

  return (
      <div className="fixed top-0 left-0 right-0 z-[100] shadow-2xl flex flex-col pointer-events-none">
          {alerts}
      </div>
  );
};
