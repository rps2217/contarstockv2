/**
 * useDashboardMetrics - Hook para métricas del Dashboard
 * 
 * Carga métricas de forma lazy y memoizada para evitar re-renders innecesarios.
 */

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';

export interface DashboardMetrics {
  productCount: number;
  customerCount: number;
  providerCount: number;
  sessionCount: number;
  scanCount: number;
  syncQueueCount: number;
  todaySessions: number;
  expiryMetrics: ExpiryMetrics;
}

export interface ExpiryMetrics {
  expired: number;
  critical: number;
  warning: number;
  safe: number;
  total: number;
}

// Safe count helper
const safeCount = async (table: any): Promise<number> => {
  try {
    if (!table) return 0;
    return await table.count();
  } catch {
    return 0;
  }
};

export function useDashboardMetrics(): DashboardMetrics {
  // Queries individuales memoizadas
  const productCount = useLiveQuery(async () => {
    return safeCount(db?.products);
  }, [], 0);
  
  const customerCount = useLiveQuery(async () => {
    return safeCount(db?.customers);
  }, [], 0);
  
  const providerCount = useLiveQuery(async () => {
    return safeCount(db?.providers);
  }, [], 0);
  
  const sessionCount = useLiveQuery(async () => {
    return safeCount(db?.sessions);
  }, [], 0);
  
  const scanCount = useLiveQuery(async () => {
    return safeCount(db?.scans);
  }, [], 0);
  
  const syncQueueCount = useLiveQuery(async () => {
    return safeCount(db?.syncQueue);
  }, [], 0);
  
  // Sesiones de hoy
  const todaySessions = useLiveQuery(async () => {
    try {
      if (!db?.sessions) return 0;
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const sessions = await db.sessions.where('createdAt').above(startOfDay.getTime()).toArray();
      return sessions.filter(s => s.status === 'completed').length;
    } catch { return 0; }
  }, [], 0);
  
  // Métricas de vencimiento
  const expiryMetrics = useLiveQuery(async () => {
    try {
      if (!db) return { expired: 0, critical: 0, warning: 0, safe: 0, total: 0 };
      const expirations = await db.table('expirations').toArray() as any[];
      
      let expired = 0, critical = 0, warning = 0, safe = 0;
      
      expirations.forEach(e => {
        const daysLeft = e.daysLeft ?? 0;
        if (daysLeft < 0) expired++;
        else if (daysLeft <= 7) critical++;
        else if (daysLeft <= 30) warning++;
        else safe++;
      });
      
      return { expired, critical, warning, safe, total: expirations.length };
    } catch { return { expired: 0, critical: 0, warning: 0, safe: 0, total: 0 }; }
  }, [], { expired: 0, critical: 0, warning: 0, safe: 0, total: 0 });
  
  // Memoizar resultado
  return useMemo(() => ({
    productCount: productCount ?? 0,
    customerCount: customerCount ?? 0,
    providerCount: providerCount ?? 0,
    sessionCount: sessionCount ?? 0,
    scanCount: scanCount ?? 0,
    syncQueueCount: syncQueueCount ?? 0,
    todaySessions: todaySessions ?? 0,
    expiryMetrics,
  }), [
    productCount,
    customerCount,
    providerCount,
    sessionCount,
    scanCount,
    syncQueueCount,
    todaySessions,
    expiryMetrics,
  ]);
}

// Hook simplificado que solo retorna totales
export function useDashboardTotals() {
  const productCount = useLiveQuery(async () => {
    return safeCount(db?.products);
  }, [], 0);
  
  const sessionCount = useLiveQuery(async () => {
    return safeCount(db?.sessions);
  }, [], 0);
  
  const todaySessions = useLiveQuery(async () => {
    try {
      if (!db?.sessions) return 0;
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const sessions = await db.sessions.where('createdAt').above(startOfDay.getTime()).toArray();
      return sessions.filter(s => s.status === 'completed').length;
    } catch { return 0; }
  }, [], 0);
  
  return useMemo(() => ({
    totalProducts: productCount ?? 0,
    totalSessions: sessionCount ?? 0,
    todaySessions: todaySessions ?? 0,
  }), [productCount, sessionCount, todaySessions]);
}

export default useDashboardMetrics;