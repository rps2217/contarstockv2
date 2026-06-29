import React from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar as CalendarIcon,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const StatCard = ({ title, value, trend, isPositive }: {
  title: string
  value: string
  trend: string
  isPositive: boolean
}) => (
  <div className="bg-surface border border-subtle rounded-2xl p-5 flex flex-col gap-2">
    <h3 className="text-secondary text-sm font-medium">{title}</h3>
    <div className="flex items-end justify-between">
      <p className="text-2xl font-bold text-primary">{value}</p>
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
    </div>
  </div>
)

export const RedesignReportsPage: React.FC = () => {
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
            {['Hoy', 'Esta semana', 'Este mes', 'Este año'].map((period, i) => (
              <button
                key={period}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  i === 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-surface text-secondary hover:bg-elevated hover:text-primary',
                )}
              >
                {period}
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
              title="Valor del Inventario"
              value="$4.2M"
              trend="12.5%"
              isPositive={true}
            />
            <StatCard
              title="Ítems Contados"
              value="8,432"
              trend="5.2%"
              isPositive={true}
            />
            <StatCard
              title="Discrepancias"
              value="124"
              trend="2.1%"
              isPositive={false}
            />
            <StatCard
              title="Rotación (Días)"
              value="14.2"
              trend="1.5%"
              isPositive={true}
            />
          </div>

          {/* Chart Section (Mock) */}
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
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-xs text-secondary">Entradas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs text-secondary">Salidas</span>
                </div>
              </div>
            </div>

            {/* CSS Grid Bar Chart Mock */}
            <div className="h-64 flex items-end justify-between gap-2 sm:gap-4">
              {[40, 70, 45, 90, 65, 85, 100].map((height, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col justify-end gap-1 group relative"
                >
                  {/* Tooltip */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-elevated text-primary border border-subtle text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    {height * 12} ítems
                  </div>
                  <motion.div
                    initial={{
                      height: 0,
                    }}
                    animate={{
                      height: `${height}%`,
                    }}
                    transition={{
                      duration: 1,
                      delay: i * 0.1,
                    }}
                    className="w-full bg-blue-500/80 hover:bg-blue-500 rounded-t-md transition-colors"
                  />
                  <div className="text-center text-xs text-muted mt-2">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][i]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
