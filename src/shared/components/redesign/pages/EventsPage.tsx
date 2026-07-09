import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle, AlertTriangle, CheckCircle, Info, Bell, Clock, Package,
  Upload, List, Table2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { EventsModal } from '../components/EventsModal'
import { EventsImporter } from '../components/EventsImporter'

// ============================================================================
// Tipos
// ============================================================================
type EventType = 'info' | 'warning' | 'error' | 'success'
type EventStatus = 'pending' | 'destined' | 'adjusted'
type TabType = 'table' | 'import'

interface EventRecord {
  id: string
  type: EventType
  title: string
  description: string
  productName?: string
  barcode?: string
  location?: string
  userName?: string
  timestamp?: number
  status: EventStatus
  batch?: string
  expiryDate?: string
  frcNumber?: string
}

// ============================================================================
// Constantes
// ============================================================================
const STATUS_META: Record<EventStatus, {
  label: string; icon: React.ElementType; bg: string; border: string; dot: string; text: string
}> = {
  pending: { label: 'Pendiente', icon: Clock, bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-500', text: 'text-amber-500' },
  destined: { label: 'Destinados', icon: Package, bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-500', text: 'text-blue-500' },
  adjusted: { label: 'Ajustados', icon: CheckCircle, bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500', text: 'text-emerald-500' },
}

const STATUS_ORDER: EventStatus[] = ['pending', 'destined', 'adjusted']

// ============================================================================
// Componentes
// ============================================================================
const StatCard = ({ status, count, isActive, onClick }: { status: EventStatus; count: number; isActive: boolean; onClick: () => void }) => {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }} 
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className={cn(
        "rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all border",
        isActive 
          ? "bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/20" 
          : "bg-surface border-subtle hover:border-blue-500/50 hover:bg-surface/80"
      )}
    >
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", meta.bg, isActive ? "border-blue-500/50" : meta.border)}>
        <Icon className={cn("w-5 h-5", isActive ? "text-white" : meta.text)} />
      </div>
      <div>
        <p className={cn("text-2xl font-bold", isActive ? "text-white" : "text-primary")}>{count}</p>
        <p className={cn("text-xs", isActive ? "text-blue-200" : "text-muted")}>{meta.label}</p>
      </div>
    </motion.div>
  )
}

// ============================================================================
// Componente principal
// ============================================================================
export const RedesignEventsPage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all')
  const [activeTab, setActiveTab] = useState<TabType>('table')

  // Datos de eventos
  const events = useLiveQuery(async (): Promise<EventRecord[]> => {
    try {
      if (!db.events) return []
      const eventsList = await db.events.toArray()
      return eventsList.map(e => ({
        id: e.id?.toString() || Math.random().toString(),
        type: e.type as EventType,
        title: e.productName || e.frcNumber || 'Evento',
        description: e.resolution || '',
        barcode: e.barcode,
        batch: e.batch,
        expiryDate: e.expiryDate,
        frcNumber: e.frcNumber,
        status: e.status as EventStatus,
        timestamp: e.createdAt
      }))
    } catch (error) {
      console.error('Error loading events:', error)
      return []
    }
  }, [refreshKey])

  // Stats
  const stats = useMemo(() => {
    if (!events) return { pending: 0, destined: 0, adjusted: 0 }
    const s = { pending: 0, destined: 0, adjusted: 0 }
    events.forEach(e => { if (e.status in s) s[e.status as EventStatus]++ })
    return s
  }, [events])

  // Manejar importación con prevención de duplicados (frcNumber + barcode)
  const handleImportSave = async (parsedEvents: any[]) => {
    try {
      if (!db.events) {
        toast.error('Tabla de eventos no disponible. Recarga la página.')
        return
      }
      
      // Obtener eventos existentes para verificar duplicados
      const existingEvents = await db.events.toArray()
      // Crear clave única: frcNumber + barcode
      const existingKeys = new Set(
        existingEvents
          .map(e => `${e.frcNumber || ''}~${e.barcode || ''}`.toLowerCase())
          .filter(key => key !== '~')
      )
      
      // Filtrar eventos nuevos (no duplicados)
      const newEvents = parsedEvents.filter(event => {
        const key = `${event.frcNumber || ''}~${event.barcode || ''}`.toLowerCase()
        return !existingKeys.has(key)
      })
      
      const skippedCount = parsedEvents.length - newEvents.length
      
      // Guardar solo los eventos nuevos
      for (const event of newEvents) {
        await db.events.add({
          type: event.type || 'info',
          frcNumber: event.frcNumber,
          barcode: event.barcode,
          productName: event.productName,
          batch: event.batch,
          expiryDate: event.expiryDate,
          resolution: event.resolution,
          status: 'pending',
          createdAt: Date.now()
        })
      }
      
      if (newEvents.length > 0) {
        toast.success(`${newEvents.length} eventos importados exitosamente`)
        if (skippedCount > 0) {
          toast.info(`${skippedCount} registros omitidos (ya existen)`)
        }
        setActiveTab('table')
        setRefreshKey(k => k + 1)
      } else {
        toast.warning('Todos los registros ya existen en el sistema')
      }
    } catch (err) {
      console.error('Error guardando eventos:', err)
      toast.error('Error al guardar eventos')
    }
  }

  if (!events) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-base">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-muted mt-4">Cargando eventos...</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-base">
      {/* Header */}
      <div className="pt-8 px-4 sm:px-6 lg:px-8 shrink-0">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <Bell className="w-8 h-8 text-amber-500" />
              Eventos
            </h1>
            <p className="text-secondary text-sm mt-2">Gestión de incidencias y actividades.</p>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-surface rounded-xl border border-subtle">
            <button
              onClick={() => setActiveTab('table')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                activeTab === 'table' 
                  ? "bg-blue-600 text-white" 
                  : "text-muted hover:text-white"
              )}
            >
              <Table2 className="w-4 h-4" />
              Tabla
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                activeTab === 'import' 
                  ? "bg-blue-600 text-white" 
                  : "text-muted hover:text-white"
              )}
            >
              <Upload className="w-4 h-4" />
              Importar
            </button>
          </div>
        </div>

        {/* Stats - Clickeables para filtrar (solo en tabla) */}
        {activeTab === 'table' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard 
              status="pending" 
              count={stats.pending} 
              isActive={statusFilter === 'pending'}
              onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
            />
            <StatCard 
              status="destined" 
              count={stats.destined} 
              isActive={statusFilter === 'destined'}
              onClick={() => setStatusFilter(statusFilter === 'destined' ? 'all' : 'destined')}
            />
            <StatCard 
              status="adjusted" 
              count={stats.adjusted} 
              isActive={statusFilter === 'adjusted'}
              onClick={() => setStatusFilter(statusFilter === 'adjusted' ? 'all' : 'adjusted')}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-4 sm:px-6 lg:px-8 pb-6">
        {activeTab === 'table' ? (
          <EventsModal 
            isOpen={true} 
            onClose={() => {}} 
            embedded={true}
            statusFilter={statusFilter}
          />
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="max-w-2xl">
              <EventsImporter 
                onSave={handleImportSave}
                onCancel={() => setActiveTab('table')}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
