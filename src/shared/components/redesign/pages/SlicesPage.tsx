import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Scissors, Plus, Search, ScissorsLineDashed, Package, Clock, MapPin,
  MoreVertical, ChevronRight, Download, Upload, Check, X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'

// ============================================================================
// Tipos
// ============================================================================
interface Slice {
  id: string
  barcode: string
  productName: string
  originalQuantity: number
  slicedQuantity: number
  remainingQuantity: number
  location?: string
  createdAt: number
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

const SliceRow = ({ slice }: { slice: Slice }) => {
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
  const date = slice.createdAt ? new Date(slice.createdAt).toLocaleDateString() : '-'

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-4 p-4 bg-surface hover:bg-elevated rounded-xl transition-colors">
      <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center">
        <Scissors className="w-6 h-6 text-rose-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-primary truncate">{slice.productName}</p>
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusColors[slice.status])}>
            {statusLabels[slice.status]}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-1">
          <span className="text-xs text-muted font-mono">{slice.barcode}</span>
          <span className="text-xs text-muted">
            {slice.slicedQuantity} de {slice.originalQuantity} unidades
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">{date}</span>
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
export const RedesignSlicesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')

  // Datos de slices (usando sessions como proxy)
  const slices = useLiveQuery(async (): Promise<Slice[]> => {
    const sessions = await db.sessions.toArray()
    return sessions.slice(0, 15).map(s => ({
      id: s.id?.toString() || Math.random().toString(),
      barcode: s.barcode || '',
      productName: s.productName || 'Producto',
      originalQuantity: Math.floor(Math.random() * 50) + 10,
      slicedQuantity: Math.floor(Math.random() * 30),
      remainingQuantity: Math.floor(Math.random() * 20) + 1,
      location: s.location,
      createdAt: s.timestamp || Date.now(),
      status: (s.syncStatus === 'synced' ? 'completed' : 'in-progress') as Slice['status']
    }))
  }, [])

  const filtered = useMemo(() => {
    if (!slices || !searchQuery) return slices || []
    const q = searchQuery.toLowerCase()
    return slices.filter(s => 
      s.productName.toLowerCase().includes(q) ||
      s.barcode.includes(q)
    )
  }, [slices, searchQuery])

  const stats = useMemo(() => {
    const all = slices || []
    return {
      total: all.length,
      pending: all.filter(s => s.status === 'pending').length,
      inProgress: all.filter(s => s.status === 'in-progress').length,
      completed: all.filter(s => s.status === 'completed').length
    }
  }, [slices])

  if (!slices) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-base">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-muted mt-4">Cargando cortes...</p>
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
              <Scissors className="w-8 h-8 text-rose-500" />
              Cortes
            </h1>
            <p className="text-secondary text-sm mt-2">Gestión de cortes y divisiones de productos.</p>
          </div>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
            <Plus className="w-4 h-4" />
            Nuevo Corte
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Pendientes" value={stats.pending} color="text-amber-500" />
          <StatCard label="En Progreso" value={stats.inProgress} color="text-blue-500" />
          <StatCard label="Completados" value={stats.completed} color="text-emerald-500" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por producto o código..."
              className="w-full bg-surface border border-subtle rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
          </div>

          {/* List */}
          <div className="flex flex-col gap-2">
            {filtered.length === 0 ? (
              <div className="bg-surface border border-subtle rounded-2xl p-8 text-center">
                <Scissors className="w-12 h-12 text-muted mx-auto mb-4" />
                <p className="text-muted">
                  {searchQuery ? 'No se encontraron cortes' : 'No hay cortes registrados'}
                </p>
              </div>
            ) : (
              filtered.map(slice => (
                <SliceRow key={slice.id} slice={slice} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
