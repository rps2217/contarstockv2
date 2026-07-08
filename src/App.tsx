
import React, { Suspense, useEffect, useState, useMemo, lazy } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useAppStore } from '@/stores';
import type { CountingSession } from '@/types';
import { isModuleEnabled } from './services/moduleManager';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorProvider } from '@/lib/errors';
import { Box, Loader2, Database, WifiOff, Cpu, RefreshCw, Plus } from 'lucide-react';
import { lazyWithRetry } from '@/services/lazyLoad';
import { Toaster } from 'sonner';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useAutoSync } from '@/hooks/useAutoSync';
import { useAutoSession } from '@/hooks/useAutoSession';
import { useExpiryWatcher } from '@/hooks/useExpiryWatcher';
import { useExpiryNotifications } from '@/hooks/useExpiryNotifications';
import { useAppShortcuts } from '@/shared/hooks/useKeyboardShortcuts';
import { useNavigate } from 'react-router-dom';
import { initializeWorkflows } from '@/lib/workflowEngine';
import { useRowLevelSecurityStore, usePermissionStore } from '@/stores';
import { db } from './db';
import { CommandMenuProvider } from '@/components/GlobalSearch/CommandMenu';
import { NotificationCenterProvider } from '@/components/NotificationCenter/NotificationCenter';
import { ThemeProvider } from '@/hooks/useTheme/useTheme';
import { SkipLinksProvider } from '@/shared/components/ui/SkipLinks';
import { useAppInit } from '@/hooks/useAppInit';
import { MotionProvider, useMotionContext } from '@/hooks/useMotionContext';
import { useSimpleUI } from '@/hooks/useDeviceCapability';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardSimple } from '@/shared/components/redesign/DashboardSimple';

// ============================================================================
// LAZY IMPORTS - OPTIMIZACIÓN DE BUNDLE
// ============================================================================

// Componentes de autenticación
const Login = lazyWithRetry(() => import('@/components/Login').then(m => ({ default: m.Login })));
const StartSessionModal = lazyWithRetry(() => import('@/components/StartSessionModal').then(m => ({ default: m.StartSessionModal })));

// Dashboard - carga diferida o versión simple según dispositivo
const DashboardFull = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignDashboard })));

// Vistas principales (AppSheet-style) - Carga diferida
const CapturePage = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignCapturePage })));
const DataPage = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignDataPage })));
const SyncPage = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignSyncPage })));
const SettingsPage = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignSettingsPage })));

// Páginas en redesign (consolidadas)
const ReportsLegacy = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignReportsPage })));
const ExpiryPage = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignExpiryPage })));
const ExpiryLegacy = ExpiryPage;

// Páginas redesignadas
const CustomersPage = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignCustomersPage })));
const SuppliersPage = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignSuppliersPage })));
const SlicesPage = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignSlicesPage })));
const CountingPage = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignCountingPage })));
const ReceptionPage = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignReceptionPage })));
const DynamicPage = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignDynamicPage })));

// Otras páginas
const TheoreticalLoadsPage = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignTheoreticalLoadsPage })));
const HammerPage = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignHammerPage })));
const InventoryPage = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignInventoryPage })));
const AuditPage = lazyWithRetry(() => import('@/shared/components/redesign').then(m => ({ default: m.RedesignAuditPage })));

// Componentes pesados - Solo carga cuando se necesitan (y solo en desktop)
const Sidebar = lazyWithRetry(() => import('@/components/Sidebar').then(m => ({ default: m.Sidebar })));
const BottomDock = lazyWithRetry(() => import('@/components/BottomDock').then(m => ({ default: m.BottomDock })));
const OnboardingOverlay = lazyWithRetry(() => import('@/shared/components/core/OnboardingOverlay').then(m => ({ default: m.OnboardingOverlay })));
const SystemOperationsDrawer = lazyWithRetry(() => import('@/shared/components/core/SystemOperationsDrawer').then(m => ({ default: m.SystemOperationsDrawer })));
const ToastContainer = lazyWithRetry(() => import('@/shared/components/ui/ToastContainer').then(m => ({ default: m.ToastContainer })));
const TaskProgressIndicator = lazyWithRetry(() => import('@/shared/components/TaskProgressIndicator').then(m => ({ default: m.TaskProgressIndicator })));
const ThemeDemo = lazyWithRetry(() => import('@/shared/components/ui/ThemeDemo').then(m => ({ default: m.ThemeDemo })));

// Wrapper para ThemeDemo
const ThemeDemoPage = () => <ThemeDemo />;

