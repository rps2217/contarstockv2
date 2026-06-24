import React, { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Database,
  Settings,
  RefreshCw,
  FileText,
  Package,
  CheckCircle2,
  AlertCircle,
  Zap,
  History,
  Users,
  Calendar,
  LayoutDashboard,
  Plus,
  Radio,
  FileCheck2,
  FileSpreadsheet,
  ScanLine,
  Cloud,
  Package2,
  Search,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { useDashboard } from "./hooks/useDashboard";
import { useAppStore } from '@/stores';
import { useLiveQuery } from 'dexie-react-hooks';
import { ScanRepository } from '@/repositories/ScanRepository';
import { db } from '@/db';
import { SoundFX } from "../../services/audio";

// ============================================
// STAT CARD COMPONENT
// ============================================
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  onClick?: () => void;
  isDark: boolean;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = memo(({ icon, label, value, trend, trendValue, tone, onClick, isDark, delay = 0 }) => {
  const toneStyles = {
    primary: {
      bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50',
      icon: isDark ? 'text-blue-400' : 'text-blue-600',
      badge: 'bg-blue-500/20 text-blue-400'
    },
    success: {
      bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
      icon: isDark ? 'text-emerald-400' : 'text-emerald-600',
      badge: 'bg-emerald-500/20 text-emerald-400'
    },
    warning: {
      bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
      icon: isDark ? 'text-amber-400' : 'text-amber-600',
      badge: 'bg-amber-500/20 text-amber-400'
    },
    danger: {
      bg: isDark ? 'bg-rose-500/10' : 'bg-rose-50',
      icon: isDark ? 'text-rose-400' : 'text-rose-600',
      badge: 'bg-rose-500/20 text-rose-400'
    },
    neutral: {
      bg: isDark ? 'bg-white/5' : 'bg-slate-100',
      icon: isDark ? 'text-slate-400' : 'text-slate-600',
      badge: 'bg-white/10 text-slate-400'
    }
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.3 }}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer
        ${isDark 
          ? 'bg-slate-900/50 border-white/5 hover:border-white/10 hover:bg-slate-900/70' 
          : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-lg'
        }
        ${onClick ? 'active:scale-[0.98]' : ''}
      `}
    >
      {/* Gradient accent */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${toneStyles[tone].bg}`} />
      
      <div className="p-4 md:p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2.5 rounded-xl ${toneStyles[tone].bg}`}>
            {React.cloneElement(icon as React.ReactElement, { 
              className: `w-5 h-5 ${toneStyles[tone].icon}` 
            })}
          </div>
          
          {trend && TrendIcon && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-slate-400'}`}>
              <TrendIcon className="w-3.5 h-3.5" />
              {trendValue && <span>{trendValue}</span>}
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <p className={`text-2xl md:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {typeof value === 'number' ? value.toLocaleString('es') : value}
          </p>
          <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            {label}
          </p>
        </div>
      </div>

      {/* Hover glow effect */}
      <div className={`absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none ${toneStyles[tone].bg} blur-xl`} />
    </motion.div>
  );
});

// ============================================
// QUICK ACTION BUTTON
// ============================================
interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  isDark: boolean;
  delay?: number;
}

const QuickAction: React.FC<QuickActionProps> = memo(({ icon, label, onClick, variant = 'secondary', isDark, delay = 0 }) => {
  const isPrimary = variant === 'primary';
  
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay * 0.05, duration: 0.2 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200
        ${isPrimary
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 active:bg-blue-700'
          : isDark
            ? 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
            : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
        }
      `}
    >
      {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
      <span>{label}</span>
    </motion.button>
  );
});

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { operatorId } = useDashboard();
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const { settings, setStartSessionModalOpen } = useAppStore();

  // Stats en tiempo real
  const scansToday = useLiveQuery(
    () => ScanRepository.getTodayScansCount(),
    [],
    0
  );
  
  const pendingSync = useLiveQuery(async () => {
    const scans = await ScanRepository.getPendingSyncCount();
    const sessions = await db.sessions.where('syncStatus').equals('pending').count();
    const dynamic = await db.dynamic_data.where('syncStatus').anyOf(['pending', 'error']).count();
    return scans + sessions + dynamic;
  }, [], 0);
  
  const activeSessions = useLiveQuery(
    () => db.sessions.where('status').equals('active').count(),
    [],
    0
  );

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

  return (
    <div className={`h-full w-full ${isDark ? "bg-slate-950 selection:bg-blue-500/30" : "bg-slate-50 selection:bg-blue-500/20"} overflow-y-auto no-scrollbar pb-32 font-sans relative`}>
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-emerald-600/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div 
              initial={{ scale: 0.5, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-full p-8 mb-8 shadow-2xl"
            >
              <CheckCircle2 className="w-24 h-24 text-emerald-600" />
            </motion.div>
            <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-tight max-w-2xl">
              {successMessage}
            </h2>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER / COMMAND CENTER */}
      <header className={`px-4 md:px-6 pt-10 md:pt-14 pb-6 ${isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200/80"} border-b relative overflow-hidden shrink-0`}>
        {/* Background gradient */}
        <div className={`absolute top-0 right-0 w-[600px] h-[600px] ${isDark ? "bg-blue-600/5" : "bg-blue-500/3"} rounded-full blur-[140px] -mr-64 -mt-64 pointer-events-none`} />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            {/* Left: Branding */}
            <div>
              <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="flex flex-wrap items-center gap-3 mb-4"
              >
                <div className={`px-3.5 py-1.5 ${isDark ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"} border rounded-full flex items-center gap-2.5`}>
                  <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Operador</span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{operatorId}</span>
                </div>
                {activeSessions > 0 && (
                  <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-medium text-emerald-400">{activeSessions} sesión{activeSessions > 1 ? 'es' : ''} activa{activeSessions > 1 ? 's' : ''}</span>
                  </div>
                )}
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-5xl font-black tracking-tighter leading-none italic uppercase"
              >
                <span className={isDark ? "text-white" : "text-slate-900"}>LOGI</span>
                <span className="text-gradient-blue">COUNT</span>
                <span className={`${isDark ? "text-white/10" : "text-slate-300"} ml-2 md:ml-3`}>PRO</span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`mt-3 text-sm ${isDark ? "text-slate-500" : "text-slate-500"} max-w-md`}
              >
                Centro de operaciones de inventario y conteo
              </motion.p>
            </div>

            {/* Right: Quick Actions + Settings */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3"
            >
              <QuickAction
                icon={<Plus />}
                label="Nuevo Conteo"
                variant="primary"
                onClick={() => setStartSessionModalOpen(true)}
                isDark={isDark}
                delay={0}
              />
              <QuickAction
                icon={<RefreshCw className={pendingSync > 0 ? 'animate-spin' : ''} />}
                label={pendingSync > 0 ? `Sync (${pendingSync})` : 'Sync'}
                variant="secondary"
                onClick={() => navigate("/sync")}
                isDark={isDark}
                delay={1}
              />
              <button
                onClick={() => navigate("/settings")}
                className={`
                  w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 group
                  ${isDark 
                    ? "bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10" 
                    : "bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                  }
                `}
              >
                <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
              </button>
            </motion.div>
          </div>

          {/* Stats Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6">
            <StatCard
              icon={<ScanLine />}
              label="Scans hoy"
              value={scansToday}
              tone="primary"
              trend={scansToday > 0 ? 'up' : 'neutral'}
              trendValue={scansToday > 0 ? '+12%' : undefined}
              isDark={isDark}
              delay={0}
            />
            <StatCard
              icon={<Cloud />}
              label="Pendientes"
              value={pendingSync}
              tone={pendingSync > 10 ? 'warning' : pendingSync > 0 ? 'primary' : 'success'}
              onClick={() => navigate("/sync")}
              isDark={isDark}
              delay={1}
            />
            <StatCard
              icon={<Package2 />}
              label="Órdenes activas"
              value={activeSessions}
              tone="neutral"
              onClick={() => navigate("/reports")}
              isDark={isDark}
              delay={2}
            />
            <StatCard
              icon={<Database />}
              label="En línea"
              value={settings?.isOnline ? 'Sí' : 'No'}
              tone={settings?.isOnline ? 'success' : 'danger'}
              isDark={isDark}
              delay={3}
            />
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 md:space-y-8 mt-2">
        {/* MODULES SECTION */}
        <section>
          <div className="flex items-center gap-3 mb-5 px-1">
            <LayoutDashboard className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
            <h2 className={`text-xs font-bold uppercase tracking-[0.15em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Módulos operativos</h2>
          </div>
          
          {/* Bento-style Grid with responsive columns: 2 columns on mobile, 3 on tablet, 4 on desktop */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8 max-w-7xl mx-auto">
            
            <BentoModule 
              icon={<Plus />} 
              label="Nuevo Conteo" 
              description="Ingresar orden ERP, código de barras o conteo ciego" 
              color="indigo" 
              onClick={() => setStartSessionModalOpen(true)}
              className="col-span-2"
              isDark={isDark}
            />

            <BentoModule 
              icon={<History />} 
              label="Recepción" 
              description="Recepción y validación de mercadería logística" 
              color="emerald" 
              onClick={() => navigate("/reception")} 
              isDark={isDark}
            />

            <BentoModule 
              icon={<Zap />} 
              label="Hammer (Ráfaga)" 
              description="Escaneo masivo ultra rápido asistido" 
              color="rose" 
              onClick={() => navigate("/massive/BURST-MODE")} 
              isDark={isDark}
            />

            <BentoModule 
              icon={<Database />} 
              label="Inventario" 
              description="Ver y gestionar catálogo maestro de SKU" 
              color="amber" 
              onClick={() => navigate("/database")} 
              isDark={isDark}
            />

            <BentoModule 
              icon={<FileSpreadsheet />} 
              label="Carga Teórica" 
              description="Cargar facturas, remisiones o picking de control" 
              color="blue" 
              onClick={() => navigate("/expected-orders")} 
              isDark={isDark}
            />

            <BentoModule 
              icon={<Calendar />} 
              label="Vencimientos" 
              description="Control de lotes y fechas de vencimiento de bultos" 
              color="orange" 
              onClick={() => navigate("/expiry")} 
              isDark={isDark}
            />

            <BentoModule 
              icon={<Users />} 
              label="Asignaciones" 
              description="Asignación y tracking de cargas a clientes" 
              color="blue" 
              onClick={() => navigate("/customers")} 
              isDark={isDark}
            />

            <BentoModule 
              icon={<AlertCircle />} 
              label="Siniestros" 
              description="Mermas, roturas y bitácora de incidencias" 
              color="purple" 
              onClick={() => navigate("/events")} 
              isDark={isDark}
            />

            <BentoModule 
              icon={<Package />} 
              label="Proveedores" 
              description="Directorio de proveedores y auditorías" 
              color="cyan" 
              onClick={() => navigate("/providers")} 
              isDark={isDark}
            />

            <BentoModule 
              icon={<RefreshCw />} 
              label="Sincronización" 
              description="Monitor en la nube, latencia y control de transmisión activa" 
              color="teal" 
              onClick={() => navigate("/sync")} 
              className="col-span-2"
              isDark={isDark}
            />

            <BentoModule 
              icon={<FileText />} 
              label="Reportes" 
              description="Informes, resúmenes y descargas CSV/PDF" 
              color="violet" 
              onClick={() => navigate("/reports")} 
              isDark={isDark}
            />

          </div>
        </section>
      </main>
    </div>
  );
};

interface BentoModuleProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  color: 'emerald' | 'rose' | 'amber' | 'blue' | 'orange' | 'indigo' | 'purple' | 'violet' | 'cyan' | 'teal';
  onClick: () => void;
  className?: string;
  isDark?: boolean;
}

const BentoModule: React.FC<BentoModuleProps> = ({ icon, label, description, color, onClick, className = "", isDark = true }) => {
  const colors = isDark ? {
    emerald: 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10 hover:bg-emerald-500/10 hover:border-emerald-500/20',
    rose: 'bg-rose-500/5 text-rose-400 border-rose-500/10 hover:bg-rose-500/10 hover:border-rose-500/20',
    amber: 'bg-amber-500/5 text-amber-400 border-amber-500/10 hover:bg-amber-500/10 hover:border-amber-500/20',
    blue: 'bg-blue-500/5 text-blue-400 border-blue-500/10 hover:bg-blue-500/10 hover:border-blue-500/20',
    orange: 'bg-orange-500/5 text-orange-400 border-orange-500/10 hover:bg-orange-500/10 hover:border-orange-500/20',
    indigo: 'bg-indigo-500/5 text-indigo-400 border-indigo-500/10 hover:bg-indigo-500/10 hover:border-indigo-500/20',
    purple: 'bg-purple-500/5 text-purple-400 border-purple-500/10 hover:bg-purple-500/10 hover:border-purple-500/20',
    violet: 'bg-violet-500/5 text-violet-400 border-violet-500/10 hover:bg-violet-500/10 hover:border-violet-500/20',
    cyan: 'bg-cyan-500/5 text-cyan-400 border-cyan-500/10 hover:bg-cyan-500/10 hover:border-cyan-500/20',
    teal: 'bg-teal-500/5 text-teal-400 border-teal-500/10 hover:bg-teal-500/10 hover:border-teal-500/20'
  } : {
    emerald: 'bg-white text-emerald-600 border-slate-200/90 hover:bg-emerald-50/20 hover:border-emerald-300 shadow-sm hover:shadow-md',
    rose: 'bg-white text-rose-600 border-slate-200/90 hover:bg-rose-50/20 hover:border-rose-300 shadow-sm hover:shadow-md',
    amber: 'bg-white text-amber-600 border-slate-200/90 hover:bg-amber-50/20 hover:border-amber-300 shadow-sm hover:shadow-md',
    blue: 'bg-white text-blue-600 border-slate-200/90 hover:bg-blue-50/20 hover:border-blue-300 shadow-sm hover:shadow-md',
    orange: 'bg-white text-orange-600 border-slate-200/90 hover:bg-orange-50/20 hover:border-orange-300 shadow-sm hover:shadow-md',
    indigo: 'bg-white text-indigo-600 border-slate-200/90 hover:bg-indigo-50/20 hover:border-indigo-300 shadow-sm hover:shadow-md',
    purple: 'bg-white text-purple-600 border-slate-200/90 hover:bg-purple-50/20 hover:border-purple-300 shadow-sm hover:shadow-md',
    violet: 'bg-white text-violet-600 border-slate-200/90 hover:bg-violet-50/20 hover:border-violet-300 shadow-sm hover:shadow-md',
    cyan: 'bg-white text-cyan-600 border-slate-200/90 hover:bg-cyan-50/20 hover:border-cyan-300 shadow-sm hover:shadow-md',
    teal: 'bg-white text-teal-600 border-slate-200/90 hover:bg-teal-50/20 hover:border-teal-300 shadow-sm hover:shadow-md'
  };

  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.01 }} 
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-6 md:p-8 rounded-[2.5rem] border transition-all flex flex-col items-start text-left justify-between h-48 group ${isDark ? "border-white/5" : "border-slate-200/80"} ${colors[color]} ${className}`}
    >
      <div className={`p-3 rounded-2xl transition-colors ${isDark ? 'bg-white/5 group-hover:bg-white/10' : 'bg-slate-100 group-hover:bg-slate-200/70'}`}>
        {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6 md:w-7 md:h-7' })}
      </div>
      <div className="mt-4 w-full">
        <span className={`text-sm font-black uppercase tracking-[0.12em] block ${isDark ? 'text-white' : 'text-slate-800'}`}>{label}</span>
        {description && (
          <span className={`text-[11px] md:text-xs font-medium transition-colors mt-1.5 block leading-tight ${isDark ? 'text-slate-500 group-hover:text-slate-400' : 'text-slate-400 group-hover:text-slate-600'}`}>
            {description}
          </span>
        )}
      </div>
    </motion.button>
  );
};

export default memo(Dashboard);
