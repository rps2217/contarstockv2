import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { massiveDb } from '../db.massive';

export const useDashboard = () => {
  const navigate = useNavigate();
  const [isEnteringMartillo, setIsEnteringMartillo] = useState(false);
  
  const stats = useLiveQuery(async () => {
    const today = new Date().setHours(0,0,0,0);
    const scansToday = await db.scans.where('timestamp').above(today).count();
    const pendingSync = await db.scans.where('synced').equals(0).count();
    return { scansToday, pendingSync };
  }, [], { scansToday: 0, pendingSync: 0 });

  const operatorId = localStorage.getItem('logicount_operator_id') || 'SIN_IDENTIFICAR';
  const isSyncNeeded = (stats?.pendingSync || 0) > 0;

  const handleEnterMartillo = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsEnteringMartillo(true);
    try {
      // Intentamos recuperar la última sesión martillo activa o creamos una nueva
      const lastScan = await massiveDb.blindScans.orderBy('timestamp').reverse().first();
      const lastManifest = await massiveDb.blindManifests.toCollection().first();
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
