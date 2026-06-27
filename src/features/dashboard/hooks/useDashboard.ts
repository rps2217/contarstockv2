import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useEffect } from 'react';
import { db } from '../../../db';
import { ScanRepository } from '../../../repositories/ScanRepository';
import { ProductRepository } from '../../../repositories/ProductRepository';
import { SessionRepository } from '../../../repositories/SessionRepository';
import { ExpiryRepository } from '../../../repositories/ExpiryRepository';
import { AnalyticService } from '../../../services/analyticService';
import { ExpectedOrderRepository } from '../../../repositories/ExpectedOrderRepository';
import { legacySyncWrapper, LegacySyncStatus } from '../../../services/sync/fsm';
import { useSyncStore } from '@/stores';

import { dynamicDataRepository } from '../../../repositories/DynamicDataRepository';

export interface ActivityItem {
  id: string;
  icon: string;
  iconColor: string;
  title: string;
  time: string;
  user?: string;
  count?: number;
  countLabel?: string;
  onClick?: () => void;
}

export const useDashboard = () => {
  const [syncStatus, setSyncStatus] = useState<LegacySyncStatus>({ state: 'IDLE', pendingCount: 0, lastSync: 0 });
  const { pendingItems, isSupabaseConnected } = useSyncStore();

  useEffect(() => {
    return legacySyncWrapper.subscribe((newStatus: LegacySyncStatus) => {
      setSyncStatus(newStatus);
    });
  }, []);
  
  const stats = useLiveQuery(async () => {
    const [scansToday, history, pendingSync] = await Promise.all([
      AnalyticService.getTotalUnitsToday(),
      AnalyticService.getWeeklyTrend(),
      ScanRepository.getPendingSyncCount()
    ]);
    
    return { scansToday, pendingSync, history };
  }, [], { scansToday: 0, pendingSync: 0, history: [] });

  const dynamicStats = useLiveQuery(async () => {
    const pending = await dynamicDataRepository.getPendingCount();
    const error = await dynamicDataRepository.getErrorCount();
    return { pending, error };
  }, [], { pending: 0, error: 0 });

  const pendingOrders = useLiveQuery(() => ExpectedOrderRepository.getAll(), [], []);

  const operatorId = localStorage.getItem('logicount_operator_id') || 'SIN_IDENTIFICAR';
  const isSyncNeeded = (stats?.pendingSync || 0) > 0 || (dynamicStats?.pending || 0) > 0;

  // Total de items en inventario
  const totalItems = useLiveQuery(async () => {
    return await db.products.count();
  }, [], 0);

  // Items próximos a vencer (próximos 7 días)
  const expiringItems = useLiveQuery(async () => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const expiryTableName = 'VENCIMIENTOS';
    const records = await db.dynamic_data
      .where('tableName')
      .equals(expiryTableName)
      .toArray();
    
    return records.filter(r => {
      const data = r.data || {};
      const mm = data.mm;
      const yyyy = data.yyyy;
      if (!mm || !yyyy) return false;
      
      const expiryDate = new Date(yyyy, mm - 1);
      return expiryDate >= now && expiryDate <= nextWeek;
    }).length;
  }, [], 0);

  // Actividad reciente
  const recentActivity = useLiveQuery(async (): Promise<ActivityItem[]> => {
    const activities: ActivityItem[] = [];
    
    // Sesiones recientes
    const recentSessions = await SessionRepository.getRecent(5);
    for (const session of recentSessions) {
      const timeAgo = getTimeAgo(session.createdAt);
      let icon = 'C';
      let iconColor = 'blue';
      let title = 'Sesión de conteo';
      let count = session.totalUnits || session.totalSKUs || 0;
      
      if (session.sessionType === 'reception') {
        icon = 'S';
        iconColor = 'emerald';
        title = `Stock recibido (${session.erpOrder || 'Recepción'})`;
      } else if (session.sessionType === 'hammer') {
        icon = 'H';
        iconColor = 'amber';
        title = 'Modo ráfaga completado';
      }
      
      activities.push({
        id: session.id,
        icon,
        iconColor,
        title,
        time: timeAgo,
        user: session.operatorId ? `${session.operatorId}.` : undefined,
        count,
        countLabel: 'Ítems'
      });
    }
    
    // Ordenes esperadas recientes
    const pendingOrdersData = await ExpectedOrderRepository.getAll();
    for (const order of pendingOrdersData.slice(0, 3)) {
      activities.push({
        id: order.id || order.internalId,
        icon: 'O',
        iconColor: 'purple',
        title: `Orden esperada: ${order.metadata?.purchaseOrder || order.internalId}`,
        time: getTimeAgo(order.importedAt || Date.now()),
        count: order.items?.length || 0,
        countLabel: 'Ítems'
      });
    }
    
    // Ordenar por más reciente
    return activities.sort((a, b) => {
      const sessionA = recentSessions.find(s => s.id === a.id);
      const sessionB = recentSessions.find(s => s.id === b.id);
      const timeA = sessionA?.createdAt || 0;
      const timeB = sessionB?.createdAt || 0;
      return timeB - timeA;
    }).slice(0, 5);
  }, [], []);

  return {
    stats,
    dynamicStats,
    operatorId,
    isSyncNeeded,
    syncStatus,
    pendingOrders,
    totalItems,
    expiringItems,
    recentActivity,
    pendingSyncCount: pendingItems,
    isOnline: isSupabaseConnected,
    triggerSync: () => legacySyncWrapper.runSync()
  };
};

// Helper para formatear tiempo relativo
function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  if (hours < 24) return `hace ${hours} horas`;
  if (days === 1) return 'Ayer';
  if (days < 7) return `hace ${days} días`;
  return new Date(timestamp).toLocaleDateString('es-ES');
}

