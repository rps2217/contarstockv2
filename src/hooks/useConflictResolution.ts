/**
 * useConflictResolution - Hook para manejar conflictos de sincronización
 */

import { useState, useCallback } from 'react';
import { ConflictResolutionModal, ConflictData } from '@/shared/components/ui/ConflictResolutionModal';
import { db } from '../db';

interface Conflict<T = any> {
  id: string;
  table: string;
  localVersion: T;
  remoteVersion: T;
  localTimestamp: number;
  remoteTimestamp: number;
  conflictingFields: string[];
}

export const useConflictResolution = () => {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [currentConflict, setCurrentConflict] = useState<Conflict | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Agregar un nuevo conflicto
  const addConflict = useCallback((conflict: Conflict) => {
    setConflicts(prev => [...prev, conflict]);
    setCurrentConflict(conflict);
    setIsModalOpen(true);
  }, []);

  // Resolver conflicto
  const resolveConflict = useCallback(async (
    resolution: 'local' | 'remote' | 'merge',
    mergedData?: any
  ) => {
    if (!currentConflict) return;

    try {
      const { id, table, localVersion, remoteVersion } = currentConflict;
      let resolvedData: any;

      if (resolution === 'local') {
        resolvedData = { ...localVersion, syncStatus: 'pending' };
      } else if (resolution === 'remote') {
        resolvedData = { ...remoteVersion, syncStatus: 'synced' };
      } else if (resolution === 'merge' && mergedData) {
        resolvedData = { ...mergedData, syncStatus: 'pending' };
      }

      // Actualizar en la base de datos local
      const tableRef = db.table(table);
      await tableRef.put(resolvedData);

      // Remover de la lista de conflictos
      setConflicts(prev => prev.filter(c => c.id !== id));
      setCurrentConflict(null);
      setIsModalOpen(false);

      console.log(`[ConflictResolver] Resuelto con ${resolution}:`, id);
    } catch (error) {
      console.error('[ConflictResolver] Error resolviendo conflicto:', error);
    }
  }, [currentConflict]);

  // Cerrar modal sin resolver
  const dismissConflict = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Simular un conflicto (para testing)
  const simulateConflict = useCallback(() => {
    const mockConflict: Conflict = {
      id: 'test-123',
      table: 'products',
      localVersion: {
        id: 'test-123',
        name: 'Producto Test',
        stock: 45,
        updatedAt: Date.now() - 60000, // 1 min ago
      },
      remoteVersion: {
        id: 'test-123',
        name: 'Producto Test',
        stock: 42,
        updatedAt: Date.now() - 120000, // 2 min ago
      },
      localTimestamp: Date.now() - 60000,
      remoteTimestamp: Date.now() - 120000,
      conflictingFields: ['stock'],
    };
    addConflict(mockConflict);
  }, [addConflict]);

  return {
    conflicts,
    currentConflict,
    isModalOpen,
    addConflict,
    resolveConflict,
    dismissConflict,
    simulateConflict,
    ConflictModal: () => currentConflict ? (
      <ConflictResolutionModal
        isOpen={isModalOpen}
        onClose={dismissConflict}
        conflict={currentConflict}
        onResolve={(resolution, mergedData) => resolveConflict(resolution, mergedData)}
      />
    ) : null,
  };
};

export default useConflictResolution;
