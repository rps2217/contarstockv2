/**
 * useCountingSync - Hook para sincronización en tiempo real de conteos
 * 
 * Usa startFilteredSync para suscripción realtime filtrada por sesión.
 * No requiere GenericSyncEngine ya que es solo lectura en tiempo real.
 * 
 * Maneja errores 406 (tabla no existe o RLS bloquea acceso) gracefully.
 */

import { useEffect, useRef } from 'react';
import { db } from '../../../db';
import { supabaseSyncService } from '../../../services/supabaseSyncService';
import type { LocalTableRepository } from '../../../services/supabaseSyncService';

export const useCountingSync = (sessionId: string | undefined) => {
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (!sessionId || hasSyncedRef.current) return;
    
    let unsubSession: (() => void) | undefined;
    let unsubScans: (() => void) | undefined;
    
    const setupSync = async () => {
      try {
        // Suscripciones realtime filtradas por sesión
        unsubSession = supabaseSyncService.startFilteredSync(
          'SESSIONS', 
          db.sessions as unknown as LocalTableRepository, 
          'id', 
          sessionId
        );
        
        unsubScans = supabaseSyncService.startFilteredSync(
          'CONTEOS', 
          db.scans as unknown as LocalTableRepository, 
          'sessionId', 
          sessionId
        );
        
        hasSyncedRef.current = true;
      } catch (error) {
        // Silenciar errores 406 - tabla no existe o RLS bloquea
        if (error instanceof Error && error.message.includes('406')) {
          console.warn('[useCountingSync] SESSIONS table not available, skipping realtime sync');
        }
      }
    };
    
    setupSync();
    
    return () => {
      if (unsubSession) unsubSession();
      if (unsubScans) unsubScans();
    };
  }, [sessionId]);
};
