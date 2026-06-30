import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Scissors, Plus, Search, Package, Clock, MapPin,
  ChevronRight, Download, Check, X, Package2
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
// Constantes de UI
// ============================================================================
const STATUS_META = {
  pending: { label: 'Pendiente', icon: Clock, text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  'in-progress': { label: 'En Progreso', icon: Package, text: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-500' },
  completed: { label: 'Completado', icon: Check, text: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
}

const FILTERS = [
  { value: 'all' as const, label: 'Todos' },
  { value: 'pending' as const, label: 'Pendientes' },
  { value: 'in-progress' as const, label: 'En Progreso' },
  { value: 'completed' as const, label: 'Completados' },
]

// ============================================================================
// Componentes de UI
// ============================================================================
const SummaryCard = ({ label, value, color = 'text-primary', icon: Icon }: { 
  label: string; value: number; color?: string; icon: React.ElementType 
}) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.9 }} 
    animate={{ opacity: 1, scale: 1 }}
    className="bg-surface border border-subtle rounded-2xl p-4 flex flex-col gap-3 min-w-[140px]">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-500/10">
      <Icon className={cn('w-5 h-5', color)} />
    </div>
    <div>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
      <p className="text-xs text-muted mt-1">{label}</p>
    </div>
  </motion.div>
)

