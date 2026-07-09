import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle, AlertTriangle, CheckCircle, Info, Bell, Clock, Package
} from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { EventsModal } from '../components/EventsModal'

// ============================================================================
// Tipos
// ============================================================================
type EventType = 'info' | 'warning' | 'error' | 'success'
type EventStatus = 'pending' | 'destined' | 'adjusted'

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
const StatCard = ({ status, count }: { status: EventStatus; count: number }) => {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className="bg-surface border border-subtle rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-emerald-500/10 border-emerald-500/30">
        <Icon className="w-5 h-5 text-emerald-500" />
      </div>
      <div>
        <p className="text-2xl font-bold text-primary">{count}</p>
        <p className="text-xs text-muted">{meta.label}</p>
      </div>
    </motion.div>
  )
}

// ============================================================================
// Componente principal
// ============================================================================
export const RedesignEventsPage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0)

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
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {STATUS_ORDER.map(status => (
            <StatCard key={status} status={status} count={stats[status]} />
          ))}
        </div>
      </div>

      {/* Tabla de Eventos */}
      <div className="flex-1 overflow-hidden px-4 sm:px-6 lg:px-8 pb-6">
        <EventsModal 
          isOpen={true} 
          onClose={() => {}} 
          embedded={true}
        />
      </div>
    </div>
  )
}
