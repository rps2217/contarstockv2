
import React, { Suspense, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useAppStore } from '@/stores';
import type { CountingSession } from '@/types';
import { isModuleEnabled } from './services/moduleManager';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Box, Loader2, Database, WifiOff, Cpu, RefreshCw, Plus } from 'lucide-react';
import { lazyWithRetry } from '@/services/lazyLoad';
import { Toaster } from 'sonner';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useAutoSync } from '@/hooks/useAutoSync';
import { useAutoSession } from '@/hooks/useAutoSession';
import { useExpiryWatcher } from '@/hooks/useExpiryWatcher';
import { useNavigate } from 'react-router-dom';
import { CommandMenuProvider } from '@/components/GlobalSearch/CommandMenu';
import { NotificationCenterProvider } from '@/components/NotificationCenter/NotificationCenter';
import { ThemeProvider } from '@/hooks/useTheme/useTheme';
import { useAppInit } from '@/hooks/useAppInit';
import { motion, AnimatePresence } from 'motion/react';

// ============================================================================
// LAZY IMPORTS - OPTIMIZACIÓN DE BUNDLE
// ============================================================================

// Componentes de autenticación
const Login = lazyWithRetry(() => import('@/components/Login').then(m => ({ default: m.Login })));
const StartSessionModal = lazyWithRetry(() => import('@/components/StartSessionModal').then(m => ({ default: m.StartSessionModal })));

// Vistas principales (AppSheet-style) - Carga diferida
// REDISEÑO: Usando páginas del rediseño
const Dashboard = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignDashboard })));
const CapturePage = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignCapturePage })));
const DataPage = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignDataPage })));
const SyncPage = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignSyncPage })));
// SettingsPage - usando versión rediseñada con datos reales
const SettingsPage = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignSettingsPage })));

// Vistas legacy - Carga solo cuando se accede (no en bundle inicial)
// REDISEÑO: Usando páginas del rediseño
const ReportsLegacy = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignReportsPage })));
const ExpiryPage = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignExpiryPage })));
const ExpiryLegacy = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignExpiryPage })));
const EventsLegacy = lazyWithRetry(() => import('@/features/events/EventsPage'));
const CountingLegacy = lazyWithRetry(() => import('@/features/counting/CountingPage'));
const CustomersLegacy = lazyWithRetry(() => import('@/features/customers/CustomersPage').then(m => ({ default: m.CustomersPage })));
const ProvidersLegacy = lazyWithRetry(() => import('@/features/suppliers/pages/SuppliersPage').then(m => ({ default: m.SuppliersPage })));
const ExpectedOrdersLegacy = lazyWithRetry(() => import('@/features/expected-orders/ExpectedOrdersPage').then(m => ({ default: m.ExpectedOrdersPage })));
const DynamicLegacy = lazyWithRetry(() => import('@/features/dynamic/DynamicManagementPage').then(m => ({ default: m.DynamicManagementPage })));
const SlicesLegacy = lazyWithRetry(() => import('@/features/slices/SlicesPage').then(m => ({ default: m.SlicesPage })));
const HammerLegacy = lazyWithRetry(() => import('@/features/hammer/HammerPage'));

// Componentes pesados - Solo carga cuando se necesitan
const Sidebar = lazyWithRetry(() => import('@/components/Sidebar').then(m => ({ default: m.Sidebar })));
const BottomDock = lazyWithRetry(() => import('@/components/BottomDock').then(m => ({ default: m.BottomDock })));
const OnboardingOverlay = lazyWithRetry(() => import('@/shared/components/core/OnboardingOverlay').then(m => ({ default: m.OnboardingOverlay })));
const SystemOperationsDrawer = lazyWithRetry(() => import('@/shared/components/core/SystemOperationsDrawer').then(m => ({ default: m.SystemOperationsDrawer })));
const ToastContainer = lazyWithRetry(() => import('@/shared/components/ui/ToastContainer').then(m => ({ default: m.ToastContainer })));
const TaskProgressIndicator = lazyWithRetry(() => import('@/shared/components/TaskProgressIndicator').then(m => ({ default: m.TaskProgressIndicator })));
const ThemeDemo = lazyWithRetry(() => import('@/shared/components/ui/ThemeDemo').then(m => ({ default: m.ThemeDemo })));

// Wrapper para ThemeDemo
const ThemeDemoPage = () => <ThemeDemo />;

// Redesign Preview - Lazy load con ThemeProvider
const RedesignPreviewApp = lazyWithRetry(() => import('@/shared/components/redesign/AppShell').then(m => ({ default: m.RedesignAppShellWrapper })));
const RedesignPreviewPage = () => <RedesignPreviewApp />;

const ModuleRoute = ({ moduleKey, element }: { moduleKey: string, element: React.ReactNode }) => {
  return isModuleEnabled(moduleKey) ? <React.Fragment>{element}</React.Fragment> : <Navigate to="/" replace />;
};

