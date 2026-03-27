import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ScanRepository } from '../../../repositories/ScanRepository';
import { ExpectedOrderRepository } from '../../../repositories/ExpectedOrderRepository';
import { db } from '../../../db';

export const useDashboard = () => {
  const navigate = useNavigate();
  
  const stats = useLiveQuery(async () => {
    const today = new Date().setHours(0,0,0,0);
    const scansToday = await ScanRepository.getScansToday(today);
    const pendingSync = await ScanRepository.getPendingSyncCount();
    return { scansToday, pendingSync };
  }, [], { scansToday: 0, pendingSync: 0 });

  const dynamicStats = useLiveQuery(async () => {
    const pending = await db.dynamic_data.where('syncStatus').equals('pending').count();
    const error = await db.dynamic_data.where('syncStatus').equals('error').count();
    return { pending, error };
  }, [], { pending: 0, error: 0 });

  const pendingOrders = useLiveQuery(() => db.expectedOrders.toArray(), [], []);

  const operatorId = localStorage.getItem('logicount_operator_id') || 'SIN_IDENTIFICAR';
  const isSyncNeeded = (stats?.pendingSync || 0) > 0 || (dynamicStats?.pending || 0) > 0;

  return {
    stats,
    dynamicStats,
    operatorId,
    isSyncNeeded,
    pendingOrders,
    navigate
  };
};
