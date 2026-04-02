import React, { useState, useEffect, useCallback, memo } from "react";
import { useLocation } from "react-router-dom";
import {
  ScanLine,
  Radio,
  Database,
  Settings,
  UserCircle,
  ShieldAlert,
  RefreshCw,
  FileText,
  Box,
  ArrowRight,
  Package,
  CheckCircle2,
  Cloud,
  AlertCircle,
  Zap,
} from "lucide-react";
import { NetworkStatus } from "../../shared/components/ui/NetworkStatus";
import { OrderRow } from "./components/OrderRow";
import { useDashboard } from "./hooks/useDashboard";
import { Button, Card } from "../../shared/components/ui";
import { db } from "../../db";
import { getSettings } from "../../services/settings";
import { SoundFX } from "../../services/audio";
import { useAppStore } from "../../store/useAppStore";
import { ExpectedOrderRepository } from "../../repositories/ExpectedOrderRepository";
import * as sessionService from "../../services/sessionService";
import { sanitizeBarcode } from "../../services/utils";
import { useHIDScanner } from "../../hooks/useHIDScanner";

const Dashboard: React.FC = () => {
  const { operatorId, isSyncNeeded, pendingOrders, navigate, dynamicStats } =
    useDashboard();
  const location = useLocation();
  const [hasConfigError, setHasConfigError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
        navigate(`/count/${session.id}`);
      } else {
        // 2. Check if it's a Logistics Barcode (Reception)
        // Rule: Contains letters OR length > 14 (like SSCC-18 or tracking numbers)
        const isLogisticsBarcode =
          /[a-zA-Z]/.test(cleanCode) || cleanCode.length > 14;

        if (isLogisticsBarcode) {
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

        // Let the CountingPage handle the initial scan
        navigate(`/count/${session.id}`, { state: { initialScan: cleanCode } });
      }
    } catch (error) {
      console.error("Scan error:", error);
      SoundFX.play("error");
    } finally {
      setIsProcessingScan(false);
      setScanInput("");
    }
  };

  const handleOrderClick = async (orderId: string) => {
    handleUniversalScan(orderId);
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
      <header className="px-6 py-8 bg-white dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/5 sticky top-0 z-50 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight leading-none">
              LOGI<span className="text-blue-600">COUNT</span>
            </h1>
            <div className="mt-2">
              <NetworkStatus />
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
            <UserCircle className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {operatorId}
            </span>
          </div>
        </div>

        {/* UNIVERSAL SCAN INPUT */}
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <ScanLine className="w-6 h-6 text-blue-600" />
          </div>
          <input
            type="text"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleUniversalScan(scanInput);
              }
            }}
            placeholder="Escanear Orden o Producto..."
            className="w-full h-16 bg-white dark:bg-slate-950 border-2 border-blue-200 dark:border-blue-900 rounded-2xl pl-14 pr-4 text-lg font-black shadow-lg shadow-blue-500/10 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
            disabled={isProcessingScan}
            autoFocus
          />
          {isProcessingScan && (
            <div className="absolute inset-y-0 right-4 flex items-center">
              <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
            </div>
          )}
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* ALERTA DE CONFIGURACIÓN - Eliminada por migración a Firebase */}

        {/* SALUD DE TABLAS DINÁMICAS */}
        {((dynamicStats?.pending || 0) > 0 ||
          (dynamicStats?.error || 0) > 0) && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-500" />
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <Cloud className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Pendientes
                  </span>
                </div>
                <div className="text-xl font-black">
                  {dynamicStats?.pending || 0}
                </div>
              </div>
              <div
                className={`p-3 rounded-xl border ${
                  (dynamicStats?.error || 0) > 0
                    ? "bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-500/30"
                    : "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle
                    className={`w-3.5 h-3.5 ${(dynamicStats?.error || 0) > 0 ? "text-rose-500" : "text-slate-400"}`}
                  />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Errores
                  </span>
                </div>
                <div
                  className={`text-xl font-black ${(dynamicStats?.error || 0) > 0 ? "text-rose-500" : ""}`}
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
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">
              Órdenes Pendientes
            </h2>
            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-black px-2.5 py-1 rounded-full">
              {pendingOrders?.length || 0}
            </span>
          </div>

          <div className="space-y-3">
            {!visibleOrders || visibleOrders.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
                <Package className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-500">
                  No hay órdenes pendientes
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Escanea un producto para iniciar un conteo ciego
                </p>
              </div>
            ) : (
              <>
                {visibleOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onClick={handleOrderClick}
                  />
                ))}
                {pendingOrders && pendingOrders.length > 5 && (
                  <button
                    onClick={() => setShowAllOrders(!showAllOrders)}
                    className="w-full py-3 text-xs font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 rounded-xl transition-colors"
                  >
                    {showAllOrders ? "Ver menos" : `Ver ${pendingOrders.length - 5} más...`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* RECEPCIÓN (INBOUND HUB) */}
        <button
          onClick={() => navigate("/reception")}
          className="w-full bg-slate-900 dark:bg-slate-800 border-2 border-slate-800 dark:border-slate-700 p-5 rounded-2xl flex items-center gap-4 active:scale-[0.98] transition-all text-left group hover:border-blue-500"
        >
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Box className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-base font-black text-white uppercase tracking-wider">
              Recepción Inteligente
            </h4>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Escanear documento físico con IA
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
        </button>

        {/* HERRAMIENTAS */}
        <div className="grid grid-cols-3 gap-4">
          <Card
            hoverable
            onClick={() => navigate("/database")}
            className="flex flex-col items-center justify-center gap-3 p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl"
          >
            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl">
              <Database className="w-6 h-6 text-amber-600 dark:text-amber-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider">
              Catálogo
            </span>
          </Card>

          <Card
            hoverable
            onClick={() => navigate("/massive/BURST-MODE")}
            className="flex flex-col items-center justify-center gap-3 p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl"
          >
            <div className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl">
              <Zap className="w-6 h-6 text-rose-600 dark:text-rose-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider">
              Hammer
            </span>
          </Card>

          <Card
            hoverable
            onClick={() => navigate("/sync")}
            className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl transition-all ${isSyncNeeded ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-500/50 animate-pulse" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}
          >
            <div
              className={`p-3 rounded-xl ${isSyncNeeded ? "bg-orange-100 dark:bg-orange-500/20" : "bg-slate-800"}`}
            >
              <Radio
                className={`w-6 h-6 ${isSyncNeeded ? "text-orange-600 dark:text-orange-500" : "text-slate-400"}`}
              />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider">
              Sync
            </span>
          </Card>
        </div>

        {/* AJUSTES Y REPORTES */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate("/reports")}
            className="flex items-center justify-center gap-2 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Reportes
            </span>
          </button>

          <button
            onClick={() => navigate("/settings")}
            className="flex items-center justify-center gap-2 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Ajustes
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(Dashboard);
