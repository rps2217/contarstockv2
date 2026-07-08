import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Scan,
  ArrowDownToLine,
  Zap,
  Package,
  RefreshCw,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  Box,
  History,
  Users,
  Truck,
  FileText,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  PieChart,
  Scissors,
  Layers,
  Loader2,
  ClipboardList,
  Bell,
  Settings,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSyncStore, useAppStore } from '@/stores';
import { useDashboard, type ActivityItem } from '@/features/dashboard/hooks/useDashboard';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { formatTimeAgo } from '@/lib/date';
import { CardSkeleton } from '@/shared/components/ui/EmptyState';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  icon: React.ElementType;
  colorClass: string;
  onClick?: () => void;
  linkTo?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, trend, icon: Icon, colorClass, onClick, linkTo }) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (linkTo) {
      navigate(linkTo);
    }
  };

  const isClickable = !!(onClick || linkTo);

  return (
    <button
      onClick={handleClick}
      disabled={!isClickable}
      className={cn(
        'bg-surface border border-subtle rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden transition-all duration-200',
        isClickable && 'hover:bg-elevated hover:border-blue-500/30 cursor-pointer group'
      )}
    >
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
        {isClickable && (
          <ArrowRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      <div className="text-left">
        <h3 className="text-secondary text-sm font-medium mb-1">{title}</h3>
        <p className="text-2xl font-bold text-primary">{value}</p>
      </div>
    </button>
  );
};

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

// Métricas adicionales desde IndexedDB
const useDashboardMetrics = () => {
  // Safe access to db tables with fallback
  const safeCount = async (table: any): Promise<number> => {
    try {
      if (!table) return 0;
      return await table.count();
    } catch {
      return 0;
    }
  };
  
  const productCount = useLiveQuery(async () => {
    return safeCount(db?.products);
  }, [], 0);
  
  const customerCount = useLiveQuery(async () => {
    return safeCount(db?.customers);
  }, [], 0);
  
  const providerCount = useLiveQuery(async () => {
    return safeCount(db?.providers);
  }, [], 0);
  
  const sessionCount = useLiveQuery(async () => {
    return safeCount(db?.sessions);
  }, [], 0);
  
  const scanCount = useLiveQuery(async () => {
    return safeCount(db?.scans);
  }, [], 0);
  
  const syncQueueCount = useLiveQuery(async () => {
    return safeCount(db?.syncQueue);
  }, [], 0);
  
  // Sesiones de hoy
  const todaySessions = useLiveQuery(async () => {
    try {
      if (!db?.sessions) return 0;
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const sessions = await db.sessions.where('createdAt').above(startOfDay.getTime()).toArray();
      return sessions.filter(s => s.status === 'completed').length;
    } catch { return 0; }
  }, [], 0);
  
  // Métricas de vencimiento
  const expiryMetrics = useLiveQuery(async () => {
    try {
      if (!db) return { expired: 0, critical: 0, warning: 0, safe: 0, total: 0 };
      const expirations = await db.table('expirations').toArray() as any[];
      
      let expired = 0, critical = 0, warning = 0, safe = 0;
      
      expirations.forEach(e => {
        const daysLeft = e.daysLeft ?? 0;
        if (daysLeft < 0) expired++;
        else if (daysLeft <= 7) critical++;
        else if (daysLeft <= 30) warning++;
        else safe++;
      });
      
      return { expired, critical, warning, safe, total: expirations.length };
    } catch { return { expired: 0, critical: 0, warning: 0, safe: 0, total: 0 }; }
  }, [], { expired: 0, critical: 0, warning: 0, safe: 0, total: 0 });
  
  return { 
    productCount: productCount ?? 0, 
    customerCount: customerCount ?? 0, 
    providerCount: providerCount ?? 0, 
    sessionCount: sessionCount ?? 0, 
    scanCount: scanCount ?? 0, 
    syncQueueCount: syncQueueCount ?? 0, 
    todaySessions: todaySessions ?? 0,
    expiryMetrics 
  };
};

export const RedesignDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { pendingItems, isSupabaseConnected, lastSyncTime, latencyMs } = useSyncStore();
  const { setStartSessionModalOpen } = useAppStore();
  const metrics = useDashboardMetrics();
  
  const {
    totalItems,
    pendingSyncCount,
    expiringItems,
    recentActivity,
    isOnline,
    todayStats
  } = useDashboard();

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto no-scrollbar bg-base pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 flex items-end justify-between">
            <div className="space-y-2">
              <div className="w-48 h-8 bg-surface rounded animate-pulse" />
              <div className="w-64 h-4 bg-elevated rounded animate-pulse" />
            </div>
            <div className="w-32 h-8 bg-surface rounded-full animate-pulse" />
          </div>
          <div className="w-full h-16 bg-surface rounded-2xl animate-pulse mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-surface rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="space-y-4">
            <div className="w-32 h-6 bg-surface rounded animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-32 bg-surface rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Sync Status Banner */}
        <div className={cn(
          'rounded-2xl p-4 mb-6 border',
          isSupabaseConnected 
            ? 'bg-emerald-500/10 border-emerald-500/30' 
            : 'bg-rose-500/10 border-rose-500/30'
        )}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {isSupabaseConnected ? (
                <>
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-medium text-emerald-500">Conectado a la nube</span>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-sm font-medium text-rose-500">Sin conexión</span>
                </>
              )}
              {lastSyncTime && (
                <span className="text-xs text-muted flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Última sync: {formatTimeAgo(lastSyncTime)}
                </span>
              )}
              {latencyMs && (
                <span className="text-xs text-muted flex items-center gap-1">
                  {latencyMs}ms
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted">Pendiente:</span>
                <span className={cn('font-bold', pendingItems > 0 ? 'text-amber-500' : 'text-emerald-500')}>
                  {pendingItems}
                </span>
              </div>
              <button
                onClick={() => navigate('/sync')}
                className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1"
              >
                Ver detalles <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <StatCard
            title="Productos"
            value={formatNumber(metrics.productCount || 0)}
            icon={Box}
            colorClass="bg-blue-500/10 text-blue-500"
            linkTo="/data"
          />

          <StatCard
            title="Clientes"
            value={metrics.customerCount || 0}
            icon={Users}
            colorClass="bg-purple-500/10 text-purple-500"
            linkTo="/customers"
          />

          <StatCard
            title="Proveedores"
            value={metrics.providerCount || 0}
            icon={Truck}
            colorClass="bg-amber-500/10 text-amber-500"
            linkTo="/suppliers"
          />

          <StatCard
            title="Vencimientos"
            value={metrics.expiryMetrics?.total || 0}
            icon={CalendarClock}
            colorClass="bg-rose-500/10 text-rose-500"
            linkTo="/expiry"
          />

          <StatCard
            title="Sesiones"
            value={metrics.sessionCount || 0}
            icon={History}
            colorClass="bg-emerald-500/10 text-emerald-500"
            linkTo="/data"
          />

          <StatCard
            title="Scans"
            value={formatNumber(metrics.scanCount || 0)}
            icon={Scan}
            colorClass="bg-pink-500/10 text-pink-500"
            linkTo="/capture"
          />
        </div>

        {/* Quick Actions Grid */}
        <div>
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

            <ActionCard
              title="Cargas teóricas"
              description="Gestiona listados de stock teóricos para auditorías."
              icon={Layers}
              delay={0.3}
              onClick={() => navigate('/theoretical-loads')}
            />

            <ActionCard
              title="Ver reportes"
              description="Estadísticas y reportes de inventario."
              icon={BarChart3}
              delay={0.35}
              onClick={() => navigate('/reports')}
            />

            <ActionCard
              title="Clientes"
              description="Gestiona la base de datos de clientes."
              icon={Users}
              delay={0.45}
              onClick={() => navigate('/customers')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};