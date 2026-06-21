/**
 * useBulkActions - Hook global para acciones masivas
 * 
 * Proporciona un sistema reutilizable de selección y acciones masivas
 * que puede ser configurado para cualquier módulo de la aplicación.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { X, Trash2, Edit3, Download, Search, Printer } from 'lucide-react';
import { useTaskStore } from '@/stores';
import { toast } from 'sonner';

// ============================================================
// TIPOS
// ============================================================

export interface BulkAction<T = any> {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'primary' | 'danger' | 'success';
  onClick: (selectedItems: T[]) => void | Promise<void>;
  requiresConfirmation?: boolean;
  confirmMessage?: string;
}

export interface BulkField<T = any> {
  key: string;
  label: string;
  type: 'text' | 'select' | 'textarea' | 'number' | 'date';
  options?: { value: string; label: string }[];
  required?: boolean;
  condition?: (data: Record<string, any>) => boolean;
}

export interface BulkEditConfig<T = any> {
  title: string;
  description: string;
  fields: BulkField<T>[];
  onApply: (ids: string[], values: Record<string, any>, items: T[]) => Promise<void>;
}

export interface BulkActionsConfig<T = any> {
  module: string;
  getItemId: (item: T) => string;
  actions: BulkAction<T>[];
  bulkEdit?: BulkEditConfig<T>;
}

interface UseBulkActionsReturn<T> {
  selectedIds: Set<string>;
  selectedCount: number;
  isAllSelected: boolean;
  isBulkEditModalOpen: boolean;
  getSelectedItems: (allItems: T[]) => T[];
  toggleSelection: (id: string) => void;
  selectAll: (items: T[]) => void;
  clearSelection: () => void;
  executeBulkAction: (actionId: string, allItems: T[]) => Promise<void>;
  openBulkEditModal: () => void;
  closeBulkEditModal: () => void;
}

export function useBulkActions<T = any>(config: BulkActionsConfig<T>): UseBulkActionsReturn<T> {
  const { addTask, updateTask } = useTaskStore();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((items: T[]) => {
    const allIds = items.map(config.getItemId);
    setSelectedIds(new Set(allIds));
  }, [config.getItemId]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const getSelectedItems = useCallback((allItems: T[]) => {
    return allItems.filter(item => selectedIds.has(config.getItemId(item)));
  }, [selectedIds, config.getItemId]);

  const selectedCount = selectedIds.size;

  const executeBulkAction = useCallback(async (actionId: string, allItems: T[]) => {
    const selectedItems = getSelectedItems(allItems);
    const ids = Array.from(selectedIds);
    
    if (selectedItems.length === 0) {
      toast.error('No hay elementos seleccionados');
      return;
    }

    const action = config.actions.find(a => a.id === actionId);
    if (!action) {
      console.error(`Acción no encontrada: ${actionId}`);
      return;
    }

    if (action.requiresConfirmation) {
      const message = action.confirmMessage || `¿Ejecutar "${action.label}" en ${selectedItems.length} elementos?`;
      if (!window.confirm(message)) {
        return;
      }
    }

    const taskId = `bulk-${actionId}-${Date.now()}`;
    addTask({
      id: taskId,
      name: `${action.label}: ${selectedItems.length} elementos`,
      progress: 0,
      status: 'running'
    });

    try {
      await action.onClick(selectedItems);
      updateTask(taskId, { status: 'completed', progress: 100 });
      clearSelection();
    } catch (error: any) {
      updateTask(taskId, { 
        status: 'error', 
        error: error.message || 'Error en operación masiva' 
      });
      toast.error(`Error en ${action.label}: ${error.message}`);
    }
  }, [selectedIds, getSelectedItems, config.actions, addTask, updateTask, clearSelection]);

  const openBulkEditModal = useCallback(() => {
    if (selectedCount === 0) {
      toast.error('Selecciona elementos para editar');
      return;
    }
    setIsBulkEditModalOpen(true);
  }, [selectedCount]);

  const closeBulkEditModal = useCallback(() => {
    setIsBulkEditModalOpen(false);
  }, []);

  return {
    selectedIds,
    selectedCount,
    isAllSelected: selectedCount > 0,
    isBulkEditModalOpen,
    getSelectedItems,
    toggleSelection,
    selectAll,
    clearSelection,
    executeBulkAction,
    openBulkEditModal,
    closeBulkEditModal,
  };
}

// ============================================================
// COMPONENTE: BulkActionBar
// ============================================================

export interface BulkActionBarProps<T = any> {
  selectedCount: number;
  actions: BulkAction<T>[];
  onExecute: (actionId: string) => void;
  onClear: () => void;
  theme?: 'dark' | 'light' | 'high-contrast';
  className?: string;
}

export function BulkActionBar<T = any>({
  selectedCount,
  actions,
  onExecute,
  onClear,
  theme = 'dark',
  className = ''
}: BulkActionBarProps<T>) {
  if (selectedCount === 0) return null;

  const bgClass = theme === 'dark' ? 'bg-slate-800' : theme === 'light' ? 'bg-white' : 'bg-black';
  const textClass = theme === 'dark' ? 'text-white' : theme === 'light' ? 'text-slate-900' : 'text-yellow-400';
  const borderClass = theme === 'dark' ? 'border-slate-700' : theme === 'light' ? 'border-slate-200' : 'border-yellow-400';

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 ${bgClass} border-t-4 ${borderClass} ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={onClear}
            className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X className={`w-4 h-4 ${textClass}`} />
          </button>
          <span className={`text-sm font-bold ${textClass}`}>
            <span className="text-blue-500">{selectedCount}</span> seleccionados
          </span>
        </div>

        <div className="flex items-center gap-2">
          {actions.slice(0, 4).map(action => {
            const Icon = action.icon;
            const variantClass = action.variant === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' :
              action.variant === 'primary' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
              action.variant === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
              theme === 'high-contrast' ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white';
            
            return (
              <button
                key={action.id}
                onClick={() => onExecute(action.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${variantClass}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: BulkEditModal
// ============================================================

export interface BulkEditModalProps<T = any> {
  isOpen: boolean;
  onClose: () => void;
  config: BulkEditConfig<T>;
  selectedItems: T[];
  theme?: 'dark' | 'light' | 'high-contrast';
}

export function BulkEditModal<T = any>({
  isOpen,
  onClose,
  config,
  selectedItems,
  theme = 'dark'
}: BulkEditModalProps<T>) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    for (const field of config.fields) {
      if (field.required && !values[field.key]) {
        toast.error(`${field.label} es requerido`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const ids = selectedItems.map((item: any) => item.id);
      await config.onApply(ids, values, selectedItems);
      toast.success(`${selectedItems.length} registros actualizados`);
      onClose();
      setValues({});
    } catch (error: any) {
      toast.error(error.message || 'Error al aplicar cambios');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (key: string, value: any) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  const bgClass = theme === 'dark' ? 'bg-slate-900' : 'bg-white';
  const textClass = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const inputBgClass = theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className={`relative w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border-4 border-black ${bgClass}`}>
        <div className="bg-black p-6 flex items-center justify-between border-b-4 border-black">
          <div>
            <h2 className={`text-xl font-black uppercase tracking-tighter italic leading-none ${textClass}`}>
              {config.title}
            </h2>
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">
              {selectedItems.length} ítems seleccionados
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-blue-900/20 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
              {config.description}
            </p>
          </div>

          {config.fields.map(field => {
            if (field.condition && !field.condition(values)) {
              return null;
            }

            return (
              <div key={field.key} className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {field.label} {field.required && <span className="text-rose-500">*</span>}
                </label>

                {field.type === 'select' ? (
                  <select
                    value={values[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    className={`w-full px-5 py-4 rounded-xl text-sm font-bold border-2 transition-all outline-none appearance-none ${inputBgClass} focus:border-blue-500 ${textClass}`}
                  >
                    <option value="">Seleccionar...</option>
                    {field.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={values[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    rows={3}
                    className={`w-full px-5 py-4 rounded-xl text-sm font-bold border-2 transition-all outline-none ${inputBgClass} focus:border-blue-500 ${textClass}`}
                  />
                ) : (
                  <input
                    type={field.type}
                    value={values[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    className={`w-full px-5 py-4 rounded-xl text-sm font-bold border-2 transition-all outline-none ${inputBgClass} focus:border-blue-500 ${textClass}`}
                  />
                )}
              </div>
            );
          })}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${
              isSubmitting
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
            }`}
          >
            {isSubmitting ? (
              <span className="animate-spin">⟳</span>
            ) : (
              <>
                <Edit3 className="w-4 h-4" />
                Aplicar Cambios
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================

export function createStandardBulkActions<T>(config: {
  onDelete: (items: T[]) => Promise<void>;
  onExport?: (items: T[]) => Promise<void>;
  onEdit?: () => void;
}): BulkAction<T>[] {
  const actions: BulkAction<T>[] = [];

  if (config.onDelete) {
    actions.push({
      id: 'delete',
      label: 'Eliminar',
      icon: Trash2,
      variant: 'danger',
      requiresConfirmation: true,
      confirmMessage: '¿Eliminar los elementos seleccionados? Esta acción es irreversible.',
      onClick: config.onDelete
    });
  }

  if (config.onExport) {
    actions.push({
      id: 'export',
      label: 'Exportar',
      icon: Download,
      variant: 'default',
      onClick: config.onExport
    });
  }

  if (config.onEdit) {
    actions.push({
      id: 'edit',
      label: 'Editar',
      icon: Edit3,
      variant: 'primary',
      onClick: config.onEdit
    });
  }

  return actions;
}
