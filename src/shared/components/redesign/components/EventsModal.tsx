import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Plus, Edit2, Trash2, Save, Loader2, ChevronUp, ChevronDown,
  AlertCircle, AlertTriangle, CheckCircle, Info, Search, Filter,
  Table as TableIcon, ClipboardList, ArrowUpDown, List, Cloud, CloudOff, RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, InventoryEvent } from '@/db'

// ============================================================================
// Tipos
// ============================================================================
type EventType = 'info' | 'warning' | 'error' | 'success'
type EventStatus = 'pending' | 'destined' | 'adjusted'
type ViewMode = 'table' | 'form'

interface EventFormData {
  frcNumber: string
  barcode: string
  productName: string
  batch: string
  expiryDate: string
  resolution: string
  status: EventStatus
  traspasoNumber: string
}

// ============================================================================
// Constantes
// ============================================================================
const EVENT_META: Record<EventType, {
  label: string; icon: React.ElementType; bg: string; border: string; dot: string; text: string
}> = {
  info: { label: 'Info', icon: Info, bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-500', text: 'text-blue-500' },
  warning: { label: 'Advertencia', icon: AlertTriangle, bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-500', text: 'text-amber-500' },
  error: { label: 'Error', icon: AlertCircle, bg: 'bg-rose-500/10', border: 'border-rose-500/30', dot: 'bg-rose-500', text: 'text-rose-500' },
  success: { label: 'Éxito', icon: CheckCircle, bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500', text: 'text-emerald-500' },
}

const STATUS_OPTIONS: { value: EventStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pendiente', color: 'text-amber-500' },
  { value: 'destined', label: 'Destinados', color: 'text-blue-500' },
  { value: 'adjusted', label: 'Ajustados', color: 'text-emerald-500' },
]

const TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Advertencia' },
  { value: 'error', label: 'Error' },
  { value: 'success', label: 'Éxito' },
]

const COLUMNS = [
  { key: 'frcNumber', label: 'FRC', sortable: true, width: 'w-28' },
  { key: 'productName', label: 'Producto', sortable: true, width: 'flex-1' },
  { key: 'barcode', label: 'Barras', sortable: true, width: 'w-32' },
  { key: 'batch', label: 'Lote', sortable: true, width: 'w-24' },
  { key: 'expiryDate', label: 'Vencimiento', sortable: true, width: 'w-28' },
  { key: 'status', label: 'Estado', sortable: true, width: 'w-24' },
  { key: 'syncStatus', label: '', sortable: false, width: 'w-8' },
  { key: 'createdAt', label: 'Fecha', sortable: true, width: 'w-28' },
  { key: 'actions', label: '', sortable: false, width: 'w-24' },
]

// ============================================================================
// Helper
// ============================================================================
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const EMPTY_FORM: EventFormData = {
  frcNumber: '',
  barcode: '',
  productName: '',
  batch: '',
  expiryDate: '',
  resolution: '',
  status: 'pending',
  traspasoNumber: '',
}

// ============================================================================
// Componente: EventsModal
// ============================================================================
interface EventsModalProps {
  isOpen: boolean
  onClose: () => void
  embedded?: boolean
  onSwitchView?: () => void
  statusFilter?: EventStatus | 'all'
}

export const EventsModal: React.FC<EventsModalProps> = ({ isOpen, onClose, embedded = false, onSwitchView, statusFilter: externalStatusFilter = 'all' }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [editingEvent, setEditingEvent] = useState<InventoryEvent | null>(null)
  const [formData, setFormData] = useState<EventFormData>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'createdAt',
    direction: 'desc'
  })
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all')
  const [refreshKey, setRefreshKey] = useState(0)

  // Sincronizar filtro de estado externo con estado local
  useEffect(() => {
    setStatusFilter(externalStatusFilter)
  }, [externalStatusFilter])

  // Cargar eventos
  const events = useLiveQuery(async (): Promise<InventoryEvent[]> => {
    try {
      if (!db.events) return []
      return await db.events.orderBy('createdAt').reverse().toArray()
    } catch (error) {
      console.error('Error loading events:', error)
      return []
    }
  }, [refreshKey])

  // Filtrar y ordenar
  const filteredEvents = useMemo(() => {
    if (!events) return []
    
    let result = [...events]
    
    // Filtro por tipo
    if (typeFilter !== 'all') {
      result = result.filter(e => e.type === typeFilter)
    }
    
    // Filtro por estado
    if (statusFilter !== 'all') {
      result = result.filter(e => e.status === statusFilter)
    }
    
    // Búsqueda
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(e =>
        e.productName?.toLowerCase().includes(q) ||
        e.barcode?.toLowerCase().includes(q) ||
        e.frcNumber?.toLowerCase().includes(q) ||
        e.batch?.toLowerCase().includes(q)
      )
    }
    
    // Ordenamiento
    result.sort((a, b) => {
      const aVal = a[sortConfig.key as keyof InventoryEvent]
      const bVal = b[sortConfig.key as keyof InventoryEvent]
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
      }
      return 0
    })
    
    return result
  }, [events, searchQuery, sortConfig, typeFilter, statusFilter])

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  // Abrir formulario para crear
  const handleNew = () => {
    setEditingEvent(null)
    setFormData(EMPTY_FORM)
    setViewMode('form')
  }

  // Abrir formulario para editar
  const handleEdit = (event: InventoryEvent) => {
    setEditingEvent(event)
    setFormData({
      frcNumber: event.frcNumber || '',
      barcode: event.barcode || '',
      productName: event.productName || '',
      batch: event.batch || '',
      expiryDate: event.expiryDate || '',
      resolution: event.resolution || '',
      status: event.status as EventStatus,
      traspasoNumber: (event as any).traspasoNumber || '',
    })
    setViewMode('form')
  }

  // Guardar (crear o actualizar)
  const handleSave = async () => {
    if (!formData.productName.trim()) {
      toast.error('El nombre del producto es requerido')
      return
    }
    
    setIsSaving(true)
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
      }
      
      if (editingEvent?.id) {
        // Actualizar - marcar como pendiente de sincronizar
        await db.events.update(editingEvent.id, {
          ...eventData,
          updatedAt: Date.now(),
          syncStatus: 'pending' as const,
        })
        toast.success('Evento actualizado correctamente')
      } else {
        // Crear - marcar como pendiente de sincronizar
        await db.events.add({
          ...eventData,
          type: 'info' as const,
          createdAt: Date.now(),
          syncStatus: 'pending' as const,
        })
        toast.success('Evento creado correctamente')
      }
      
      setViewMode('table')
      setRefreshKey(k => k + 1)
    } catch (error) {
      console.error('Error saving event:', error)
      toast.error('Error al guardar el evento')
    } finally {
      setIsSaving(false)
    }
  }

  // Eliminar evento (local y nube)
  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este evento?')) return
    
    try {
      // Obtener el evento antes de eliminar
      const event = await db.events.get(id)
      
      if (event) {
        // Registrar en lista de eliminados para no volver a descargar
        const eventKey = `${event.barcode || ''}~${event.frcNumber || ''}`.toLowerCase();
        await db.deletedEvents.put({
          eventKey,
          barcode: event.barcode || '',
          frcNumber: event.frcNumber || '',
          deletedAt: Date.now(),
          synced: false // Se marcará como sincronizado cuando se elimine de la nube
        });

        // Intentar eliminar de la nube
        try {
          const { supabase } = await import('@/lib/supabase')
          const deleteResult = await supabase
            .from('EVENTOS')
            .delete()
            .eq('barcode', event.barcode || '')
            .eq('frc_code', event.frcNumber || '')
          
          if (!deleteResult.error) {
            // Marcar como sincronizado en lista de eliminados
            await db.deletedEvents
              .where('eventKey')
              .equals(eventKey)
              .modify({ synced: true });
          } else {
            console.warn('No se pudo eliminar de la nube:', deleteResult.error.message)
          }
        } catch (cloudErr) {
          console.warn('No se pudo eliminar de la nube:', cloudErr)
          // Continuar con eliminación local aunque falle la nube
        }
      }
      
      // Eliminar localmente
      await db.events.delete(id)
      toast.success('Evento eliminado')
      setRefreshKey(k => k + 1)
    } catch (error) {
      console.error('Error deleting event:', error)
      toast.error('Error al eliminar')
    }
  }

  // Cancelar formulario
  const handleCancelForm = () => {
    setViewMode('table')
    setEditingEvent(null)
    setFormData(EMPTY_FORM)
  }

  if (!isOpen) return null

  // Contenedor según modo
  const containerClass = embedded
    ? "bg-surface border border-subtle rounded-2xl w-full h-full flex flex-col overflow-hidden"
    : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"

  const handleContainerClick = embedded ? undefined : onClose
  const handleContentClick = embedded ? undefined : (e: React.MouseEvent) => e.stopPropagation()

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
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle shrink-0">
          <div className="flex items-center gap-3">
            {viewMode === 'table' ? (
              <>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <TableIcon className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-primary">Gestión de Eventos</h2>
                  <p className="text-xs text-muted">{filteredEvents.length} registros</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-lg font-bold text-primary">
                  {editingEvent ? 'Editar Evento' : 'Nuevo Evento'}
                </h2>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {viewMode === 'table' && (
              <button
                onClick={handleNew}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nuevo
              </button>
            )}
            {embedded && onSwitchView && (
              <button
                onClick={onSwitchView}
                className="flex items-center gap-2 bg-surface hover:bg-elevated text-secondary px-3 py-2 rounded-xl text-sm font-medium transition-colors border border-subtle"
              >
                <List className="w-4 h-4" />
                Cards
              </button>
            )}
            <button
              onClick={embedded ? onSwitchView || (() => {}) : onClose}
              className="p-2 hover:bg-base rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-muted" />
            </button>
          </div>
        </div>

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
                <div className="px-6 py-3 border-b border-subtle space-y-3 shrink-0">
                  <div className="flex gap-3">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por producto, barras, FRC..."
                        className="w-full bg-base border border-subtle rounded-xl pl-10 pr-4 py-2 text-sm text-primary focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as EventType | 'all')}
                      className="bg-base border border-subtle rounded-xl px-3 py-2 text-sm text-primary focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">Todos los tipos</option>
                      {TYPE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as EventStatus | 'all')}
                      className="bg-base border border-subtle rounded-xl px-3 py-2 text-sm text-primary focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">Todos los estados</option>
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tabla */}
                <div className="flex-1 overflow-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-surface z-10">
                      <tr className="border-b border-subtle">
                        {COLUMNS.map(col => (
                          <th
                            key={col.key}
                            className={cn(
                              'px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider',
                              col.width,
                              col.sortable && 'cursor-pointer hover:text-primary transition-colors'
                            )}
                            onClick={() => col.sortable && handleSort(col.key)}
                          >
                            <div className="flex items-center gap-1">
                              {col.label}
                              {col.sortable && sortConfig.key === col.key && (
                                sortConfig.direction === 'asc' 
                                  ? <ChevronUp className="w-3 h-3" />
                                  : <ChevronDown className="w-3 h-3" />
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-subtle">
                      {filteredEvents.length === 0 ? (
                        <tr>
                          <td colSpan={COLUMNS.length} className="px-4 py-12 text-center">
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
                          const statusInfo = STATUS_OPTIONS.find(s => s.value === event.status)
                          
                          return (
                            <tr 
                              key={event.id}
                              className="hover:bg-base/50 transition-colors"
                            >
                              {/* FRC */}
                              <td className="px-4 py-3">
                                <span className="text-sm font-mono text-primary">
                                  {event.frcNumber || '-'}
                                </span>
                              </td>
                              
                              {/* Producto */}
                              <td className="px-4 py-3">
                                <span className="text-sm text-primary line-clamp-1">
                                  {event.productName || '-'}
                                </span>
                              </td>
                              
                              {/* Barras */}
                              <td className="px-4 py-3">
                                <span className="text-sm font-mono text-secondary">
                                  {event.barcode || '-'}
                                </span>
                              </td>
                              
                              {/* Lote */}
                              <td className="px-4 py-3">
                                <span className="text-sm text-secondary">
                                  {event.batch || '-'}
                                </span>
                              </td>
                              
                              {/* Vencimiento */}
                              <td className="px-4 py-3">
                                <span className="text-sm text-secondary">
                                  {event.expiryDate || '-'}
                                </span>
                              </td>
                              
                              {/* Estado */}
                              <td className="px-4 py-3">
                                <span className={cn(
                                  'text-xs font-medium px-2 py-1 rounded-full',
                                  event.status === 'pending' && 'bg-amber-500/20 text-amber-500',
                                  event.status === 'destined' && 'bg-blue-500/20 text-blue-500',
                                  event.status === 'adjusted' && 'bg-emerald-500/20 text-emerald-500'
                                )}>
                                  {statusInfo?.label}
                                </span>
                              </td>
                              
                              {/* Indicador de sincronización */}
                              <td className="px-4 py-3">
                                {event.syncStatus === 'pending' && (
                                  <div className="flex items-center justify-center" title="Esperando respaldo">
                                    <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                                  </div>
                                )}
                                {event.syncStatus === 'synced' && (
                                  <div className="flex items-center justify-center" title="Respaldado">
                                    <Cloud className="w-4 h-4 text-emerald-400" />
                                  </div>
                                )}
                                {event.syncStatus === 'error' && (
                                  <div className="flex items-center justify-center" title="Error de sincronización">
                                    <CloudOff className="w-4 h-4 text-rose-400" />
                                  </div>
                                )}
                              </td>
                              
                              {/* Fecha */}
                              <td className="px-4 py-3">
                                <span className="text-sm text-muted">
                                  {event.createdAt ? formatDate(event.createdAt) : '-'}
                                </span>
                              </td>
                              
                              {/* Acciones */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleEdit(event)}
                                    className="p-1.5 rounded-lg hover:bg-blue-500/20 transition-colors"
                                    title="Editar"
                                  >
                                    <Edit2 className="w-4 h-4 text-blue-500" />
                                  </button>
                                  <button
                                    onClick={() => event.id && handleDelete(event.id)}
                                    className="p-1.5 rounded-lg hover:bg-rose-500/20 transition-colors"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-4 h-4 text-rose-500" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
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
                className="flex-1 overflow-y-auto p-6"
              >
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6 max-w-2xl">
                  {/* Estado y Traspaso */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">Estado</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as EventStatus })}
                        className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500"
                      >
                        {STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">N° de Traspaso</label>
                      <input
                        type="number"
                        value={formData.traspasoNumber}
                        onChange={(e) => {
                          const value = e.target.value
                          setFormData({ 
                            ...formData, 
                            traspasoNumber: value,
                            status: value.trim() !== '' ? 'adjusted' as EventStatus : formData.status
                          })
                        }}
                        className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500 font-mono"
                        placeholder="Ej: 12345"
                      />
                      {formData.traspasoNumber.trim() !== '' && (
                        <p className="text-xs text-emerald-500 mt-1">✓ Estado: Ajustados</p>
                      )}
                    </div>
                  </div>

                  {/* FRC y Barras */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">Número FRC</label>
                      <input
                        type="text"
                        value={formData.frcNumber}
                        onChange={(e) => setFormData({ ...formData, frcNumber: e.target.value })}
                        className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500 font-mono"
                        placeholder="FRC-0001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">Código de Barras</label>
                      <input
                        type="text"
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500 font-mono"
                        placeholder="1234567890123"
                      />
                    </div>
                  </div>

                  {/* Producto */}
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">Nombre del Producto *</label>
                    <input
                      type="text"
                      value={formData.productName}
                      onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                      className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500"
                      placeholder="Nombre del producto"
                      required
                    />
                  </div>

                  {/* Lote y Vencimiento */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">Lote</label>
                      <input
                        type="text"
                        value={formData.batch}
                        onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                        className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500"
                        placeholder="LOT-2024-001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">Fecha de Vencimiento</label>
                      <input
                        type="text"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                        className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500"
                        placeholder="mm/yyyy"
                      />
                    </div>
                  </div>

                  {/* Resolución */}
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">Resolución / Notas</label>
                    <textarea
                      value={formData.resolution}
                      onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                      className="w-full bg-base border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500 resize-none"
                      rows={3}
                      placeholder="Notas o resolución del evento..."
                    />
                  </div>

                  {/* Botones */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-subtle">
                    <button
                      type="button"
                      onClick={handleCancelForm}
                      className="px-6 py-2.5 rounded-xl text-sm font-medium text-secondary bg-base border border-subtle hover:bg-elevated transition-colors"
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
  )
}
