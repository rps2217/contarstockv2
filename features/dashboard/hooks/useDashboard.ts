import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ScanRepository } from '../../../repositories/ScanRepository';
import { MassiveDbRepository } from '../../../repositories/MassiveDbRepository';

export const useDashboard = () => {
  const navigate = useNavigate();
  const [isEnteringMartillo, setIsEnteringMartillo] = useState(false);
  
  const stats = useLiveQuery(async () => {
    const today = new Date().setHours(0,0,0,0);
    const scansToday = await ScanRepository.getScansToday(today);
    const pendingSync = await ScanRepository.getPendingSyncCount();
    return { scansToday, pendingSync };
  }, [], { scansToday: 0, pendingSync: 0 });

  const operatorId = localStorage.getItem('logicount_operator_id') || 'SIN_IDENTIFICAR';
  const isSyncNeeded = (stats?.pendingSync || 0) > 0;

  const handleEnterMartillo = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsEnteringMartillo(true);
    try {
      // Intentamos recuperar la última sesión martillo activa o creamos una nueva
      const lastScan = await MassiveDbRepository.getLastBlindScan();
      const lastManifest = await MassiveDbRepository.getFirstBlindManifest();
      const activeBatchId = lastScan?.batchId || lastManifest?.batchId || `MARTILLO-${Date.now()}`;
      navigate(`/massive/${activeBatchId}`);
    } catch (e) {
      navigate(`/massive/MARTILLO-${Date.now()}`);
    } finally {
      setIsEnteringMartillo(false);
    }
  };

  return {
    stats,
    operatorId,
    isSyncNeeded,
    isEnteringMartillo,
    handleEnterMartillo,
    navigate
  };
};
