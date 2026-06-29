import React, { useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarClock, Plus, Search, ChevronRight, Skull, AlertTriangle,
  PackageX, Clock, ShieldCheck, MapPin, Download, AlertCircle, Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Product } from '@/types'

// ============================================================================
// Tipos y constantes
// ============================================================================
type ExpiryStatus = 'expired' | 'critical' | 'withdrawal' | 'next' | 'safe'

interface ExpiryRecord {
  id: string; product: string; barcode: string; sku?: string
  location: string; month: number; year: number; expiryDate: Date
  quantity: number; daysLeft: number; createdAt?: number; source?: string
}

const STATUS_META: Record<ExpiryStatus, {
  label: string; icon: React.ElementType; text: string; bg: string; border: string; dot: string
}> = {
  expired: { label: 'Vencido', icon: Skull, text: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30', dot: 'bg-rose-500' },
  critical: { label: 'Crítico', icon: AlertTriangle, text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  withdrawal: { label: 'A retirar', icon: PackageX, text: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-500' },
  next: { label: 'Próximo', icon: Clock, text: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-500' },
  safe: { label: 'Vigente', icon: ShieldCheck, text: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
}

const STATUS_ORDER: ExpiryStatus[] = ['expired', 'critical', 'withdrawal', 'next', 'safe']
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const classify = (daysLeft: number): ExpiryStatus => {
  if (daysLeft < 0) return 'expired'
  if (daysLeft <= 15) return 'critical'
  if (daysLeft <= 30) return 'withdrawal'
  if (daysLeft <= 120) return 'next'
  return 'safe'
}

// ============================================================================
// Componentes
// ============================================================================
const SummaryCard = ({ status, count, total }: { status: ExpiryStatus; count: number; total: number }) => {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0
  
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className={cn('bg-surface border border-subtle rounded-2xl p-4 flex flex-col gap-3 min-w-[140px]')}>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', meta.bg, meta.border)}>
        <Icon className={cn('w-5 h-5', meta.text)} />
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-primary">{count}</p>
          <p className="text-xs text-muted">{percentage}%</p>
        </div>
        <p className="text-xs text-muted mt-1">{meta.label}</p>
      </div>
    </motion.div>
  )
}

const RecordRow = ({ record }: { record: ExpiryRecord }) => {
  const status = classify(record.daysLeft)
  const meta = STATUS_META[status]
  const daysText = record.daysLeft < 0 ? `Venció hace ${Math.abs(record.daysLeft)} días` : record.daysLeft === 0 ? 'Vence hoy' : `Faltan ${record.daysLeft} días`

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-3 hover:bg-elevated transition-colors group rounded-xl">
      <div className={cn('w-1.5 h-12 rounded-full shrink-0', meta.dot)} />
      <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center shrink-0">
        <Package className="w-5 h-5 text-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary truncate">{record.product || 'Producto sin nombre'}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
          <span className="text-xs text-muted font-mono">{record.barcode || record.sku || 'Sin código'}</span>
          {record.location && <span className="text-xs text-secondary flex items-center gap-1"><MapPin className="w-3 h-3" />{record.location}</span>}
        </div>
      </div>
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-sm font-semibold text-primary">{MONTHS[record.month - 1]} {record.year}</p>
        <p className="text-xs text-muted">{record.quantity} un.</p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1 w-28">
        <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full border', meta.bg, meta.border, meta.text)}>{meta.label}</span>
        <span className="text-[11px] text-secondary">{daysText}</span>
      </div>
    </motion.div>
  )
}

const Section = ({ status, records, isOpen, onToggle }: { status: ExpiryStatus; records: ExpiryRecord[]; isOpen: boolean; onToggle: () => void }) => {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  
  return (
    <div className={cn('bg-surface border border-subtle rounded-2xl overflow-hidden', records.length === 0 && 'opacity-60')}>
      <button onClick={onToggle} disabled={records.length === 0}
        className={cn('w-full px-4 py-3 flex items-center justify-between hover:bg-elevated transition-colors', records.length === 0 && 'cursor-not-allowed')}>
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center border', meta.bg, meta.border)}>
            <Icon className={cn('w-4 h-4', meta.text)} />
          </div>
          <div className="text-left">
            <span className="text-sm font-semibold text-primary">{meta.label}</span>
            <span className="text-xs text-muted ml-2 font-mono">{records.length} registros</span>
          </div>
        </div>
        {records.length > 0 && (
          <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="w-4 h-4 text-muted" />
          </motion.div>
        )}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && records.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="divide-y divide-subtle border-t border-subtle px-2 py-2">
              {records.slice(0, 20).map((r) => <RecordRow key={r.id} record={r} />)}
              {records.length > 20 && <p className="text-center py-3 text-xs text-muted">Mostrando 20 de {records.length}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// Componente principal
// ============================================================================
const FILTERS = [
  { value: 'all' as const, label: 'Todos' },
  { value: 'expired' as const, label: 'Vencidos' },
  { value: 'critical' as const, label: 'Críticos' },
  { value: 'withdrawal' as const, label: 'A retirar' },
  { value: 'next' as const, label: 'Próximos' },
  { value: 'safe' as const, label: 'Vigentes' },
]

export const RedesignExpiryPage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | ExpiryStatus>('all')
  const [query, setQuery] = useState('')
  const [openSections, setOpenSections] = useState<Record<ExpiryStatus, boolean>>({
    expired: true, critical: true, withdrawal: true, next: false, safe: false,
  })

  // Datos de vencimientos
  const expiryRecords = useLiveQuery(async (): Promise<ExpiryRecord[]> => {
    const now = new Date()
    try {
      const dynamicRecords = await db.dynamic_data.where('tableName').equals('VENCIMIENTOS').toArray()
      if (dynamicRecords.length > 0) {
        return dynamicRecords.map((r) => {
          const data = r.data || {}
          const mm = data.mm || data.month || 1
          const yyyy = data.yyyy || data.year || now.getFullYear()
          const expiryDate = new Date(yyyy, mm - 1)
          const daysLeft = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          return {
            id: r.id?.toString() || Math.random().toString(),
            product: data.producto || data.product || data.name || 'Producto sin nombre',
            barcode: data.codigo || data.barcode || '',
            sku: data.sku,
            location: data.ubicacion || data.location || '',
            month: mm, year: yyyy, expiryDate, quantity: data.cantidad || data.quantity || 0, daysLeft,
            createdAt: r.timestamp, source: 'dynamic_data',
          }
        })
      }
    } catch {}
    
    // Demo data
    const demoProducts = [
      { name: 'Leche La Serenisima 1L', barcode: '7791234567890' },
      { name: 'Yogur Danone Frutilla', barcode: '7790987654321' },
      { name: 'Queso Cremoso Ilolay 500g', barcode: '7794567890123' },
      { name: 'Jamon Cocido Paladini 200g', barcode: '7793216549870' },
      { name: 'Manteca Chantiproy 250g', barcode: '7796543210987' },
    ]
    const locations = ['Góndola A', 'Góndola B', 'Depósito', 'Refrigerador 1']
    return demoProducts.map((p, idx) => {
      const daysOffset = Math.floor(Math.random() * 200) - 30
      const expiryDate = new Date(now)
      expiryDate.setDate(expiryDate.getDate() + daysOffset)
      return {
        id: `demo-${idx}`, product: p.name, barcode: p.barcode,
        location: locations[idx % locations.length],
        month: expiryDate.getMonth() + 1, year: expiryDate.getFullYear(),
        expiryDate, quantity: Math.floor(Math.random() * 50) + 1, daysLeft: daysOffset, source: 'demo',
      }
    })
  }, [], [] as ExpiryRecord[])

  const counts = useMemo(() => {
    const c: Record<ExpiryStatus, number> = { expired: 0, critical: 0, withdrawal: 0, next: 0, safe: 0 }
    expiryRecords.forEach((r) => { c[classify(r.daysLeft)]++ })
    return c
  }, [expiryRecords])

  const grouped = useMemo(() => {
    const g: Record<ExpiryStatus, ExpiryRecord[]> = { expired: [], critical: [], withdrawal: [], next: [], safe: [] }
    expiryRecords.filter((r) => {
      const matchesQuery = !query || r.product.toLowerCase().includes(query.toLowerCase()) || r.barcode.includes(query) || r.location.toLowerCase().includes(query.toLowerCase())
      const status = classify(r.daysLeft)
      return matchesQuery && (filter === 'all' || filter === status)
    }).forEach((r) => { g[classify(r.daysLeft)].push(r) })
    Object.keys(g).forEach((key) => { g[key as ExpiryStatus].sort((a, b) => a.daysLeft - b.daysLeft) })
    return g
  }, [filter, query, expiryRecords])

  const totalRecords = expiryRecords.length
  const urgentCount = counts.expired + counts.critical + counts.withdrawal
  const visibleStatuses = filter === 'all' ? STATUS_ORDER : [filter as ExpiryStatus]

  return (
    <div className="h-full flex flex-col bg-base">
      <div className="pt-8 px-4 sm:px-6 lg:px-8 shrink-0">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <CalendarClock className="w-8 h-8 text-blue-500" />
              Vencimientos
              {urgentCount > 0 && (
                <span className="flex items-center gap-1 text-sm font-normal text-rose-500 bg-rose-500/10 px-2 py-1 rounded-full">
                  <AlertCircle className="w-4 h-4" />
                  {urgentCount} urgente{urgentCount !== 1 ? 's' : ''}
                </span>
              )}
            </h1>
            <p className="text-secondary text-sm mt-2">Controla la caducidad de tus productos y planifica retiros.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button className="flex items-center gap-2 bg-surface hover:bg-elevated border border-subtle text-primary px-3 py-2 rounded-xl text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /><span className="hidden sm:inline">Exportar</span>
            </button>
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
              <Plus className="w-4 h-4" /><span className="hidden sm:inline">Registrar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto flex flex-col gap-5">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {STATUS_ORDER.map((s) => <SummaryCard key={s} status={s} count={counts[s]} total={totalRecords} />)}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por producto, código o ubicación..."
                className="w-full bg-surface border border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm text-primary focus:outline-none focus:border-blue-500 transition-all" />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {FILTERS.map((f) => (
                <button key={f.value} onClick={() => setFilter(f.value)}
                  className={cn('px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors shrink-0',
                    filter === f.value ? 'bg-blue-600 text-white' : 'bg-surface text-secondary hover:bg-elevated hover:text-primary border border-subtle')}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {urgentCount > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-rose-500">{urgentCount} producto{urgentCount !== 1 ? 's' : ''} requieren atención inmediata</p>
                <p className="text-xs text-secondary mt-0.5">
                  {counts.expired > 0 && `${counts.expired} vencidos`}{counts.expired > 0 && counts.critical > 0 && ', '}{counts.critical > 0 && `${counts.critical} en estado crítico`}
                </p>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface border border-subtle rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-primary">{totalRecords}</p><p className="text-xs text-muted">Total</p>
            </div>
            <div className="bg-surface border border-subtle rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-rose-500">{counts.expired}</p><p className="text-xs text-muted">Vencidos</p>
            </div>
            <div className="bg-surface border border-subtle rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-amber-500">{counts.critical + counts.withdrawal}</p><p className="text-xs text-muted">A retirar</p>
            </div>
            <div className="bg-surface border border-subtle rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-emerald-500">{counts.next + counts.safe}</p><p className="text-xs text-muted">Vigentes</p>
            </div>
          </div>

          {expiryRecords.length === 0 ? (
            <div className="bg-surface border border-subtle rounded-2xl p-8 text-center">
              <CalendarClock className="w-12 h-12 text-muted mx-auto mb-4" />
              <p className="text-sm text-muted">No hay registros de vencimientos</p>
              <p className="text-xs text-muted mt-1">Comienza agregando fechas de vencimiento</p>
            </div>
          ) : (
            visibleStatuses.map((s) => (
              <Section key={s} status={s} records={grouped[s]}
                isOpen={filter !== 'all' ? true : openSections[s]}
                onToggle={() => setOpenSections((prev) => ({ ...prev, [s]: !prev[s] }))} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
