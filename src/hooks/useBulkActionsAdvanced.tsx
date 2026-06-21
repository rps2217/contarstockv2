/**
 * useBulkActionsAdvanced - Características avanzadas para acciones masivas
 * 
 * Incluye:
 * - Persistencia de preferencias de vista
 * - Atajos de teclado globales
 * - Sistema de deshacer (undo)
 * - Historial de acciones masivas
 * - Notificaciones de escritorio
 * - Exportación a CSV
 * - Dry-run mode
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { useBulkActions, BulkAction, BulkEditConfig, BulkActionBar, BulkEditModal } from './useBulkActions';
import { useTaskStore } from '@/stores';
import { toast } from 'sonner';
import { Undo2, Clock, Eye, EyeOff, ArrowUpDown, Download, Play, Pause, FileText } from 'lucide-react';

// ============================================================
// TIPOS
// ============================================================

export interface ViewPreferences {
  module: string;
  compactView: boolean;
  sortBy: 'date' | 'name' | 'status';
  sortOrder: 'asc' | 'desc';
  expandedPanels: Record<string, boolean>;
  lastUpdated: number;
}

export interface BulkHistoryEntry {
  id: string;
  module: string;
  action: string;
  actionLabel: string;
  itemCount: number;
  itemIds: string[];
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  timestamp: number;
  undone: boolean;
  canUndo: boolean;
  undoTimeout: number; // ms para poder deshacer
}

export interface BulkUndoContext {
  entry: BulkHistoryEntry;
  undoAction: () => Promise<void>;
  items: any[];
}

// ============================================================
// STORE PARA PREFERENCIAS
// ============================================================

const DEFAULT_PREFERENCES: ViewPreferences = {
  module: '',
  compactView: false,
  sortBy: 'date',
  sortOrder: 'desc',
  expandedPanels: {},
  lastUpdated: Date.now()
};

export function useViewPreferences(module: string) {
  const [preferences, setPreferences] = useState<ViewPreferences>(() => ({
    ...DEFAULT_PREFERENCES,
    module
  }));

  // Cargar preferencias al iniciar
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const stored = await db.viewPreferences.get(module);
        if (stored) {
          setPreferences({
            ...DEFAULT_PREFERENCES,
            ...stored,
            lastUpdated: stored.lastUpdated || Date.now()
          });
        }
      } catch (e) {
        console.error('Error loading preferences:', e);
      }
    };
    loadPreferences();
  }, [module]);

  // Guardar preferencias
  const savePreferences = useCallback(async (updates: Partial<ViewPreferences>) => {
    const newPrefs = {
      ...preferences,
      ...updates,
      module,
      lastUpdated: Date.now()
    };
    setPreferences(newPrefs);
    
    try {
      await db.viewPreferences.put(newPrefs);
    } catch (e) {
      console.error('Error saving preferences:', e);
    }
  }, [preferences, module]);

  // Acciones de preferencias
  const toggleCompactView = useCallback(() => {
    savePreferences({ compactView: !preferences.compactView });
  }, [preferences.compactView, savePreferences]);

  const setSortBy = useCallback((sortBy: ViewPreferences['sortBy']) => {
    savePreferences({ sortBy });
  }, [savePreferences]);

  const toggleSortOrder = useCallback(() => {
    savePreferences({ sortOrder: preferences.sortOrder === 'asc' ? 'desc' : 'asc' });
  }, [preferences.sortOrder, savePreferences]);

  const togglePanel = useCallback((panelId: string) => {
    savePreferences({
      expandedPanels: {
        ...preferences.expandedPanels,
        [panelId]: !preferences.expandedPanels[panelId]
      }
    });
  }, [preferences.expandedPanels, savePreferences]);

  return {
    preferences,
    toggleCompactView,
    setSortBy,
    toggleSortOrder,
    togglePanel,
    savePreferences,
    isPanelExpanded: (panelId: string) => preferences.expandedPanels[panelId] ?? true
  };
}

// ============================================================
// HISTORIAL DE ACCIONES MASIVAS
// ============================================================

const UNDO_TIMEOUT = 30000; // 30 segundos para deshacer

export function useBulkHistory() {
  const history = useLiveQuery(() => 
    db.bulkHistory.orderBy('timestamp').reverse().limit(50).toArray()
  , []);

  const addEntry = useCallback(async (entry: Omit<BulkHistoryEntry, 'id' | 'timestamp' | 'undone' | 'canUndo'>) => {
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
      
      // Auto-mark as non-undoable after timeout
      setTimeout(async () => {
        try {
          await db.bulkHistory.update(id, { canUndo: false });
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
    } catch (e) {
      console.error('Error marking as undone:', e);
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      await db.bulkHistory.clear();
    } catch (e) {
      console.error('Error clearing history:', e);
    }
  }, []);

  return {
    history: history || [],
    addEntry,
    markAsUndone,
    clearHistory
  };
}

// ============================================================
// HOOK PRINCIPAL CON FEATURES AVANZADAS
// ============================================================

export interface BulkActionsAdvancedConfig<T = any> {
  module: string;
  getItemId: (item: T) => string;
  actions: BulkAction<T>[];
  bulkEdit?: BulkEditConfig<T>;
  enableKeyboardShortcuts?: boolean;
  enableUndo?: boolean;
  onUndoAction?: (entry: BulkHistoryEntry, items: T[]) => Promise<void>;
}

export interface UseBulkActionsAdvancedReturn<T> {
  // Features del hook base
  selectedIds: Set<string>;
  selectedCount: number;
  isBulkEditModalOpen: boolean;
  getSelectedItems: (allItems: T[]) => T[];
  toggleSelection: (id: string) => void;
  selectAll: (items: T[]) => void;
  clearSelection: () => void;
  executeBulkAction: (actionId: string, allItems: T[]) => Promise<void>;
  openBulkEditModal: () => void;
  closeBulkEditModal: () => void;
  
  // Features avanzadas
  preferences: ViewPreferences;
  toggleCompactView: () => void;
  setSortBy: (sortBy: ViewPreferences['sortBy']) => void;
  toggleSortOrder: () => void;
  togglePanel: (panelId: string) => void;
  isPanelExpanded: (panelId: string) => boolean;
  
  history: BulkHistoryEntry[];
  undoContext: BulkUndoContext | null;
  canUndo: boolean;
  performUndo: () => Promise<void>;
  clearHistory: () => void;
  
  // Atajos de teclado
  keyboardHint: string;
  
  // UI
  renderActionBar: (theme?: 'dark' | 'light' | 'high-contrast') => React.ReactNode;
  renderBulkEditModal: (allItems: T[], theme?: 'dark' | 'light' | 'high-contrast') => React.ReactNode;
}

export function useBulkActionsAdvanced<T = any>(
  config: BulkActionsAdvancedConfig<T>
): UseBulkActionsAdvancedReturn<T> {
  const { addTask, updateTask } = useTaskStore();
  const { preferences, toggleCompactView, setSortBy, toggleSortOrder, togglePanel, isPanelExpanded } = useViewPreferences(config.module);
  const { history, addEntry, markAsUndone, clearHistory } = useBulkHistory();
  
  const [undoContext, setUndoContext] = useState<BulkUndoContext | null>(null);
  const actionsRef = useRef(config.actions);

  // Mantener acciones actualizadas
  useEffect(() => {
    actionsRef.current = config.actions;
  }, [config.actions]);

  // Hook base
  const bulk = useBulkActions({
    module: config.module,
    getItemId: config.getItemId,
    actions: config.actions,
    bulkEdit: config.bulkEdit
  });

  // Deshacer
  const canUndo = undoContext !== null && history.length > 0 && history[0]?.canUndo;

  // ============================================================
  // NOTIFICACIONES DE ESCRITORIO
  // ============================================================
  
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
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

  // ============================================================
  // EXPORTACIÓN A CSV
  // ============================================================
  
  const exportHistoryToCSV = useCallback((entries: BulkHistoryEntry[]) => {
    const headers = ['Fecha', 'Módulo', 'Acción', 'Ítems', 'Deshecho', 'Estado'];
    const rows = entries.map(entry => [
      new Date(entry.timestamp).toLocaleString(),
      entry.module,
      entry.actionLabel,
      entry.itemCount.toString(),
      entry.undone ? 'Sí' : 'No',
      entry.canUndo && !entry.undone ? 'Reversible' : 'Finalizado'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bulk_history_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Historial exportado a CSV');
    return csv;
  }, []);

  const exportItemsToCSV = useCallback((items: T[], filename?: string) => {
    if (items.length === 0) {
      toast.error('No hay elementos para exportar');
      return;
    }

    const keys = new Set<string>();
    items.forEach(item => {
      Object.keys(item as object).forEach(key => keys.add(key));
    });
    const keyArray = Array.from(keys);

    const headers = keyArray;
    const rows = items.map(item => {
      const obj = item as Record<string, any>;
      return keyArray.map(key => {
        const value = obj[key];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      });
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `export_${config.module}_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${items.length} elementos exportados`);
    return csv;
  }, [config.module]);

  // ============================================================
  // DRY-RUN MODE
  // ============================================================
  
  const [isDryRunMode, setIsDryRunMode] = useState(false);
  const [dryRunResults, setDryRunResults] = useState<{
    actionId: string;
    affected: number;
    errors: string[];
    preview: Record<string, any>[];
  } | null>(null);

  const performDryRun = useCallback((actionId: string, items: T[]) => {
    const action = config.actions.find(a => a.id === actionId);
    if (!action) {
      toast.error('Acción no encontrada');
      return;
    }

    const preview = items.map((item) => ({
      id: config.getItemId(item),
      status: 'would_change' as const,
      changes: actionId === 'delete' ? { action: 'delete' } :
               actionId === 'edit' ? { action: 'update', fields: {} } :
               { action: action.label }
    }));

    setDryRunResults({ actionId, affected: items.length, errors: [], preview });
    setIsDryRunMode(true);
    toast.info(`Dry-run: ${action.label} afectaría ${items.length} elementos`);
  }, [config.actions, config.getItemId]);

  const executeDryRun = useCallback(async (actionId: string, items: T[]) => {
    setIsDryRunMode(false);
    setDryRunResults(null);
    await executeBulkActionWithHistory(actionId, items);
  }, [executeBulkActionWithHistory]);

  const cancelDryRun = useCallback(() => {
    setIsDryRunMode(false);
    setDryRunResults(null);
  }, []);

  // ============================================================
  // INTEGRACIÓN CON AUDIT LOGS
  // ============================================================
  
  const logToAudit = useCallback(async (
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    tableName: string,
    recordId: string,
    oldValue?: any,
    newValue?: any
  ) => {
    try {
      await db.audit_logs.add({
        tableName,
        recordId,
        action,
        oldValue: oldValue ? JSON.stringify(oldValue) : undefined,
        newValue: newValue ? JSON.stringify(newValue) : undefined,
        timestamp: Date.now(),
        synced: false
      });
    } catch (e) {
      console.error('Error logging to audit:', e);
    }
  }, []);

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

  // Wrapper para executeBulkAction que añade historial y undo
  const executeBulkActionWithHistory = useCallback(async (actionId: string, allItems: T[]) => {
    const selectedItems = bulk.getSelectedItems(allItems);
    const entry = await addEntry({
      module: config.module,
      action: actionId,
      actionLabel: config.actions.find(a => a.id === actionId)?.label || actionId,
      itemCount: selectedItems.length,
      itemIds: selectedItems.map(config.getItemId),
      previousState: selectedItems.reduce((acc, item) => {
        acc[config.getItemId(item)] = { ...item };
        return acc;
      }, {} as Record<string, any>)
    });

    if (entry) {
      setUndoContext({
        entry,
        undoAction: async () => {
          if (config.onUndoAction) {
            await config.onUndoAction(entry, selectedItems);
          }
        },
        items: selectedItems
      });
    }

    await bulk.executeBulkAction(actionId, allItems);
  }, [bulk, config, addEntry]);

  // Atajos de teclado
  useEffect(() => {
    if (!config.enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + A: Seleccionar todo
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !e.shiftKey) {
        e.preventDefault();
        const focused = document.activeElement;
        if (focused?.tagName !== 'INPUT' && focused?.tagName !== 'TEXTAREA') {
          // La selección se maneja en el componente
        }
      }

      // Escape: Limpiar selección
      if (e.key === 'Escape') {
        if (bulk.selectedCount > 0) {
          bulk.clearSelection();
          toast.info('Selección limpiada');
        }
      }

      // Delete/Backspace: Eliminar seleccionados (con confirmación)
      if ((e.key === 'Delete' || e.key === 'Backspace') && bulk.selectedCount > 0) {
        const focused = document.activeElement;
        if (focused?.tagName !== 'INPUT' && focused?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          const deleteAction = actionsRef.current.find(a => a.id === 'delete');
          if (deleteAction) {
            executeBulkActionWithHistory('delete', []);
          }
        }
      }

      // Ctrl/Cmd + Z: Deshacer
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && canUndo) {
        e.preventDefault();
        performUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bulk, canUndo, performUndo, executeBulkActionWithHistory, config.enableKeyboardShortcuts]);

  // Render helpers
  const renderActionBar = (theme?: 'dark' | 'light' | 'high-contrast') => (
    <BulkActionBar
      selectedCount={bulk.selectedCount}
      actions={config.actions}
      onExecute={(id) => executeBulkActionWithHistory(id, [])}
      onClear={bulk.clearSelection}
      theme={theme}
    />
  );

  const renderBulkEditModal = (allItems: T[], theme?: 'dark' | 'light' | 'high-contrast') => (
    <BulkEditModal
      isOpen={bulk.isBulkEditModalOpen}
      onClose={bulk.closeBulkEditModal}
      config={config.bulkEdit!}
      selectedItems={bulk.getSelectedItems(allItems)}
      theme={theme}
    />
  );

  const keyboardHint = config.enableKeyboardShortcuts ? `
    Atajos: Ctrl+A (seleccionar todo), Escape (limpiar), 
    Delete (eliminar), Ctrl+Z (deshacer)
  ` : '';

  return {
    // Hook base
    ...bulk,
    
    // Preferencias de vista
    preferences,
    toggleCompactView,
    setSortBy,
    toggleSortOrder,
    togglePanel,
    isPanelExpanded,
    
    // Historial y undo
    history,
    undoContext,
    canUndo,
    performUndo,
    clearHistory,
    
    // Notificaciones
    requestNotificationPermission,
    sendNotification,
    
    // Exportación
    exportHistoryToCSV,
    exportItemsToCSV,
    
    // Dry-run
    isDryRunMode,
    dryRunResults,
    performDryRun,
    executeDryRun,
    cancelDryRun,
    
    // Audit logs
    logToAudit,
    
    // Atajos
    keyboardHint,
    
    // UI
    renderActionBar,
    renderBulkEditModal
  };
}

// ============================================================
// COMPONENTE: HistorialPanel
// ============================================================

export interface BulkHistoryPanelProps {
  history: BulkHistoryEntry[];
  onUndo: (entry: BulkHistoryEntry) => void;
  onClear: () => void;
  theme?: 'dark' | 'light' | 'high-contrast';
}

export const BulkHistoryPanel: React.FC<BulkHistoryPanelProps> = ({
  history,
  onUndo,
  onClear,
  theme = 'dark'
}) => {
  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Hace un momento';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    return new Date(timestamp).toLocaleTimeString();
  };

  const bgClass = theme === 'dark' ? 'bg-slate-900' : 'bg-white';
  const textClass = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const mutedClass = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';

  if (history.length === 0) {
    return (
      <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
        <div className="flex items-center gap-2 mb-2">
          <Clock className={`w-4 h-4 ${mutedClass}`} />
          <span className={`text-sm font-bold ${mutedClass}`}>Sin historial</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl overflow-hidden border ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className={`p-3 flex items-center justify-between border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
          <span className={`text-sm font-bold ${textClass}`}>Historial de Acciones</span>
        </div>
        <button
          onClick={onClear}
          className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
        >
          Limpiar
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {history.slice(0, 10).map(entry => (
          <div
            key={entry.id}
            className={`p-3 flex items-center justify-between border-b last:border-b-0 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold truncate ${entry.undone ? 'line-through opacity-50' : textClass}`}>
                  {entry.actionLabel}
                </span>
                <span className={`text-xs ${mutedClass}`}>
                  ({entry.itemCount} ítems)
                </span>
              </div>
              <span className={`text-[10px] ${mutedClass}`}>
                {formatTime(entry.timestamp)}
                {entry.undone && ' • Deshecho'}
              </span>
            </div>

            {entry.canUndo && !entry.undone && (
              <button
                onClick={() => onUndo(entry)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 text-xs font-bold"
              >
                <Undo2 className="w-3 h-3" />
                Deshacer
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE: DryRunModal
// ============================================================

export interface DryRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  results: {
    actionId: string;
    affected: number;
    errors: string[];
    preview: Record<string, any>[];
  } | null;
  theme?: 'dark' | 'light' | 'high-contrast';
}

export const DryRunModal: React.FC<DryRunModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  results,
  theme = 'dark'
}) => {
  if (!isOpen || !results) return null;

  const bgClass = theme === 'dark' ? 'bg-slate-900' : 'bg-white';
  const textClass = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const mutedClass = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const inputBgClass = theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className={`relative w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border-4 border-blue-500 ${bgClass}`}>
        <div className="bg-blue-600 p-6 border-b-4 border-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter italic leading-none text-white">
                Preview de Cambios
              </h2>
              <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest mt-1">
                Modo Dry-Run
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Resumen */}
          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-blue-900/20 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                Elementos afectados
              </span>
              <span className="text-2xl font-black text-blue-500">{results.affected}</span>
            </div>
          </div>

          {/* Preview de cambios */}
          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ${mutedClass}`}>
              Cambios que se aplicarán:
            </label>
            <div className={`rounded-xl border ${inputBgClass} max-h-48 overflow-y-auto`}>
              {results.preview.slice(0, 10).map((item, idx) => (
                <div key={idx} className={`p-3 border-b last:border-b-0 ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono truncate flex-1 ${textClass}`}>
                      {item.id}
                    </span>
                    <span className="text-xs font-bold text-blue-500 ml-2">
                      {item.changes?.action || 'update'}
                    </span>
                  </div>
                </div>
              ))}
              {results.preview.length > 10 && (
                <div className={`p-3 text-center ${mutedClass}`}>
                  <span className="text-xs">+{results.preview.length - 10} más...</span>
                </div>
              )}
            </div>
          </div>

          {/* Errores */}
          {results.errors.length > 0 && (
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest text-red-500`}>
                Errores detectados:
              </label>
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                {results.errors.map((err, idx) => (
                  <div key={idx} className="text-xs text-red-400">{err}</div>
                ))}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={`flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${
                theme === 'dark' 
                  ? 'bg-white/10 text-white hover:bg-white/20' 
                  : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xl transition-all active:scale-95"
            >
              Aplicar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE: ViewPreferencesToolbar
// ============================================================

export interface ViewPreferencesToolbarProps {
  preferences: ViewPreferences;
  onToggleCompact: () => void;
  onSortByChange: (sortBy: ViewPreferences['sortBy']) => void;
  onToggleSortOrder: () => void;
  theme?: 'dark' | 'light' | 'high-contrast';
}

export const ViewPreferencesToolbar: React.FC<ViewPreferencesToolbarProps> = ({
  preferences,
  onToggleCompact,
  onSortByChange,
  onToggleSortOrder,
  theme = 'dark'
}) => {
  const bgClass = theme === 'dark' ? 'bg-slate-800' : 'bg-white';
  const textClass = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const mutedClass = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const activeClass = theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600';

  const sortOptions: { value: ViewPreferences['sortBy']; label: string }[] = [
    { value: 'date', label: 'Fecha' },
    { value: 'name', label: 'Nombre' },
    { value: 'status', label: 'Estado' }
  ];

  return (
    <div className={`flex items-center gap-2 p-2 rounded-xl ${bgClass}`}>
      {/* Vista compacta */}
      <button
        onClick={onToggleCompact}
        className={`p-2 rounded-lg transition-colors ${
          preferences.compactView ? activeClass : mutedClass + ' hover:bg-white/10'
        }`}
        title="Vista compacta"
      >
        {preferences.compactView ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>

      {/* Separador */}
      <div className={`w-px h-6 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`} />

      {/* Ordenar por */}
      <div className="flex items-center gap-1">
        <ArrowUpDown className={`w-4 h-4 ${mutedClass}`} />
        <select
          value={preferences.sortBy}
          onChange={(e) => onSortByChange(e.target.value as ViewPreferences['sortBy'])}
          className={`text-xs font-bold bg-transparent border-none outline-none cursor-pointer ${textClass}`}
        >
          {sortOptions.map(opt => (
            <option key={opt.value} value={opt.value} className={theme === 'dark' ? 'bg-slate-800' : 'bg-white'}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Dirección del orden */}
      <button
        onClick={onToggleSortOrder}
        className={`px-2 py-1 rounded text-xs font-bold ${
          preferences.sortOrder === 'asc' ? activeClass : mutedClass
        }`}
        title={preferences.sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
      >
        {preferences.sortOrder === 'asc' ? '↑' : '↓'}
      </button>
    </div>
  );
};
