/**
 * useBulkOperations - Hook para operaciones masivas con deshacer y dry-run
 * 
 * Funcionalidades:
 * - Sistema de deshacer (undo)
 * - Modo dry-run para previsualizar cambios
 * - Historial de operaciones
 * - Notificaciones de escritorio
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { logger } from '@/services/logger';
;
import { db } from '@/db';
import { useTaskStore } from '@/stores';
import { toast } from 'sonner';
import { BulkHistoryEntry } from '@/db';

export interface BulkUndoContext<T = any> {
  entry: BulkHistoryEntry;
  items: T[];
  previousValues: Map<string, any>;
  timestamp: number;
  undoAction?: () => Promise<void>;
}

const UNDO_TIMEOUT = 30000; // 30 segundos para deshacer

export interface BulkOperationsConfig<T> {
  module: string;
  actions: Array<{ id: string; label: string }>;
  getItemId: (item: T) => string;
  onUndoAction?: (entry: BulkHistoryEntry, items: T[]) => Promise<void>;
}

export interface UseBulkOperationsReturn<T> {
  // Historial
  history: BulkHistoryEntry[];
  addEntry: (entry: Omit<BulkHistoryEntry, 'id' | 'timestamp' | 'undone' | 'canUndo' | 'undoTimeout'>) => Promise<BulkHistoryEntry | null>;
  markAsUndone: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  
  // Undo
  undoContext: BulkUndoContext | null;
  canUndo: boolean;
  performUndo: () => Promise<void>;
  
  // Dry-run
  isDryRunMode: boolean;
  dryRunResults: DryRunResult | null;
  performDryRun: (actionId: string, items: T[]) => void;
  executeDryRun: (actionId: string, items: T[]) => Promise<void>;
  cancelDryRun: () => void;
  
  // Notificaciones
  canNotify: boolean;
  requestNotificationPermission: () => Promise<void>;
  sendNotification: (title: string, options?: NotificationOptions) => Notification | null;
}

export interface DryRunResult {
  actionId: string;
  affected: number;
  errors: string[];
  preview: Array<{
    id: string;
    status: 'would_change';
    changes: Record<string, unknown>;
  }>;
}

/**
 * Hook para operaciones masivas con deshacer y dry-run
 */
