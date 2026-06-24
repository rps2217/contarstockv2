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
  FileSpreadsheet,
  TrendingUp,
  UploadCloud,
  ClipboardList,
  ArrowUpRight,
} from "lucide-react";
import { useDashboard } from "./hooks/useDashboard";
import { useAppStore } from '@/stores';
import { SoundFX } from "../../services/audio";

type Tone = 'primary' | 'neutral' | 'success' | 'warning' | 'danger';

interface ModuleDef {
  icon: React.ReactNode;
  label: string;
  description: string;
  tone: Tone;
  onClick: () => void;
  featured?: boolean;
  wide?: boolean;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { operatorId, stats, dynamicStats, pendingOrders } = useDashboard();
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { settings, setStartSessionModalOpen } = useAppStore();

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

  const unitsToday = stats?.scansToday ?? 0;
  const pendingSync = (stats?.pendingSync ?? 0) + (dynamicStats?.pending ?? 0);
  const theoreticalOrders = pendingOrders?.length ?? 0;

  const modules: ModuleDef[] = [
    {
      icon: <Plus />,
      label: "Nuevo Conteo",
      description: "Inicia una sesión por orden ERP, código de barras o conteo ciego.",
      tone: "primary",
      featured: true,
      wide: true,
      onClick: () => setStartSessionModalOpen(true),
    },
    {
      icon: <History />,
      label: "Recepción",
      description: "Recepción y validación de mercadería logística.",
      tone: "primary",
      onClick: () => navigate("/capture"),
    },
    {
      icon: <Zap />,
      label: "Hammer (Ráfaga)",
      description: "Escaneo masivo ultrarrápido asistido.",
      tone: "neutral",
      onClick: () => navigate("/massive/BURST-MODE"),
    },
    {
      icon: <Database />,
      label: "Inventario",
      description: "Catálogo maestro de SKU y existencias.",
      tone: "neutral",
      onClick: () => navigate("/data"),
    },
    {
      icon: <FileSpreadsheet />,
      label: "Carga Teórica",
      description: "Carga facturas, remisiones o picking de control.",
      tone: "neutral",
      onClick: () => navigate("/expected-orders"),
    },
    {
      icon: <Calendar />,
      label: "Vencimientos",
      description: "Control de lotes y fechas de vencimiento.",
      tone: "warning",
      onClick: () => navigate("/expiry"),
    },
    {
      icon: <Users />,
      label: "Asignaciones",
      description: "Asignación y tracking de cargas a clientes.",
      tone: "neutral",
      onClick: () => navigate("/customers"),
    },
    {
      icon: <AlertCircle />,
      label: "Siniestros",
      description: "Mermas, roturas y bitácora de incidencias.",
      tone: "danger",
      onClick: () => navigate("/events"),
    },
    {
      icon: <Package />,
      label: "Proveedores",
      description: "Directorio de proveedores y auditorías.",
      tone: "neutral",
      onClick: () => navigate("/providers"),
    },
    {
      icon: <RefreshCw />,
      label: "Sincronización",
      description: "Monitor en la nube, latencia y transmisión activa.",
      tone: "success",
      wide: true,
      onClick: () => navigate("/sync"),
    },
    {
      icon: <FileText />,
      label: "Reportes",
      description: "Informes, resúmenes y descargas CSV/PDF.",
      tone: "neutral",
      onClick: () => navigate("/reports"),
    },
  ];

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
              className="bg-white rounded-full p-6 mb-6 shadow-2xl"
            >
              <CheckCircle2 className="w-16 h-16 text-emerald-600" />
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase italic leading-tight max-w-2xl text-balance">
              {successMessage}
            </h2>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER / COMMAND CENTER */}
      <header className={`px-4 md:px-6 pt-10 md:pt-14 pb-6 ${isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200/80"} border-b relative overflow-hidden shrink-0`}>
        <div className={`absolute top-0 right-0 w-[500px] h-[500px] ${isDark ? "bg-blue-600/5" : "bg-blue-500/5"} rounded-full blur-[120px] -mr-64 -mt-64`} />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-wrap items-center gap-2 mb-4">
                <div className={`px-3 py-1.5 ${isDark ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"} border rounded-full flex items-center gap-2`}>
                  <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Operador</span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{operatorId}</span>
                </div>
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none italic uppercase">
                <span className={isDark ? "text-white" : "text-slate-900"}>LOGI</span><span className="text-gradient-blue">COUNT</span><span className={`${isDark ? "text-white/10" : "text-slate-300"} ml-2 md:ml-3`}>PRO</span>
              </h1>
              <p className={`mt-3 text-sm leading-relaxed max-w-md ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Centro de operaciones de conteo e inventario. Elige un módulo o inicia un nuevo conteo.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStartSessionModalOpen(true)}
                className="hidden md:inline-flex items-center gap-2 h-12 px-5 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-500 active:scale-95 transition-all"
              >
                <Plus className="w-5 h-5" />
                Nuevo conteo
              </button>
              <button
                onClick={() => navigate("/settings")}
                aria-label="Abrir ajustes"
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 group border ${isDark ? "surface-glass text-slate-400 border-white/5 hover:text-white hover:bg-slate-800" : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-200"}`}
              >
                <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
              </button>
            </div>
          </div>

          {/* LIVE STATS */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mt-8">
            <StatCard
              icon={<TrendingUp />}
              label="Unidades hoy"
              value={unitsToday.toLocaleString('es')}
              tone="primary"
              isDark={isDark}
            />
            <StatCard
              icon={<UploadCloud />}
              label="Pendientes de sync"
              value={pendingSync.toLocaleString('es')}
              tone={pendingSync > 0 ? "warning" : "success"}
              hint={pendingSync > 0 ? "Toca para sincronizar" : "Todo al día"}
              onClick={() => navigate("/sync")}
              isDark={isDark}
            />
            <StatCard
              icon={<ClipboardList />}
              label="Órdenes teóricas"
              value={theoreticalOrders.toLocaleString('es')}
              tone="neutral"
              onClick={() => navigate("/expected-orders")}
              isDark={isDark}
              className="col-span-2 lg:col-span-1"
            />
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 mt-2">
        {/* MODULES SECTION */}
        <section>
          <div className="flex items-center gap-2.5 mb-5 px-1">
            <LayoutDashboard className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
            <h2 className={`text-xs font-bold uppercase tracking-[0.15em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Módulos operativos</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {modules.map((m) => (
              <BentoModule key={m.label} {...m} isDark={isDark} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

/* ----------------------------- Stat Card ----------------------------- */

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: Tone;
  hint?: string;
  onClick?: () => void;
  isDark?: boolean;
  className?: string;
}

const toneAccent: Record<Tone, string> = {
  primary: 'text-blue-500',
  neutral: 'text-slate-400',
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  danger: 'text-rose-500',
};

const toneChip = (tone: Tone, isDark: boolean): string => {
  if (tone === 'neutral') return isDark ? 'bg-white/5' : 'bg-slate-100';
  const map: Record<Exclude<Tone, 'neutral'>, string> = {
    primary: 'bg-blue-500/10',
    success: 'bg-emerald-500/10',
    warning: 'bg-amber-500/10',
    danger: 'bg-rose-500/10',
  };
  return map[tone as Exclude<Tone, 'neutral'>];
};

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, tone, hint, onClick, isDark = true, className = "" }) => {
  const Comp: any = onClick ? motion.button : motion.div;
  return (
    <Comp
      {...(onClick ? { whileHover: { y: -2 }, whileTap: { scale: 0.98 }, onClick } : {})}
      className={`text-left rounded-2xl border p-4 flex items-center gap-4 transition-all ${
        isDark ? "bg-slate-900 border-white/5 hover:border-white/10" : "bg-white border-slate-200 shadow-sm hover:shadow-md"
      } ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      <div className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${toneChip(tone, isDark)}`}>
        {React.cloneElement(icon as React.ReactElement, { className: `w-5 h-5 ${toneAccent[tone]}` })}
      </div>
      <div className="min-w-0">
        <div className={`text-2xl font-black tabular-nums leading-none ${isDark ? "text-white" : "text-slate-900"}`}>{value}</div>
        <div className={`text-xs font-medium mt-1 truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>{label}</div>
        {hint && <div className={`text-[11px] mt-0.5 truncate ${toneAccent[tone]}`}>{hint}</div>}
      </div>
    </Comp>
  );
};

