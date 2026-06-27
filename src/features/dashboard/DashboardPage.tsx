/**
 * Dashboard - Página principal con módulos de navegación
 * 
 * Diseño monocromático de grises, sin estadísticas.
 * Usa componentes del design system.
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
} from "lucide-react";
import { useAppStore } from '@/stores';
import { SoundFX } from "../../services/audio";
import { ModuleCard } from "@/shared/components/ui/design-system";

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

  // Módulos principales
  const modules = [
    { icon: <Plus />, label: "Nuevo Conteo", path: "new", primary: true },
    { icon: <ClipboardList />, label: "Conteo", path: "/counting" },
    { icon: <History />, label: "Recepción", path: "/reception" },
    { icon: <Zap />, label: "Ráfaga", path: "/massive/BURST-MODE" },
    { icon: <FileSpreadsheet />, label: "Carga", path: "/expected-orders" },
    { icon: <Calendar />, label: "Vencimientos", path: "/expiry" },
    { icon: <AlertCircle />, label: "Eventos", path: "/events" },
    { icon: <FileText />, label: "Reportes", path: "/reports" },
    { icon: <Database />, label: "Inventario", path: "/database" },
    { icon: <RefreshCw />, label: "Sincronizar", path: "/sync" },
    { icon: <Settings />, label: "Ajustes", path: "/settings" },
  ];

  const handleModuleClick = (path: string) => {
    if (path === "new") {
      setStartSessionModalOpen(true);
    } else {
      navigate(path);
    }
  };

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

      {/* Header */}
      <header className={`px-4 py-4 ${isDark ? "bg-neutral-950" : "bg-white"}`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className={`text-xl font-bold ${isDark ? "text-white" : "text-neutral-900"}`}>
              CountPro
            </h1>
            <p className={`text-xs ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
              Gestión de inventario
            </p>
          </div>
          <button
            onClick={() => navigate("/settings")}
            className={`p-2.5 rounded-xl transition-colors ${isDark ? "bg-neutral-900 hover:bg-neutral-800 text-neutral-400" : "bg-neutral-100 hover:bg-neutral-200 text-neutral-600"}`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Módulos usando ModuleCard */}
      <main className="p-4 max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
          {modules.map((module, index) => (
            <motion.div
              key={module.path}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <ModuleCard
                icon={module.icon}
                label={module.label}
                onClick={() => handleModuleClick(module.path)}
                isDark={isDark}
                variant={module.primary ? 'primary' : 'default'}
              />
            </motion.div>
          ))}
        </div>

        {/* Info adicional */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`mt-8 p-4 rounded-xl ${isDark ? "bg-neutral-900 border border-neutral-800" : "bg-white border border-neutral-200"}`}
        >
          <p className={`text-xs text-center ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
            Sincronización automática activada
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default memo(Dashboard);