const AppContent = () => {
  const location = useLocation();
  const settings = useAppStore(state => state.settings);
  const isStartSessionModalOpen = useAppStore(state => state.isStartSessionModalOpen);
  const setStartSessionModalOpen = useAppStore(state => state.setStartSessionModalOpen);
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

  const currentThemeClass = 
    settings.theme === 'high-contrast' ? 'bg-black text-yellow-400' :
    settings.theme === 'light' ? 'bg-slate-50 text-slate-900' : 
    
    'bg-base text-slate-100';

  const isDarkMode = settings.theme === 'dark' || settings.theme === 'high-contrast' ;
  const isHighContrast = settings.theme === 'high-contrast';

  if (bootState === 'initializing' && isAuthenticated !== false) {
    return (
      <div className="h-screen w-full bg-base flex flex-col items-center justify-center text-white p-8">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative mb-12"
        >
          <div className="p-12 border border-white/5 rounded-[3.5rem] relative z-10 bg-surface/50 backdrop-blur-2xl shadow-2xl shadow-blue-500/10">
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
    <div className={`w-full h-full flex flex-col transition-colors duration-700 ${currentThemeClass} ${isDarkMode ? 'dark' : ''} ${isHighContrast ? 'high-contrast' : ''} font-sans selection:bg-blue-500/30`}>
      <Suspense fallback={null}>
        <OnboardingOverlay />
        <SystemOperationsDrawer />
        <ToastContainer />
        <TaskProgressIndicator />
      </Suspense>
      <OfflineBanner />
      <Toaster position="bottom-center" />
      
      <div className="flex-1 flex overflow-hidden relative">
        {!isScanningMode && (
          <Suspense fallback={null}>
            <Sidebar 
              view={location.pathname.split('/')[1] || 'dashboard'} 
              settings={settings} 
              isCollapsed={isSidebarCollapsed}
              onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
          </Suspense>
        )}
        
        <main className={`flex-1 relative overflow-hidden transition-[padding-left] duration-300 ease-in-out ${!isScanningMode ? (isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64') : ''}`}>
          
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
                    {/* RUTAS PRINCIPALES (AppSheet-style) */}
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/capture" element={<CapturePage />} />
                    <Route path="/capture/:tab" element={<CapturePage />} />
                    <Route path="/data" element={<DataPage />} />
                    <Route path="/data/:table" element={<DataPage />} />
                    <Route path="/data/:table/:id" element={<DataPage />} />
                    <Route path="/sync" element={<SyncPage />} />
                    <Route path="/sync/:tab" element={<SyncPage />} />
                    <Route path="/reports" element={<ReportsLegacy />} />
                    <Route path="/reports/:tab" element={<ReportsLegacy />} />
                    <Route path="/expiry" element={<ExpiryPage />} />
                    <Route path="/expiry/:tab" element={<ExpiryPage />} />
                    <Route path="/settings" element={<SettingsPage />} />

                    {/* DEEP LINKS - Abrir app en registro específico */}
                    <Route path="/session/:id" element={<ReportsLegacy />} />
                    <Route path="/reception/:id" element={<CapturePage />} />
                    <Route path="/product/:barcode" element={<DataPage />} />

                    {/* TEMA DEMO - Página de demostración del tema AppSheet */}
                    <Route path="/theme-demo" element={<ThemeDemoPage />} />

                    {/* REDISEÑO - Preview del nuevo diseño de interfaz */}
                    <Route path="/redesign" element={<RedesignPreviewPage />} />

                    {/* RUTAS LEGACY (redirigir a nuevas) */}
                    <Route path="/reception" element={<Navigate to="/capture" replace />} />
                    <Route path="/reception/capture" element={<Navigate to="/capture" replace />} />
                    <Route path="/events" element={<EventsLegacy />} />
                    <Route path="/events/capture" element={<Navigate to="/capture" replace />} />
                    <Route path="/expiry/capture" element={<Navigate to="/capture" replace />} />
                    <Route path="/counting" element={<Navigate to="/reports" replace />} />
                    <Route path="/counting/:id" element={<CountingLegacy />} />
                    <Route path="/massive" element={<Navigate to="/reports" replace />} />
                    <Route path="/massive/:batchId" element={<HammerLegacy />} />
                    <Route path="/database" element={<Navigate to="/data" replace />} />
                    <Route path="/customers" element={<CustomersLegacy />} />
                    <Route path="/providers" element={<ProvidersLegacy />} />
                    <Route path="/expected-orders" element={<ExpectedOrdersLegacy />} />
                    <Route path="/slices" element={<SlicesLegacy />} />
                    <Route path="/dynamic/:tableKey" element={<DynamicLegacy />} />

                    {/* Fallback */}
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
          <Suspense fallback={null}>
            <BottomDock currentView={location.pathname.split('/')[1] || 'dashboard'} settings={settings} />
          </Suspense>
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
            onSessionStart={(session: CountingSession) => navigate(`/counting/${session.id}`)}
          />
        </Suspense>
      )}
    </div>
  );
};


const App = () => (
  <Router>
    <ThemeProvider>
      <NotificationCenterProvider>
        <CommandMenuProvider>
          <AppContent />
        </CommandMenuProvider>
      </NotificationCenterProvider>
    </ThemeProvider>
  </Router>
);

export default App;

