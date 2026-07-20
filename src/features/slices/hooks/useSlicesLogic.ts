/**
 * useSlicesLogic - Hook de dominio para la lógica de negocio de Slices
 * Sigue el patrón de Arquitectura Lego: { state, actions }
 */

import { useState, useCallback, useMemo } from 'react';
import { logger } from '@/services/logger';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import { useToastStore } from '@/stores';
import { AppSheetSlice, SourceTable, FilterOperator } from '../types/Slice';
import { DEFAULT_SLICES, TABLE_FIELDS, SLICE_STORAGE_KEY } from '../constants/defaultSlices';

// Tipos internos del hook
interface UseSlicesLogicReturn {
  // Estado
  slices: AppSheetSlice[];
  activeSlice: AppSheetSlice | undefined;
  activeSliceId: string;
  searchTerm: string;
  sliceData: Record<string, unknown>[] | undefined;
  filteredRows: Record<string, unknown>[];
  isLoading: boolean;

  // Acciones
  setActiveSliceId: (id: string) => void;
  setSearchTerm: (term: string) => void;
  createSlice: (slice: Omit<AppSheetSlice, 'id' | 'isSystem'>) => void;
  updateSlice: (slice: AppSheetSlice) => void;
  deleteSlice: (id: string) => void;
  editRow: (rowId: string, rowData: Record<string, unknown>) => Promise<void>;
  deleteRow: (rowId: string) => Promise<void>;
  exportCSV: () => void;

  // Utilidades
  getTableFields: (table: SourceTable) => string[];
}

