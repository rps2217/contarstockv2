import { useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { SessionRepository } from '../../../repositories/SessionRepository';
import { ScanRepository } from '../../../repositories/ScanRepository';
import { CountingSession } from '../../../types';
import { db } from '../../../db';
import Papa from 'papaparse';
import { format } from 'date-fns';

export const useReceptionHistory = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState(50);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  const startTimestamp = useMemo(() => startDate ? new Date(startDate).getTime() : undefined, [startDate]);
  const endTimestamp = useMemo(() => endDate ? new Date(endDate).getTime() + 86399999 : undefined, [endDate]);

  const sessions = useLiveQuery(
    () => SessionRepository.getReceptionHistory(searchQuery, limit, startTimestamp, endTimestamp),
    [searchQuery, limit, startTimestamp, endTimestamp]
  );

  // Descarga inicial de datos de recepción desde la nube
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  
  const pullCloudData = useCallback(async () => {
    if (isInitialLoading) return;
    setIsInitialLoading(true);
    try {
      const config = (await import('../../../services/settings')).getSettings().cloudConfig;
      const targetTable = config?.receptionTableName || "RECEPCION_BULTOS";
      const { supabaseSyncService } = await import('../../../services/supabaseSyncService');
      const { db } = await import('../../../db');
      
      const response = await supabaseSyncService.pullBatch(targetTable);
      if (response.success && response.rows) {
        const sessionsToPut = response.rows.map((r: any) => ({
          id: r.id || r.ID,
          erpOrder: r.erpOrder || r.ERP_ORDEN || 'RECEPCION_BORRADOR',
          logisticsLabel: r.logisticsLabel || r.ETIQUETA_LOGISTICA || '',
          createdAt: r.createdAt || (r.TIMESTAMP ? new Date(r.TIMESTAMP).getTime() : Date.now()),
          status: r.status || 'completed',
          sessionType: 'reception' as const,
          lastSyncTimestamp: r.lastSyncTimestamp || Date.now(),
          totalUnits: r.totalUnits || 0,
          totalSKUs: r.totalSKUs || 0
        }));

        if (sessionsToPut.length > 0) {
          await db.sessions.bulkPut(sessionsToPut);
        }
      }
    } catch (e) {
      console.error('Error pulling reception data:', e);
    } finally {
      setIsInitialLoading(false);
    }
  }, [isInitialLoading]);

  // Ejecutar descarga al montar el componente
  useState(() => {
    pullCloudData();
  });

  const loadMore = useCallback(() => {
    setLimit(prev => prev + 50);
  }, []);

  const exportToCSV = useCallback(async () => {
    if (!sessions || sessions.length === 0) return;
    setIsExporting(true);
    try {
      const data = sessions.map(s => ({
        'ID': s.id,
        'ERP_ORDEN': s.erpOrder,
        'ETIQUETA_LOGISTICA': s.logisticsLabel,
        'FECHA': format(s.createdAt, 'yyyy-MM-dd'),
        'HORA': format(s.createdAt, 'HH:mm:ss'),
        'ESTADO': s.status,
        'SINCRONIZADO': s.lastSyncTimestamp ? 'SÍ' : 'NO'
      }));

      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `recepcion_bultos_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
  }, [sessions]);

  // Eliminar sesión
  const deleteSession = useCallback(async (id: string | number) => {
    await SessionRepository.delete(String(id));
  }, []);

  // Limpiar todas las sesiones de recepción
  const clearAll = useCallback(async () => {
    const sessionsToDelete = await db.sessions
      .where('sessionType')
      .equals('reception')
      .toArray();
    const ids = sessionsToDelete.map(s => s.id);
    if (ids.length > 0) {
      await db.sessions.bulkDelete(ids);
    }
  }, []);

  return {
    state: {
      sessions,
      searchQuery,
      startDate,
      endDate,
      isExporting,
      hasMore: sessions?.length === limit
    },
    actions: {
      setSearchQuery,
      setStartDate,
      setEndDate,
      loadMore,
      exportToCSV,
      deleteSession,
      clearAll
    }
  };
};
