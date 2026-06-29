import React from 'react';
import { motion } from 'framer-motion';
import {
  Scan,
  ArrowDownToLine,
  Zap,
  Package,
  RefreshCw,
  CalendarClock,
  AlertTriangle,
  TrendingUp,
  Box,
  History
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from './utils';
import { useSyncStore, useAppStore } from '@/stores';
import { useDashboard, type ActivityItem } from '@/features/dashboard/hooks/useDashboard';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  icon: React.ElementType;
  colorClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, trend, icon: Icon, colorClass }) => (
  <div className="bg-surface border border-subtle rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden group">
    <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />

    <div className="flex justify-between items-start">
      <div className={cn('p-2.5 rounded-xl', colorClass)}>
        <Icon className="w-5 h-5" />
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-emerald-500 text-xs font-medium bg-emerald-500/10 px-2 py-1 rounded-full">
          <TrendingUp className="w-3 h-3" />
          {trend}
        </div>
      )}
    </div>

    <div>
      <h3 className="text-secondary text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-primary">{value}</p>
    </div>
  </div>
);

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  primary?: boolean;
  delay: number;
  onClick: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({ title, description, icon: Icon, primary, delay, onClick }) => (
  <motion.button
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      'text-left p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-3 h-full',
      primary
        ? 'bg-blue-600 hover:bg-blue-500 border-blue-500 shadow-lg shadow-blue-900/20'
        : 'bg-surface hover:bg-elevated border-subtle'
    )}
  >
    <div
      className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center',
        primary ? 'bg-white/20 text-white' : 'bg-elevated text-blue-500'
      )}
    >
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <h4 className={cn('font-semibold mb-1', primary ? 'text-white' : 'text-primary')}>
        {title}
      </h4>
      <p className={cn('text-xs leading-relaxed', primary ? 'text-blue-100' : 'text-muted')}>
        {description}
      </p>
    </div>
  </motion.button>
);

export const RedesignDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { pendingItems, isSupabaseConnected } = useSyncStore();
  const { setStartSessionModalOpen } = useAppStore();
  const {
    totalItems,
    pendingSyncCount,
    expiringItems,
    recentActivity,
    isOnline,
    todayStats
  } = useDashboard();

  // Handler para abrir modal de nuevo conteo
  const handleNewCount = () => {
    setStartSessionModalOpen(true);
  };

  // Formatear números
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-base pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8 flex items-end justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl sm:text-3xl font-bold text-primary tracking-tight mb-1"
            >
              Buenos días
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-secondary text-sm"
            >
              Esto es lo que pasa hoy en tu almacén.
            </motion.p>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-secondary bg-surface border border-subtle px-3 py-1.5 rounded-full">
            <div className={cn(
              'w-2 h-2 rounded-full animate-pulse',
              isOnline ? 'bg-emerald-500' : 'bg-rose-500'
            )} />
            {isOnline ? 'Sistema en línea' : 'Sistema sin conexión'}
          </div>
        </header>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard
            title="Total de ítems"
            value={formatNumber(totalItems || 0)}
            trend={todayStats?.trend ? `+${todayStats.trend.toFixed(1)}%` : undefined}
            icon={Box}
            colorClass="bg-blue-500/10 text-blue-500"
          />

          <StatCard
            title="Sync pendiente"
            value={pendingItems}
            icon={RefreshCw}
            colorClass="bg-amber-500/10 text-amber-500"
          />

          <StatCard
            title="Por vencer"
            value={expiringItems || 0}
            icon={CalendarClock}
            colorClass="bg-rose-500/10 text-rose-500"
          />

          <StatCard
            title="Pendiente sync"
            value={pendingSyncCount || 0}
            icon={AlertTriangle}
            colorClass="bg-purple-500/10 text-purple-500"
          />
        </div>

        {/* Quick Actions Grid */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-primary mb-4">
            Acciones rápidas
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            <ActionCard
              title="Nuevo conteo"
              description="Inicia una nueva sesión de conteo de inventario."
              icon={Scan}
              primary
              delay={0.1}
              onClick={handleNewCount}
            />

            <ActionCard
              title="Recibir stock"
              description="Registra envíos y órdenes entrantes."
              icon={ArrowDownToLine}
              delay={0.15}
              onClick={() => navigate('/reception')}
            />

            <ActionCard
              title="Modo ráfaga"
              description="Escaneo continuo de códigos a alta velocidad."
              icon={Zap}
              delay={0.2}
              onClick={() => navigate('/massive')}
            />

            <ActionCard
              title="Ver inventario"
              description="Busca y verifica productos específicos."
              icon={Package}
              delay={0.25}
              onClick={() => navigate('/data')}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-lg font-semibold text-primary mb-4">
            Actividad reciente
          </h2>
          <div className="bg-surface border border-subtle rounded-2xl overflow-hidden">
            {recentActivity.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border-b border-subtle last:border-0 hover:bg-elevated transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center text-secondary">
                    <span className="text-xs font-bold">
                      {item.user?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted">
                      {item.time} {item.user && `• ${item.user}`}
                    </p>
                  </div>
                </div>
                {item.count !== undefined && (
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">
                      {item.count}
                    </p>
                    <p className="text-[10px] text-muted uppercase tracking-wider">
                      {item.countLabel || 'Ítems'}
                    </p>
                  </div>
                )}
              </div>
            ))}
            {recentActivity.length === 0 && (
              <div className="p-8 text-center text-muted text-sm">
                No hay actividad reciente
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};