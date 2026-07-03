import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle, AlertTriangle, CheckCircle, Info, X, Plus, Search,
  Filter, Bell, Clock, User, MapPin, Package, ChevronRight, RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'

// ============================================================================
// Tipos
// ============================================================================
type EventType = 'info' | 'warning' | 'error' | 'success'
type EventStatus = 'active' | 'resolved' | 'dismissed'

interface EventRecord {
  id: string
  type: EventType
  title: string
  description: string
  productName?: string
  barcode?: string
  location?: string
  userName?: string
  timestamp: number
  status: EventStatus
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

const STATUS_ORDER: EventType[] = ['error', 'warning', 'info', 'success']

// ============================================================================
// Componentes
// ============================================================================
const StatCard = ({ type, count }: { type: EventType; count: number }) => {
  const meta = EVENT_META[type]
  const Icon = meta.icon
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className={cn('bg-surface border border-subtle rounded-xl p-4 flex items-center gap-3')}>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', meta.bg, meta.border)}>
        <Icon className={cn('w-5 h-5', meta.text)} />
      </div>
      <div>
        <p className="text-2xl font-bold text-primary">{count}</p>
        <p className="text-xs text-muted">{meta.label}</p>
      </div>
    </motion.div>
  )
}

const EventRow = ({ event, onDismiss }: { event: EventRecord; onDismiss: (id: string) => void }) => {
  const meta = EVENT_META[event.type]
  const Icon = meta.icon
  const timeAgo = formatTimeAgo(event.timestamp)

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl transition-all bg-surface hover:bg-elevated',
        event.status !== 'active' && 'opacity-60'
      )}>
      <div className={cn('w-1.5 h-full rounded-full shrink-0', meta.dot)} />
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', meta.bg)}>
        <Icon className={cn('w-5 h-5', meta.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-primary">{event.title}</p>
            {event.description && (
              <p className="text-xs text-secondary mt-0.5 line-clamp-2">{event.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {event.productName && (
                <span className="text-xs text-muted flex items-center gap-1">
                  <Package className="w-3 h-3" />{event.productName}
                </span>
              )}
              {event.barcode && (
                <span className="text-xs text-muted font-mono">{event.barcode}</span>
              )}
              {event.location && (
                <span className="text-xs text-muted flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{event.location}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted">{timeAgo}</span>
            {event.status === 'active' && (
              <button onClick={() => onDismiss(event.id)}
                className="p-1.5 rounded-lg hover:bg-rose-500/20 transition-colors">
                <X className="w-4 h-4 text-muted" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Helper
const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'hace un momento'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}

// ============================================================================
// Componente principal
// ============================================================================
export const RedesignEventsPage: React.FC = () => {
  const [filter, setFilter] = useState<EventType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Datos de eventos (usando sessions como proxy ya que no hay tabla events)
  const events = useLiveQuery(async (): Promise<EventRecord[]> => {
    const sessions = await db.sessions.toArray()
    return sessions.map(s => ({
      id: s.id?.toString() || Math.random().toString(),
      type: (s.sessionType === 'hammer' ? 'warning' : 'info') as EventType,
      title: `Sesión ${s.sessionType || 'general'}`,
      description: s.sessionType ? `Tipo: ${s.sessionType}` : '',
      status: (s.syncStatus === 'synced' ? 'resolved' : 'active') as EventStatus
    }))
  }, [])

  // Filtrar
  const filtered = useMemo(() => {
    if (!events) return []
    return events.filter(e => {
      if (filter !== 'all' && e.type !== filter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return e.title.toLowerCase().includes(q) || 
               e.description?.toLowerCase().includes(q) ||
               e.barcode?.includes(q)
      }
      return true
    })
  }, [events, filter, searchQuery])

  // Stats
  const stats = useMemo(() => {
    if (!events) return { info: 0, warning: 0, error: 0, success: 0, total: 0 }
    const s = { info: 0, warning: 0, error: 0, success: 0, total: events.length }
    events.forEach(e => { if (e.type in s) s[e.type as EventType]++ })
    return s
  }, [events])

  const handleDismiss = async (id: string) => {
    // Implementar dismiss si hay tabla de eventos
    console.log('Dismiss event:', id)
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
            <p className="text-secondary text-sm mt-2">Registro de incidencias y actividades.</p>
          </div>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
            <Plus className="w-4 h-4" />
            Nuevo
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-4xl mx-auto flex flex-col gap-5">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STATUS_ORDER.map(type => (
              <StatCard key={type} type={type} count={stats[type]} />
            ))}
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar eventos..."
                className="w-full bg-surface border border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setFilter('all')}
                className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                  filter === 'all' ? 'bg-blue-600 text-white' : 'bg-surface text-secondary border border-subtle')}>
                Todos
              </button>
              <button onClick={() => setFilter('error')}
                className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                  filter === 'error' ? 'bg-rose-500 text-white' : 'bg-surface text-secondary border border-subtle')}>
                Errores
              </button>
              <button onClick={() => setFilter('warning')}
                className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                  filter === 'warning' ? 'bg-amber-500 text-white' : 'bg-surface text-secondary border border-subtle')}>
                Alertas
              </button>
            </div>
          </div>

          {/* Events List */}
          <div className="flex flex-col gap-2">
            {filtered.length === 0 ? (
              <div className="bg-surface border border-subtle rounded-2xl p-8 text-center">
                <Bell className="w-12 h-12 text-muted mx-auto mb-4" />
                <p className="text-sm text-muted">No hay eventos registrados</p>
              </div>
            ) : (
              filtered.map(event => (
                <EventRow key={event.id} event={event} onDismiss={handleDismiss} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
