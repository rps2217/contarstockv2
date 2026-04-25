import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useEffect } from 'react';
import { ScanRepository } from '../../../repositories/ScanRepository';
import { ExpectedOrderRepository } from '../../../repositories/ExpectedOrderRepository';
import { db } from '../../../db';
import { syncFSM, SyncStatus } from '../../../services/syncFSM';

export const useDashboard = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: 'IDLE', pendingCount: 0 });

  useEffect(() => {
    return syncFSM.subscribe(setSyncStatus);
  }, []);
  
  const stats = useLiveQuery(async () => {
    const today = new Date().setHours(0,0,0,0);
    const scansToday = await ScanRepository.getScansToday(today);
    const pendingSync = await ScanRepository.getPendingSyncCount();
    const history = await ScanRepository.getScansLast7Days();
    return { scansToday, pendingSync, history };
  }, [], { scansToday: 0, pendingSync: 0, history: [] });

  const dynamicStats = useLiveQuery(async () => {
    const pending = await db.dynamic_data.where('syncStatus').equals('pending').count();
    const error = await db.dynamic_data.where('syncStatus').equals('error').count();
    return { pending, error };
  }, [], { pending: 0, error: 0 });

  const pendingOrders = useLiveQuery(() => ExpectedOrderRepository.getAll(), [], []);

  const operatorId = localStorage.getItem('logicount_operator_id') || 'SIN_IDENTIFICAR';
  const isSyncNeeded = (stats?.pendingSync || 0) > 0 || (dynamicStats?.pending || 0) > 0;

  return {
    stats,
    dynamicStats,
    operatorId,
    isSyncNeeded,
    syncStatus,
    pendingOrders,
    triggerSync: () => syncFSM.runSync()
  };
};

// Forced GitHub sync
