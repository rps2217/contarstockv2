/**
 * Dashboard - Página principal con diseño inspirado en Magic Patterns
 * 
 * Características:
 * - Header con saludo personalizado y estado del sistema
 * - Grid de métricas (total items, sync pendiente, por vencer, alertas)
 * - Acciones rápidas
 * - Actividad reciente
 */

import React, { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Settings,
  ClipboardList,
  History,
  Zap,
  Database,
  FileSpreadsheet,
  Calendar,
  AlertCircle,
  RefreshCw,
  FileText,
  Plus,
  CheckCircle2,
  Package,
  Cloud,
  Clock,
  ListPlus,
  PackageSearch,
} from "lucide-react";
import { useAppStore } from '@/stores';
import { SoundFX } from "../../services/audio";
import { ModuleCard } from "@/shared/components/ui/design-system";
import { DashboardHeader, MetricCard, QuickAction, RecentActivity } from "./components";
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
    operatorId
  } = useDashboard();

  useEffect(() => {
    const msg = (location.state as any)?.message;
    if (msg) {
      setSuccessMessage(msg);
      SoundFX.play("success");
      navigate(location.pathname, { replace: true, state: {} });
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [location, navigate]);

  const isDark = settings?.theme !== 'light';

  // Acciones rápidas disponibles
  const quickActions = [
    {
      id: 'new-count',
      icon: <Plus className="w-6 h-6" />,
      title: 'Nuevo conteo',
      description: 'Inicia una nueva sesión de conteo de inventario.',
      onClick: () => setStartSessionModalOpen(true),
    },
    {
      id: 'receive',
      icon: <Package className="w-6 h-6" />,
      title: 'Recibir stock',
      description: 'Registra envíos y órdenes entrantes.',
      onClick: () => navigate('/capture/reception'),
    },
    {
      id: 'burst',
      icon: <Zap className="w-6 h-6" />,
      title: 'Modo ráfaga',
      description: 'Escaneo continuo de códigos a alta velocidad.',
      onClick: () => navigate('/massive/BURST-MODE'),
    },
    {
      id: 'inventory',
      icon: <PackageSearch className="w-6 h-6" />,
      title: 'Ver inventario',
      description: 'Busca y verifica productos específicos.',
      onClick: () => navigate('/data'),
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
    <div className={`h-full w-full ${isDark ? "bg-neutral-950" : "bg-neutral-50"} overflow-y-auto no-scrollbar pb-32 font-sans relative`}>
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-neutral-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div 
              initial={{ scale: 0.5, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-neutral-800 rounded-full p-8 mb-8"
            >
              <CheckCircle2 className="w-24 h-24 text-neutral-300" />
            </motion.div>
            <h2 className={`text-4xl font-bold tracking-tight max-w-2xl ${isDark ? "text-neutral-100" : "text-neutral-900"}`}>
              {successMessage}
            </h2>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header con saludo */}
      <DashboardHeader 
        userName={operatorId || 'Usuario'}
        isOnline={isOnline}
        isDark={isDark}
      />

      {/* Contenido principal */}
      <main className="px-4 pb-4 space-y-6">
        {/* Métricas */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              label="Total de ítems"
              value={totalItems || 0}
              icon={<Database className="w-4 h-4" />}
              change={2.4}
              isDark={isDark}
            />
            <MetricCard
              label="Sync pendiente"
              value={pendingSyncCount || 0}
              icon={<Cloud className="w-4 h-4" />}
              variant={(pendingSyncCount || 0) > 0 ? 'warning' : 'default'}
              isDark={isDark}
            />
            <MetricCard
              label="Por vencer"
              value={expiringItems || 0}
              icon={<Clock className="w-4 h-4" />}
              variant={(expiringItems || 0) > 0 ? 'error' : 'default'}
              isDark={isDark}
            />
            <MetricCard
              label="Alertas recientes"
              value={0}
              icon={<AlertCircle className="w-4 h-4" />}
              variant="default"
              isDark={isDark}
            />
          </div>
        </section>

        {/* Acciones rápidas */}
        <section>
          <h2 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            Acciones rápidas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <QuickAction
                  icon={action.icon}
                  title={action.title}
                  description={action.description}
                  onClick={action.onClick}
                  isDark={isDark}
                />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Actividad reciente */}
        <section>
          <RecentActivity
            title="Actividad reciente"
            items={mappedActivity}
            isDark={isDark}
            maxItems={5}
          />
        </section>
      </main>
    </div>
  );
};

export default memo(Dashboard);
