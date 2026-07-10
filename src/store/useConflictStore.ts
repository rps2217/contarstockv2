"use client";
/**
 * useConflictStore - Gestión de conflictos de sincronización
 * 
 * Almacena conflictos detectados que requieren decisión manual del usuario.
 * Proporciona UI para comparar y resolver cada conflicto.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ConflictRecord {
  id: string;
  table: string;
  recordId: string;
  localData: Record<string, any>;
  remoteData: Record<string, any>;
  localTimestamp: number;
  remoteTimestamp: number;
  detectedAt: number;
  resolvedAt?: number;
  resolution?: 'local' | 'remote' | 'merged';
}

interface ConflictState {
  // Conflictos pendientes de resolver
  pendingConflicts: ConflictRecord[];
  
  // Conflictos ya resueltos (historial)
  resolvedConflicts: ConflictRecord[];
  
  // Conflictos en proceso de resolución
  activeConflictId: string | null;
  
  // Agregar nuevo conflicto
  addConflict: (conflict: Omit<ConflictRecord, 'detectedAt'>) => void;
  
  // Obtener conflicto activo
  getActiveConflict: () => ConflictRecord | null;
  
  // Resolver conflicto
  resolveConflict: (conflictId: string, resolution: 'local' | 'remote' | 'merged', mergedData?: Record<string, any>) => void;
  
  // Eliminar conflicto (descartar)
  dismissConflict: (conflictId: string) => void;
  
  // Limpiar todos los conflictos resueltos
  clearResolved: () => void;
  
  // Limpiar conflictos de una tabla específica
  clearTableConflicts: (table: string) => void;
  
  // Contadores
  pendingCount: () => number;
  resolvedCount: () => number;
}

export const useConflictStore = create<ConflictState>()(
  persist(
    (set, get) => ({
      pendingConflicts: [],
      resolvedConflicts: [],
      activeConflictId: null,

      addConflict: (conflict) => {
        set((state) => {
          // Verificar si ya existe
          const exists = state.pendingConflicts.some(
            c => c.recordId === conflict.recordId && c.table === conflict.table
          );
          
          if (exists) return state;
          
          return {
            pendingConflicts: [
              ...state.pendingConflicts,
              {
                ...conflict,
                detectedAt: Date.now(),
              },
            ],
          };
        });
      },

      getActiveConflict: () => {
        const state = get();
        if (state.activeConflictId) {
          return state.pendingConflicts.find(c => c.id === state.activeConflictId) || null;
        }
        // Si no hay conflicto activo, devolver el primero pendiente
        return state.pendingConflicts[0] || null;
      },

      resolveConflict: (conflictId, resolution, mergedData) => {
        set((state) => {
          const conflict = state.pendingConflicts.find(c => c.id === conflictId);
          if (!conflict) return state;

          const resolvedConflict: ConflictRecord = {
            ...conflict,
            resolvedAt: Date.now(),
            resolution,
          };

          if (resolution === 'merged' && mergedData) {
            resolvedConflict.localData = mergedData;
          }

          return {
            pendingConflicts: state.pendingConflicts.filter(c => c.id !== conflictId),
            resolvedConflicts: [resolvedConflict, ...state.resolvedConflicts].slice(0, 100), // Mantener últimos 100
            activeConflictId: null,
          };
        });
      },

      dismissConflict: (conflictId) => {
        set((state) => ({
          pendingConflicts: state.pendingConflicts.filter(c => c.id !== conflictId),
          activeConflictId: state.activeConflictId === conflictId ? null : state.activeConflictId,
        }));
      },

      clearResolved: () => {
        set({ resolvedConflicts: [] });
      },

      clearTableConflicts: (table) => {
        set((state) => ({
          pendingConflicts: state.pendingConflicts.filter(c => c.table !== table),
        }));
      },

      pendingCount: () => get().pendingConflicts.length,
      resolvedCount: () => get().resolvedConflicts.length,
    }),
    {
      name: 'conflict-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        pendingConflicts: state.pendingConflicts,
        resolvedConflicts: state.resolvedConflicts.slice(0, 50), // Solo últimos 50 en storage
      }),
    }
  )
);

// Selector para obtener conflictos por tabla
export const useConflictsByTable = (table: string) => {
  return useConflictStore((state) =>
    state.pendingConflicts.filter(c => c.table === table)
  );
};

// Selector para contar conflictos pendientes
export const usePendingConflictCount = () => {
  return useConflictStore((state) => state.pendingConflicts.length);
};

export default useConflictStore;