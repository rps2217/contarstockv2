import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar as CalendarIcon,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  ClipboardCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { SessionRepository } from '@/repositories/SessionRepository'

type TimePeriod = 'today' | 'week' | 'month' | 'year'

const StatCard = ({ title, value, trend, isPositive, icon: Icon }: {
  title: string
  value: string | number
  trend?: string
  isPositive?: boolean
  icon?: React.ElementType
}) => (
  <div className="bg-surface border border-subtle rounded-2xl p-5 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <h3 className="text-secondary text-sm font-medium">{title}</h3>
      {Icon && <Icon className="w-4 h-4 text-muted" />}
    </div>
    <div className="flex items-end justify-between">
      <p className="text-2xl font-bold text-primary">{value}</p>
      {trend && (
        <div
          className={cn(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
            isPositive
              ? 'text-emerald-500 bg-emerald-500/10'
              : 'text-rose-500 bg-rose-500/10',
          )}
        >
          {isPositive ? (
            <ArrowUpRight className="w-3 h-3" />
          ) : (
            <ArrowDownRight className="w-3 h-3" />
          )}
          {trend}
        </div>
      )}
    </div>
  </div>
)

export const RedesignReportsPage: React.FC = () => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week')

  // Obtener estadísticas de sesiones
  const stats = useLiveQuery(async () => {
    const now = new Date()
    let startTime: number
    
    switch (timePeriod) {
      case 'today':
        startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        break
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime()
        break
      case 'month':
        startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
        break
      case 'year':
        startTime = new Date(now.getFullYear(), 0, 1).getTime()
        break
    }

    const sessions = await SessionRepository.getByDateRange(startTime, now.getTime())
    const completedSessions = sessions.filter(s => s.status === 'completed')
    
    // Contar total de items y sesiones
    const totalScans = completedSessions.reduce((sum, s) => sum + (s.totalSKUs || 0), 0)
    const totalUnits = completedSessions.reduce((sum, s) => sum + (s.totalUnits || 0), 0)
    
    return {
      sessionCount: completedSessions.length,
      totalScans,
      totalUnits,
      avgPerSession: completedSessions.length > 0 
        ? Math.round(totalUnits / completedSessions.length) 
        : 0
    }
  }, [timePeriod])

  // Obtener datos para gráfico (últimos 7 días)
  const weeklyData = useLiveQuery(async () => {
    const data: number[] = []
    const labels: string[] = []
    const now = new Date()
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now)
      dayStart.setDate(dayStart.getDate() - i)
      dayStart.setHours(0, 0, 0, 0)
      
      const dayEnd = new Date(dayStart)
      dayEnd.setHours(23, 59, 59, 999)
      
      const sessions = await SessionRepository.getByDateRange(dayStart.getTime(), dayEnd.getTime())
      const completedSessions = sessions.filter(s => s.status === 'completed')
      const units = completedSessions.reduce((sum, s) => sum + (s.totalUnits || 0), 0)
      
      data.push(units)
      labels.push(dayNames[dayStart.getDay()])
    }

    return { data, labels }
  }, [])

  // Calcular máximo para el gráfico
  const maxValue = weeklyData ? Math.max(...weeklyData.data, 1) : 1

  // Total de productos en inventario
  const productCount = useLiveQuery(async () => {
    return await db.products.count()
  }, [], 0)

  return (
    <div className="h-full flex flex-col bg-base">
      {/* Header */}
      <div className="pt-8 px-4 sm:px-6 lg:px-8 shrink-0 flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-blue-500" />
          Reportes
        </h1>
        <button className="flex items-center gap-2 bg-surface border border-subtle hover:bg-elevated text-secondary px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Exportar</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:px-6 lg:px-8 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto flex flex-col gap-6">
          {/* Time Filter */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {[
              { id: 'today' as TimePeriod, label: 'Hoy' },
              { id: 'week' as TimePeriod, label: 'Esta semana' },
              { id: 'month' as TimePeriod, label: 'Este mes' },
              { id: 'year' as TimePeriod, label: 'Este año' },
            ].map((period, i) => (
              <button
                key={period.id}
                onClick={() => setTimePeriod(period.id)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  timePeriod === period.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-surface text-secondary hover:bg-elevated hover:text-primary',
                )}
              >
                {period.label}
              </button>
            ))}
            <button className="px-4 py-1.5 rounded-lg text-sm font-medium bg-surface text-secondary hover:bg-elevated hover:text-primary flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Personalizado
            </button>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Sesiones"
              value={stats?.sessionCount || 0}
              icon={ClipboardCheck}
            />
            <StatCard
              title="Total Ítems"
              value={stats?.totalUnits?.toLocaleString() || '0'}
              icon={Package}
            />
            <StatCard
              title="Productos"
              value={productCount?.toLocaleString() || '0'}
              icon={BarChart3}
            />
            <StatCard
              title="Promedio/Sesión"
              value={stats?.avgPerSession || 0}
              icon={TrendingUp}
            />
          </div>

          {/* Chart Section */}
          <div className="bg-surface border border-subtle rounded-3xl p-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-lg font-semibold text-primary">
                  Actividad de Conteo
                </h2>
                <p className="text-sm text-muted">
                  Volumen de ítems escaneados por día
                </p>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="h-64 flex items-end justify-between gap-2 sm:gap-4">
              {(weeklyData?.data || [0, 0, 0, 0, 0, 0, 0]).map((value, i) => {
                const heightPercent = (value / maxValue) * 100
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col justify-end gap-1 group relative"
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-elevated text-primary border border-subtle text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {value.toLocaleString()} ítems
                    </div>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(heightPercent, 2)}%` }}
                      transition={{
                        duration: 0.8,
                        delay: i * 0.05,
                      }}
                      className="w-full bg-blue-500/80 hover:bg-blue-500 rounded-t-md transition-colors"
                    />
                    <div className="text-center text-xs text-muted mt-2">
                      {weeklyData?.labels?.[i] || ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][i]}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
