import { useEffect } from 'react';
import { supabaseSyncService } from '../services/supabaseSyncService';
import type { LocalTableRepository } from '../services/supabaseSyncService';

export const useRealtimeSync = (tableName: string, localTable: LocalTableRepository) => {
  useEffect(() => {
    const unsubscribe = supabaseSyncService.startSync(tableName, localTable);
    return () => unsubscribe();
  }, [tableName, localTable]);
};

