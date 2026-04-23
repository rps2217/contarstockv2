import { useEffect } from 'react';
import { supabaseSyncService } from '../services/supabaseSyncService';
import { db } from '../db';

export const useRealtimeSync = (tableName: string, localTable: any) => {
  useEffect(() => {
    const unsubscribe = supabaseSyncService.startSync(tableName, localTable);
    return () => unsubscribe();
  }, [tableName, localTable]);
};

// Forced GitHub sync
