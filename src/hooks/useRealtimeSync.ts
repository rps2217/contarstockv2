import { useEffect } from 'react';
import { supabaseSyncService } from '../services/supabaseSyncService';
import type { Table } from 'dexie';

export const useRealtimeSync = (tableName: string, localTable: Table<unknown>) => {
  useEffect(() => {
    const unsubscribe = supabaseSyncService.startSync(tableName, localTable);
    return () => unsubscribe();
  }, [tableName, localTable]);
};

