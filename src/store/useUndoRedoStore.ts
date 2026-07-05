"use client";
/**
 * useUndoRedoStore - Sistema de Historial de Acciones para Undo/Redo
 * 
 * Proporciona un historial de acciones reversibles con undo y redo.
 * Cada acción tiene:
 * - type: identificador del tipo de acción
 * - description: descripción legible
 * - data: datos necesarios para deshacer
 * - timestamp: cuando se realizó
 * - undo(): función para deshacer
 * - redo(): función para rehacer (opcional)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ActionType =
  | 'create'
  | 'update'
  | 'delete'
  | 'scan'
  | 'adjustment'
  | 'transfer'
  | 'import'
  | 'export'
  | 'sync'
  | 'custom';

export interface UndoableAction {
  id: string;
  type: ActionType;
  description: string;
  entityType: string; // e.g., 'product', 'session', 'inventory'
  entityId: string;
  data: {
    before?: Record<string, any>; // Estado anterior
    after?: Record<string, any>;  // Estado nuevo
    metadata?: Record<string, any>;
  };
  timestamp: number;
  // Funciones de undo/redo (serializables en JSON si es posible)
  undoAction?: () => Promise<boolean>;
  redoAction?: () => Promise<boolean>;
}

interface UndoRedoState {
  // Historial de acciones
  history: UndoableAction[];
  
  // Índice actual (cursor) en el historial
  currentIndex: number;
  
  // Configuración
  maxHistorySize: number;
  isUndoEnabled: boolean;
  
  // Acciones
  pushAction: (action: Omit<UndoableAction, 'id' | 'timestamp'>) => string;
  undo: () => UndoableAction | null;
  redo: () => UndoableAction | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Gestión de historial
  clearHistory: () => void;
  clearEntityHistory: (entityType: string, entityId: string) => void;
  getEntityHistory: (entityType: string, entityId: string) => UndoableAction[];
  
  // Configuración
  setMaxHistorySize: (size: number) => void;
  setUndoEnabled: (enabled: boolean) => void;
  
  // Info
  getUndoCount: () => number;
  getRedoCount: () => number;
  getLastAction: () => UndoableAction | null;
}

let actionIdCounter = 0;

export const useUndoRedoStore = create<UndoRedoState>()(
  persist(
    (set, get) => ({
      history: [],
      currentIndex: -1,
      maxHistorySize: 50,
      isUndoEnabled: true,

      pushAction: (actionData) => {
        const id = `action_${Date.now()}_${++actionIdCounter}`;
        
        set((state) => {
          // Si estamos en medio del historial (no al final), descartar lo que hay adelante
          let newHistory = state.history;
          let newIndex = state.currentIndex;
          
          if (state.currentIndex < state.history.length - 1) {
            newHistory = state.history.slice(0, state.currentIndex + 1);
            newIndex = newHistory.length - 1;
          }
          
          const newAction: UndoableAction = {
            ...actionData,
            id,
            timestamp: Date.now(),
          };
          
          // Agregar la nueva acción
          newHistory = [...newHistory, newAction];
          newIndex = newHistory.length - 1;
          
          // Limitar tamaño del historial
          if (newHistory.length > state.maxHistorySize) {
            newHistory = newHistory.slice(-state.maxHistorySize);
            newIndex = Math.min(newIndex, newHistory.length - 1);
          }
          
          return {
            history: newHistory,
            currentIndex: newIndex,
          };
        });
        
        return id;
      },

      undo: () => {
        const state = get();
        
        if (!state.canUndo()) {
          return null;
        }
        
        const action = state.history[state.currentIndex];
        
        set((s) => ({
          currentIndex: s.currentIndex - 1,
        }));
        
        return action;
      },

      redo: () => {
        const state = get();
        
        if (!state.canRedo()) {
          return null;
        }
        
        const nextIndex = state.currentIndex + 1;
        const action = state.history[nextIndex];
        
        set((s) => ({
          currentIndex: nextIndex,
        }));
        
        return action;
      },

      canUndo: () => {
        const state = get();
        return state.isUndoEnabled && state.currentIndex >= 0;
      },

      canRedo: () => {
        const state = get();
        return state.isUndoEnabled && state.currentIndex < state.history.length - 1;
      },

      clearHistory: () => {
        set({ history: [], currentIndex: -1 });
      },

      clearEntityHistory: (entityType, entityId) => {
        set((state) => ({
          history: state.history.filter(
            (a) => !(a.entityType === entityType && a.entityId === entityId)
          ),
        }));
      },

      getEntityHistory: (entityType, entityId) => {
        const state = get();
        return state.history.filter(
          (a) => a.entityType === entityType && a.entityId === entityId
        );
      },

      setMaxHistorySize: (size) => {
        set({ maxHistorySize: size });
      },

      setUndoEnabled: (enabled) => {
        set({ isUndoEnabled: enabled });
      },

      getUndoCount: () => {
        const state = get();
        return state.currentIndex + 1;
      },

      getRedoCount: () => {
        const state = get();
        return state.history.length - state.currentIndex - 1;
      },

      getLastAction: () => {
        const state = get();
        if (state.currentIndex >= 0 && state.currentIndex < state.history.length) {
          return state.history[state.currentIndex];
        }
        return null;
      },
    }),
    {
      name: 'undo-redo-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        maxHistorySize: state.maxHistorySize,
        // No persistir history para evitar datos obsoletos en reload
      }),
    }
  )
);

// =============================================================================
// HOOK PARA USO SIMPLIFICADO
// =============================================================================

import { useCallback } from 'react';

interface UseUndoRedoOptions {
  entityType: string;
  entityId?: string;
  onUndo?: (action: UndoableAction) => Promise<boolean>;
  onRedo?: (action: UndoableAction) => Promise<boolean>;
}

export const useUndoRedo = (options: UseUndoRedoOptions) => {
  const store = useUndoRedoStore();
  
  const {
    canUndo,
    canRedo,
    getUndoCount,
    getRedoCount,
    getLastAction,
  } = store;

  const recordAction = useCallback(
    (action: Omit<UndoableAction, 'id' | 'timestamp'>) => {
      return store.pushAction(action);
    },
    [store]
  );

  const performUndo = useCallback(async () => {
    const action = store.undo();
    if (!action) return false;
    
    if (options.onUndo) {
      return await options.onUndo(action);
    }
    
    return true;
  }, [store, options.onUndo]);

  const performRedo = useCallback(async () => {
    const action = store.redo();
    if (!action) return false;
    
    if (options.onRedo) {
      return await options.onRedo(action);
    }
    
    return true;
  }, [store, options.onRedo]);

  return {
    // Estado
    canUndo: canUndo(),
    canRedo: canRedo(),
    undoCount: getUndoCount(),
    redoCount: getRedoCount(),
    lastAction: getLastAction(),
    
    // Acciones
    recordAction,
    undo: performUndo,
    redo: performRedo,
    clearHistory: store.clearHistory,
    
    // Historial
    history: store.history,
    currentIndex: store.currentIndex,
  };
};

// =============================================================================
// HELPERS PARA CREAR ACCIONES COMUNES
// =============================================================================

export const createProductAction = (
  type: 'create' | 'update' | 'delete',
  productId: string,
  before?: Record<string, any>,
  after?: Record<string, any>
) => ({
  type,
  description: `${type === 'create' ? 'Crear' : type === 'update' ? 'Actualizar' : 'Eliminar'} producto`,
  entityType: 'product',
  entityId: productId,
  data: { before, after },
});

export const createInventoryAction = (
  type: 'adjustment' | 'transfer',
  productId: string,
  beforeQty: number,
  afterQty: number,
  reason?: string
) => ({
  type,
  description: `Ajuste de inventario${reason ? ` (${reason})` : ''}`,
  entityType: 'inventory',
  entityId: productId,
  data: {
    before: { quantity: beforeQty },
    after: { quantity: afterQty },
  },
});

export const createScanAction = (
  sessionId: string,
  barcode: string,
  quantity: number,
  action: 'add' | 'remove' | 'adjust'
) => ({
  type: 'scan' as ActionType,
  description: `${action === 'add' ? 'Agregar' : action === 'remove' ? 'Remover' : 'Ajustar'} scan: ${barcode} x${quantity}`,
  entityType: 'session',
  entityId: sessionId,
  data: {
    before: { barcode, quantity: 0 },
    after: { barcode, quantity },
  },
});

export default useUndoRedoStore;