import React, { useState, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLocation } from "react-router-dom";
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
import { ResponsiveContainer } from 'recharts';
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
  const { operatorId, isSyncNeeded, pendingOrders, navigate, dynamicStats, syncStatus, triggerSync, stats } =
    useDashboard();
  const location = useLocation();
  const [hasConfigError, setHasConfigError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isOrdersCollapsed, setIsOrdersCollapsed] = useState(true);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const { settings } = useAppStore();

  useEffect(() => {
    const msg = (location.state as any)?.message;
    if (msg) {
      setSuccessMessage(msg);
      SoundFX.play("success");
      // Clear the state so it doesn't show again on refresh
      navigate(location.pathname, { replace: true, state: {} });

      // Hide message after 3 seconds
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

  useEffect(() => {
    // Ya no dependemos de GAS, por lo que no hay error de configuración de URL
    setHasConfigError(false);
  }, []);

  const handleHardRefresh = useCallback(async () => {
    setIsRefreshing(true);
    SoundFX.play("delete");

    try {
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      sessionStorage.clear();
      setTimeout(() => {
        window.location.href = window.location.pathname + "?v=" + Date.now();
      }, 500);
    } catch (e) {
      window.location.reload();
    }
  }, []);

  const handleUniversalScan = async (code: string) => {
    const cleanCode = sanitizeBarcode(code);
    if (!cleanCode) return;

    setIsProcessingScan(true);
    const loadingToast = toast.loading("Procesando escaneo...");
    SoundFX.play("success");

    try {
      // 1. Check if it's an Expected Order
      const order = await ExpectedOrderRepository.getById(
        cleanCode.toUpperCase(),
      );

      if (order) {
        // It's an order! Start a guided session
        const session = await sessionService.createSession(
          order.id,
          order.id, // Use order ID as label for now
          "standard",
          order,
          undefined,
          true,
        );
        toast.dismiss(loadingToast);
        navigate(`/count/${session.id}`);
      } else {
        // 2. Check if it's a Logistics Barcode (Reception)
        // Rule: Contains letters OR length > 14 (like SSCC-18 or tracking numbers)
        const isLogisticsBarcode =
          /[a-zA-Z]/.test(cleanCode) || cleanCode.length > 14;

        if (isLogisticsBarcode) {
          toast.dismiss(loadingToast);
          navigate("/reception", { state: { initialScan: cleanCode } });
          return;
        }

        // 3. It's not a known order or logistics. Start a blind count session
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
        // Let the CountingPage handle the initial scan
        navigate(`/count/${session.id}`, { state: { initialScan: cleanCode } });
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

  const handleOrderClick = async (orderId: string) => {
    handleUniversalScan(orderId);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (confirm(`¿Eliminar orden ${orderId}?`)) {
      await ExpectedOrderRepository.delete(orderId);
      SoundFX.play('delete');
      toast.success(`Orden ${orderId} eliminada`);
    }
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // TODO: PENDIENTE - Ajustar formato exacto cuando el usuario defina el documento
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        const ordersMap = new Map<string, ExpectedOrder>();

        data.forEach((row) => {
          const orderId = row.id || row.orderId || row.orden;
          const barcode = row.barcode || row.sku || row.codigo;
          const name = row.name || row.productName || row.nombre || 'Producto';
          const expectedQty = parseInt(row.expectedQty || row.qty || row.cantidad || '0');

          if (!orderId || !barcode) return;

          if (!ordersMap.has(orderId)) {
            ordersMap.set(orderId, {
              id: orderId,
              internalId: orderId,
              items: [],
              totalExpectedUnits: 0,
              totalExpectedSKUs: 0,
              importedAt: Date.now()
            });
          }

          const order = ordersMap.get(orderId)!;
          order.items.push({ barcode, name, expectedQty });
          order.totalExpectedUnits += expectedQty;
          order.totalExpectedSKUs += 1;
        });

        for (const order of ordersMap.values()) {
          await ExpectedOrderRepository.save(order);
        }

        toast.success(`${ordersMap.size} órdenes importadas correctamente`);
        SoundFX.play('success');
        if (event.target) event.target.value = '';
      },
      error: (error) => {
        toast.error("Error al procesar el archivo CSV");
        console.error(error);
      }
    });
  };

  const [showAllOrders, setShowAllOrders] = useState(false);
  const visibleOrders = showAllOrders ? pendingOrders : pendingOrders?.slice(0, 5);

  return (
    <div className="h-full w-full bg-slate-50 dark:bg-brand-dark overflow-y-auto no-scrollbar pb-32 font-sans text-slate-900 dark:text-white relative">
      {/* SUCCESS OVERLAY */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-emerald-500/90 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            <motion.div 
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              className="bg-white rounded-full p-6 mb-6 shadow-2xl shadow-emerald-900/50"
            >
              <CheckCircle2 className="w-24 h-24 text-emerald-500" />
            </motion.div>
            <h2 className="text-4xl font-black text-white tracking-tighter text-center px-6 uppercase italic">
              {successMessage}
            </h2>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER / HERO */}
      <header className="px-6 pt-10 pb-12 bg-white dark:bg-brand-surface border-b border-slate-200 dark:border-white/5 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-warning/5 rounded-full blur-3xl -mr-32 -mt-32" />
        
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-start mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-brand-warning animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Sistema Operativo v3.1</span>
              </div>
              <h1 className="text-4xl font-black tracking-tighter leading-none italic">
                LOGI<span className="text-brand-warning">COUNT</span><span className="text-slate-300 dark:text-white/20 ml-2">PRO</span>
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Operador</span>
                <span className="text-sm font-black text-brand-warning italic">{operatorId}</span>
              </div>
              <button
                onClick={() => navigate("/settings")}
                className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 hover:text-brand-warning transition-all active:scale-90"
              >
                <Settings className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* MAIN SCANNER HERO */}
            <div className="lg:col-span-8">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-brand-warning to-amber-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-white dark:bg-brand-dark border-4 border-brand-warning rounded-[2.5rem] p-2 shadow-2xl">
                  <div className="flex items-center">
                    <button
                      onClick={() => setIsCameraOpen(true)}
                      className="w-16 h-16 flex items-center justify-center text-brand-warning hover:bg-brand-warning/10 rounded-3xl transition-all"
                    >
                      <Camera className="w-8 h-8" />
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUniversalScan(scanInput)}
                      placeholder="ESCANEAR ORDEN O PRODUCTO..."
                      className="flex-1 h-16 bg-transparent border-none px-4 text-xl font-black outline-none placeholder:text-slate-300 dark:placeholder:text-slate-700"
                      disabled={isProcessingScan}
                      autoFocus
                    />
                    <div className="pr-2">
                      {isProcessingScan ? (
                        <div className="w-12 h-12 flex items-center justify-center">
                          <RefreshCw className="w-6 h-6 text-brand-warning animate-spin" />
                        </div>
                      ) : (
                        <button
                          onClick={() => handleUniversalScan(scanInput)}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                            scanInput ? 'bg-brand-warning text-white shadow-lg shadow-brand-warning/40 scale-100' : 'bg-slate-100 dark:bg-white/5 text-slate-400 scale-90 opacity-50'
                          }`}
                        >
                          <ArrowRight className="w-6 h-6" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-6 px-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Motor de Escaneo Activo</span>
                </div>
                <NetworkStatus />
              </div>
            </div>

            {/* QUICK STATS BENTO */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-4">
              <div className="bg-slate-100 dark:bg-white/5 rounded-3xl p-5 border border-slate-200 dark:border-white/5">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Escaneos Hoy</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black italic">{stats?.scansToday || 0}</span>
                  <TrendingUp className="w-4 h-4 text-emerald-500 mb-1" />
                </div>
              </div>
              <div className="bg-slate-100 dark:bg-white/5 rounded-3xl p-5 border border-slate-200 dark:border-white/5">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Pendientes</p>
                <div className="flex items-end gap-2">
                  <span className={`text-3xl font-black italic ${isSyncNeeded ? 'text-amber-500' : ''}`}>
                    {(stats?.pendingSync || 0) + (dynamicStats?.pending || 0)}
                  </span>
                  <Cloud className={`w-4 h-4 mb-1 ${isSyncNeeded ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* MODULES GRID - NOW PROMINENT */}
          <div className="md:col-span-8 grid grid-cols-2 gap-4">
            <BentoModule 
              icon={<History className="w-6 h-6" />}
              label="Recepción"
              color="emerald"
              onClick={() => navigate("/reception/history")}
            />
            <BentoModule 
              icon={<Zap className="w-6 h-6" />}
              label="Hammer"
              color="rose"
              onClick={() => navigate("/massive/BURST-MODE")}
            />
            <BentoModule 
              icon={<Database className="w-6 h-6" />}
              label="Catálogo"
              color="amber"
              onClick={() => navigate("/database")}
            />
            <BentoModule 
              icon={<Users className="w-6 h-6" />}
              label="Clientes"
              color="blue"
              onClick={() => navigate("/customers")}
            />
          </div>

          {/* SYNC HEALTH BENTO - SIDEBAR STYLE */}
          <div className="md:col-span-4 bg-slate-900 border border-indigo-500/30 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-500/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-600 rounded-2xl">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase italic tracking-tighter leading-none">Estado Cloud</h2>
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Sincronización Activa</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pendientes</span>
                  <span className="text-xl font-black italic">{dynamicStats?.pending || 0}</span>
                </div>
                <div className={`flex items-center justify-between p-4 rounded-2xl border ${
                  (dynamicStats?.error || 0) > 0 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/5 border-white/5'
                }`}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Errores</span>
                  <span className={`text-xl font-black italic ${(dynamicStats?.error || 0) > 0 ? 'text-rose-500' : ''}`}>
                    {dynamicStats?.error || 0}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("/sync")}
              className="mt-8 w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg shadow-indigo-900/40"
            >
              Gestionar Nube
            </button>
          </div>

          {/* PENDING ORDERS BENTO */}
          <div className="md:col-span-12">
            <div className="bg-white dark:bg-brand-surface border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/10 rounded-2xl">
                    <Package className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black uppercase italic tracking-tighter">Órdenes Pendientes</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {pendingOrders?.length || 0} manifiestos cargados
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <label className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-500 hover:text-brand-warning transition-all cursor-pointer">
                    <Upload className="w-5 h-5" />
                    <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                  </label>
                  <button 
                    onClick={() => setIsOrdersCollapsed(!isOrdersCollapsed)}
                    className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-500 hover:text-brand-warning transition-all"
                  >
                    {isOrdersCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {!isOrdersCollapsed && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 pt-2">
                      {pendingOrders && pendingOrders.length > 0 ? (
                        <>
                          {visibleOrders.map((order) => (
                            <OrderRow
                              key={order.id}
                              order={order}
                              onClick={handleOrderClick}
                              onDelete={handleDeleteOrder}
                            />
                          ))}
                          {pendingOrders.length > 5 && (
                            <button
                              onClick={() => setShowAllOrders(!showAllOrders)}
                              className="w-full py-4 text-[10px] font-black text-brand-info uppercase tracking-widest hover:bg-brand-info/5 rounded-2xl transition-colors"
                            >
                              {showAllOrders ? "Ver menos" : `Ver ${pendingOrders.length - 5} más...`}
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="py-12 text-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-3xl">
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No hay manifiestos activos</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </main>

      <AnimatePresence>
        {isCameraOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200]"
          >
            <CameraScanner 
              onScan={(code) => {
                handleUniversalScan(code);
                setIsCameraOpen(false);
              }}
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
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
  };

  return (
    <button
      onClick={onClick}
      className={`p-6 rounded-[2rem] border-2 flex flex-col items-center justify-center gap-3 transition-all active:scale-95 group ${colors[color]}`}
    >
      <div className="transform group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
    </button>
  );
};

export default memo(Dashboard);

// Forced GitHub sync
