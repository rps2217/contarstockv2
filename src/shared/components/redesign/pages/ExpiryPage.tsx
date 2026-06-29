import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarClock,
  Plus,
  Search,
  ChevronDown,
  Skull,
  AlertTriangle,
  PackageX,
  Clock,
  ShieldCheck,
  MapPin,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'

// ============================================================================
// Modelo de dominio
// ============================================================================
type ExpiryStatus = 'expired' | 'critical' | 'withdrawal' | 'next' | 'safe'

interface ExpiryRecord {
  id: string
  product: string
  barcode: string
  location: string
  month: number // 1-12
  year: number
  quantity: number
  daysLeft: number
}

const STATUS_META: Record<
  ExpiryStatus,
  {
    label: string
    icon: React.ElementType
    text: string
    bg: string
    dot: string
  }
> = {
  expired: {
    label: 'Vencido',
    icon: Skull,
    text: 'text-rose-500',
    bg: 'bg-rose-500/10 border-rose-500/30',
    dot: 'bg-rose-500',
  },
  critical: {
    label: 'Crítico',
    icon: AlertTriangle,
    text: 'text-amber-500',
    bg: 'bg-amber-500/10 border-amber-500/30',
    dot: 'bg-amber-500',
  },
  withdrawal: {
    label: 'A retirar',
    icon: PackageX,
    text: 'text-orange-500',
    bg: 'bg-orange-500/10 border-orange-500/30',
    dot: 'bg-orange-500',
  },
  next: {
    label: 'Próximo',
    icon: Clock,
    text: 'text-yellow-500',
    bg: 'bg-yellow-500/10 border-yellow-500/30',
    dot: 'bg-yellow-500',
  },
  safe: {
    label: 'Vigente',
    icon: ShieldCheck,
    text: 'text-emerald-500',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
}

const STATUS_ORDER: ExpiryStatus[] = [
  'expired',
  'critical',
  'withdrawal',
  'next',
  'safe',
]

const MONTHS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

// Clasificación de estado (umbral de retiro = 30 días)
const classify = (daysLeft: number): ExpiryStatus => {
  if (daysLeft < 0) return 'expired'
  if (daysLeft <= 15) return 'critical'
  if (daysLeft <= 30) return 'withdrawal'
  if (daysLeft <= 120) return 'next'
  return 'safe'
}

// ============================================================================
// Subcomponentes
// ============================================================================
const SummaryCard = ({
  status,
  count,
}: {
  status: ExpiryStatus
  count: number
}) => {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <div className="bg-surface border border-subtle rounded-2xl p-4 flex flex-col gap-3 min-w-[130px]">
      <div
        className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center border',
          meta.bg,
        )}
      >
        <Icon className={cn('w-4.5 h-4.5', meta.text)} />
      </div>
      <div>
        <p className="text-2xl font-bold text-primary leading-none">{count}</p>
        <p className="text-xs text-muted mt-1.5">{meta.label}</p>
      </div>
    </div>
  )
}

