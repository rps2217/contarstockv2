import React, { useState, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Radio,
  Database,
  Settings,
  UserCircle,
  ShieldAlert,
  RefreshCw,
  FileText,
  Box,
  Package,
  CheckCircle2,
  Cloud,
  AlertCircle,
  Zap,
  ChevronDown,
  ChevronUp,
  Upload,
  Trash2,
  History,
  Camera,
  ArrowRight,
  TrendingUp,
  LayoutDashboard,
  Users,
  Calendar,
  Activity
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import { NetworkStatus } from "../../shared/components/ui/NetworkStatus";
import { OrderRow } from "./components/OrderRow";
import { useDashboard } from "./hooks/useDashboard";
import { Button, Card } from "../../shared/components/ui";
import { db } from "../../db";
import { getSettings } from "../../services/settings";
import { SoundFX } from "../../services/audio";
import { useAppStore } from "@/store/mainAppStore";
import { ExpectedOrderRepository } from "../../repositories/ExpectedOrderRepository";
import * as sessionService from "../../services/sessionService";
import { sanitizeBarcode } from "../../services/utils";
import { useHIDScanner } from "../../hooks/useHIDScanner";
import Papa from 'papaparse';
import { toast } from 'sonner';
import { ExpectedOrder, ExpectedItem } from "../../types";
import { CameraScanner } from "../../components/CameraScanner";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { operatorId, isSyncNeeded, pendingOrders, dynamicStats, syncStatus, triggerSync, stats } =
    useDashboard();
  const location = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isOrdersCollapsed, setIsOrdersCollapsed] = useState(true);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const { settings } = useAppStore();

  // Actividad simulada para el sparkline (telemetría visual)
  const sparklineData = [
    { v: 10 }, { v: 25 }, { v: 15 }, { v: 45 }, { v: 30 }, { v: 55 }, { v: 40 }, { v: 45 }, { v: 60 }
  ];

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

  useHIDScanner({
    onScan: (code) => {
      if (!isProcessingScan) {
        handleUniversalScan(code);
      }
    },
    isEnabled: true,
  });

  const handleUniversalScan = async (code: string) => {
    const cleanCode = sanitizeBarcode(code);
    if (!cleanCode) return;

    setIsProcessingScan(true);
    const loadingToast = toast.loading("Procesando escaneo...");
    SoundFX.play("success");

    try {
      const order = await ExpectedOrderRepository.getById(
        cleanCode.toUpperCase(),
      );

      if (order) {
        const session = await sessionService.createSession(
          order.id,
          order.id,
          "standard",
          order,
          undefined,
          true,
        );
        toast.dismiss(loadingToast);
        navigate(`/counting/${session.id}`);
      } else {
        const isLogisticsBarcode =
          /[a-zA-Z]/.test(cleanCode) || cleanCode.length > 14;

        if (isLogisticsBarcode) {
          toast.dismiss(loadingToast);
          navigate("/reception", { state: { initialScan: cleanCode } });
          return;
        }

        const blindLabel = `CIEGO_${new Date().getTime().toString().slice(-6)}`;
        const session = await sessionService.createSession(
          "CONTEO_CIEGO",
          blindLabel,
          "standard",
          undefined,
          undefined,
          true,
        );

        toast.dismiss(loadingToast);
        navigate(`/counting/${session.id}`, { state: { initialScan: cleanCode } });
      }
    } catch (error) {
      console.error("Scan error:", error);
      toast.dismiss(loadingToast);
      toast.error("Error al procesar el escaneo");
      SoundFX.play("error");
    } finally {
      setIsProcessingScan(false);
      setScanInput("");
    }
  };

  const [showAllOrders, setShowAllOrders] = useState(false);
  const visibleOrders = showAllOrders ? pendingOrders : pendingOrders?.slice(0, 5);

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
      <header className="px-6 pt-16 pb-12 bg-slate-900 border-b border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] -mr-64 -mt-64" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 mb-4">
                <div className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Enterprise Edition v3.1</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Cloud Live</span>
                </div>
              </motion.div>
              <h1 className="text-5xl font-black tracking-tighter leading-none italic uppercase">
                LOGI<span className="text-gradient-blue">COUNT</span><span className="text-white/10 ml-3">PRO</span>
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden lg:block w-48 h-12">
                <div style={{ width: '100%', height: '100%', minWidth: 150, minHeight: 40 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData}>
                      <Line type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={3} dot={false} isAnimationActive={true} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[9px] font-bold text-center uppercase tracking-widest text-slate-600 mt-1">Actividad Real-Time</p>
              </div>
              <button
                onClick={() => navigate("/settings")}
                className="w-14 h-14 surface-glass rounded-2xl flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-95 group"
              >
                <Settings className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* SEARCH AREA */}
            <div className="lg:col-span-8">
              <div className="relative group p-[2px] rounded-[2.8rem] bg-gradient-to-r from-blue-500/20 to-transparent">
                <div className="relative bg-slate-950 border border-white/5 rounded-[2.7rem] p-3 shadow-2xl flex items-center gap-3">
                  <button
                    onClick={() => setIsCameraOpen(true)}
                    className="w-14 h-14 flex items-center justify-center text-blue-500 hover:bg-blue-500/10 rounded-full transition-all"
                  >
                    <Camera className="w-7 h-7" />
                  </button>
                  <input
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUniversalScan(scanInput)}
                    placeholder="INGRESAR SKU O ID MANIFIESTO..."
                    className="flex-1 h-14 bg-transparent border-none px-2 text-xl font-medium tracking-tight outline-none placeholder:text-slate-700 text-white"
                  />
                  <div className="flex items-center gap-2">
                    {isProcessingScan ? (
                      <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mr-4" />
                    ) : (
                      <button
                        onClick={() => handleUniversalScan(scanInput)}
                        disabled={!scanInput}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                          scanInput ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/40 scale-100' : 'bg-white/5 text-slate-700 scale-95 opacity-50'
                        }`}
                      >
                        <ArrowRight className="w-6 h-6" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* QUICK STATS BENTO */}
            <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-4">
              <div className="surface-glass rounded-3xl p-5 flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 z-10">Cola de Nube</p>
                <div className="flex items-end gap-3 z-10">
                  <span className={`text-4xl font-black italic tracking-tighter ${isSyncNeeded ? 'text-amber-500' : 'text-white'}`}>
                    {(stats?.pendingSync || 0) + (dynamicStats?.pending || 0)}
                  </span>
                  <Cloud className={`w-6 h-6 mb-2 ${isSyncNeeded ? 'text-amber-500 animate-pulse' : 'text-slate-600'}`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto space-y-8">
        {/* MODULES SECTION */}
        <section>
          <div className="flex items-center gap-3 mb-6 px-2">
            <LayoutDashboard className="w-4 h-4 text-slate-500" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Módulos Operativos</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <BentoModule icon={<History />} label="Recepción" color="emerald" onClick={() => navigate("/reception")} />
            <BentoModule icon={<Zap />} label="Hammer" color="rose" onClick={() => navigate("/massive/BURST-MODE")} />
            <BentoModule icon={<Database />} label="Inventario" color="amber" onClick={() => navigate("/database")} />
            <BentoModule icon={<Users />} label="Asignación" color="blue" onClick={() => navigate("/customers")} />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* PENDING ORDERS TABLE */}
          <div className="lg:col-span-8 surface-card rounded-[2.5rem] p-8">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                  <Package className="w-7 h-7 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Órdenes Activas</h2>
                  <p className="text-xs text-slate-500 tracking-wide font-medium">{pendingOrders?.length || 0} manifiestos registrados</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsOrdersCollapsed(!isOrdersCollapsed)}
                  className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-slate-400 transition-all active:scale-95"
                >
                  {isOrdersCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {!isOrdersCollapsed && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="space-y-3 pb-4">
                    {pendingOrders && pendingOrders.length > 0 ? (
                      <>
                        {visibleOrders.map((order) => (
                          <OrderRow key={order.id} order={order} onClick={() => handleUniversalScan(order.id)} />
                        ))}
                        {pendingOrders.length > 5 && (
                          <button
                            onClick={() => setShowAllOrders(!showAllOrders)}
                            className="w-full mt-4 py-4 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:bg-blue-500/5 rounded-2xl transition-colors border border-dashed border-blue-500/20"
                          >
                            {showAllOrders ? "Mostrar menos" : `Ver ${pendingOrders.length - 5} órdenes adicionales`}
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="py-20 text-center border border-dashed border-white/5 rounded-[2rem] bg-slate-900/30">
                        <Package className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-[0.2em]">Bandeja de Entrada Vacía</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* TELEMETRY / STATUS */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-gradient-to-br from-slate-900 to-black border border-blue-500/20 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/5 rounded-full blur-[40px] group-hover:bg-blue-500/10 transition-all duration-700" />
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <Cloud className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.1em] text-white">Sincronización</h3>
                  <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Estado del Motor</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center p-4 bg-white/3 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">Nodos Pendientes</span>
                  <span className="text-2xl font-black italic text-white">{dynamicStats?.pending || 0}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/3 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">Latencia Promedio</span>
                  <span className="text-2xl font-black italic text-emerald-500">12ms</span>
                </div>
              </div>

              <button
                onClick={() => navigate("/sync")}
                className="w-full py-5 bg-white text-black font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:bg-slate-100 transition-all active:scale-95"
              >
                Abrir Terminal Cloud
              </button>
            </div>
            
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 text-center">
               <TrendingUp className="w-5 h-5 text-emerald-500 mx-auto mb-3" />
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Productividad Diaria</p>
               <h4 className="text-3xl font-black italic text-white mt-1">+24%</h4>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isCameraOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200]">
            <CameraScanner 
              onScan={(code) => { handleUniversalScan(code); setIsCameraOpen(false); }}
              onClose={() => setIsCameraOpen(false)}
              isTriggered={true}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface BentoModuleProps {
  icon: React.ReactNode;
  label: string;
  color: 'emerald' | 'rose' | 'amber' | 'blue';
  onClick: () => void;
}

const BentoModule: React.FC<BentoModuleProps> = ({ icon, label, color, onClick }) => {
  const colors = {
    emerald: 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10 hover:bg-emerald-500/10 hover:border-emerald-500/30',
    rose: 'bg-rose-500/5 text-rose-600 border-rose-500/10 hover:bg-rose-500/10 hover:border-rose-500/30',
    amber: 'bg-amber-500/5 text-amber-500 border-amber-500/10 hover:bg-amber-500/10 hover:border-amber-500/30',
    blue: 'bg-blue-500/5 text-blue-500 border-blue-500/10 hover:bg-blue-500/10 hover:border-blue-500/30'
  };

  return (
    <motion.button
      whileHover={{ y: -4 }} whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center justify-center gap-4 group ${colors[color]}`}
    >
      <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-white/10 transition-colors">
        {React.cloneElement(icon as React.ReactElement, { className: 'w-7 h-7' })}
      </div>
      <span className="text-[11px] font-black uppercase tracking-[0.2em]">{label}</span>
    </motion.button>
  );
};

export default memo(Dashboard);
