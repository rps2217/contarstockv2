import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, TrendingUp, TrendingDown, Download, Calendar as CalendarIcon,
  ArrowUpRight, ArrowDownRight, Package, ClipboardCheck, FileText, PieChart,
  Clock, Users, Truck, RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  Database, History, Printer, Share2, Scan, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { SessionRepository } from '@/repositories/SessionRepository'

type TimePeriod = 'today' | 'week' | 'month' | 'year'
type ReportType = 'counting' | 'inventory' | 'sync' | 'expiry'

const StatCard = ({ title, value, trend, isPositive, icon: Icon, color = 'blue' }: {
  title: string; value: string | number; trend?: string; isPositive?: boolean
  icon?: React.ElementType; color?: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'cyan'
}) => {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-500', green: 'text-emerald-500', red: 'text-rose-500',
    amber: 'text-amber-500', purple: 'text-purple-500', cyan: 'text-cyan-500',
  }
  return (
    <div className="bg-surface border border-subtle rounded-2xl p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-secondary text-sm font-medium">{title}</h3>
        {Icon && <Icon className={cn('w-4 h-4', colorMap[color])} />}
      </div>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-primary">{value}</p>
        {trend && (
          <div className={cn('flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
            isPositive ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10')}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </div>
    </div>
  )
}

const MiniChart = ({ data, color = 'blue' }: { data: number[], color?: 'blue' | 'green' | 'red' }) => {
  const max = Math.max(...data, 1)
  const colorClass = color === 'blue' ? 'bg-blue-500' : color === 'green' ? 'bg-emerald-500' : 'bg-rose-500'
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((value, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end">
          <div className={cn('w-full rounded-sm', colorClass)} style={{ height: `${Math.max((value / max) * 100, 10)}%` }} />
        </div>
      ))}
    </div>
  )
}

export const RedesignReportsPage: React.FC = () => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week')
  const [activeTab, setActiveTab] = useState<ReportType>('counting')

  const getDateRange = (period: TimePeriod) => {
    const now = new Date()
    let startTime: number
    switch (period) {
      case 'today': startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); break
      case 'week': startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime(); break
      case 'month': startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime(); break
      case 'year': startTime = new Date(now.getFullYear(), 0, 1).getTime(); break
    }
    return { startTime, endTime: now.getTime() }
  }

  // Estadísticas de conteo
  const countingStats = useLiveQuery(async () => {
    const { startTime, endTime } = getDateRange(timePeriod)
    const sessions = await SessionRepository.getByDateRange(startTime, endTime)
    const completedSessions = sessions.filter(s => s.status === 'completed')
    const periodLength = endTime - startTime
    const prevSessions = await SessionRepository.getByDateRange(startTime - periodLength, startTime)
    const prevCompleted = prevSessions.filter(s => s.status === 'completed')
    const totalUnits = completedSessions.reduce((sum, s) => sum + (s.totalUnits || 0), 0)
    const prevTotalUnits = prevCompleted.reduce((sum, s) => sum + (s.totalUnits || 0), 0)
    const trend = prevTotalUnits > 0 ? Math.round(((totalUnits - prevTotalUnits) / prevTotalUnits) * 100) : totalUnits > 0 ? 100 : 0
    return {
      sessionCount: completedSessions.length,
      totalUnits,
      avgPerSession: completedSessions.length > 0 ? Math.round(totalUnits / completedSessions.length) : 0,
      trend: `${Math.abs(trend)}%`,
      isPositive: trend >= 0
    }
  }, [timePeriod])

  // Estadísticas de inventario
  const inventoryStats = useLiveQuery(async () => {
    try {
      if (!db?.products) return { products: 0, customers: 0, providers: 0, lowStock: 0, noStock: 0 }
      const [products, customers, providers] = await Promise.all([
        db.products.count().catch(() => 0), 
        db.customers?.count().catch(() => 0) ?? 0, 
        db.providers?.count().catch(() => 0) ?? 0
      ])
      const lowStock = await db.products.filter(p => (p.stock || 0) < 10).count().catch(() => 0)
      const noStock = await db.products.filter(p => (p.stock || 0) === 0).count().catch(() => 0)
      return { products, customers, providers, lowStock, noStock }
    } catch {
      return { products: 0, customers: 0, providers: 0, lowStock: 0, noStock: 0 }
    }
  }, [])

  // Estadísticas de sincronización
  const syncStats = useLiveQuery(async () => {
    try {
      const { startTime, endTime } = getDateRange(timePeriod)
      if (!db?.sync_logs || !db?.syncQueue) return { totalOps: 0, successCount: 0, pendingCount: 0, successRate: 100 }
      const logs = await db.sync_logs.where('timestamp').between(startTime, endTime).toArray().catch(() => [])
      const successCount = logs.filter(l => l.status === 'success').length
      const pendingCount = await db.syncQueue.count().catch(() => 0)
      return { totalOps: logs.length, successCount, pendingCount, successRate: logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 100 }
    } catch {
      return { totalOps: 0, successCount: 0, pendingCount: 0, successRate: 100 }
    }
  }, [timePeriod])

  // Estadísticas de vencimientos
  const expiryStats = useLiveQuery(async () => {
    const now = new Date()
    const records = await db.dynamic_data.where('tableName').equals('VENCIMIENTOS').toArray()
    let expired = 0, critical = 0, upcoming = 0, safe = 0
    records.forEach(r => {
      const data = r.data || {}
      const mm = data.mm || data.month, yyyy = data.yyyy || data.year
      if (!mm || !yyyy) return
      const daysLeft = Math.floor((new Date(yyyy, mm - 1).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysLeft < 0) expired++; else if (daysLeft <= 15) critical++; else if (daysLeft <= 30) upcoming++; else safe++
    })
    return { total: records.length, expired, critical, upcoming, safe }
  }, [])

  // Gráfico semanal de sesiones
  const weeklyChart = useLiveQuery(async () => {
    const data: number[] = [], labels: string[] = [], now = new Date()
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now); dayStart.setDate(dayStart.getDate() - i); dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart); dayEnd.setHours(23, 59, 59, 999)
      const sessions = await SessionRepository.getByDateRange(dayStart.getTime(), dayEnd.getTime())
      const completed = sessions.filter(s => s.status === 'completed')
      data.push(completed.reduce((sum, s) => sum + (s.totalUnits || 0), 0))
      labels.push(dayNames[dayStart.getDay()])
    }
    return { data, labels }
  }, [])

  // Sesiones recientes
  const recentSessions = useLiveQuery(async () => {
    const sessions = await SessionRepository.getRecent(5)
    return sessions.map(s => ({ id: s.id, type: s.sessionType || 'counting', date: s.createdAt, items: s.totalUnits || 0, status: s.status }))
  }, [], [])

  const maxChartValue = Math.max(...(weeklyChart?.data || [1]), 1)
  const formatNumber = (num: number) => num?.toLocaleString() || '0'

  const TABS: { id: ReportType; label: string; icon: React.ElementType }[] = [
    { id: 'counting', label: 'Conteo', icon: ClipboardCheck },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'sync', label: 'Sincronización', icon: RefreshCw },
    { id: 'expiry', label: 'Vencimientos', icon: AlertTriangle },
  ]

  return (
    <div className="h-full flex flex-col bg-base">
      <div className="pt-8 px-4 sm:px-6 lg:px-8 shrink-0 flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-500" />
            Reportes
          </h1>
          <p className="text-secondary text-sm mt-2">Análisis y estadísticas de tu negocio.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-surface border border-subtle hover:bg-elevated text-secondary px-3 py-2 rounded-xl text-sm font-medium transition-colors">
            <Printer className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto flex flex-col gap-6">
          {/* Tabs */}
          <div className="flex gap-1 bg-surface border border-subtle rounded-xl p-1 overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-secondary hover:text-primary hover:bg-elevated')}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Time Filter */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {[{ id: 'today' as TimePeriod, label: 'Hoy' }, { id: 'week' as TimePeriod, label: 'Esta semana' },
             { id: 'month' as TimePeriod, label: 'Este mes' }, { id: 'year' as TimePeriod, label: 'Este año' }].map(period => (
              <button key={period.id} onClick={() => setTimePeriod(period.id)}
                className={cn('px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  timePeriod === period.id ? 'bg-blue-600 text-white' : 'bg-surface text-secondary hover:bg-elevated hover:text-primary')}>
                {period.label}
              </button>
            ))}
            <button className="px-4 py-1.5 rounded-lg text-sm font-medium bg-surface text-secondary hover:bg-elevated flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />Personalizado
            </button>
          </div>

          {/* Counting Tab */}
          {activeTab === 'counting' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Sesiones" value={countingStats?.sessionCount || 0} icon={ClipboardCheck} color="blue" />
                <StatCard title="Total Ítems" value={formatNumber(countingStats?.totalUnits || 0)} trend={countingStats?.trend} isPositive={countingStats?.isPositive} icon={Scan} color="cyan" />
                <StatCard title="Promedio/Sesión" value={countingStats?.avgPerSession || 0} icon={TrendingUp} color="green" />
                <StatCard title="Pendiente Sync" value={syncStats?.pendingCount || 0} icon={RefreshCw} color="amber" />
              </div>

              <div className="bg-surface border border-subtle rounded-3xl p-6">
                <h2 className="text-lg font-semibold text-primary mb-2">Actividad de Conteo</h2>
                <p className="text-sm text-muted mb-6">Volumen de ítems escaneados por día</p>
                <div className="h-64 flex items-end justify-between gap-2">
                  {(weeklyChart?.data || [0,0,0,0,0,0,0]).map((value, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end gap-1 group relative">
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-elevated text-primary border border-subtle text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        {value.toLocaleString()} ítems
                      </div>
                      <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max((value / maxChartValue) * 100, 2)}%` }} transition={{ duration: 0.8, delay: i * 0.05 }}
                        className="w-full bg-blue-500/80 hover:bg-blue-500 rounded-t-md transition-colors" />
                      <div className="text-center text-xs text-muted mt-2">{weeklyChart?.labels?.[i]}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Productos" value={formatNumber(inventoryStats?.products || 0)} icon={Package} color="blue" />
                <StatCard title="Clientes" value={inventoryStats?.customers || 0} icon={Users} color="purple" />
                <StatCard title="Proveedores" value={inventoryStats?.providers || 0} icon={Truck} color="amber" />
                <StatCard title="Sin Stock" value={inventoryStats?.noStock || 0} icon={XCircle} color="red" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-surface border border-subtle rounded-3xl p-6">
                  <h3 className="font-semibold text-primary mb-4">Distribución de Inventario</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-secondary">Con stock</span>
                        <span className="text-sm font-medium text-emerald-500">{((inventoryStats?.products || 0) - (inventoryStats?.noStock || 0) - (inventoryStats?.lowStock || 0))}</span>
                      </div>
                      <div className="h-2 bg-base rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${((inventoryStats?.products || 0) - (inventoryStats?.noStock || 0) - (inventoryStats?.lowStock || 0)) / Math.max(inventoryStats?.products || 1, 1) * 100}%` }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-secondary">Stock bajo</span>
                        <span className="text-sm font-medium text-amber-500">{inventoryStats?.lowStock || 0}</span>
                      </div>
                      <div className="h-2 bg-base rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(inventoryStats?.lowStock || 0) / Math.max(inventoryStats?.products || 1, 1) * 100}%` }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-secondary">Sin stock</span>
                        <span className="text-sm font-medium text-rose-500">{inventoryStats?.noStock || 0}</span>
                      </div>
                      <div className="h-2 bg-base rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(inventoryStats?.noStock || 0) / Math.max(inventoryStats?.products || 1, 1) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-surface border border-subtle rounded-3xl p-6">
                  <h3 className="font-semibold text-primary mb-4">Resumen</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-base rounded-xl">
                      <span className="text-sm text-secondary">Total de SKUs</span>
                      <span className="font-bold text-primary">{formatNumber(inventoryStats?.products || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-base rounded-xl">
                      <span className="text-sm text-secondary">Productos únicos</span>
                      <span className="font-bold text-primary">{formatNumber(inventoryStats?.products || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-base rounded-xl">
                      <span className="text-sm text-secondary">Requieren atención</span>
                      <span className="font-bold text-amber-500">{(inventoryStats?.lowStock || 0) + (inventoryStats?.noStock || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Sync Tab */}
          {activeTab === 'sync' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Operaciones" value={syncStats?.totalOps || 0} icon={RefreshCw} color="blue" />
                <StatCard title="Exitosas" value={syncStats?.successCount || 0} icon={CheckCircle2} color="green" />
                <StatCard title="Tasa de Éxito" value={`${syncStats?.successRate || 100}%`} icon={TrendingUp} color="cyan" />
                <StatCard title="Pendientes" value={syncStats?.pendingCount || 0} icon={Clock} color="amber" />
              </div>

              <div className="bg-surface border border-subtle rounded-3xl p-6">
                <h3 className="font-semibold text-primary mb-4">Estado de Sincronización</h3>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-32 rounded-full border-8 border-emerald-500 flex items-center justify-center">
                    <span className="text-3xl font-bold text-primary">{syncStats?.successRate || 100}%</span>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-sm text-secondary">Exitosas</span></div>
                      <span className="font-bold text-emerald-500">{syncStats?.successCount || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-rose-500" /><span className="text-sm text-secondary">Fallidas</span></div>
                      <span className="font-bold text-rose-500">{(syncStats?.totalOps || 0) - (syncStats?.successCount || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" /><span className="text-sm text-secondary">Pendientes</span></div>
                      <span className="font-bold text-amber-500">{syncStats?.pendingCount || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Expiry Tab */}
          {activeTab === 'expiry' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Total" value={expiryStats?.total || 0} icon={Package} color="blue" />
                <StatCard title="Vencidos" value={expiryStats?.expired || 0} icon={XCircle} color="red" />
                <StatCard title="Críticos" value={expiryStats?.critical || 0} icon={AlertTriangle} color="amber" />
                <StatCard title="Próximos (30d)" value={expiryStats?.upcoming || 0} icon={Clock} color="cyan" />
              </div>

              <div className="bg-surface border border-subtle rounded-3xl p-6">
                <h3 className="font-semibold text-primary mb-4">Estado de Vencimientos</h3>
                <div className="flex items-center gap-6">
                  <div className="flex-1 space-y-3">
                    {[
                      { label: 'Vencidos', count: expiryStats?.expired || 0, color: 'bg-rose-500', textColor: 'text-rose-500' },
                      { label: 'Críticos (<15d)', count: expiryStats?.critical || 0, color: 'bg-amber-500', textColor: 'text-amber-500' },
                      { label: 'Próximos (<30d)', count: expiryStats?.upcoming || 0, color: 'bg-cyan-500', textColor: 'text-cyan-500' },
                      { label: 'Vigentes', count: expiryStats?.safe || 0, color: 'bg-emerald-500', textColor: 'text-emerald-500' },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-secondary">{item.label}</span>
                          <span className={cn('font-bold', item.textColor)}>{item.count}</span>
                        </div>
                        <div className="h-2 bg-base rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', item.color)} style={{ width: `${(item.count / Math.max(expiryStats?.total || 1, 1)) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Recent Sessions */}
          <div className="bg-surface border border-subtle rounded-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-subtle flex items-center justify-between">
              <h3 className="font-semibold text-primary">Sesiones Recientes</h3>
              <button className="text-xs text-blue-500 hover:text-blue-400">Ver todas</button>
            </div>
            {recentSessions.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">No hay sesiones recientes</div>
            ) : (
              <div className="divide-y divide-subtle">
                {recentSessions.map(session => (
                  <div key={session.id} className="px-6 py-4 flex items-center justify-between hover:bg-elevated transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center',
                        session.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500')}>
                        {session.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary capitalize">{session.type}</p>
                        <p className="text-xs text-muted">{new Date(session.date).toLocaleDateString('es-ES')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{session.items}</p>
                      <p className="text-xs text-muted">ítems</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
