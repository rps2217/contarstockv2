
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Scan, Database, History, Cloud, Settings, CalendarClock } from 'lucide-react';
import { AppSettings } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { ScanRepository } from '../repositories/ScanRepository';
import { db } from '../db';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSyncStore } from '@/stores';
import { SmartDock, SmartDockItem } from './SmartDock';

// Navegación simplificada estilo AppSheet (5 items para móvil)
const MOBILE_NAV = [
  { id: 'dashboard', label: 'Panel', icon: Home, path: '/' },
  { id: 'counting', label: 'Contar', icon: Scan, path: '/massive' },
  { id: 'expiry', label: 'Vencim.', icon: CalendarClock, path: '/expiry' },
  { id: 'data', label: 'Datos', icon: Database, path: '/data' },
  { id: 'settings', label: 'Ajustes', icon: Settings, path: '/settings' },
];

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

  // Determinar qué item está activo basándose en la ruta actual
  const getActiveId = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'dashboard';
    if (path.startsWith('/massive') || path.startsWith('/counting')) return 'counting';
    if (path.startsWith('/data')) return 'data';
    if (path.startsWith('/reports')) return 'reports';
    if (path.startsWith('/expiry')) return 'expiry';
    if (path.startsWith('/sync')) return 'sync';
    if (path.startsWith('/settings')) return 'settings';
    return 'dashboard';
  };

  const activeId = getActiveId();

  const dockItems: SmartDockItem[] = MOBILE_NAV.map(item => {
    const isActive = activeId === item.id;

    // Badge para sync
    let badge = 0;
    let badgeStyle: 'default' | 'error' | 'warning' = 'default';
    if (item.id === 'counting' && totalPending > 0) {
      badge = totalPending;
      badgeStyle = 'warning';
    }

    return {
      id: item.id,
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