export function useSlicesLogic(): UseSlicesLogicReturn {
  const { addToast } = useToastStore();

  // Estado de slices (persisted in localStorage)
  const [slices, setSlices] = useState<AppSheetSlice[]>(() => {
    const saved = localStorage.getItem(SLICE_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_SLICES;
      }
    }
    return DEFAULT_SLICES;
  });

  const [activeSliceId, setActiveSliceId] = useState<string>(DEFAULT_SLICES[0].id);
  const [searchTerm, setSearchTerm] = useState('');

  // Guardar slices en localStorage
  const saveSlices = useCallback((updatedList: AppSheetSlice[]) => {
    setSlices(updatedList);
    localStorage.setItem(SLICE_STORAGE_KEY, JSON.stringify(updatedList));
  }, []);

  // Slice activo
  const activeSlice = useMemo(
    () => slices.find(s => s.id === activeSliceId) || slices[0],
    [slices, activeSliceId]
  );

  // Obtener campos de tabla
  const getTableFields = useCallback((table: SourceTable): string[] => {
    return TABLE_FIELDS[table] || [];
  }, []);

  // Fetching rows basado en el slice activo
  const sliceData = useLiveQuery(async () => {
    if (!activeSlice) return [];

    const source = activeSlice.sourceTable;
    const tableInstance = (db as any)[source];
    if (!tableInstance) return [];

    try {
      const rawData: Record<string, unknown>[] = await tableInstance.toArray();

      // Aplicar filtro condicional del Slice
      return rawData.filter((item: Record<string, unknown>) => {
        let val = item[activeSlice.filterField];
        if (val === undefined && item.data) {
          val = item.data[activeSlice.filterField];
        }

        const target = activeSlice.filterValue;
        const itemStr = val !== undefined && val !== null ? String(val).toLowerCase() : '';
        const targetStr = target ? target.toLowerCase() : '';

        switch (activeSlice.filterOperator as FilterOperator) {
          case 'equals':
            return itemStr === targetStr;
          case 'notEquals':
            return itemStr !== targetStr;
          case 'contains':
            return itemStr.includes(targetStr);
          case 'greaterThan':
            return Number(val) > Number(target);
          case 'lessThan':
            return Number(val) < Number(target);
          case 'isEmpty':
            return val === undefined || val === null || val === '';
          case 'isNotEmpty':
            return val !== undefined && val !== null && val !== '';
          default:
            return true;
        }
      });
    } catch (err: unknown) {
      logger.error(
        'useSlicesLogic',
        'Error fetching slice data',
        err instanceof Error ? err.message : String(err)
      );
      return [];
    }
  }, [activeSlice, slices]);

  // Filtrado por término de búsqueda
  const filteredRows = useMemo(() => {
    if (!sliceData) return [];
    if (!searchTerm) return sliceData;

    const term = searchTerm.toLowerCase();
    return sliceData.filter((row: Record<string, unknown>) =>
      Object.values(row).some(val => {
        if (typeof val === 'object' && val !== null) {
          return Object.values(val).some((sub: unknown) =>
            String(sub).toLowerCase().includes(term)
          );
        }
        return String(val).toLowerCase().includes(term);
      })
    );
  }, [sliceData, searchTerm]);

  // Crear slice
  const createSlice = useCallback(
    (sliceData: Omit<AppSheetSlice, 'id' | 'isSystem'>) => {
      const newSlice: AppSheetSlice = {
        ...sliceData,
        id: `slice-${Date.now()}`,
        isSystem: false,
      };

      const updated = [...slices, newSlice];
      saveSlices(updated);
      setActiveSliceId(newSlice.id);
      addToast(`Slice "${newSlice.name}" creado con éxito`, 'success');
    },
    [slices, saveSlices, addToast]
  );

  // Actualizar slice
  const updateSlice = useCallback(
    (updatedSlice: AppSheetSlice) => {
      const updated = slices.map(s => (s.id === updatedSlice.id ? updatedSlice : s));
      saveSlices(updated);
      addToast(`Slice "${updatedSlice.name}" actualizado`, 'success');
    },
    [slices, saveSlices, addToast]
  );

  // Eliminar slice
  const deleteSlice = useCallback(
    (id: string) => {
      const sliceToDelete = slices.find(s => s.id === id);
      if (!sliceToDelete) return;

      if (window.confirm(`¿Eliminar slice "${sliceToDelete.name}"?`)) {
        const filtered = slices.filter(s => s.id !== id);
        saveSlices(filtered);
        addToast('Slice eliminado', 'success');

        if (activeSliceId === id && filtered.length > 0) {
          setActiveSliceId(filtered[0].id);
        }
      }
    },
    [slices, activeSliceId, saveSlices, addToast]
  );

  // Editar fila
  const editRow = useCallback(
    async (rowId: string, rowData: Record<string, unknown>) => {
      if (!activeSlice?.allowEdits) {
        addToast('La edición está bloqueada en este Slice', 'warning');
        return;
      }

      const fieldToEdit = window.prompt(
        `Columna a editar:\n${activeSlice.selectedColumns.join(', ')}`,
        activeSlice.selectedColumns[1]
      );
      if (!fieldToEdit || !activeSlice.selectedColumns.includes(fieldToEdit)) {
        addToast('Columna no válida', 'error');
        return;
      }

      const newValue = window.prompt(
        `Nuevo valor para [${fieldToEdit}]:`,
        String(rowData[fieldToEdit] || '')
      );
      if (newValue === null) return;

      try {
        const tableInstance = (db as any)[activeSlice.sourceTable];
        if (!tableInstance) return;

        const updatePayload: Record<string, unknown> = {
          updatedAt: Date.now(),
          syncStatus: 'pending',
        };

        if (activeSlice.sourceTable === 'dynamic_data') {
          const originalRecord = await tableInstance.get(rowId);
          if (originalRecord) {
            updatePayload.data = { ...originalRecord.data, [fieldToEdit]: newValue };
          }
        } else {
          updatePayload[fieldToEdit] = isNaN(Number(newValue)) ? newValue : Number(newValue);
        }

        await tableInstance.update(rowId, updatePayload);
        addToast('Registro actualizado', 'success');
      } catch (err: unknown) {
        addToast(`Error: ${(err as Error).message}`, 'error');
      }
    },
    [activeSlice, addToast]
  );

  // Eliminar fila
  const deleteRow = useCallback(
    async (rowId: string) => {
      if (!activeSlice?.allowDeletes) {
        addToast('Eliminación no permitida en este Slice', 'warning');
        return;
      }

      if (!window.confirm('¿Marcar este registro para borrado?')) return;

      try {
        const tableInstance = (db as any)[activeSlice.sourceTable];
        if (!tableInstance) return;

        const item = await tableInstance.get(rowId);
        if (item && item.syncStatus !== 'synced') {
          await tableInstance.delete(rowId);
        } else {
          await tableInstance.update(rowId, {
            syncStatus: 'pending_delete',
            updatedAt: Date.now(),
          });
        }
        addToast('Registro removido', 'success');
      } catch (err: unknown) {
        addToast(`Error: ${(err as Error).message}`, 'error');
      }
    },
    [activeSlice, addToast]
  );

  // Exportar a CSV
  const exportCSV = useCallback(() => {
    if (!sliceData || sliceData.length === 0) {
      addToast('No hay registros para exportar', 'warning');
      return;
    }

    const headers = activeSlice!.selectedColumns.join(',');
    const rows = sliceData.map(row =>
      activeSlice!.selectedColumns
        .map(col => {
          let val = row[col];
          if (val === undefined && row.data) val = row.data[col];
          const valStr = val !== undefined && val !== null ? String(val).replace(/,/g, ' ') : '';
          return `"${valStr}"`;
        })
        .join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Slice_${activeSlice!.name.replace(/\s+/g, '_')}_Offline.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('CSV exportado', 'success');
  }, [sliceData, activeSlice, addToast]);

  return {
    // Estado
    slices,
    activeSlice,
    activeSliceId,
    searchTerm,
    sliceData,
    filteredRows,
    isLoading: sliceData === undefined,

    // Acciones
    setActiveSliceId,
    setSearchTerm,
    createSlice,
    updateSlice,
    deleteSlice,
    editRow,
    deleteRow,
    exportCSV,

    // Utilidades
    getTableFields,
  };
}
