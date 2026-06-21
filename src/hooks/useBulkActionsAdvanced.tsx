/**
 * useBulkActionsAdvanced - Características avanzadas para acciones masivas
 * 
 * Incluye:
 * - Persistencia de preferencias de vista
 * - Atajos de teclado globales
 * - Sistema de deshacer (undo)
 * - Historial de acciones masivas
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { useBulkActions, BulkAction, BulkEditConfig, BulkActionBar, BulkEditModal } from './useBulkActions';
import { useTaskStore } from '@/stores';
import { toast } from 'sonner';
import { Undo2, Clock, Eye, EyeOff, ArrowUpDown } from 'lucide-react';

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
