
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppSettings } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { ScanRepository } from '../repositories/ScanRepository';
import { db } from '../db';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSyncStore } from '@/stores';
import { SmartDock, SmartDockItem } from './SmartDock';
import { MAIN_NAV, getActiveNavKey } from '@/config/navigation';

interface Props {
  currentView: string;
  settings: AppSettings;
}

export const BottomDock: React.FC<Props> = ({ currentView, settings }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isOnline = useNetworkStatus();
  const { pendingItems } = useSyncStore();
  
  // Calcular items pendientes de sincronización
  const pendingScans = useLiveQuery(() => ScanRepository.getPendingSyncCount(), [], 0);
  const pendingSessions = useLiveQuery(() => db.sessions.where('syncStatus').equals('pending').count(), [], 0);
  const pendingDynamic = useLiveQuery(() => db.dynamic_data.where('syncStatus').anyOf(['pending', 'error']).count(), [], 0);
  const totalPending = pendingScans + pendingSessions + pendingDynamic;

  // Item activo resuelto con la lógica compartida (coincide con el Sidebar)
  const activeId = getActiveNavKey(location.pathname);

  const dockItems: SmartDockItem[] = MAIN_NAV.map(item => {
    const isActive = activeId === item.key;

    // Badge para sync
    let badge = 0;
    let badgeStyle: 'default' | 'error' | 'warning' = 'default';
    if (item.key === 'sync' && totalPending > 0) {
      badge = totalPending;
      badgeStyle = 'warning';
    }

    return {
      id: item.key,
      label: item.label,
      icon: item.icon,
      onClick: () => navigate(item.path),
      isActive,
      badge,
      badgeStyle
    };
  });

  return (
    <div className="relative">
      <SmartDock items={dockItems} variant="global" />
      {/* Network Status Indicator */}
      <div className={`fixed bottom-12 right-4 w-2 h-2 rounded-full z-[101] ${isOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} title={isOnline ? 'Online' : 'Offline'}></div>
    </div>
  );
};
