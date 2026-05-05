
import React, { Suspense, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useAppStore } from '@/store/mainAppStore'; // Vercel Cache Invalidation Ref: 20260404-03
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Sidebar } from '@/components/Sidebar';
import { BottomDock } from '@/components/BottomDock';
import { SystemStatus } from '@/components/SystemStatus';
import { Box, Loader2, Database, WifiOff, Cpu, RefreshCw, Plus } from 'lucide-react';
import { lazyWithRetry } from '@/services/lazyLoad';
import { ToastContainer } from '@/shared/components/ui/ToastContainer';
import { TaskProgressIndicator } from '@/shared/components/TaskProgressIndicator';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useAutoSync } from '@/hooks/useAutoSync';
import { useAutoSession } from '@/hooks/useAutoSession';
import { useExpiryWatcher } from '@/hooks/useExpiryWatcher';
import { useNavigate } from 'react-router-dom';

// --- COMPONENTES DIFERIDOS ---
const Login = lazyWithRetry(() => import('@/components/Login').then(m => ({ default: m.Login })));
const StartSessionModal = lazyWithRetry(() => import('@/components/StartSessionModal').then(m => ({ default: m.StartSessionModal })));

// --- VISTAS MAESTRAS ---
// Forzamos un cambio para limpiar el caché de Vercel (intento 2)
const Dashboard = lazyWithRetry(() => import('@/features/dashboard/DashboardPage'));
const Reports = lazyWithRetry(() => import('@/features/reports/ReportsPage'));
const DatabaseView = lazyWithRetry(() => import('@/features/inventory/InventoryPage'));
const Sync = lazyWithRetry(() => import('@/features/sync/SyncPage'));
const Settings = lazyWithRetry(() => import('@/features/settings/SettingsPage'));

// --- MÓDULOS OPERATIVOS (FEATURES) ---
const ReceptionManagement = lazyWithRetry(() => import('@/features/reception/ReceptionManagementPage'));
const ReceptionCapture = lazyWithRetry(() => import('@/features/reception/ReceptionCapturePage'));
const CountingPage = lazyWithRetry(() => import('@/features/counting/CountingPage'));
const HammerPage = lazyWithRetry(() => import('@/features/hammer/HammerPage'));
const ExpiryManagement = lazyWithRetry(() => import('@/features/expiry/ExpiryManagementPage'));
const EventManagement = lazyWithRetry(() => import('@/features/events/EventManagementPage'));
const ExpiryCapturePage = lazyWithRetry(() => import('@/features/expiry/ExpiryCapturePage'));
const EventCapturePage = lazyWithRetry(() => import('@/features/events/EventCapturePage'));
const ComplianceDashboardPage = lazyWithRetry(() => import('@/features/compliance/ComplianceDashboardPage'));
const DynamicManagement = lazyWithRetry(() => import('@/features/dynamic/DynamicManagementPage').then(m => ({ default: m.DynamicManagementPage })));
const GlobalSyncQueue = lazyWithRetry(() => import('@/features/sync/SyncCenterPage').then(m => ({ default: m.SyncCenterPage })));
const ProvidersPage = lazyWithRetry(() => import('@/features/suppliers/pages/ProvidersPage').then(m => ({ default: m.ProvidersPage })));
const CustomersPage = lazyWithRetry(() => import('@/features/customers/CustomersPage').then(m => ({ default: m.CustomersPage })));

import { ExpiryAlertBanner } from '@/features/expiry/components/ExpiryAlertBanner';
import { OnboardingOverlay } from '@/shared/components/core/OnboardingOverlay';

import { useAppInit } from '@/hooks/useAppInit';
import { motion, AnimatePresence } from 'motion/react';

