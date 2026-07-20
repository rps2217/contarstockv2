/**
 * useWriteQueue - Hook para manejar escritura en cola
 *
 * Responsabilidad: Abstrae el batching y retry de writes a la BD
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { HammerDbRepository } from '../../../repositories/HammerDbRepository';
import { pushScansToCloud } from '../../../services/hammerSync';
import { logger } from '@/services/logger';

interface WriteQueueItem {
  barcode: string;
  qty: number;
  loc: string;
  ts: number;
}

interface UseWriteQueueOptions {
  batchId: string;
  autoSyncEnabled: boolean;
  onSyncSuccess?: () => void;
  onSyncError?: (error: string) => void;
}

interface UseWriteQueueReturn {
  pendingWrites: number;
  syncError: string | null;
  isSyncing: boolean;
  addToQueue: (item: WriteQueueItem) => void;
  flushQueue: () => Promise<void>;
  retrySync: () => Promise<void>;
}

const MAX_RETRIES = 3;
const BATCH_INTERVAL = 400;

export function useWriteQueue({
  batchId,
  autoSyncEnabled,
  onSyncSuccess,
  onSyncError,
}: UseWriteQueueOptions): UseWriteQueueReturn {
  const [pendingWrites, setPendingWrites] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const queueRef = useRef<WriteQueueItem[]>([]);
  const autoSyncRef = useRef(autoSyncEnabled);
  const retryCountRef = useRef(0);

  useEffect(() => {
    autoSyncRef.current = autoSyncEnabled;
  }, [autoSyncEnabled]);

  const pushWithRetry = useCallback(
    async (attempt = 0): Promise<void> => {
      try {
        await pushScansToCloud(batchId);
        retryCountRef.current = 0;
        setSyncError(null);
        onSyncSuccess?.();
      } catch (err: unknown) {
        if (attempt < MAX_RETRIES) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
          await new Promise(resolve => setTimeout(resolve, delay));
          return pushWithRetry(attempt + 1);
        }
        setSyncError('Error de sincronización');
        onSyncError?.('Error de sincronización');
        throw err;
      }
    },
    [batchId, onSyncSuccess, onSyncError]
  );

  const flushQueue = useCallback(async () => {
    if (queueRef.current.length === 0) return;

    const batch = [...queueRef.current];
    queueRef.current = [];
    setPendingWrites(prev => prev + batch.length);

    try {
      const aggregatedBatch = batch.reduce(
        (acc, curr) => {
          const key = `${curr.barcode}_${curr.loc}`;
          if (!acc[key]) {
            acc[key] = { ...curr };
          } else {
            acc[key].qty += curr.qty;
            acc[key].ts = Math.max(acc[key].ts, curr.ts);
          }
          return acc;
        },
        {} as Record<string, WriteQueueItem>
      );

      const mergedScans = Object.values(aggregatedBatch).filter(b => b.qty !== 0);

      if (mergedScans.length > 0) {
        await HammerDbRepository.bulkAddBlindScans(
          mergedScans.map(b => ({
            batchId,
            barcode: b.barcode,
            quantity: b.qty,
            location: b.loc,
            timestamp: b.ts,
          }))
        );
      }

      setPendingWrites(prev => Math.max(0, prev - mergedScans.length));
      setSyncError(null);
      retryCountRef.current = 0;

      if (autoSyncRef.current && mergedScans.length > 0) {
        pushWithRetry().catch(err => {
          logger.error(
            'useWriteQueue',
            'Auto-sync failed after batch write',
            err instanceof Error ? err.message : String(err)
          );
        });
      }
    } catch (e: unknown) {
      queueRef.current = [...batch, ...queueRef.current];
      setSyncError('Error de escritura local');
      onSyncError?.('Error de escritura local');
    }
  }, [batchId, pushWithRetry, onSyncError]);

  const addToQueue = useCallback((item: WriteQueueItem) => {
    queueRef.current.push(item);
  }, []);

  const retrySync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await pushScansToCloud(batchId);
      setSyncError(null);
      onSyncSuccess?.();
    } catch (e: unknown) {
      setSyncError('Error de sincronización');
      onSyncError?.('Error de sincronización');
    } finally {
      setIsSyncing(false);
    }
  }, [batchId, isSyncing, onSyncSuccess, onSyncError]);

  // Flush queue periodically
  useEffect(() => {
    const timer = setInterval(flushQueue, BATCH_INTERVAL);
    return () => clearInterval(timer);
  }, [flushQueue]);

  return {
    pendingWrites,
    syncError,
    isSyncing,
    addToQueue,
    flushQueue,
    retrySync,
  };
}