// Redesign Preview
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
  
  // Motion context para animaciones optimizadas
  const { shouldReduceMotion, motionVariants } = useMotionContext();
  
  // Detectar si usar UI simplificada (móvil de gama baja)
  const isSimpleUI = useSimpleUI();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [hasInitialRedirected, setHasInitialRedirected] = useState(false);
  const navigate = useNavigate();
  
  // Activar hooks globales
  useAutoSync();
  useAutoSession();
  useExpiryWatcher();
  useExpiryNotifications();
  useAppShortcuts();

  // Inicializar workflows al cargar la app
  useEffect(() => {
    initializeWorkflows();
  }, []);

  // Sincronizar rol de usuario con RLS
  useEffect(() => {
    const syncRoleToRLS = () => {
      const permissionStore = usePermissionStore.getState();
      const rlsStore = useRowLevelSecurityStore.getState();
      
      const role = permissionStore.currentRole;
      const user = permissionStore.currentUser;
      
      // Actualizar contexto de seguridad
      rlsStore.setContext({
        userId: user?.id || 'anonymous',
        role: role,
      });
      
      // Si es admin, establecer bypass (ve todo)
      if (role === 'admin') {
        rlsStore.enableAdminBypass(true);
      } else {
        rlsStore.enableAdminBypass(false);
      }
    };
    
    syncRoleToRLS();
    
    // Suscribirse a cambios en el store de permisos
    const unsubscribe = usePermissionStore.subscribe((state, prevState) => {
      if (state.currentRole !== prevState.currentRole || state.currentUser !== prevState.currentUser) {
        syncRoleToRLS();
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Cargar ubicaciones disponibles para RLS desde la BD
  useEffect(() => {
    const loadLocations = async () => {
      const rlsStore = useRowLevelSecurityStore.getState();
      try {
        const locations = await db.locations.toArray();
        const locationNames = locations.map(l => l.name).filter(Boolean);
        locationNames.forEach(loc => rlsStore.addWarehouse(loc));
        
        // También cargar ubicaciones únicas de productos
        const products = await db.products.toArray();
        const uniqueLocations = [...new Set(products.map(p => p.location).filter(Boolean))];
        uniqueLocations.forEach(loc => { if (loc) rlsStore.addWarehouse(loc as string); });
      } catch (err) {
        console.warn('Error cargando ubicaciones:', err);
      }
    };
    loadLocations();
  }, []);

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
    settings.theme === 'gray' ? 'bg-[#E8E8E8] text-[#171717]' :
    settings.theme === 'night' ? 'bg-[#0A0A0B] text-white' :
    'bg-base text-slate-100';

  const isDarkMode = settings.theme === 'dark' || settings.theme === 'night' || settings.theme === 'high-contrast' || settings.theme === 'appsheet-dark';
  const isHighContrast = settings.theme === 'high-contrast';
  
  // Memoizar transición de página para evitar recrear en cada render
  const pageTransition = useMemo(() => ({
    duration: shouldReduceMotion ? 0 : 0.25,
    ease: [0.23, 1, 0.32, 1] as const
  }), [shouldReduceMotion]);
  
  // Dashboard según tipo de dispositivo
  const Dashboard = useMemo(() => {
    if (isSimpleUI) {
      return DashboardSimple;
    }
    return DashboardFull;
  }, [isSimpleUI]);

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
      {/* Solo cargar componentes de overlay en desktop */}
      {!isMobile && (
        <Suspense fallback={null}>
          <OnboardingOverlay />
          <SystemOperationsDrawer />
          <ToastContainer />
          <TaskProgressIndicator />
        </Suspense>
      )}
      
      <OfflineBanner />
      <Toaster position="bottom-center" />
      
      <div className="flex-1 flex overflow-hidden relative">
        {/* Solo mostrar Sidebar en desktop */}
        {!isScanningMode && !isMobile && (
          <Suspense fallback={null}>
            <Sidebar 
              view={location.pathname.split('/')[1] || 'dashboard'} 
              settings={settings} 
              isCollapsed={isSidebarCollapsed}
              onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
          </Suspense>
        )}
        
        <main 
          id="main-content"
          role="main"
          className={`flex-1 relative overflow-hidden ${!isScanningMode && !isMobile ? `transition-[padding-left] duration-300 ease-in-out ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}` : ''}`}
        >
          
          <ErrorBoundary>
            {/* Contenido con o sin animaciones según el dispositivo */}
            <RoutesWrapper
              location={location}
              Dashboard={Dashboard}
              shouldReduceMotion={shouldReduceMotion}
              motionVariants={motionVariants}
              pageTransition={pageTransition}
              CapturePage={CapturePage}
              DataPage={DataPage}
              SyncPage={SyncPage}
              ReportsLegacy={ReportsLegacy}
              ExpiryPage={ExpiryPage}
              SettingsPage={SettingsPage}
              CustomersPage={CustomersPage}
              SuppliersPage={SuppliersPage}
              SlicesPage={SlicesPage}
              CountingPage={CountingPage}
              ReceptionPage={ReceptionPage}
              DynamicPage={DynamicPage}
              HammerPage={HammerPage}
              TheoreticalLoadsPage={TheoreticalLoadsPage}
              InventoryPage={InventoryPage}
              AuditPage={AuditPage}
              ThemeDemoPage={ThemeDemoPage}
              RedesignPreviewPage={RedesignPreviewPage}
            />
          </ErrorBoundary>
        </main>
      </div>
      
      {/* BottomDock y botón flotante - siempre en móvil */}
      {!isScanningMode && (
        <>
          <Suspense fallback={null}>
            <BottomDock currentView={location.pathname.split('/')[1] || 'dashboard'} settings={settings} />
          </Suspense>
          {(location.pathname === '/' || location.pathname === '/dashboard') && (
            <button
              onClick={() => setStartSessionModalOpen(true)}
              className="md:hidden fixed bottom-24 right-6 z-[110] w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-2xl shadow-blue-900/50 flex items-center justify-center border-b-4 border-blue-800 active:scale-90 transition-transform"
            >
              <Plus className="w-8 h-8" />
            </button>
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

// ============================================================================
// ROUTES WRAPPER - Renderiza rutas con o sin animaciones según dispositivo
// ============================================================================

interface RoutesWrapperProps {
  location: ReturnType<typeof useLocation>;
  Dashboard: React.ComponentType;
  shouldReduceMotion: boolean;
  motionVariants: any;
  pageTransition: any;
  [key: string]: any;
}

const RoutesWrapper: React.FC<RoutesWrapperProps> = ({
  location,
  Dashboard,
  shouldReduceMotion,
  motionVariants,
  pageTransition,
  ...pages
}) => {
  const { 
    CapturePage, DataPage, SyncPage, ReportsLegacy, ExpiryPage, 
    SettingsPage, CustomersPage, SuppliersPage, SlicesPage, 
    CountingPage, ReceptionPage, DynamicPage,
    HammerPage, TheoreticalLoadsPage, InventoryPage, AuditPage,
    ThemeDemoPage, RedesignPreviewPage 
  } = pages;

  const content = (
    <Routes location={location}>
      {/* RUTAS PRINCIPALES */}
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      {/* Redirección: /capture ahora es /counting (flujo unificado) */}
      <Route path="/capture" element={<Navigate to="/counting" replace />} />
      <Route path="/capture/:tab" element={<Navigate to="/counting" replace />} />
      <Route path="/counting" element={<CountingPage />} />
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

      {/* PÁGINAS DE MÓDULOS */}
      <Route path="/counting" element={<CountingPage />} />
      <Route path="/counting/:id" element={<CountingPage />} />
      <Route path="/events" element={<ReportsLegacy />} />
      <Route path="/reception" element={<ReceptionPage />} />
      <Route path="/reception/:id" element={<ReceptionPage />} />
      <Route path="/dynamic" element={<DynamicPage />} />
      <Route path="/dynamic/:tableKey" element={<DynamicPage />} />

      {/* OTRAS PÁGINAS */}
      <Route path="/customers" element={<CustomersPage />} />
      <Route path="/providers" element={<SuppliersPage />} />
      <Route path="/slices" element={<SlicesPage />} />
      <Route path="/theoretical-loads" element={<TheoreticalLoadsPage />} />
      <Route path="/inventory" element={<InventoryPage />} />
      <Route path="/audit" element={<AuditPage />} />
      <Route path="/massive" element={<HammerPage />} />
      <Route path="/massive/:batchId" element={<HammerPage />} />

      {/* DEEP LINKS */}
      <Route path="/session/:id" element={<ReportsLegacy />} />
      <Route path="/product/:barcode" element={<DataPage />} />

      {/* DEMO */}
      <Route path="/theme-demo" element={<ThemeDemoPage />} />
      <Route path="/redesign" element={<RedesignPreviewPage />} />

      {/* RUTAS LEGACY (Alias) */}
      <Route path="/database" element={<Navigate to="/data" replace />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

  // Sin animaciones para dispositivos lentos
  if (shouldReduceMotion) {
    return (
      <Suspense 
        fallback={
          <div className="h-full w-full flex items-center justify-center bg-base">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        }
      >
        {content}
      </Suspense>
    );
  }

  // Con animaciones para dispositivos de gama alta
  return (
    <AnimatePresence mode="wait">
      <Suspense 
        fallback={
          <div className="h-full w-full flex items-center justify-center bg-base">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        }
      >
        <motion.div
          key={location.pathname}
          initial={motionVariants.page.initial}
          animate={motionVariants.page.animate}
          exit={motionVariants.page.exit}
          transition={pageTransition}
          className="h-full w-full"
        >
          {content}
        </motion.div>
      </Suspense>
    </AnimatePresence>
  );
};

// ============================================================================
// APP
// ============================================================================

const App = () => (
  <Router>
    <SkipLinksProvider>
      <ThemeProvider>
        <MotionProvider>
          <NotificationCenterProvider>
            <ErrorProvider>
              <CommandMenuProvider>
                <AppContent />
              </CommandMenuProvider>
            </ErrorProvider>
          </NotificationCenterProvider>
        </MotionProvider>
      </ThemeProvider>
    </SkipLinksProvider>
  </Router>
);

export default App;