const SliceRow = ({ slice, onClick }: { slice: Slice; onClick: () => void }) => {
  const meta = STATUS_META[slice.status]
  const Icon = meta.icon
  const date = slice.createdAt ? new Date(slice.createdAt).toLocaleDateString() : '-'

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className="flex items-center gap-3 p-3 hover:bg-elevated transition-colors group cursor-pointer rounded-xl">
      <div className={cn('w-1.5 h-12 rounded-full shrink-0', meta.dot)} />
      <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center shrink-0">
        <Package className="w-5 h-5 text-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-primary truncate">{slice.productName}</p>
          <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-medium', meta.bg, meta.text)}>
            {meta.label}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
          <span className="text-xs text-muted font-mono">{slice.barcode}</span>
          <span className="text-xs text-muted">
            {slice.slicedQuantity}/{slice.originalQuantity} unidades
          </span>
          {slice.location && (
            <span className="text-xs text-secondary flex items-center gap-1">
              <MapPin className="w-3 h-3" />{slice.location}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        <span className="text-[11px] text-muted">{date}</span>
        <ChevronRight className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
      </div>
    </motion.div>
  )
}

const Section = ({ label, count, icon: Icon, color, children }: {
  label: string;
  count: number;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
}) => (
  <div className="bg-surface border border-subtle rounded-2xl overflow-hidden">
    <div className="px-4 py-3 border-b border-subtle flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center bg-rose-500/10')}>
          <Icon className={cn('w-4 h-4', color)} />
        </div>
        <span className="text-sm font-semibold text-primary">{label}</span>
      </div>
      <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', color)}>
        {count}
      </span>
    </div>
    <div className="flex flex-col">
      {children}
    </div>
  </div>
)

// ============================================================================
// Modal de Detalle
// ============================================================================
const SliceDetailModal = ({ slice, onClose }: { slice: Slice | null; onClose: () => void }) => {
  if (!slice) return null
  
  const meta = STATUS_META[slice.status]
  const date = slice.createdAt ? new Date(slice.createdAt).toLocaleString() : '-'

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-base border border-subtle rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative">
          <div className="h-24 bg-gradient-to-br from-rose-500/20 to-orange-500/20" />
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 rounded-xl backdrop-blur-sm">
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="absolute -bottom-10 left-4">
            <div className="w-20 h-20 rounded-2xl bg-rose-500 flex items-center justify-center border-4 border-base shadow-lg">
              <Scissors className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="pt-12 px-4 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-primary">{slice.productName}</h2>
              <p className="text-sm text-muted font-mono">{slice.barcode}</p>
            </div>
            <span className={cn('px-2 py-1 rounded-full text-xs font-medium', meta.bg, meta.text)}>
              {meta.label}
            </span>
          </div>
        </div>

        {/* Detalles */}
        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-primary">{slice.originalQuantity}</p>
              <p className="text-xs text-muted">Original</p>
            </div>
            <div className="bg-surface rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-blue-500">{slice.slicedQuantity}</p>
              <p className="text-xs text-muted">Cortado</p>
            </div>
            <div className="bg-surface rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-rose-500">{slice.remainingQuantity}</p>
              <p className="text-xs text-muted">Restante</p>
            </div>
          </div>
          
          {slice.location && (
            <div className="flex items-center gap-3 p-3 bg-surface rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted">Ubicación</p>
                <p className="text-sm font-medium text-primary">{slice.location}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 p-3 bg-surface rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted">Fecha</p>
              <p className="text-sm font-medium text-primary">{date}</p>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="p-4 border-t border-subtle flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-medium transition-colors">
            <Check className="w-4 h-4" />
            Completar
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-surface hover:bg-elevated text-primary rounded-xl font-medium transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================================================
// Componente principal
// ============================================================================
export const RedesignSlicesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | Slice['status']>('all')
  const [selectedSlice, setSelectedSlice] = useState<Slice | null>(null)

  // Datos de slices (usando sessions como proxy)
  const slices = useLiveQuery(async (): Promise<Slice[]> => {
    const sessions = await db.sessions.toArray()
    return sessions.slice(0, 15).map(s => ({
      id: s.id?.toString() || Math.random().toString(),
      barcode: s.barcode || '',
      productName: s.productName || 'Producto sin nombre',
      originalQuantity: Math.floor(Math.random() * 50) + 10,
      slicedQuantity: Math.floor(Math.random() * 30),
      remainingQuantity: Math.floor(Math.random() * 20) + 1,
      location: s.location,
      createdAt: s.timestamp || Date.now(),
      status: (s.syncStatus === 'synced' ? 'completed' : 'in-progress') as Slice['status']
    }))
  }, [])

  const filtered = useMemo(() => {
    let result = slices || []
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(s =>
        s.productName.toLowerCase().includes(q) ||
        s.barcode.includes(q)
      )
    }
    
    if (activeFilter !== 'all') {
      result = result.filter(s => s.status === activeFilter)
    }
    
    return result
  }, [slices, searchQuery, activeFilter])

  // Agrupar por estado
  const grouped = useMemo(() => {
    const list = searchQuery ? filtered : slices || []
    return {
      pending: list.filter(s => s.status === 'pending'),
      inProgress: list.filter(s => s.status === 'in-progress'),
      completed: list.filter(s => s.status === 'completed'),
    }
  }, [filtered, slices, searchQuery])

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
      <div className="pt-8 px-4 sm:px-6 lg:px-8 shrink-0 border-b border-subtle pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <Scissors className="w-8 h-8 text-rose-500" />
              Cortes
            </h1>
            <p className="text-secondary text-sm mt-1">Gestión de cortes y divisiones de productos.</p>
          </div>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
            <Plus className="w-4 h-4" />
            Nuevo
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          <SummaryCard label="Total" value={stats.total} icon={Package2} color="text-primary" />
          <SummaryCard label="Pendientes" value={stats.pending} icon={Clock} color="text-amber-500" />
          <SummaryCard label="En Progreso" value={stats.inProgress} icon={Package} color="text-blue-500" />
          <SummaryCard label="Completados" value={stats.completed} icon={Check} color="text-emerald-500" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 pb-24">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por producto o código..." 
                className="w-full bg-surface border border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" 
              />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setActiveFilter(f.value)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors',
                    activeFilter === f.value
                      ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                      : 'bg-surface text-secondary hover:text-primary border border-subtle'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista */}
          {filtered.length === 0 ? (
            <div className="bg-surface border border-subtle rounded-2xl p-8 text-center">
              <Scissors className="w-12 h-12 text-muted mx-auto mb-4" />
              <p className="text-muted">
                {searchQuery ? 'No se encontraron cortes' : 'No hay cortes registrados'}
              </p>
            </div>
          ) : (
            <>
              {grouped.pending.length > 0 && (
                <Section label="Pendientes" count={grouped.pending.length} icon={Clock} color="text-amber-500">
                  {grouped.pending.map(slice => (
                    <SliceRow key={slice.id} slice={slice} onClick={() => setSelectedSlice(slice)} />
                  ))}
                </Section>
              )}
              {grouped.inProgress.length > 0 && (
                <Section label="En Progreso" count={grouped.inProgress.length} icon={Package} color="text-blue-500">
                  {grouped.inProgress.map(slice => (
                    <SliceRow key={slice.id} slice={slice} onClick={() => setSelectedSlice(slice)} />
                  ))}
                </Section>
              )}
              {grouped.completed.length > 0 && (
                <Section label="Completados" count={grouped.completed.length} icon={Check} color="text-emerald-500">
                  {grouped.completed.map(slice => (
                    <SliceRow key={slice.id} slice={slice} onClick={() => setSelectedSlice(slice)} />
                  ))}
                </Section>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedSlice && (
          <SliceDetailModal slice={selectedSlice} onClose={() => setSelectedSlice(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