/* ----------------------------- Bento Module ----------------------------- */

const BentoModule: React.FC<ModuleDef & { isDark?: boolean }> = ({ icon, label, description, tone, onClick, featured, wide, isDark = true }) => {
  // Tarjeta destacada: superficie azul sólida
  if (featured) {
    return (
      <motion.button
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={`group relative overflow-hidden p-5 md:p-6 rounded-2xl text-left flex flex-col justify-between h-44 bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all ${wide ? "col-span-2" : ""}`}
      >
        <ArrowUpRight className="absolute top-4 right-4 w-5 h-5 text-white/50 group-hover:text-white transition-colors" />
        <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
          {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6 text-white' })}
        </div>
        <div>
          <span className="text-base font-black uppercase tracking-tight block">{label}</span>
          <span className="text-sm text-white/80 mt-1 block leading-snug">{description}</span>
        </div>
      </motion.button>
    );
  }

  return (
    <motion.button
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group relative p-5 md:p-6 rounded-2xl border text-left flex flex-col justify-between h-44 transition-all ${
        isDark
          ? "bg-slate-900 border-white/5 hover:bg-slate-800 hover:border-white/10"
          : "bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
      } ${wide ? "col-span-2" : ""}`}
    >
      <ArrowUpRight className={`absolute top-4 right-4 w-4 h-4 transition-colors ${isDark ? "text-slate-600 group-hover:text-slate-400" : "text-slate-300 group-hover:text-slate-500"}`} />
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${toneChip(tone, isDark)}`}>
        {React.cloneElement(icon as React.ReactElement, { className: `w-6 h-6 ${toneAccent[tone]}` })}
      </div>
      <div>
        <span className={`text-sm font-bold uppercase tracking-tight block ${isDark ? "text-white" : "text-slate-800"}`}>{label}</span>
        <span className={`text-xs mt-1 block leading-snug ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          {description}
        </span>
      </div>
    </motion.button>
  );
};

export default memo(Dashboard);
