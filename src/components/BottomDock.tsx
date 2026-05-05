
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Database, History, Cloud, Container, Settings, FileText, Calendar, ShieldCheck, Users } from 'lucide-react';
import { AppSettings, ViewState } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { ScanRepository } from '../repositories/ScanRepository';
import { db } from '../db';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useExpiryStore } from '../store/useExpiryStore';
import { SmartDock, SmartDockItem } from './SmartDock';

interface Props {
  currentView: string;
  settings: AppSettings;
}

export const BottomDock: React.FC<Props> = ({ currentView, settings }) => {
  const navigate = useNavigate();
  const isOnline = useNetworkStatus();
  const pendingScans = useLiveQuery(() => ScanRepository.getPendingSyncCount(), [], 0);
  const pendingSessions = useLiveQuery(() => db.sessions.where('syncStatus').equals('pending').count(), [], 0);
  const pendingDynamic = useLiveQuery(() => db.dynamic_data.where('syncStatus').anyOf(['pending', 'error']).count(), [], 0);
  const totalPending = pendingScans + pendingSessions + pendingDynamic;
  const alertCount = useExpiryStore(state => state.alertCount);

  const iconMap: Record<string, { label: string, icon: any, path: string }> = {
    'dashboard': { label: 'INICIO', icon: Home, path: '/dashboard' },
    'reception': { label: 'RECEPCIÓN', icon: Container, path: '/reception' },
    'reports': { label: 'HISTORIAL', icon: History, path: '/reports' },
    'database': { label: 'CATÁLOGO', icon: Database, path: '/database' },
    'compliance': { label: 'RIESGO', icon: ShieldCheck, path: '/compliance' },
    'providers': { label: 'PROV.', icon: Container, path: '/providers' },
    'customers': { label: 'CLIENTES', icon: Users, path: '/customers' },
    'sync': { label: 'NUBE', icon: Cloud, path: '/sync' },
    'expiry': { label: 'VENCIMIENTOS', icon: Calendar, path: '/expiry' },
    'events': { label: 'EVENTOS', icon: FileText, path: '/events' },
    'settings': { label: 'AJUSTES', icon: Settings, path: '/settings' }
  };

  const activeNavKeys = (settings.mobileNavConfig || ['dashboard', 'sync', 'settings']).filter(k => k in iconMap);

  const dockItems: SmartDockItem[] = activeNavKeys.map(key => {
    const item = iconMap[key as ViewState];
    const isActive = currentView === key;

    let badge = 0;
    let badgeStyle: 'default' | 'error' | 'warning' = 'default';

    if (key === 'sync' && totalPending > 0) {
      badge = totalPending;
      badgeStyle = 'warning';
    } else if (key === 'expiry' && alertCount > 0) {
      badge = alertCount;
      badgeStyle = 'error';
    }

    return {
      id: key,
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