const AppContent = () => {
  const location = useLocation();
  const { settings, isStartSessionModalOpen, setStartSessionModalOpen } = useAppStore();
  const { bootState, initStep, isAuthenticated, handleLoginSuccess } = useAppInit();
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [hasInitialRedirected, setHasInitialRedirected] = useState(false);
  const navigate = useNavigate();
  
  // Activar hooks globales
  useAutoSync();
  useAutoSession();
  useExpiryWatcher();

  useEffect(() => {
    (window as any).__APP_SETTINGS__ = settings;
  }, [settings]);

  useEffect(() => {
    if (isAuthenticated && bootState === 'ready' && !hasInitialRedirected) {
      setHasInitialRedirected(true);
      if (settings.defaultStartModule && settings.defaultStartModule !== 'dashboard' && location.pathname === '/') {
        navigate(`/${settings.defaultStartModule}`, { replace: true });
      }
    }
  }, [isAuthenticated, bootState, hasInitialRedirected, settings.defaultStartModule, location.pathname, navigate]);

  const { isScanningMode, systemMode } = React.useMemo(() => {
    const path = location.pathname;
    const scanningPaths = ['/counting/', '/reception', '/expiry/capture', '/events/capture', '/massive/'];
    
    let mode: 'expiry' | 'reception' | 'counting' | 'events' | 'default' = 'default';
    if (path.startsWith('/expiry')) mode = 'expiry';
    else if (path.startsWith('/reception')) mode = 'reception';
    else if (path.startsWith('/counting')) mode = 'counting';
    else if (path.startsWith('/events')) mode = 'events';

    const isScanning = scanningPaths.some(p => path.startsWith(p));

    return {
      isScanningMode: isScanning,
      systemMode: mode
    };
  }, [location.pathname]);

  const currentThemeClass = settings.theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100';

  if (bootState === 'initializing' && isAuthenticated !== false) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white p-8">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative mb-12"
        >
          <div className="p-12 border border-white/5 rounded-[3.5rem] relative z-10 bg-slate-900/50 backdrop-blur-2xl shadow-2xl shadow-blue-500/10">
            {initStep === 'config' ? <Cpu className="w-16 h-16 text-blue-400 animate-pulse" /> : 
            initStep === 'database' ? <Database className="w-16 h-16 text-emerald-500 animate-bounce" /> :
            initStep === 'purging' ? <RefreshCw className="w-16 h-16 text-amber-500 animate-spin" /> :
            initStep === 'offline' ? <WifiOff className="w-16 h-16 text-rose-500" /> :
            <Box className="w-16 h-16 text-blue-500" />}
          </div>
          <div className="absolute inset-0 bg-blue-500 blur-[80px] opacity-20 animate-pulse"></div>
        </motion.div>

        <h1 className="text-5xl font-black uppercase tracking-tighter italic mb-2 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
          LOGICOUNT <span className="text-blue-500">PRO</span>
        </h1>
        
        <div className="mt-10 w-72 space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
              {initStep === 'config' ? 'Optimizing_Cloud' : 
              initStep === 'database' ? 'Rebuilding_Catalog' : 
              initStep === 'purging' ? 'Cleaning_Environment' :
              'System_Warming_Up'}
            </span>
            <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/10">
            <motion.div 
              initial={{ width: "10%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 3, ease: "easeInOut" }}
              className="h-full bg-blue-600 rounded-full" 
            />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={null}>
        <Login onLoginSuccess={handleLoginSuccess} />
      </Suspense>
    );
  }

  return (
    <div className={`w-full h-full flex flex-col transition-colors duration-700 ${currentThemeClass} ${settings.theme === 'dark' ? 'dark' : ''} font-sans selection:bg-blue-500/30`}>
      <OnboardingOverlay />
      <OfflineBanner />
      <ToastContainer />
      <TaskProgressIndicator />
      
      <div className="flex-1 flex overflow-hidden relative">
        {!isScanningMode && (
          <Sidebar 
            view={location.pathname.split('/')[1] || 'dashboard'} 
            settings={settings} 
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        )}
        
        <main className={`flex-1 relative overflow-hidden transition-all duration-500 ${!isScanningMode ? (isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64') : ''}`}>
          {/* Ocultar indicadores en móvil durante escaneo */}
          <div className={isScanningMode ? 'hidden sm:block' : ''}>
            <SystemStatus />
            <ExpiryAlertBanner theme={settings.theme} />
          </div>
          
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <Suspense 
                fallback={
                  <div className="h-full w-full flex items-center justify-center surface-glass">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                  </div>
                }
              >
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.02, y: -10 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                  className="h-full w-full"
                >
                  <Routes location={location}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/database" element={<DatabaseView />} />
                    <Route path="/sync" element={<Sync />} />
                    <Route path="/sync/queue" element={<GlobalSyncQueue />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/reception" element={<ReceptionManagement />} />
                    <Route path="/reception/capture" element={<ReceptionCapture />} />
                    <Route path="/expiry" element={<ExpiryManagement />} />
                    <Route path="/expiry/capture" element={<ExpiryCapturePage />} />
                    <Route path="/compliance" element={<ComplianceDashboardPage />} />
                    <Route path="/events" element={<EventManagement />} />
                    <Route path="/events/capture" element={<EventCapturePage />} />
                    <Route path="/providers" element={<ProvidersPage />} />
                    <Route path="/customers" element={<CustomersPage />} />
                    <Route path="/dynamic/:tableKey" element={<DynamicManagement />} />
                    <Route path="/counting/:id" element={<CountingPage />} />
                    <Route path="/massive/:batchId" element={<HammerPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </motion.div>
              </Suspense>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>
      
      {!isScanningMode && (
        <>
          <BottomDock currentView={location.pathname.split('/')[1] || 'dashboard'} settings={settings} />
          {(location.pathname === '/' || location.pathname === '/dashboard') && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setStartSessionModalOpen(true)}
              className="md:hidden fixed bottom-24 right-6 z-[110] w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-2xl shadow-blue-900/50 flex items-center justify-center border-b-4 border-blue-800"
            >
              <Plus className="w-8 h-8" />
            </motion.button>
          )}
        </>
      )}

      {isStartSessionModalOpen && (
        <Suspense fallback={null}>
          <StartSessionModal 
            isOpen={isStartSessionModalOpen}
            onClose={() => setStartSessionModalOpen(false)}
            onSessionStart={(session) => navigate(`/counting/${session.id}`)}
          />
        </Suspense>
      )}
    </div>
  );
};


const App = () => (
  <Router>
    <AppContent />
  </Router>
);

export default App;

