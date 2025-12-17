
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Battery, BatteryCharging, BatteryWarning, HardDrive, AlertOctagon } from 'lucide-react';

export const SystemStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);
  
  // Battery State
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  
  // Storage State
  const [storageCritical, setStorageCritical] = useState(false);

  useEffect(() => {
    // --- NETWORK LISTENERS ---
    const handleOnline = () => {
      setIsOnline(true);
      setShowBackOnline(true);
      setTimeout(() => setShowBackOnline(false), 3000);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // --- BATTERY LISTENERS ---
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

    // --- STORAGE CHECK ---
    const checkStorage = async () => {
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const { usage, quota } = await navigator.storage.estimate();
                if (usage && quota) {
                    const percent = (usage / quota) * 100;
                    if (percent > 85) setStorageCritical(true);
                }
            } catch (e) {
                console.warn("Storage check failed", e);
            }
        }
    };
    checkStorage();
    const storageInterval = setInterval(checkStorage, 30000); // Check every 30s

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

  // --- RENDERING LOGIC ---

  const alerts = [];

  // 1. Critical Battery
  if (batteryLevel !== null && batteryLevel < 15 && !isCharging) {
      alerts.push(
          <div key="batt" className="bg-red-600 text-white px-4 py-1 text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
              <BatteryWarning className="w-3 h-3" />
              <span>BATERÍA CRÍTICA ({batteryLevel.toFixed(0)}%) - Guarde cambios</span>
          </div>
      );
  }

  // 2. Critical Storage
  if (storageCritical) {
      alerts.push(
          <div key="store" className="bg-amber-600 text-white px-4 py-1 text-xs font-bold flex items-center justify-center gap-2">
              <HardDrive className="w-3 h-3" />
              <span>ALMACENAMIENTO LLENO - Limpie historial</span>
          </div>
      );
  }

  // 3. Offline Mode
  if (!isOnline) {
      alerts.push(
          <div key="net" className="bg-slate-800 text-slate-300 px-4 py-1 text-xs font-bold flex items-center justify-center gap-2 border-b border-slate-700">
              <WifiOff className="w-3 h-3" />
              <span>MODO OFFLINE</span>
          </div>
      );
  } else if (showBackOnline) {
      alerts.push(
          <div key="net-back" className="bg-emerald-600 text-white px-4 py-1 text-xs font-bold flex items-center justify-center gap-2 animate-in slide-in-from-top-full fade-out duration-1000">
              <Wifi className="w-3 h-3" />
              <span>EN LÍNEA</span>
          </div>
      );
  }

  if (alerts.length === 0) return null;

  return (
      <div className="fixed top-0 left-0 right-0 z-[100] shadow-md flex flex-col">
          {alerts}
      </div>
  );
};
