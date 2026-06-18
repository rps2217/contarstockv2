import React, { useEffect, useCallback, useRef, useState } from 'react';
import { syncFSM, SyncFSM } from './SyncFSM';
import type { SyncState, SyncEvent, SyncContext, UploadGroup } from './types';
import { useSyncStore } from '../../../store/useSyncStore';

/**
 * Hook para integrar la FSM de sync con React
 */
export function useSyncFSM() {
  const fsmRef = useRef<SyncFSM>(syncFSM);
  const { 
    isSyncing, 
    setSyncing,
    setSyncError,
    addIncident,
    clearIncidents 
  } = useSyncStore();

  const [state, setState] = useState<SyncState>(syncFSM.getState());
  const [context, setContext] = useState<SyncContext>(syncFSM.getContext());

  useEffect(() => {
    const unsubscribe = fsmRef.current.subscribe((newState, newContext) => {
      setState(newState);
      setContext(newContext);

      // Sincronizar con Zustand store
      setSyncing(fsmRef.current.isRunning());
      
      if (newState === 'error' && newContext.lastError) {
        setSyncError(newContext.lastError);
        addIncident('sync', newContext.lastError);
      }
      
      if (newState === 'success') {
        setSyncError(null);
      }
    });

    return unsubscribe;
  }, [setSyncing, setSyncError, addIncident]);

  const dispatch = useCallback((event: SyncEvent) => {
    return fsmRef.current.handle(event);
  }, []);

  const startSync = useCallback(() => {
    clearIncidents();
    return dispatch({ type: 'START_SYNC' });
  }, [dispatch, clearIncidents]);

  const cancelSync = useCallback(() => {
    return dispatch({ type: 'CANCEL' });
  }, [dispatch]);

  const retrySync = useCallback(() => {
    return dispatch({ type: 'RETRY' });
  }, [dispatch]);

  const setCurrentGroup = useCallback((group: UploadGroup) => {
    setContext(prev => ({ ...prev, currentGroup: group }));
  }, []);

  const updateProgress = useCallback((processed: number, pending: number) => {
    setContext(prev => ({ 
      ...prev, 
      processedCount: processed,
      pendingCount: pending,
    }));
  }, []);

  return {
    state,
    context,
    isRunning: fsmRef.current.isRunning(),
    canStart: fsmRef.current.canStart(),
    dispatch,
    startSync,
    cancelSync,
    retrySync,
    setCurrentGroup,
    updateProgress,
    getResult: () => fsmRef.current.getResult(),
    reset: () => fsmRef.current.reset(),
  };
}
