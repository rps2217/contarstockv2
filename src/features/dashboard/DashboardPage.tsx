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
} from "lucide-react";
import { NetworkStatus } from "../../shared/components/ui/NetworkStatus";
import { OrderRow } from "./components/OrderRow";
import { useDashboard } from "./hooks/useDashboard";
import { Button, Card } from "../../shared/components/ui";
import { db } from "../../db";
import { getSettings } from "../../services/settings";
import { SoundFX } from "../../services/audio";
import { useAppStore } from "../../store/appStore";
import { ExpectedOrderRepository } from "../../repositories/ExpectedOrderRepository";
import * as sessionService from "../../services/sessionService";
import { sanitizeBarcode } from "../../services/utils";
import { useHIDScanner } from "../../hooks/useHIDScanner";
import Papa from 'papaparse';
import { toast } from 'sonner';
import { ExpectedOrder, ExpectedItem } from "../../types";
import { CameraScanner } from "../../components/CameraScanner";

const Dashboard: React.FC = () => {
  const { operatorId, isSyncNeeded, pendingOrders, navigate, dynamicStats, syncStatus, triggerSync } =
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
    <div className="h-full w-full bg-slate-50 dark:bg-black overflow-y-auto no-scrollbar pb-32 font-sans text-slate-900 dark:text-white relative">
      {/* SUCCESS OVERLAY */}
      {successMessage && (
        <div className="absolute inset-0 z-[200] bg-emerald-500/90 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white rounded-full p-6 mb-6 shadow-2xl shadow-emerald-900/50 animate-bounce">
            <CheckCircle2 className="w-24 h-24 text-emerald-500" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight text-center px-6">
            {successMessage}
          </h2>
        </div>
      )}

      {/* HEADER */}
      <header className="px-6 pt-8 pb-6 bg-white dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/5 sticky top-0 z-50 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight leading-none">
              LOGI<span className="text-blue-600">COUNT</span>
            </h1>
            <div className="mt-2">
              <NetworkStatus />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/reports")}
              className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 transition-colors"
              title="Historial de Cargas"
            >
              <History className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
              <UserCircle className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {operatorId}
              </span>
            </div>
          </div>
        </div>

        {/* UNIVERSAL SCAN INPUT - HERO ACTION */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <motion.div 
            animate={{ scale: [1, 1.01, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="relative"
          >
            <button
              onClick={() => setIsCameraOpen(true)}
              className="absolute inset-y-0 left-4 flex items-center z-10 text-blue-600 hover:text-blue-700 active:scale-90 transition-all"
              title="Abrir Cámara"
            >
              <Camera className="w-7 h-7" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleUniversalScan(scanInput);
                }
              }}
              placeholder="Escanear Orden o Producto..."
              className="w-full h-20 bg-white dark:bg-slate-950 border-4 border-blue-500 rounded-3xl pl-16 pr-16 text-2xl font-black shadow-2xl shadow-blue-500/20 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
              disabled={isProcessingScan}
              autoFocus
            />
            <div className="absolute inset-y-0 right-4 flex items-center gap-2">
              {isProcessingScan ? (
                <RefreshCw className="w-7 h-7 text-blue-500 animate-spin" />
              ) : scanInput ? (
                <button
                  onClick={() => handleUniversalScan(scanInput)}
                  className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40 active:scale-90 transition-all"
                >
                  <ArrowRight className="w-7 h-7" />
                </button>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      </header>

      <div className="p-6 max-w-4xl mx-auto space-y-8">
        
        {/* SALUD DE TABLAS DINÁMICAS */}
        {((dynamicStats?.pending || 0) > 0 ||
          (dynamicStats?.error || 0) > 0) && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-500" />
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Salud de Tablas
                </h2>
              </div>
              <button
                onClick={() => navigate("/sync")}
                className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 transition-colors"
              >
                Gestionar Sincronización
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <Cloud className="w-4 h-4 text-blue-500" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Pendientes
                  </span>
                </div>
                <div className="text-2xl font-black">
                  {dynamicStats?.pending || 0}
                </div>
              </div>
              <div
                className={`p-4 rounded-2xl border ${
                  (dynamicStats?.error || 0) > 0
                    ? "bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-500/30"
                    : "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle
                    className={`w-4 h-4 ${(dynamicStats?.error || 0) > 0 ? "text-rose-500" : "text-slate-400"}`}
                  />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Errores
                  </span>
                </div>
                <div
                  className={`text-2xl font-black ${(dynamicStats?.error || 0) > 0 ? "text-rose-500" : ""}`}
                >
                  {dynamicStats?.error || 0}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ÓRDENES PENDIENTES */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">
                Órdenes Pendientes
              </h2>
              <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                {pendingOrders?.length || 0}
              </span>
            </div>
            
            {pendingOrders && pendingOrders.length > 0 && (
              <button 
                onClick={() => setIsOrdersCollapsed(!isOrdersCollapsed)}
                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 transition-colors"
              >
                {isOrdersCollapsed ? (
                  <>Ver Órdenes <ChevronDown className="w-3 h-3" /></>
                ) : (
                  <>Colapsar <ChevronUp className="w-3 h-3" /></>
                )}
              </button>
            )}
          </div>

          {!isOrdersCollapsed || (pendingOrders?.length === 0) ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              {!visibleOrders || visibleOrders.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center">
                  <Package className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                  <p className="text-sm font-bold text-slate-500">
                    No hay órdenes pendientes
                  </p>
                  <p className="text-xs text-slate-400 mt-1 mb-6">
                    Escanea un producto para iniciar un conteo ciego o sube un archivo
                  </p>
                  
                  <label className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 cursor-pointer shadow-lg shadow-blue-900/40">
                    <Upload className="w-4 h-4" />
                    Subir CSV de Órdenes
                    <input 
                      type="file" 
                      accept=".csv" 
                      className="hidden" 
                      onChange={handleCsvUpload}
                    />
                  </label>
                </div>
              ) : (
                <>
                  {visibleOrders.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      onClick={handleOrderClick}
                      onDelete={handleDeleteOrder}
                    />
                  ))}
                  {pendingOrders && pendingOrders.length > 5 && (
                    <button
                      onClick={() => setShowAllOrders(!showAllOrders)}
                      className="w-full py-4 text-xs font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 rounded-2xl transition-colors"
                    >
                      {showAllOrders ? "Ver menos" : `Ver ${pendingOrders.length - 5} más...`}
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  {pendingOrders.length} Órdenes cargadas en memoria
                </span>
              </div>
              <button 
                onClick={() => setIsOrdersCollapsed(false)}
                className="text-[10px] font-black uppercase tracking-widest text-blue-500"
              >
                Expandir
              </button>
            </div>
          )}
        </div>

        {/* ACCIONES RÁPIDAS Y HERRAMIENTAS */}
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 gap-4">
            <Card
              hoverable
              onClick={() => navigate("/massive/BURST-MODE")}
              className="flex items-center gap-3 p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl"
            >
              <div className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl">
                <Zap className="w-5 h-5 text-rose-600 dark:text-rose-500" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">
                Hammer
              </span>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card
              hoverable
              onClick={() => navigate("/database")}
              className="flex items-center gap-3 p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl col-span-2"
            >
              <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl">
                <Database className="w-5 h-5 text-amber-600 dark:text-amber-500" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">
                Catálogo
              </span>
            </Card>
          </div>

          <button
            onClick={() => navigate("/settings")}
            className="flex items-center justify-center gap-3 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider">
              Ajustes
            </span>
          </button>
        </div>
      </div>

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

export default memo(Dashboard);
