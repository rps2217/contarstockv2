import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PackageCheck, Plus, Search, Upload, Camera, List, Grid, X, Check,
  Clock, MapPin, User, Package, MoreVertical, ChevronRight, Truck,
  Trash2, Pencil, Eye, AlertCircle, CheckCircle2, XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { SessionRepository } from '@/repositories/SessionRepository'

// ============================================================================
// Tipos
// ============================================================================
interface Reception {
  id: string
  supplierName?: string
  supplierRut?: string
  documentNumber?: string
  documentType?: string
  receivedBy?: string
  location?: string
  receivedAt: number
  items: { barcode: string; name?: string; quantity: number; expiry?: string }[]
  observations?: string
  status: 'pending' | 'in-progress' | 'completed'
  syncStatus: 'pending' | 'synced' | 'error'
}

// ============================================================================
// Componentes de UI - Estilo HammerPage
// ============================================================================
const StatCard = ({ icon: Icon, label, value, color = 'text-primary' }: { 
  icon: React.ElementType; label: string; value: number | string; color?: string 
}) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.9 }} 
    animate={{ opacity: 1, scale: 1 }}
    className="bg-surface border border-subtle rounded-xl p-3 flex items-center gap-3"
  >
    <div className="w-10 h-10 rounded-lg bg-elevated flex items-center justify-center shrink-0">
      <Icon className={cn('w-5 h-5', color)} />
    </div>
    <div className="min-w-0">
      <p className={cn('text-lg font-bold', color)}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  </motion.div>
)

const ReceptionCard = ({ 
  reception, 
  onView, 
  onEdit, 
  onDelete 
}: { 
  reception: Reception
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}) => {
  const statusConfig = {
    pending: { bg: 'bg-amber-500/20', text: 'text-amber-500', label: 'Pendiente', icon: Clock },
    'in-progress': { bg: 'bg-blue-500/20', text: 'text-blue-500', label: 'En Progreso', icon: Package },
    completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-500', label: 'Completado', icon: CheckCircle2 }
  }
  const status = statusConfig[reception.status]
  const StatusIcon = status.icon
  const date = reception.receivedAt ? new Date(reception.receivedAt).toLocaleDateString('es-CL') : '-'
  const time = reception.receivedAt ? new Date(reception.receivedAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }}
      className="bg-surface border border-subtle rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
          <PackageCheck className="w-6 h-6 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-primary truncate flex-1">
              {reception.supplierName || 'Recepción sin proveedor'}
            </h3>
            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0', status.bg, status.text)}>
              {status.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {reception.documentNumber && (
              <span className="font-mono">{reception.documentNumber}</span>
            )}
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              {reception.items?.length || 0}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {date} {time}
            </span>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="border-t border-subtle flex">
        <button 
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-xs text-muted hover:text-primary hover:bg-elevated transition-colors"
        >
          <Eye className="w-4 h-4" />
          Ver
        </button>
        <button 
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-xs text-muted hover:text-amber-500 hover:bg-elevated transition-colors border-l border-subtle"
        >
          <Pencil className="w-4 h-4" />
          Editar
        </button>
        <button 
          onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-xs text-muted hover:text-rose-500 hover:bg-elevated transition-colors border-l border-subtle"
        >
          <Trash2 className="w-4 h-4" />
          Eliminar
        </button>
      </div>
    </motion.div>
  )
}

