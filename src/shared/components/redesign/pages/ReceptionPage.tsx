import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  PackageCheck, Plus, Search, Upload, Camera, List, Grid, X, Check,
  Clock, MapPin, User, Package, MoreVertical, ChevronRight, Truck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'

// ============================================================================
// Tipos
// ============================================================================
interface Reception {
  id: string
  supplierName?: string
  documentNumber?: string
  receivedBy?: string
  location?: string
  receivedAt: number
  items: { barcode: string; name?: string; quantity: number }[]
  photos?: string[]
  status: 'pending' | 'in-progress' | 'completed'
}

// ============================================================================
// Componentes de UI
// ============================================================================
const StatCard = ({ label, value, color = 'text-primary' }: { label: string; value: number; color?: string }) => (
  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
    className="bg-surface border border-subtle rounded-xl p-4">
    <p className={cn('text-2xl font-bold', color)}>{value}</p>
    <p className="text-xs text-muted">{label}</p>
  </motion.div>
)

const ReceptionRow = ({ reception }: { reception: Reception }) => {
  const statusColors = {
    pending: 'bg-amber-500/20 text-amber-500',
    'in-progress': 'bg-blue-500/20 text-blue-500',
    completed: 'bg-emerald-500/20 text-emerald-500'
  }
  const statusLabels = {
    pending: 'Pendiente',
    'in-progress': 'En Progreso',
    completed: 'Completado'
  }
  const date = reception.receivedAt ? new Date(reception.receivedAt).toLocaleDateString() : '-'

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-4 p-4 bg-surface hover:bg-elevated rounded-xl transition-colors">
      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
        <PackageCheck className="w-6 h-6 text-emerald-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-primary truncate">
            {reception.supplierName || 'Recepción sin proveedor'}
          </p>
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusColors[reception.status])}>
            {statusLabels[reception.status]}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-1">
          {reception.documentNumber && (
            <span className="text-xs text-muted font-mono">{reception.documentNumber}</span>
          )}
          <span className="text-xs text-muted">{reception.items?.length || 0} items</span>
          <span className="text-xs text-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />{date}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-surface transition-colors">
          <MoreVertical className="w-4 h-4 text-muted" />
        </button>
        <ChevronRight className="w-4 h-4 text-muted" />
      </div>
    </motion.div>
  )
}

// ============================================================================
// Componente principal
// ============================================================================
export const RedesignReceptionPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  // Datos de recepciones (usando sessions como proxy)
  const receptions = useLiveQuery(async (): Promise<Reception[]> => {
    const sessions = await db.sessions.toArray()
    return sessions.slice(0, 20).map(s => ({
      id: s.id?.toString() || Math.random().toString(),
      supplierName: s.supplierName || s.productName || 'Recepción',
      documentNumber: (s as any).documentNumber,
      receivedBy: s.userName,
      location: s.location,
      receivedAt: s.timestamp || Date.now(),
      items: s.sessionType === 'reception' ? [
        { barcode: s.barcode || '', name: s.productName, quantity: 1 }
      ] : [],
      status: (s.syncStatus === 'synced' ? 'completed' : 'in-progress') as Reception['status']
    }))
  }, [])

  const filtered = useMemo(() => {
    if (!receptions || !searchQuery) return receptions || []
    const q = searchQuery.toLowerCase()
    return receptions.filter(r => 
      r.supplierName?.toLowerCase().includes(q) ||
      r.documentNumber?.includes(q)
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
      <div className="pt-8 px-4 sm:px-6 lg:px-8 shrink-0">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <PackageCheck className="w-8 h-8 text-emerald-500" />
              Recepciones
            </h1>
            <p className="text-secondary text-sm mt-2">Registro de entradas de mercancía.</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 bg-surface hover:bg-elevated border border-subtle text-primary px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
              <Upload className="w-4 h-4" />
              Importar
            </button>
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
              <Plus className="w-4 h-4" />
              Nueva
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Pendientes" value={stats.pending} color="text-amber-500" />
          <StatCard label="En Progreso" value={stats.inProgress} color="text-blue-500" />
          <StatCard label="Completadas" value={stats.completed} color="text-emerald-500" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {/* Search & View Toggle */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por proveedor o documento..."
                className="w-full bg-surface border border-subtle rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex bg-surface rounded-xl border border-subtle p-1">
              <button
                onClick={() => setViewMode('list')}
                className={cn('p-2 rounded-lg transition-colors', viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-muted')}>
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn('p-2 rounded-lg transition-colors', viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-muted')}>
                <Grid className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex flex-col gap-2">
            {filtered.length === 0 ? (
              <div className="bg-surface border border-subtle rounded-2xl p-8 text-center">
                <PackageCheck className="w-12 h-12 text-muted mx-auto mb-4" />
                <p className="text-muted">
                  {searchQuery ? 'No se encontraron recepciones' : 'No hay recepciones registradas'}
                </p>
              </div>
            ) : (
              filtered.map(reception => (
                <ReceptionRow key={reception.id} reception={reception} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
