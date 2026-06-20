
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Database, History, Cloud, Container, Settings, FileText, Calendar, ShieldCheck, Users, Layers } from 'lucide-react';
import { AppSettings, ViewState } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { ScanRepository } from '../repositories/ScanRepository';
import { db } from '../db';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useExpiryStore } from '@/stores';
import { SmartDock, SmartDockItem } from './SmartDock';
import { isModuleEnabled } from '../services/moduleManager';

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
    'database': { label: 'CATÁLOGO', icon: Database, path: '/database' },
    'reception': { label: 'RECEPCIÓN', icon: Container, path: '/reception' },
    'expiry': { label: 'VENCIMIENTOS', icon: Calendar, path: '/expiry' },
    'events': { label: 'EVENTOS', icon: FileText, path: '/events' },
    'reports': { label: 'HISTORIAL', icon: History, path: '/reports' },
    'compliance': { label: 'RIESGO', icon: ShieldCheck, path: '/compliance' },
    'customers': { label: 'CLIENTES', icon: Users, path: '/customers' },
    'providers': { label: 'PROV.', icon: Container, path: '/providers' },
    'slices': { label: 'VISTAS', icon: Layers, path: '/slices' },
    'sync': { label: 'NUBE', icon: Cloud, path: '/sync' },
    'settings': { label: 'AJUSTES', icon: Settings, path: '/settings' }
  };

  // List all available modules in a logical order
  const allNavKeys: string[] = [
    'dashboard',
    'database',
    'reception',
    'expiry',
    'events',
    'reports',
    'compliance',
    'customers',
    'providers',
    'slices',
    'sync',
    'settings'
  ];

  // Filter keys based on module toggle
  const activeNavKeys = allNavKeys.filter(key => {
    // These keys are always enabled/not toggled by modules
    if (key === 'dashboard' || key === 'compliance' || key === 'customers' || key === 'providers' || key === 'settings' || key === 'slices') {
      return true;
    }
    // Check if the specific module is enabled
    return isModuleEnabled(key);
  });

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

