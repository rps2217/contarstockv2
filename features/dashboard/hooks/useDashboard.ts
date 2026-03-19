import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ScanRepository } from '../../../repositories/ScanRepository';

export const useDashboard = () => {
  const navigate = useNavigate();
  
  const stats = useLiveQuery(async () => {
    const today = new Date().setHours(0,0,0,0);
    const scansToday = await ScanRepository.getScansToday(today);
    const pendingSync = await ScanRepository.getPendingSyncCount();
    return { scansToday, pendingSync };
  }, [], { scansToday: 0, pendingSync: 0 });

  const operatorId = localStorage.getItem('logicount_operator_id') || 'SIN_IDENTIFICAR';
  const isSyncNeeded = (stats?.pendingSync || 0) > 0;

  return {
    stats,
    operatorId,
    isSyncNeeded,
    navigate
  };
};
