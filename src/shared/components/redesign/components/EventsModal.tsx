import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { logger } from '@/services/logger';

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Save,
  Loader2,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  Search,
  Filter,
  Table as TableIcon,
  ClipboardList,
  ArrowUpDown,
  List,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckSquare,
  Square,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, InventoryEvent } from '@/db';

// Importar constantes y tipos
import {
  EVENT_META,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  COLUMNS,
  formatEventDate,
  EMPTY_FORM,
  type EventType,
  type EventStatus,
  type ViewMode,
  type EventFormData,
} from './EventsModal/eventsConstants';

// Importar operaciones masivas
import { bulkDeleteEvents } from './EventsModal/bulkOperations';

// Re-exportar tipos para uso externo
export type {
  EventType,
  EventStatus,
  ViewMode,
  EventFormData,
} from './EventsModal/eventsConstants';

// ============================================================================
// Componente: EventsModal
// ============================================================================
interface EventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
  onSwitchView?: () => void;
  statusFilter?: EventStatus | 'all';
}

export const EventsModal: React.FC<EventsModalProps> = ({
  isOpen,
  onClose,
  embedded = false,
  onSwitchView,
  statusFilter: externalStatusFilter = 'all',
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [editingEvent, setEditingEvent] = useState<InventoryEvent | null>(null);
  const [formData, setFormData] = useState<EventFormData>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'createdAt',
    direction: 'desc',
  });
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Selección múltiple (estilo AppSheet)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Sincronizar filtro de estado externo con estado local
  useEffect(() => {
    setStatusFilter(externalStatusFilter);
  }, [externalStatusFilter]);

  // Limpiar selección cuando se cambia el modo de vista
  useEffect(() => {
    if (viewMode === 'form') {
      setSelectedIds(new Set());
    }
  }, [viewMode]);

  // Cargar eventos
  const events = useLiveQuery(async (): Promise<InventoryEvent[]> => {
    try {
      if (!db.events) return [];
      return await db.events.orderBy('createdAt').reverse().toArray();
    } catch (error) {
      logger.error(
        'EventsModal',
        'Error loading events',
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }, [refreshKey]);

  // Filtrar y ordenar
  const filteredEvents = useMemo(() => {
    if (!events) return [];

    let result = [...events];

    // Filtro por tipo
    if (typeFilter !== 'all') {
      result = result.filter(e => e.type === typeFilter);
    }

    // Filtro por estado
    if (statusFilter !== 'all') {
      result = result.filter(e => e.status === statusFilter);
    }

    // Búsqueda
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        e =>
          e.productName?.toLowerCase().includes(q) ||
          e.barcode?.toLowerCase().includes(q) ||
          e.frcNumber?.toLowerCase().includes(q) ||
          e.batch?.toLowerCase().includes(q)
      );
    }

    // Ordenamiento
    result.sort((a, b) => {
      const aVal = a[sortConfig.key as keyof InventoryEvent];
      const bVal = b[sortConfig.key as keyof InventoryEvent];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    return result;
  }, [events, searchQuery, sortConfig, typeFilter, statusFilter]);

  // Computed: ¿Todos los elementos filtrados están seleccionados?
  const isAllSelected = useMemo(() => {
    return (
      filteredEvents.length > 0 &&
      filteredEvents.every(e => e.id !== undefined && selectedIds.has(e.id))
    );
  }, [filteredEvents, selectedIds]);

  // Contador de seleccionados
  const selectedCount = selectedIds.size;

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Abrir formulario para crear
  const handleNew = () => {
    setEditingEvent(null);
    setFormData(EMPTY_FORM);
    setViewMode('form');
    setSelectedIds(new Set()); // Limpiar selección
  };

  // Abrir formulario para editar
  const handleEdit = (event: InventoryEvent) => {
    setEditingEvent(event);
    setFormData({
      frcNumber: event.frcNumber || '',
      barcode: event.barcode || '',
      productName: event.productName || '',
      batch: event.batch || '',
      expiryDate: event.expiryDate || '',
      resolution: event.resolution || '',
      status: event.status as EventStatus,
      traspasoNumber: (event as any).traspasoNumber || '',
    });
    setViewMode('form');
  };

  // Guardar (crear o actualizar)
  const handleSave = async () => {
    if (!formData.productName.trim()) {
      toast.error('El nombre del producto es requerido');
      return;
    }

    setIsSaving(true);
    try {
      const eventData = {
        frcNumber: formData.frcNumber,
        barcode: formData.barcode,
        productName: formData.productName,
        batch: formData.batch,
        expiryDate: formData.expiryDate,
        resolution: formData.resolution,
        status: formData.status,
        traspasoNumber: formData.traspasoNumber,
      };

      if (editingEvent?.id) {
        // Actualizar - marcar como pendiente de sincronizar
        await db.events.update(editingEvent.id, {
          ...eventData,
          updatedAt: Date.now(),
          syncStatus: 'pending' as const,
        });
        toast.success('Evento actualizado correctamente');
      } else {
        // Crear - marcar como pendiente de sincronizar
        await db.events.add({
          ...eventData,
          type: 'info' as const,
          createdAt: Date.now(),
          syncStatus: 'pending' as const,
        });
        toast.success('Evento creado correctamente');
      }

      setViewMode('table');
      setRefreshKey(k => k + 1);
    } catch (error) {
      logger.error(
        'EventsModal',
        'Error saving event',
        error instanceof Error ? error.message : String(error)
      );
      toast.error('Error al guardar el evento');
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar evento (local y nube)
  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este evento?')) return;

    try {
      // Obtener el evento antes de eliminar
      const event = await db.events.get(id);

      if (event) {
        // Registrar en lista de eliminados para no volver a descargar
        const eventKey = `${event.barcode || ''}~${event.frcNumber || ''}`.toLowerCase();
        await db.deletedEvents.put({
          eventKey,
          barcode: event.barcode || '',
          frcNumber: event.frcNumber || '',
          deletedAt: Date.now(),
          synced: false, // Se marcará como sincronizado cuando se elimine de la nube
        });

        // Intentar eliminar de la nube
        try {
          const { supabase } = await import('@/lib/supabase');
          const deleteResult = await supabase
            .from('EVENTOS')
            .delete()
            .eq('barcode', event.barcode || '')
            .eq('frc_code', event.frcNumber || '');

          if (!deleteResult.error) {
            // Marcar como sincronizado en lista de eliminados
            await db.deletedEvents.where('eventKey').equals(eventKey).modify({ synced: true });
          } else {
            logger.warn(
              'EventsModal',
              'No se pudo eliminar de la nube',
              deleteResult.error.message
            );
          }
        } catch (cloudErr) {
          logger.warn(
            'EventsModal',
            'No se pudo eliminar de la nube',
            cloudErr instanceof Error ? cloudErr.message : String(cloudErr)
          );
          // Continuar con eliminación local aunque falle la nube
        }
      }

      // Eliminar localmente
      await db.events.delete(id);
      toast.success('Evento eliminado');
      setRefreshKey(k => k + 1);
    } catch (error) {
      logger.error(
        'EventsModal',
        'Error deleting event',
        error instanceof Error ? error.message : String(error)
      );
      toast.error('Error al eliminar');
    }
  };

  // Limpiar eventos problemáticos y agregarlos a eliminados
  const handleCleanOrphanEvents = async () => {
    if (
      !confirm(
        '¿Eliminar TODOS los eventos actuales y agregarlos a la lista de eliminados? No se volverán a descargar.'
      )
    )
      return;

    try {
      // Obtener TODOS los eventos locales
      const allEvents = await db.events.toArray();

      if (allEvents.length === 0) {
        toast.info('No hay eventos para limpiar');
        return;
      }

      let cleaned = 0;
      let errors = 0;

      for (const event of allEvents) {
        try {
          if (event.id) {
            // Agregar a lista de eliminados con la clave barcode~frcNumber
            const eventKey = `${event.barcode || ''}~${event.frcNumber || ''}`.toLowerCase();
            await db.deletedEvents.put({
              eventKey,
              barcode: event.barcode || '',
              frcNumber: event.frcNumber || '',
              deletedAt: Date.now(),
              synced: false, // Se intentará sincronizar la eliminación
            });

            // Intentar eliminar de la nube
            try {
              const { supabase } = await import('@/lib/supabase');
              await supabase
                .from('EVENTOS')
                .delete()
                .eq('barcode', event.barcode || '')
                .eq('frc_code', event.frcNumber || '');

              // Marcar como sincronizado si se eliminó de la nube
              await db.deletedEvents.where('eventKey').equals(eventKey).modify({ synced: true });
            } catch (cloudErr) {
              logger.warn(
                'EventsModal',
                'No se pudo eliminar de la nube',
                cloudErr instanceof Error ? cloudErr.message : String(cloudErr)
              );
            }

            // Eliminar localmente
            await db.events.delete(event.id);
            cleaned++;
          }
        } catch (err) {
          logger.error(
            'EventsModal',
            'Error cleaning event',
            err instanceof Error ? err.message : String(err)
          );
          errors++;
        }
      }

      if (errors > 0) {
        toast.error(`${cleaned} eliminados, ${errors} errores`);
      } else {
        toast.success(`${cleaned} eventos eliminados. No se volverán a descargar.`);
      }
      setRefreshKey(k => k + 1);
    } catch (error) {
      logger.error(
        'EventsModal',
        'Error cleaning orphan events',
        error instanceof Error ? error.message : String(error)
      );
      toast.error('Error al limpiar eventos: ' + String(error));
    }
  };

  // Cancelar formulario
  const handleCancelForm = () => {
    setViewMode('table');
    setEditingEvent(null);
    setFormData(EMPTY_FORM);
  };

  // ============================================================================
  // Selección múltiple (estilo AppSheet)
  // ============================================================================

  // Toggle selección de un item
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Seleccionar todos / deseleccionar todos
  const toggleSelectAll = () => {
    if (isAllSelected) {
      // Deseleccionar todos
      setSelectedIds(new Set());
    } else {
      // Seleccionar todos los ids visibles
      const allIds = filteredEvents.filter(e => e.id !== undefined).map(e => e.id as number);
      setSelectedIds(new Set(allIds));
    }
  };

  // Limpiar selección
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Eliminar seleccionados (masivo) - usa función importada
  const handleBulkDelete = async () => {
    setIsDeletingBulk(true);
    try {
      await bulkDeleteEvents(selectedIds, () => {
        setSelectedIds(new Set());
        setRefreshKey(k => k + 1);
      });
    } finally {
      setIsDeletingBulk(false);
    }
  };

  if (!isOpen) return null;

  // Contenedor según modo
  const containerClass = embedded
    ? 'bg-surface border border-subtle rounded-2xl w-full h-full flex flex-col overflow-hidden'
    : 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm';

  const handleContainerClick = embedded ? undefined : onClose;
  const handleContentClick = embedded ? undefined : (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className={containerClass} onClick={handleContainerClick as any}>
      <motion.div
        initial={embedded ? false : { scale: 0.95, opacity: 0 }}
        animate={embedded ? false : { scale: 1, opacity: 1 }}
        exit={embedded ? false : { scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', duration: 0.3 }}
        className="bg-surface border border-subtle rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden"
        onClick={handleContentClick as any}
        style={embedded ? { borderRadius: '1rem', maxWidth: '100%', height: '100%' } : {}}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-subtle shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            {viewMode === 'table' ? (
              <>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <TableIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-primary">Eventos</h2>
                  <p className="text-[10px] sm:text-xs text-muted hidden sm:block">
                    {selectedCount > 0
                      ? `${selectedCount} seleccionado${selectedCount !== 1 ? 's' : ''} de ${filteredEvents.length}`
                      : `${filteredEvents.length} registros`}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-primary">
                  {editingEvent ? 'Editar' : 'Nuevo Evento'}
                </h2>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {viewMode === 'table' && selectedCount === 0 && (
              <button
                onClick={handleNew}
                className="flex items-center gap-1 sm:gap-2 bg-blue-600 hover:bg-blue-500 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-colors"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Nuevo</span>
              </button>
            )}
            {viewMode === 'table' && (
              <button
                onClick={handleCleanOrphanEvents}
                className="flex items-center gap-1 sm:gap-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-medium transition-colors border border-amber-500/30"
                title="Eliminar eventos con FRC='-' para evitar descargas fantasma"
              >
                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Limpiar</span>
              </button>
            )}
            {embedded && onSwitchView && (
              <button
                onClick={onSwitchView}
                className="flex items-center gap-1 sm:gap-2 bg-surface hover:bg-elevated text-secondary px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-colors border border-subtle"
              >
                <List className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Cards</span>
              </button>
            )}
            <button
              onClick={embedded ? onSwitchView || (() => {}) : onClose}
              className="p-1.5 sm:p-2 hover:bg-base rounded-lg sm:rounded-xl transition-colors"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-muted" />
            </button>
          </div>
        </div>

        {/* Barra de acciones masivas */}
        <AnimatePresence>
          {viewMode === 'table' && selectedCount > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-blue-600/10 border-b border-blue-500/30 px-6 py-3 shrink-0 overflow-hidden"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-blue-400" />
                    <span className="text-sm font-medium text-blue-300">
                      {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <button
                    onClick={clearSelection}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    Limpiar selección
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 bg-surface hover:bg-elevated text-secondary px-3 py-1.5 rounded-lg text-sm transition-colors border border-subtle"
                  >
                    {isAllSelected ? (
                      <>
                        <Square className="w-4 h-4" />
                        Deseleccionar todo
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-4 h-4" />
                        Seleccionar todo ({filteredEvents.length})
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={isDeletingBulk}
                    className="flex items-center gap-2 bg-rose-600/80 hover:bg-rose-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {isDeletingBulk ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Eliminar {selectedCount}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {viewMode === 'table' ? (
              <motion.div
                key="table"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* Filtros */}
                <div className="px-4 sm:px-6 py-2 sm:py-3 border-b border-subtle shrink-0">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar..."
                        className="w-full bg-base border border-subtle rounded-xl pl-9 pr-4 py-2 text-sm text-primary focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <select
                      value={typeFilter}
                      onChange={e => setTypeFilter(e.target.value as EventType | 'all')}
                      className="bg-base border border-subtle rounded-xl px-2 sm:px-3 py-2 text-xs sm:text-sm text-primary focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">Tipo</option>
                      {TYPE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value as EventStatus | 'all')}
                      className="bg-base border border-subtle rounded-xl px-2 sm:px-3 py-2 text-xs sm:text-sm text-primary focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">Estado</option>
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tabla */}
                <div className="flex-1 overflow-auto min-w-0">
                  <table className="w-full min-w-[600px]">
                    <thead className="sticky top-0 bg-surface z-10">
                      <tr className="border-b border-subtle">
                        {/* Checkbox de selección */}
                        <th className="w-10 sm:w-12 px-2 sm:px-4 py-2 sm:py-3">
                          <button
                            onClick={toggleSelectAll}
                            className="flex items-center justify-center w-5 h-5 rounded transition-colors hover:bg-elevated"
                            title={isAllSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                          >
                            {isAllSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-400" />
                            ) : (
                              <Square
                                className={cn(
                                  'w-4 h-4',
                                  selectedCount > 0 ? 'text-blue-400' : 'text-muted'
                                )}
                              />
                            )}
                          </button>
                        </th>
                        {COLUMNS.map(col => (
                          <th
                            key={col.key}
                            className={cn(
                              'px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-muted uppercase tracking-wider',
                              col.width,
                              col.sortable && 'cursor-pointer hover:text-primary transition-colors'
                            )}
                            onClick={() => col.sortable && handleSort(col.key)}
                          >
                            <div className="flex items-center gap-1">
                              <span className="hidden sm:inline">{col.label}</span>
                              <span className="sm:hidden">
                                {col.label === 'FRC'
                                  ? 'FRC'
                                  : col.label === 'Producto'
                                    ? 'Prod'
                                    : col.label === 'Barras'
                                      ? 'Bar'
                                      : col.label === 'Lote'
                                        ? 'Lot'
                                        : col.label === 'Vencimiento'
                                          ? 'Ven'
                                          : col.label === 'Estado'
                                            ? 'Est'
                                            : col.label === 'Fecha'
                                              ? 'Fec'
                                              : ''}
                              </span>
                              {col.sortable &&
                                sortConfig.key === col.key &&
                                (sortConfig.direction === 'asc' ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                ))}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-subtle">
                      {filteredEvents.length === 0 ? (
                        <tr>
                          <td colSpan={COLUMNS.length + 1} className="px-4 py-12 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <Info className="w-8 h-8 text-muted" />
                              <p className="text-sm text-muted">No hay eventos registrados</p>
                              <button
                                onClick={handleNew}
                                className="mt-2 text-blue-500 hover:text-blue-400 text-sm font-medium"
                              >
                                + Crear el primero
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredEvents.map(event => {
                          const statusInfo = STATUS_OPTIONS.find(s => s.value === event.status);
                          const isSelected = event.id !== undefined && selectedIds.has(event.id);

                          return (
                            <tr
                              key={event.id}
                              className={cn(
                                'transition-colors',
                                isSelected ? 'bg-blue-500/10' : 'hover:bg-base/50'
                              )}
                            >
                              {/* Checkbox de selección */}
                              <td className="w-10 sm:w-12 px-2 sm:px-4 py-2 sm:py-3">
                                <button
                                  onClick={() => event.id !== undefined && toggleSelect(event.id)}
                                  className="flex items-center justify-center w-5 h-5 rounded transition-colors hover:bg-elevated"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-blue-400" />
                                  ) : (
                                    <Square className="w-4 h-4 text-muted" />
                                  )}
                                </button>
                              </td>
                              {/* FRC */}
                              <td className="px-2 sm:px-4 py-2 sm:py-3">
                                <span className="text-xs sm:text-sm font-mono text-primary truncate block max-w-[60px] sm:max-w-none">
                                  {event.frcNumber || '-'}
                                </span>
                              </td>

                              {/* Producto */}
                              <td className="px-2 sm:px-4 py-2 sm:py-3">
                                <span className="text-xs sm:text-sm text-primary line-clamp-1 block max-w-[80px] sm:max-w-[200px]">
                                  {event.productName || '-'}
                                </span>
                              </td>

                              {/* Barras */}
                              <td className="px-2 sm:px-4 py-2 sm:py-3 hidden sm:table-cell">
                                <span className="text-xs sm:text-sm font-mono text-secondary truncate block max-w-[80px]">
                                  {event.barcode || '-'}
                                </span>
                              </td>

                              {/* Lote */}
                              <td className="px-2 sm:px-4 py-2 sm:py-3 hidden md:table-cell">
                                <span className="text-xs sm:text-sm text-secondary truncate block max-w-[60px]">
                                  {event.batch || '-'}
                                </span>
                              </td>

                              {/* Vencimiento */}
                              <td className="px-2 sm:px-4 py-2 sm:py-3 hidden lg:table-cell">
                                <span className="text-xs sm:text-sm text-secondary">
                                  {event.expiryDate || '-'}
                                </span>
                              </td>

                              {/* Estado */}
                              <td className="px-2 sm:px-4 py-2 sm:py-3">
                                <span
                                  className={cn(
                                    'text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap',
                                    event.status === 'pending' && 'bg-amber-500/20 text-amber-500',
                                    event.status === 'destined' && 'bg-blue-500/20 text-blue-500',
                                    event.status === 'adjusted' &&
                                      'bg-emerald-500/20 text-emerald-500'
                                  )}
                                >
                                  {statusInfo?.label}
                                </span>
                              </td>

                              {/* Indicador de sincronización */}
                              <td className="px-2 sm:px-4 py-2 sm:py-3">
                                <div className="flex items-center justify-center">
                                  {event.syncStatus === 'pending' && (
                                    <div title="Esperando respaldo">
                                      <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400 animate-spin" />
                                    </div>
                                  )}
                                  {event.syncStatus === 'synced' && (
                                    <div title="Respaldado">
                                      <Cloud className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" />
                                    </div>
                                  )}
                                  {event.syncStatus === 'error' && (
                                    <div title="Error">
                                      <CloudOff className="w-3 h-3 sm:w-4 sm:h-4 text-rose-400" />
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Fecha */}
                              <td className="px-2 sm:px-4 py-2 sm:py-3 hidden sm:table-cell">
                                <span className="text-[10px] sm:text-sm text-muted">
                                  {event.createdAt ? formatEventDate(event.createdAt) : '-'}
                                </span>
                              </td>

                              {/* Acciones */}
                              <td className="px-2 sm:px-4 py-2 sm:py-3">
                                <div className="flex items-center gap-0.5 sm:gap-1">
                                  <button
                                    onClick={() => handleEdit(event)}
                                    className="p-1 rounded-lg hover:bg-blue-500/20 transition-colors"
                                    title="Editar"
                                  >
                                    <Edit2 className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                                  </button>
                                  <button
                                    onClick={() => event.id && handleDelete(event.id)}
                                    className="p-1 rounded-lg hover:bg-rose-500/20 transition-colors"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-rose-500" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 overflow-y-auto p-4 sm:p-6"
              >
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSave();
                  }}
                  className="space-y-4 sm:space-y-6 max-w-2xl"
                >
                  {/* Estado y Traspaso */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-secondary mb-1 sm:mb-2">
                        Estado
                      </label>
                      <select
                        value={formData.status}
                        onChange={e =>
                          setFormData({ ...formData, status: e.target.value as EventStatus })
                        }
                        className="w-full bg-base border border-subtle rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-primary focus:outline-none focus:border-blue-500"
                      >
                        {STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-secondary mb-1 sm:mb-2">
                        N° de Traspaso
                      </label>
                      <input
                        type="number"
                        value={formData.traspasoNumber}
                        onChange={e => {
                          const value = e.target.value;
                          setFormData({
                            ...formData,
                            traspasoNumber: value,
                            status:
                              value.trim() !== '' ? ('adjusted' as EventStatus) : formData.status,
                          });
                        }}
                        className="w-full bg-base border border-subtle rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-primary focus:outline-none focus:border-blue-500 font-mono"
                        placeholder="Ej: 12345"
                      />
                      {formData.traspasoNumber.trim() !== '' && (
                        <p className="text-[10px] sm:text-xs text-emerald-500 mt-1">
                          ✓ Estado: Ajustados
                        </p>
                      )}
                    </div>
                  </div>

                  {/* FRC y Barras */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-secondary mb-1 sm:mb-2">
                        Número FRC
                      </label>
                      <input
                        type="text"
                        value={formData.frcNumber}
                        onChange={e => setFormData({ ...formData, frcNumber: e.target.value })}
                        className="w-full bg-base border border-subtle rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-primary focus:outline-none focus:border-blue-500 font-mono"
                        placeholder="FRC-0001"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-secondary mb-1 sm:mb-2">
                        Código de Barras
                      </label>
                      <input
                        type="text"
                        value={formData.barcode}
                        onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                        className="w-full bg-base border border-subtle rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-primary focus:outline-none focus:border-blue-500 font-mono"
                        placeholder="1234567890123"
                      />
                    </div>
                  </div>

                  {/* Producto */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-secondary mb-1 sm:mb-2">
                      Nombre del Producto *
                    </label>
                    <input
                      type="text"
                      value={formData.productName}
                      onChange={e => setFormData({ ...formData, productName: e.target.value })}
                      className="w-full bg-base border border-subtle rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-primary focus:outline-none focus:border-blue-500"
                      placeholder="Nombre del producto"
                      required
                    />
                  </div>

                  {/* Lote y Vencimiento */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-secondary mb-1 sm:mb-2">
                        Lote
                      </label>
                      <input
                        type="text"
                        value={formData.batch}
                        onChange={e => setFormData({ ...formData, batch: e.target.value })}
                        className="w-full bg-base border border-subtle rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-primary focus:outline-none focus:border-blue-500"
                        placeholder="LOT-2024-001"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-secondary mb-1 sm:mb-2">
                        Fecha de Vencimiento
                      </label>
                      <input
                        type="text"
                        value={formData.expiryDate}
                        onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                        className="w-full bg-base border border-subtle rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-primary focus:outline-none focus:border-blue-500"
                        placeholder="mm/yyyy"
                      />
                    </div>
                  </div>

                  {/* Resolución */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-secondary mb-1 sm:mb-2">
                      Resolución / Notas
                    </label>
                    <textarea
                      value={formData.resolution}
                      onChange={e => setFormData({ ...formData, resolution: e.target.value })}
                      className="w-full bg-base border border-subtle rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-primary focus:outline-none focus:border-blue-500 resize-none"
                      rows={3}
                      placeholder="Notas o resolución del evento..."
                    />
                  </div>

                  {/* Botones */}
                  <div className="flex items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-subtle">
                    <button
                      type="button"
                      onClick={handleCancelForm}
                      className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium text-secondary bg-base border border-subtle hover:bg-elevated transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {editingEvent ? 'Actualizar' : 'Guardar'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