const RecordRow = ({ record }: { record: ExpiryRecord }) => {
  const status = classify(record.daysLeft)
  const meta = STATUS_META[status]
  const daysText =
    record.daysLeft < 0
      ? `Venció hace ${Math.abs(record.daysLeft)} d`
      : record.daysLeft === 0
        ? 'Vence hoy'
        : `Faltan ${record.daysLeft} d`

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-elevated transition-colors group">
      <div
        className={cn('w-1.5 self-stretch rounded-full shrink-0', meta.dot)}
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary truncate">
          {record.product}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
          <span className="text-xs text-muted font-mono">{record.barcode}</span>
          <span className="text-xs text-secondary flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {record.location}
          </span>
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-primary">
          {MONTHS[record.month - 1]} {record.year}
        </p>
        <p className="text-xs text-muted">{record.quantity} un.</p>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1.5 w-24">
        <span
          className={cn(
            'text-[11px] font-bold px-2 py-0.5 rounded-full border',
            meta.bg,
            meta.text,
          )}
        >
          {meta.label}
        </span>
        <span className="text-[11px] text-secondary">{daysText}</span>
      </div>

      <button className="w-8 h-8 rounded-lg items-center justify-center text-muted hover:bg-rose-500/10 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all hidden md:flex shrink-0">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

const Section = ({
  status,
  records,
  isOpen,
  onToggle,
}: {
  status: ExpiryStatus
  records: ExpiryRecord[]
  isOpen: boolean
  onToggle: () => void
}) => {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <div className="bg-surface border border-subtle rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-elevated transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center border',
              meta.bg,
            )}
          >
            <Icon className={cn('w-4 h-4', meta.text)} />
          </div>
          <span className="text-sm font-semibold text-primary">
            {meta.label}
          </span>
          <span className="text-xs text-muted font-mono">
            {records.length} registros
          </span>
        </div>
        <motion.div
          animate={{
            rotate: isOpen ? 180 : 0,
          }}
          transition={{
            duration: 0.2,
          }}
        >
          <ChevronDown className="w-4 h-4 text-muted" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{
              height: 0,
              opacity: 0,
            }}
            animate={{
              height: 'auto',
              opacity: 1,
            }}
            exit={{
              height: 0,
              opacity: 0,
            }}
            transition={{
              duration: 0.2,
            }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-subtle border-t border-subtle">
              {records.length === 0 ? (
                <p className="text-center py-6 text-xs text-muted">
                  Sin registros
                </p>
              ) : (
                records.map((r) => <RecordRow key={r.id} record={r} />)
              )}
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
const FILTERS: {
  value: 'all' | ExpiryStatus
  label: string
}[] = [
  { value: 'all', label: 'Todos' },
  { value: 'expired', label: 'Vencidos' },
  { value: 'critical', label: 'Críticos' },
  { value: 'withdrawal', label: 'A retirar' },
  { value: 'next', label: 'Próximos' },
  { value: 'safe', label: 'Vigentes' },
]

export const RedesignExpiryPage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | ExpiryStatus>('all')
  const [query, setQuery] = useState('')
  const [openSections, setOpenSections] = useState<
    Record<ExpiryStatus, boolean>
  >({
    expired: true,
    critical: true,
    withdrawal: true,
    next: false,
    safe: false,
  })

  // Datos reales desde IndexedDB
  const expiryRecords: ExpiryRecord[] = useLiveQuery(async (): Promise<ExpiryRecord[]> => {
    const tableName = 'VENCIMIENTOS'
    const records = await db.dynamic_data.where('tableName').equals(tableName).toArray()
    
    return records.map((r) => {
      const data = r.data || {}
      const mm = data.mm || data.month || 1
      const yyyy = data.yyyy || data.year || new Date().getFullYear()
      const expiryDate = new Date(yyyy, mm - 1)
      const now = new Date()
      const daysLeft = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        id: r.id?.toString() || Math.random().toString(),
        product: data.producto || data.product || data.name || 'Producto sin nombre',
        barcode: data.codigo || data.barcode || '',
        location: data.ubicacion || data.location || '',
        month: mm,
        year: yyyy,
        quantity: data.cantidad || data.quantity || 0,
        daysLeft,
      }
    })
  }, [], [] as ExpiryRecord[])

  const counts = useMemo(() => {
    const c: Record<ExpiryStatus, number> = {
      expired: 0, critical: 0, withdrawal: 0, next: 0, safe: 0,
    }
    expiryRecords.forEach((r) => {
      c[classify(r.daysLeft)] += 1
    })
    return c
  }, [expiryRecords])

  const grouped = useMemo(() => {
    const g: Record<ExpiryStatus, ExpiryRecord[]> = {
      expired: [], critical: [], withdrawal: [], next: [], safe: [],
    }
    expiryRecords.filter((r) => {
      const matchesQuery =
        !query ||
        r.product.toLowerCase().includes(query.toLowerCase()) ||
        r.barcode.includes(query)
      const status = classify(r.daysLeft)
      const matchesFilter = filter === 'all' || filter === status
      return matchesQuery && matchesFilter
    }).forEach((r) => {
      g[classify(r.daysLeft)].push(r)
    })
    return g
  }, [filter, query])

  const visibleStatuses =
    filter === 'all' ? STATUS_ORDER : [filter as ExpiryStatus]

  return (
    <div className="h-full flex flex-col bg-base">
      {/* Header */}
      <div className="pt-8 px-4 sm:px-6 lg:px-8 shrink-0 flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
            <CalendarClock className="w-8 h-8 text-blue-500" />
            Vencimientos
          </h1>
          <p className="text-secondary text-sm mt-2">
            Controla la caducidad de tus productos y planifica retiros.
          </p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/20 shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Registrar fecha</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto flex flex-col gap-5">
          {/* Summary cards */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {STATUS_ORDER.map((s) => (
              <SummaryCard key={s} status={s} count={counts[s]} />
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por producto o código..."
              className="w-full bg-surface border border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0',
                  filter === f.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-surface text-secondary hover:bg-elevated hover:text-primary border border-subtle',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sections */}
          <div className="flex flex-col gap-3">
            {visibleStatuses.map((s) => (
              <Section
                key={s}
                status={s}
                records={grouped[s]}
                isOpen={filter !== 'all' ? true : openSections[s]}
                onToggle={() =>
                  setOpenSections((prev) => ({
                    ...prev,
                    [s]: !prev[s],
                  }))
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
