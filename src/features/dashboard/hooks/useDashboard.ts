import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useEffect } from 'react';
import { ScanRepository } from '../../../repositories/ScanRepository';
import { AnalyticService } from '../../../services/analyticService';
import { ExpectedOrderRepository } from '../../../repositories/ExpectedOrderRepository';
import { legacySyncWrapper, LegacySyncStatus } from '../../../services/sync/fsm';

import { dynamicDataRepository } from '../../../repositories/DynamicDataRepository';

export const useDashboard = () => {
  const [syncStatus, setSyncStatus] = useState<LegacySyncStatus>({ state: 'IDLE', pendingCount: 0 });

  useEffect(() => {
    return legacySyncWrapper.subscribe(setSyncStatus);
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

  return {
    stats,
    dynamicStats,
    operatorId,
    isSyncNeeded,
    syncStatus,
    pendingOrders,
    triggerSync: () => legacySyncWrapper.runSync()
  };
};

