import { useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { SessionRepository } from '../../../repositories/SessionRepository';
import { ScanRepository } from '../../../repositories/ScanRepository';
import { CountingSession } from '../../../types';
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
      exportToCSV
    }
  };
};
