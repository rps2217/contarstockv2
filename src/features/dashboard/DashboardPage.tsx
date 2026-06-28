/**
 * Dashboard - Página principal con diseño inspirado en Magic Patterns
 * Estilo limpio slate con gradientes sutiles y animaciones fluidas
 */

import React, { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Zap,
  Database,
  AlertCircle,
  Plus,
  CheckCircle2,
  Package,
  Cloud,
  Clock,
  PackageSearch,
  RefreshCw,
  BoxIcon,
} from "lucide-react";
import { useAppStore } from '@/stores';
import { SoundFX } from "../../services/audio";
import { 
  DashboardHeader, 
  MetricCard, 
  QuickAction, 
  RecentActivity,
  TodaySummary,
  KeyboardShortcuts
} from "./components";
import { useDashboard } from "./hooks/useDashboard";

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const { settings, setStartSessionModalOpen } = useAppStore();
  const {
    totalItems,
    pendingSyncCount,
    expiringItems,
    recentActivity,
    isOnline,
    operatorId,
    todayStats,
    weeklyTrend
  } = useDashboard();

  useEffect(() => {
    const msg = (location.state as any)?.message;
    if (!msg) return;
    
    setSuccessMessage(msg);
    SoundFX.play("success");
    navigate(location.pathname, { replace: true, state: {} });
    const timer = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [location, navigate]);

  // Acciones rápidas disponibles
  const quickActions = [
    {
      id: 'new-count',
      icon: <Plus className="w-5 h-5" />,
      title: 'Nuevo conteo',
      description: 'Inicia una nueva sesión de conteo de inventario.',
      onClick: () => setStartSessionModalOpen(true),
      primary: true,
      delay: 0.1,
    },
    {
      id: 'receive',
      icon: <Package className="w-5 h-5" />,
      title: 'Recibir stock',
      description: 'Registra envíos y órdenes entrantes.',
      onClick: () => navigate('/capture/reception'),
      primary: false,
      delay: 0.15,
    },
    {
      id: 'burst',
      icon: <Zap className="w-5 h-5" />,
      title: 'Modo ráfaga',
      description: 'Escaneo continuo de códigos a alta velocidad.',
      onClick: () => navigate('/massive/BURST-MODE'),
      primary: false,
      delay: 0.2,
    },
    {
      id: 'inventory',
      icon: <PackageSearch className="w-5 h-5" />,
      title: 'Ver inventario',
      description: 'Busca y verifica productos específicos.',
      onClick: () => navigate('/data'),
      primary: false,
      delay: 0.25,
    },
  ];

  // Mapear actividad reciente al formato del componente
  const mappedActivity = recentActivity.map((item) => ({
    id: item.id,
    icon: item.icon,
    iconColor: item.iconColor,
    title: item.title,
    time: item.time,
    user: item.user,
    count: item.count,
    countLabel: item.countLabel,
  }));

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-slate-950 pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence>
          {successMessage && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
            >
              <motion.div 
                initial={{ scale: 0.5, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-slate-800 rounded-full p-8 mb-8"
              >
                <CheckCircle2 className="w-24 h-24 text-slate-300" />
              </motion.div>
              <h2 className="text-4xl font-bold tracking-tight max-w-2xl text-slate-100">
                {successMessage}
              </h2>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header con saludo */}
        <DashboardHeader 
          userName={operatorId || 'Usuario'}
          isOnline={isOnline}
          isDark={true}
        />

        {/* Resumen de hoy */}
        <div className="mb-10">
          <TodaySummary
            sessionsCompleted={todayStats?.sessionsCompleted || 0}
            totalScanned={todayStats?.totalScanned || 0}
            totalUnits={todayStats?.totalUnits || 0}
            trend={todayStats?.trend || 0}
            isDark={true}
          />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <MetricCard
            title="Total de ítems"
            value={totalItems || 0}
            change={2.4}
            icon={<Database className="w-5 h-5" />}
            sparklineData={weeklyTrend}
            isDark={true}
          />
          <MetricCard
            title="Sync pendiente"
            value={pendingSyncCount || 0}
            icon={<RefreshCw className="w-5 h-5" />}
            variant={(pendingSyncCount || 0) > 0 ? 'warning' : 'default'}
            isDark={true}
          />
          <MetricCard
            title="Por vencer"
            value={expiringItems || 0}
            icon={<Clock className="w-5 h-5" />}
            variant={(expiringItems || 0) > 0 ? 'error' : 'default'}
            isDark={true}
          />
          <MetricCard
            title="Alertas recientes"
            value={0}
            icon={<AlertCircle className="w-5 h-5" />}
            isDark={true}
          />
        </div>

        {/* Quick Actions Grid */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">
            Acciones rápidas
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {quickActions.map((action) => (
              <QuickAction
                key={action.id}
                icon={action.icon}
                title={action.title}
                description={action.description}
                onClick={action.onClick}
                isDark={true}
                primary={action.primary}
                delay={action.delay}
              />
            ))}
          </div>
        </div>

        {/* Actividad reciente */}
        <div>
          <RecentActivity
            title="Actividad reciente"
            items={mappedActivity}
            isDark={true}
            maxItems={5}
          />
        </div>
      </div>

      {/* Atajos de teclado */}
      <KeyboardShortcuts isDark={true} />
    </div>
  );
};

export default memo(Dashboard);
