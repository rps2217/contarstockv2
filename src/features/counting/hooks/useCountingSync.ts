import { useEffect } from 'react';
import { db } from '../../../db';
import { supabaseSyncService } from '../../../services/supabaseSyncService';
import type { LocalTableRepository } from '../../../services/supabaseSyncService';

export const useCountingSync = (sessionId: string | undefined) => {
  useEffect(() => {
    if (!sessionId) return;
    
    const unsubSession = supabaseSyncService.startFilteredSync('SESSIONS', db.sessions as unknown as LocalTableRepository, 'id', sessionId);
    const unsubScans = supabaseSyncService.startFilteredSync('CONTEOS', db.scans as unknown as LocalTableRepository, 'sessionId', sessionId);
    
    return () => {
      unsubSession();
      unsubScans();
    };
  }, [sessionId]);
};
