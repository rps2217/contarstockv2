import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle, AlertTriangle, CheckCircle, Info, Bell, Clock, Package,
  Upload, List, Table2, Cloud, CloudOff, RefreshCw, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { EventsModal } from '../components/EventsModal'
import { EventsImporter } from '../components/EventsImporter'
import { useEventsSync } from '@/shared/hooks'

// ============================================================================
// Tipos
// ============================================================================
type EventType = 'info' | 'warning' | 'error' | 'success'
type EventStatus = 'pending' | 'destined' | 'adjusted'
type TabType = 'table' | 'import'
type SyncState = 'synced' | 'pending' | 'error' | 'partial'

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
  syncStatus?: 'synced' | 'pending' | 'error'
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

// Indicador de sincronización discreto
const SyncIndicator = ({ state, pendingCount, totalCount }: { state: SyncState; pendingCount: number; totalCount: number }) => {
  const getIcon = () => {
    switch (state) {
      case 'synced':
        return <Cloud className="w-4 h-4 text-emerald-400" />
      case 'pending':
        return <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
      case 'error':
        return <CloudOff className="w-4 h-4 text-rose-400" />
      case 'partial':
        return <Cloud className="w-4 h-4 text-amber-400" />
      default:
        return <Cloud className="w-4 h-4 text-muted" />
    }
  }

  const getLabel = () => {
    switch (state) {
      case 'synced':
        return 'Respaldo completo'
      case 'pending':
        return `${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''}`
      case 'error':
        return 'Error de sincronización'
      case 'partial':
        return `${pendingCount} sin respaldar`
      default:
        return ''
    }
  }

  const getTooltip = () => {
    if (totalCount === 0) return 'No hay eventos'
    switch (state) {
      case 'synced':
        return `Todos los ${totalCount} eventos están respaldados en la nube`
      case 'pending':
        return `${pendingCount} de ${totalCount} eventos esperando respaldo`
      case 'error':
        return `${pendingCount} eventos con errores de sincronización`
      case 'partial':
        return `${pendingCount} de ${totalCount} eventos no están respaldados`
      default:
        return ''
    }
  }

  // No mostrar si no hay eventos
  if (totalCount === 0) return null

  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
        state === 'synced' && "bg-emerald-500/10 text-emerald-400",
        state === 'pending' && "bg-amber-500/10 text-amber-400",
        state === 'error' && "bg-rose-500/10 text-rose-400",
        state === 'partial' && "bg-amber-500/10 text-amber-400"
      )}
      title={getTooltip()}
    >
      {getIcon()}
      <span>{getLabel()}</span>
    </div>
  )
}

// ============================================================================
// Componente principal
// ============================================================================
export const RedesignEventsPage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all')
  const [activeTab, setActiveTab] = useState<TabType>('table')

  // Hook de sincronización de eventos
  const {
    syncEvents,
    stats: syncStatsHook,
    isSyncing,
    lastError
  } = useEventsSync({
    showToasts: true,
    onSuccess: (result) => {
      // Refrescar datos después de sincronizar
      setRefreshKey(k => k + 1)
    },
    onError: (error) => {
      console.error('Error sincronizando eventos:', error)
    }
  })

  // Datos de eventos completos con syncStatus
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
        timestamp: e.createdAt,
        syncStatus: e.syncStatus as 'synced' | 'pending' | 'error' | undefined
      }))
    } catch (error) {
      console.error('Error loading events:', error)
      return []
    }
  }, [refreshKey])

  // Stats de estado de sincronización
  const syncStats = useMemo(() => {
    if (!events) return { synced: 0, pending: 0, error: 0, total: 0, state: 'synced' as SyncState }
    
    const total = events.length
    const pending = events.filter(e => e.syncStatus === 'pending').length
    const error = events.filter(e => e.syncStatus === 'error').length
    const synced = events.filter(e => e.syncStatus === 'synced' || !e.syncStatus).length
    
    let state: SyncState = 'synced'
    if (pending > 0 && error === 0) state = pending === total ? 'pending' : 'partial'
    else if (error > 0) state = 'error'
    
    return { synced, pending, error, total, state }
  }, [events])

  // Stats de estado (para filtros)
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
      
      // Guardar solo los eventos nuevos - marcar como pendientes de sincronizar
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
          createdAt: Date.now(),
          syncStatus: 'pending' as const,
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
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
                <Bell className="w-8 h-8 text-amber-500" />
                Eventos
              </h1>
              {/* Indicador de sincronización */}
              <SyncIndicator 
                state={syncStats.state} 
                pendingCount={syncStats.pending + syncStats.error}
                totalCount={syncStats.total}
              />
            </div>
            <p className="text-secondary text-sm">Gestión de incidencias y actividades.</p>
          </div>
          
          {/* Acciones: Botón de sync + Tabs */}
          <div className="flex items-center gap-3">
            {/* Botón de sincronización */}
            <button
              onClick={syncEvents}
              disabled={isSyncing || !navigator.onLine}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                isSyncing
                  ? "bg-blue-600/50 text-white/70 cursor-not-allowed"
                  : syncStatsHook?.pending && syncStatsHook.pending > 0
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                    : "bg-surface hover:bg-elevated text-primary border border-subtle"
              )}
              title={
                !navigator.onLine 
                  ? "Sin conexión a internet" 
                  : syncStatsHook?.pending 
                    ? `Sincronizar ${syncStatsHook.pending} evento${syncStatsHook.pending !== 1 ? 's' : ''} pendiente${syncStatsHook.pending !== 1 ? 's' : ''}`
                    : "Sincronizar eventos"
              }
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Sincronizando...</span>
                </>
              ) : (
                <>
                  <RefreshCw className={cn("w-4 h-4", syncStatsHook?.pending && syncStatsHook.pending > 0 && "text-blue-200")} />
                  <span className="hidden sm:inline">Sincronizar</span>
                  {syncStatsHook?.pending && syncStatsHook.pending > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-blue-400 text-blue-900 rounded-full text-xs font-bold">
                      {syncStatsHook.pending}
                    </span>
                  )}
                </>
              )}
            </button>
            
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
