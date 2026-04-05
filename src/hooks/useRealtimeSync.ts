import { useEffect } from 'react';
import { firebaseSyncService } from '../services/firebaseSyncService';
import { db } from '../db';

export const useRealtimeSync = (tableName: string, localTable: any) => {
  useEffect(() => {
    const unsubscribe = firebaseSyncService.startSync(tableName, localTable);
    return () => unsubscribe();
  }, [tableName, localTable]);
};

// Forced GitHub sync
