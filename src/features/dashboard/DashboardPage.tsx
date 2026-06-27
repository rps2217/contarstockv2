import React, { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Database,
  Settings,
  FileText,
  Package,
  CheckCircle2,
  AlertCircle,
  Zap,
  History,
  Users,
  Calendar,
  Plus,
  FileSpreadsheet,
  RefreshCw,
  ClipboardList,
} from "lucide-react";
import { useAppStore } from '@/stores';
import { SoundFX } from "../../services/audio";

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
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

      {/* HEADER */}
      <header className={`px-4 py-4 ${isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200/80"} border-b shrink-0`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">
            <span className={isDark ? "text-white" : "text-slate-900"}>COUNT</span>
            <span className="text-blue-600 dark:text-blue-400">PRO</span>
          </h1>
          <button
            onClick={() => navigate("/settings")}
            className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-white/10" : "hover:bg-slate-100"}`}
          >
            <Settings className="w-5 h-5 text-slate-500" />
          </button>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Grid de módulos */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            
            <SimpleModule 
              icon={<Plus />} 
              label="Nuevo Conteo" 
              color="bg-blue-600" 
              onClick={() => setStartSessionModalOpen(true)}
              className="col-span-2"
            />

            <SimpleModule 
              icon={<ClipboardList />} 
              label="Conteo" 
              color="bg-blue-500" 
              onClick={() => navigate("/counting")}
            />

            <SimpleModule 
              icon={<History />} 
              label="Recepción" 
              color="bg-emerald-500" 
              onClick={() => navigate("/reception")} 
            />

            <SimpleModule 
              icon={<Zap />} 
              label="Ráfaga" 
              color="bg-rose-500" 
              onClick={() => navigate("/massive/BURST-MODE")} 
            />

            <SimpleModule 
              icon={<Database />} 
              label="Inventario" 
              color="bg-amber-500" 
              onClick={() => navigate("/database")} 
            />

            <SimpleModule 
              icon={<FileSpreadsheet />} 
              label="Carga" 
              color="bg-cyan-500" 
              onClick={() => navigate("/expected-orders")} 
            />

            <SimpleModule 
              icon={<Calendar />} 
              label="Vencim." 
              color="bg-orange-500" 
              onClick={() => navigate("/expiry")} 
            />

            <SimpleModule 
              icon={<Users />} 
              label="Clientes" 
              color="bg-violet-500" 
              onClick={() => navigate("/customers")} 
            />

            <SimpleModule 
              icon={<AlertCircle />} 
              label="Eventos" 
              color="bg-purple-500" 
              onClick={() => navigate("/events")} 
            />

            <SimpleModule 
              icon={<Package />} 
              label="Proveed." 
              color="bg-teal-500" 
              onClick={() => navigate("/providers")} 
            />

            <SimpleModule 
              icon={<RefreshCw />} 
              label="Sync" 
              color="bg-slate-500" 
              onClick={() => navigate("/sync")} 
            />

            <SimpleModule 
              icon={<FileText />} 
              label="Reportes" 
              color="bg-indigo-500" 
              onClick={() => navigate("/reports")} 
            />

          </div>
      </main>
    </div>
  );
};

// ============================================
// SIMPLE MODULE BUTTON
// ============================================
interface SimpleModuleProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
  className?: string;
}

const SimpleModule: React.FC<SimpleModuleProps> = ({ icon, label, color, onClick, className = "" }) => {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        p-4 rounded-xl border border-slate-200/50 dark:border-white/10 
        bg-white dark:bg-slate-900/50 
        hover:shadow-md hover:border-slate-300 dark:hover:border-white/20
        transition-all flex flex-col items-center gap-2
        ${className}
      `}
    >
      <div className={`p-2 rounded-lg ${color} text-white`}>
        {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
      </div>
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span>
    </motion.button>
  );
};

export default memo(Dashboard);
