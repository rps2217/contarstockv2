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
  FileCheck2
} from "lucide-react";
import { useDashboard } from "./hooks/useDashboard";
import { useAppStore } from "@/store/mainAppStore";
import { SoundFX } from "../../services/audio";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { operatorId } = useDashboard();
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

  return (
    <div className="h-full w-full bg-slate-950 overflow-y-auto no-scrollbar pb-32 font-sans selection:bg-blue-500/30 relative">
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
      <header className="px-4 md:px-6 pt-10 md:pt-16 pb-8 md:pb-12 bg-slate-900 border-b border-white/5 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] -mr-64 -mt-64" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8">
            <div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-wrap items-center gap-2 mb-3">
                <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-400">Operador:</span>
                  <span className="text-[10px] font-bold text-blue-400">{operatorId}</span>
                </div>
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none italic uppercase">
                LOGI<span className="text-gradient-blue">COUNT</span><span className="text-white/10 ml-2 md:ml-3">PRO</span>
              </h1>
            </div>
            
            <div className="flex items-center justify-end">
              <button
                onClick={() => navigate("/settings")}
                className="w-12 h-12 md:w-14 md:h-14 surface-glass rounded-xl md:rounded-2xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-95 group"
              >
                <Settings className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-90 transition-transform duration-500" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 md:space-y-8 mt-4">
        {/* MODULES SECTION */}
        <section>
          <div className="flex items-center gap-3 mb-6 px-2">
            <LayoutDashboard className="w-4 h-4 md:w-5 md:h-5 text-slate-500" />
            <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-slate-500">Módulos Operativos</h2>
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
            />

            <BentoModule 
              icon={<History />} 
              label="Recepción" 
              description="Recepción y validación de mercadería logística" 
              color="emerald" 
              onClick={() => navigate("/reception")} 
            />

            <BentoModule 
              icon={<Zap />} 
              label="Hammer (Ráfaga)" 
              description="Escaneo masivo ultra rápido asistido" 
              color="rose" 
              onClick={() => navigate("/massive/BURST-MODE")} 
            />

            <BentoModule 
              icon={<Database />} 
              label="Inventario" 
              description="Ver y gestionar catálogo maestro de SKU" 
              color="amber" 
              onClick={() => navigate("/database")} 
            />

            <BentoModule 
              icon={<Calendar />} 
              label="Vencimientos" 
              description="Control de lotes y fechas de vencimiento de bultos" 
              color="orange" 
              onClick={() => navigate("/expiry")} 
            />

            <BentoModule 
              icon={<Users />} 
              label="Asignaciones" 
              description="Asignación y tracking de cargas a clientes" 
              color="blue" 
              onClick={() => navigate("/customers")} 
            />

            <BentoModule 
              icon={<AlertCircle />} 
              label="Siniestros" 
              description="Mermas, roturas y bitácora de incidencias" 
              color="purple" 
              onClick={() => navigate("/events")} 
            />

            <BentoModule 
              icon={<Package />} 
              label="Proveedores" 
              description="Directorio de proveedores y auditorías" 
              color="cyan" 
              onClick={() => navigate("/providers")} 
            />

            <BentoModule 
              icon={<RefreshCw />} 
              label="Sincronización" 
              description="Monitor en la nube, latencia y control de transmisión activa" 
              color="teal" 
              onClick={() => navigate("/sync")} 
              className="col-span-2"
            />

            <BentoModule 
              icon={<FileText />} 
              label="Reportes" 
              description="Informes, resúmenes y descargas CSV/PDF" 
              color="violet" 
              onClick={() => navigate("/reports")} 
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
}

const BentoModule: React.FC<BentoModuleProps> = ({ icon, label, description, color, onClick, className = "" }) => {
  const colors = {
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
  };

  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.01 }} 
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-6 md:p-8 rounded-[2rem] border border-white/5 transition-all flex flex-col items-start text-left justify-between h-48 group shadow-lg ${colors[color]} ${className}`}
    >
      <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-white/10 transition-colors">
        {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6 md:w-7 md:h-7' })}
      </div>
      <div className="mt-4">
        <span className="text-sm font-black uppercase tracking-[0.15em] block">{label}</span>
        {description && (
          <span className="text-[11px] md:text-xs text-slate-500 font-medium group-hover:text-slate-400 transition-colors mt-1.5 block leading-tight">
            {description}
          </span>
        )}
      </div>
    </motion.button>
  );
};

export default memo(Dashboard);