export function useBulkOperations<T>(config: BulkOperationsConfig<T>): UseBulkOperationsReturn<T> {
  const { addTask, updateTask } = useTaskStore();
  const [undoContext, setUndoContext] = useState<BulkUndoContext | null>(null);
  const [isDryRunMode, setIsDryRunMode] = useState(false);
  const [dryRunResults, setDryRunResults] = useState<DryRunResult | null>(null);
  
  const configRef = useRef(config);
  configRef.current = config;

  // ============================================================
  // HISTORIAL DE ACCIONES MASIVAS
  // ============================================================
  
  const [history, setHistory] = useState<BulkHistoryEntry[]>([]);
  
  // Cargar historial inicial
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const entries = await db.bulkHistory
          .orderBy('timestamp')
          .reverse()
          .limit(50)
          .toArray();
        setHistory(entries || []);
      } catch (e) {
        console.error('Error loading history:', e);
      }
    };
    loadHistory();
    
    // Suscribirse a cambios
    const subscription = db.bulkHistory.hook('creating', () => {
      loadHistory();
    });
    
    return () => {
      // Cleanup subscription if needed
    };
  }, []);

  const addEntry = useCallback(async (
    entry: Omit<BulkHistoryEntry, 'id' | 'timestamp' | 'undone' | 'canUndo' | 'undoTimeout'>
  ): Promise<BulkHistoryEntry | null> => {
    const id = crypto.randomUUID();
    const fullEntry: BulkHistoryEntry = {
      ...entry,
      id,
      timestamp: Date.now(),
      undone: false,
      canUndo: true,
      undoTimeout: UNDO_TIMEOUT
    };

    try {
      await db.bulkHistory.add(fullEntry);
      setHistory(prev => [fullEntry, ...prev.slice(0, 49)]);
      
      // Auto-mark as non-undoable after timeout
      setTimeout(async () => {
        try {
          await db.bulkHistory.update(id, { canUndo: false });
          setHistory(prev => prev.map(e => e.id === id ? { ...e, canUndo: false } : e));
        } catch (e) {
          // Entry might have been deleted
        }
      }, UNDO_TIMEOUT);

      return fullEntry;
    } catch (e) {
      console.error('Error adding history entry:', e);
      return null;
    }
  }, []);

  const markAsUndone = useCallback(async (id: string) => {
    try {
      await db.bulkHistory.update(id, { undone: true, canUndo: false });
      setHistory(prev => prev.map(e => e.id === id ? { ...e, undone: true, canUndo: false } : e));
    } catch (e) {
      console.error('Error marking as undone:', e);
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      await db.bulkHistory.clear();
      setHistory([]);
    } catch (e) {
      console.error('Error clearing history:', e);
    }
  }, []);

  // ============================================================
  // DESHACER
  // ============================================================
  
  const canUndo = undoContext !== null && history.length > 0 && history[0]?.canUndo;

  const performUndo = useCallback(async () => {
    if (!undoContext || !config.onUndoAction) {
      toast.error('No se puede deshacer esta acción');
      return;
    }

    try {
      await config.onUndoAction(undoContext.entry, undoContext.items);
      await markAsUndone(undoContext.entry.id);
      toast.success('Acción deshecha correctamente');
      setUndoContext(null);
    } catch (e: any) {
      toast.error(`Error al deshacer: ${e.message}`);
    }
  }, [undoContext, config.onUndoAction, markAsUndone]);

  // ============================================================
  // DRY-RUN MODE
  // ============================================================

  const performDryRun = useCallback((actionId: string, items: T[]) => {
    const action = config.actions.find(a => a.id === actionId);
    if (!action) {
      toast.error('Acción no encontrada');
      return;
    }

    const preview = items.map((item) => ({
      id: config.getItemId(item),
      status: 'would_change' as const,
      changes: actionId === 'delete' 
        ? { action: 'delete' } 
        : actionId === 'edit' 
          ? { action: 'update', fields: {} } 
          : { action: action.label }
    }));

    setDryRunResults({ actionId, affected: items.length, errors: [], preview });
    setIsDryRunMode(true);
    toast.info(`Dry-run: ${action.label} afectaría ${items.length} elementos`);
  }, [config.actions, config.getItemId]);

  const cancelDryRun = useCallback(() => {
    setIsDryRunMode(false);
    setDryRunResults(null);
  }, []);

  const executeDryRun = useCallback(async (actionId: string, items: T[]) => {
    setIsDryRunMode(false);
    setDryRunResults(null);
    // The actual execution would be handled by the caller
  }, []);

  // ============================================================
  // NOTIFICACIONES DE ESCRITORIO
  // ============================================================
  
  const canNotify = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
      setTimeout(() => notification.close(), 5000);
      return notification;
    }
    return null;
  }, []);

  // Método para establecer el contexto de undo
  const setUndoContextForAction = useCallback((
    entry: BulkHistoryEntry,
    items: T[]
  ) => {
    setUndoContext({
      entry,
      undoAction: async () => {
        if (configRef.current.onUndoAction) {
          await configRef.current.onUndoAction(entry, items);
        }
      },
      items,
      previousValues: new Map(),
      timestamp: Date.now(),
    });
  }, []);

  return {
    // Historial
    history,
    addEntry,
    markAsUndone,
    clearHistory,
    
    // Undo
    undoContext,
    canUndo,
    performUndo,
    
    // Dry-run
    isDryRunMode,
    dryRunResults,
    performDryRun,
    executeDryRun,
    cancelDryRun,
    
    // Notificaciones
    canNotify,
    requestNotificationPermission,
    sendNotification,
    
    // Helper interno
    setUndoContextForAction
  } as any;
}

export default useBulkOperations;
