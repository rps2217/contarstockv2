import { useEffect } from 'react';
import { db } from '../../../db';
import { supabaseSyncService } from '../../../services/supabaseSyncService';

export const useCountingSync = (sessionId: string | undefined) => {
  useEffect(() => {
    if (!sessionId) return;
    
    const unsubSession = supabaseSyncService.startFilteredSync('SESSIONS', db.sessions, 'id', sessionId);
    const unsubScans = supabaseSyncService.startFilteredSync('CONTEOS', db.scans, 'sessionId', sessionId);
    
    return () => {
      unsubSession();
      unsubScans();
    };
  }, [sessionId]);
};
