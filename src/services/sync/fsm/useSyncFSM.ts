/**
 * useSyncFSM - Hook de React para la FSM de sincronización
 * 
 * Proporciona estado y controles para componentes UI.
 */

import { useEffect, useState, useCallback } from 'react';
import { syncFSM } from './SyncFSM';
import type { SyncState, SyncContext } from './types';

interface UseSyncFSMResult {
  state: SyncState;
  context: SyncContext;
  isRunning: boolean;
  canStart: boolean;
  canRetry: boolean;
  canReset: boolean;
  progress: number;
  error?: string;
  start: () => void;
  retry: () => void;
  reset: () => void;
}

export function useSyncFSM(): UseSyncFSMResult {
  const [state, setState] = useState<SyncState>(syncFSM.getState());
  const [context, setContext] = useState<SyncContext>(syncFSM.getContext());

  useEffect(() => {
    return syncFSM.subscribe((newState, newContext) => {
      setState(newState);
      setContext(newContext);
    });
  }, []);

  const canRetry = state === 'error' && context.retryCount < 3;
  const canReset = state === 'error' || state === 'success';
  const canStart = state === 'idle' || state === 'success';

  return {
    state,
    context,
    isRunning: syncFSM.isRunning(),
    canStart,
    canRetry,
    canReset,
    progress: context.progress,
    error: context.error,
    start: useCallback(() => syncFSM.dispatch({ type: 'START' }), []),
    retry: useCallback(() => syncFSM.dispatch({ type: 'RETRY' }), []),
    reset: useCallback(() => syncFSM.reset(), []),
  };
}