// ============================================================================
// Modal de Formulario (Create/Edit)
// ============================================================================
const ReceptionFormModal = ({ 
  isOpen, 
  onClose, 
  onSave,
  reception 
}: { 
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Reception>) => void
  reception?: Reception | null
}) => {
  const [formData, setFormData] = useState({
    supplierName: '',
    supplierRut: '',
    documentNumber: '',
    documentType: 'factura',
    location: '',
    receivedBy: '',
    observations: ''
  })

  React.useEffect(() => {
    if (reception) {
      setFormData({
        supplierName: reception.supplierName || '',
        supplierRut: reception.supplierRut || '',
        documentNumber: reception.documentNumber || '',
        documentType: reception.documentType || 'factura',
        location: reception.location || '',
        receivedBy: reception.receivedBy || '',
        observations: reception.observations || ''
      })
    } else {
      setFormData({
        supplierName: '',
        supplierRut: '',
        documentNumber: '',
        documentType: 'factura',
        location: '',
        receivedBy: '',
        observations: ''
      })
    }
  }, [reception, isOpen])

  const handleSubmit = () => {
    if (!formData.supplierName.trim()) {
      toast.error('El nombre del proveedor es requerido')
      return
    }
    onSave(formData)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="relative w-full max-w-md bg-base rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="shrink-0 px-4 py-4 border-b border-subtle flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary">
                {reception ? 'Editar Recepción' : 'Nueva Recepción'}
              </h2>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface transition-colors">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="text-xs text-muted mb-1 block">Proveedor *</label>
                <input
                  type="text"
                  value={formData.supplierName}
                  onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  placeholder="Nombre del proveedor"
                  className="w-full bg-surface border border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1 block">RUT Proveedor</label>
                  <input
                    type="text"
                    value={formData.supplierRut}
                    onChange={(e) => setFormData({ ...formData, supplierRut: e.target.value })}
                    placeholder="12.345.678-9"
                    className="w-full bg-surface border border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">Tipo Documento</label>
                  <select
                    value={formData.documentType}
                    onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                    className="w-full bg-surface border border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="factura">Factura</option>
                    <option value="guia">Guía</option>
                    <option value="orden">Orden de Compra</option>
                    <option value="nota">Nota</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted mb-1 block">Número Documento</label>
                <input
                  type="text"
                  value={formData.documentNumber}
                  onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                  placeholder="12345"
                  className="w-full bg-surface border border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1 block">Ubicación</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Bodega A"
                    className="w-full bg-surface border border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">Recibido por</label>
                  <input
                    type="text"
                    value={formData.receivedBy}
                    onChange={(e) => setFormData({ ...formData, receivedBy: e.target.value })}
                    placeholder="Nombre"
                    className="w-full bg-surface border border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted mb-1 block">Observaciones</label>
                <textarea
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={3}
                  className="w-full bg-surface border border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 p-4 border-t border-subtle flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-surface hover:bg-elevated text-secondary rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors"
              >
                {reception ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// Modal de Detalle (Read)
// ============================================================================
const ReceptionDetailModal = ({ 
  isOpen, 
  onClose, 
  onEdit,
  reception 
}: { 
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  reception: Reception | null
}) => {
  if (!reception) return null

  const statusConfig = {
    pending: { bg: 'bg-amber-500/20', text: 'text-amber-500', label: 'Pendiente' },
    'in-progress': { bg: 'bg-blue-500/20', text: 'text-blue-500', label: 'En Progreso' },
    completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-500', label: 'Completado' }
  }
  const syncConfig = {
    pending: { bg: 'bg-amber-500/20', text: 'text-amber-500', label: 'Pendiente' },
    synced: { bg: 'bg-emerald-500/20', text: 'text-emerald-500', label: 'Sincronizado' },
    error: { bg: 'bg-rose-500/20', text: 'text-rose-500', label: 'Error' }
  }
  const status = statusConfig[reception.status]
  const sync = syncConfig[reception.syncStatus]
  const date = reception.receivedAt ? new Date(reception.receivedAt).toLocaleString('es-CL') : '-'

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="relative w-full max-w-md bg-base rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="shrink-0 px-4 py-4 border-b border-subtle flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <PackageCheck className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-primary">Detalle de Recepción</h2>
                  <p className="text-xs text-muted">{reception.id.slice(0, 8)}...</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface transition-colors">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Status badges */}
              <div className="flex gap-2">
                <span className={cn('px-3 py-1 rounded-full text-xs font-bold', status.bg, status.text)}>
                  {status.label}
                </span>
                <span className={cn('px-3 py-1 rounded-full text-xs font-bold', sync.bg, sync.text)}>
                  {sync.label}
                </span>
              </div>

              {/* Provider info */}
              <div className="bg-surface border border-subtle rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-500" />
                  Proveedor
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Nombre:</span>
                    <span className="text-primary">{reception.supplierName || '-'}</span>
                  </div>
                  {reception.supplierRut && (
                    <div className="flex justify-between">
                      <span className="text-muted">RUT:</span>
                      <span className="text-primary font-mono">{reception.supplierRut}</span>
                    </div>
                  )}
                  {reception.documentNumber && (
                    <div className="flex justify-between">
                      <span className="text-muted">Documento:</span>
                      <span className="text-primary font-mono">{reception.documentType?.toUpperCase()} {reception.documentNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Location & Receiver */}
              <div className="bg-surface border border-subtle rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  Ubicación y Recibido
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Ubicación:</span>
                    <span className="text-primary">{reception.location || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Recibido por:</span>
                    <span className="text-primary">{reception.receivedBy || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Fecha:</span>
                    <span className="text-primary">{date}</span>
                  </div>
                </div>
              </div>

              {/* Items count */}
              <div className="bg-surface border border-subtle rounded-xl p-4">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-amber-500" />
                  Items ({reception.items?.length || 0})
                </h3>
                {reception.items && reception.items.length > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {reception.items.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-muted truncate flex-1">{item.name || item.barcode}</span>
                        <span className="text-primary ml-2">x{item.quantity}</span>
                      </div>
                    ))}
                    {reception.items.length > 5 && (
                      <p className="text-xs text-muted text-center">+{reception.items.length - 5} más...</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted">Sin items registrados</p>
                )}
              </div>

              {/* Observations */}
              {reception.observations && (
                <div className="bg-surface border border-subtle rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-primary mb-2">Observaciones</h3>
                  <p className="text-sm text-secondary">{reception.observations}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 p-4 border-t border-subtle flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-surface hover:bg-elevated text-secondary rounded-xl font-medium transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={onEdit}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-bold transition-colors"
              >
                Editar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// Componente principal
// ============================================================================
export const RedesignReceptionPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [editingReception, setEditingReception] = useState<Reception | null>(null)
  const [selectedReception, setSelectedReception] = useState<Reception | null>(null)

  // Datos de recepciones (usando sessions como proxy)
  const receptions = useLiveQuery(async (): Promise<Reception[]> => {
    const sessions = await db.sessions.toArray()
    return sessions
      .filter(s => s.sessionType === 'reception')
      .map(s => ({
        id: s.id?.toString() || Math.random().toString(),
        supplierName: (s as any).supplierName || (s as any).productName || 'Recepción',
        supplierRut: (s as any).supplierRut,
        documentNumber: (s as any).documentNumber,
        documentType: (s as any).documentType,
        receivedBy: (s as any).userName || (s as any).receivedBy,
        location: (s as any).location,
        receivedAt: s.createdAt || (s as any).timestamp || Date.now(),
        items: (s as any).items || [],
        observations: (s as any).observations,
        status: (s as any).status === 'completed' ? 'completed' : 
                (s.syncStatus === 'synced' ? 'completed' : 'in-progress') as Reception['status'],
        syncStatus: (s.syncStatus || 'pending') as Reception['syncStatus']
      }))
      .sort((a, b) => b.receivedAt - a.receivedAt)
  }, [])

  const filtered = useMemo(() => {
    if (!receptions || !searchQuery) return receptions || []
    const q = searchQuery.toLowerCase()
    return receptions.filter(r => 
      r.supplierName?.toLowerCase().includes(q) ||
      r.documentNumber?.includes(q) ||
      r.location?.toLowerCase().includes(q)
    )
  }, [receptions, searchQuery])

  const stats = useMemo(() => {
    const all = receptions || []
    return {
      total: all.length,
      pending: all.filter(r => r.status === 'pending').length,
      inProgress: all.filter(r => r.status === 'in-progress').length,
      completed: all.filter(r => r.status === 'completed').length
    }
  }, [receptions])

  const handleCreate = () => {
    setEditingReception(null)
    setShowFormModal(true)
  }

  const handleEdit = (reception: Reception) => {
    setEditingReception(reception)
    setSelectedReception(reception)
    setShowDetailModal(false)
    setShowFormModal(true)
  }

  const handleView = (reception: Reception) => {
    setSelectedReception(reception)
    setShowDetailModal(true)
  }

  const handleDelete = async (reception: Reception) => {
    if (!confirm('¿Eliminar esta recepción? Esta acción no se puede deshacer.')) return
    try {
      await SessionRepository.delete(reception.id)
      toast.success('Recepción eliminada correctamente')
    } catch (error) {
      toast.error('Error al eliminar la recepción')
    }
  }

  const handleSave = async (data: Partial<Reception>) => {
    try {
      if (editingReception) {
        // Update existing
        await SessionRepository.save({
          ...editingReception,
          ...data,
          syncStatus: 'pending'
        } as any)
        toast.success('Recepción actualizada correctamente')
      } else {
        // Create new
        const newReception = {
          sessionType: 'reception' as const,
          supplierName: data.supplierName,
          supplierRut: data.supplierRut,
          documentNumber: data.documentNumber,
          documentType: data.documentType,
          location: data.location,
          receivedBy: data.receivedBy,
          observations: data.observations,
          items: [],
          status: 'pending' as const,
          createdAt: Date.now(),
          syncStatus: 'pending' as const
        }
        await SessionRepository.save(newReception as any)
        toast.success('Recepción creada correctamente')
      }
    } catch (error) {
      toast.error('Error al guardar la recepción')
    }
  }

  if (!receptions) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-base">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-muted mt-4">Cargando recepciones...</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-base">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 shrink-0">
        {/* Title row */}
        <div className="flex items-start justify-between pt-8 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <PackageCheck className="w-8 h-8 text-emerald-500" />
              Recepciones
            </h1>
            <p className="text-secondary text-sm mt-1">
              {stats.total} recepciones • {stats.completed} completadas
            </p>
          </div>
          <div className="flex gap-2">
            <button className="hidden sm:flex items-center gap-2 bg-surface hover:bg-elevated border border-subtle text-primary px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
              <Upload className="w-4 h-4" />
              Importar
            </button>
            <button 
              onClick={handleCreate}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva</span>
            </button>
          </div>
        </div>

        {/* Stats - mismo estilo que HammerPage */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-4">
          <StatCard icon={PackageCheck} label="Total" value={stats.total} />
          <StatCard icon={Clock} label="Pendientes" value={stats.pending} color="text-amber-500" />
          <StatCard icon={Package} label="En Progreso" value={stats.inProgress} color="text-blue-500" />
          <StatCard icon={CheckCircle2} label="Completadas" value={stats.completed} color="text-emerald-500" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por proveedor, documento o ubicación..."
              className="w-full bg-surface border border-subtle rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500" 
            />
          </div>

          {/* List */}
          <div className="flex flex-col gap-3">
            {filtered.length === 0 ? (
              <div className="bg-surface border border-subtle rounded-2xl p-8 text-center">
                <PackageCheck className="w-12 h-12 text-muted mx-auto mb-4" />
                <p className="text-muted mb-2">
                  {searchQuery ? 'No se encontraron recepciones' : 'No hay recepciones registradas'}
                </p>
                {!searchQuery && (
                  <button 
                    onClick={handleCreate}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    Crear primera recepción
                  </button>
                )}
              </div>
            ) : (
              filtered.map(reception => (
                <ReceptionCard 
                  key={reception.id} 
                  reception={reception}
                  onView={() => handleView(reception)}
                  onEdit={() => handleEdit(reception)}
                  onDelete={() => handleDelete(reception)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* FAB para móvil */}
      <button
        onClick={handleCreate}
        className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-900/30 flex items-center justify-center hover:bg-blue-500 transition-colors z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modals */}
      <ReceptionFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSave={handleSave}
        reception={editingReception}
      />

      <ReceptionDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onEdit={() => handleEdit(selectedReception!)}
        reception={selectedReception}
      />
    </div>
  )
}
