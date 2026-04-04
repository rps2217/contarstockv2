
import React, { Suspense, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useAppStore } from '@/store/mainAppStore'; // Vercel Cache Invalidation Ref: 20260404-03
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NetworkStatus } from '@/shared/components/ui/NetworkStatus';
import { Sidebar } from '@/components/Sidebar';
import { BottomDock } from '@/components/BottomDock';
import { SystemStatus } from '@/components/SystemStatus';
import { Box, Loader2, Database, WifiOff, Cpu, RefreshCw, Plus } from 'lucide-react';
import { lazyWithRetry } from '@/services/lazyLoad';
import { initPersistence } from '@/services/backupService';
import { InitializationService, InitStep } from '@/services/initializationService';
import { ToastContainer } from '@/shared/components/ui/ToastContainer';
import { useAutoSync } from '@/hooks/useAutoSync';
import { useAutoSession } from '@/hooks/useAutoSession';
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
const ReceptionHub = lazyWithRetry(() => import('@/features/reception/ReceptionHub'));
const CountingPage = lazyWithRetry(() => import('@/features/counting/CountingPage'));
const HammerPage = lazyWithRetry(() => import('@/features/hammer/HammerPage'));
const ExpiryManagement = lazyWithRetry(() => import('@/features/expiry/ExpiryManagementPage'));
const EventManagement = lazyWithRetry(() => import('@/features/events/EventManagementPage'));
const ExpiryCapturePage = lazyWithRetry(() => import('@/features/expiry/ExpiryCapturePage'));
const EventCapturePage = lazyWithRetry(() => import('@/features/events/EventCapturePage'));
const DynamicManagement = lazyWithRetry(() => import('@/features/dynamic/DynamicManagementPage').then(m => ({ default: m.DynamicManagementPage })));
const GlobalSyncQueue = lazyWithRetry(() => import('@/features/sync/GlobalSyncQueuePage'));

const AppContent = () => {
  const location = useLocation();
  const { settings, isStartSessionModalOpen, setStartSessionModalOpen } = useAppStore();
  const [bootState, setBootState] = useState<'initializing' | 'ready'>('initializing');
  const [initStep, setInitStep] = useState<InitStep>('idle');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const navigate = useNavigate();
  
  // Activar sincronización automática inteligente
  useAutoSync();
  
  // Activar detección de escaneo espontáneo (Zero-Click)
  useAutoSession();

  // Detectar si estamos en un modo de escaneo inmersivo (Optimizado con useMemo)
  const isScanningMode = React.useMemo(() => {
    const paths = [
      '/counting/', 
      '/reception', 
      '/expiry/capture', 
      '/events/capture', 
      '/massive/'
    ];
    return paths.some(p => location.pathname.startsWith(p));
  }, [location.pathname]);

  useEffect(() => {
    initPersistence();
    const authStatus = localStorage.getItem('logicount_auth') === 'true';
    setIsAuthenticated(authStatus);
    
    if (authStatus) {
      InitializationService.run((step) => {
        setInitStep(step);
        if (step === 'ready') setBootState('ready');
      });
    } else {
      setBootState('ready');
    }
  }, [isAuthenticated]);

  const themeClasses: Record<string, string> = {
    'light': 'bg-slate-50 text-slate-900',
    'dark': 'bg-slate-950 text-slate-100'
  };

  const currentThemeClass = themeClasses[settings.theme] || themeClasses.dark;

  if (bootState === 'initializing' && isAuthenticated !== false) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white p-8 font-mono">
        <div className="relative mb-10">
          <div className={`p-10 border-4 ${initStep === 'purging' ? 'border-amber-500' : 'border-blue-600'} rounded-[3rem] relative z-10 bg-slate-950`}>
            {initStep === 'config' ? <Cpu className="w-16 h-16 text-blue-400 animate-pulse" /> : 
            initStep === 'database' ? <Database className="w-16 h-16 text-amber-500 animate-bounce" /> :
            initStep === 'purging' ? <RefreshCw className="w-16 h-16 text-amber-500 animate-spin" /> :
            initStep === 'offline' ? <WifiOff className="w-16 h-16 text-rose-500" /> :
            <Box className="w-16 h-16 text-blue-500 animate-pulse" />}
          </div>
          <div className={`absolute inset-0 ${initStep === 'purging' ? 'bg-amber-600' : 'bg-blue-600'} blur-[60px] opacity-20 animate-pulse`}></div>
        </div>

        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-1">
          LOGICOUNT <span className="text-blue-500">PRO</span>
        </h1>
        
        <div className="mt-8 w-64">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              {initStep === 'config' ? 'Cloud_Sync' : 
              initStep === 'database' ? 'Catalog_Refresh' : 
              initStep === 'purging' ? 'Purging_Cache' :
              'Kernel_Init'}
            </span>
            <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
            <div className="h-full bg-blue-600 transition-all duration-500 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={
        <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      }>
        <Login onLoginSuccess={() => setIsAuthenticated(true)} />
      </Suspense>
    );
  }

  return (
    <div className={`w-full h-full flex flex-col transition-colors duration-500 ${currentThemeClass} font-mono`}>
      <SystemStatus />
      <NetworkStatus />
      <ToastContainer />
      
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
          <ErrorBoundary>
            <Suspense fallback={<div className="h-full w-full flex items-center justify-center"><Loader2 className="w-10 h-10 text-blue-600 animate-spin" /></div>}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/database" element={<DatabaseView />} />
                <Route path="/sync" element={<Sync />} />
                <Route path="/sync/queue" element={<GlobalSyncQueue />} />
                <Route path="/settings" element={<Settings />} />
                
                {/* RUTAS MODULARES DE FEATURES */}
                <Route path="/expiry" element={<ExpiryManagement />} />
                <Route path="/expiry/capture" element={<ExpiryCapturePage />} />
                <Route path="/events" element={<EventManagement />} />
                <Route path="/events/capture" element={<EventCapturePage />} />
                <Route path="/dynamic/:tableKey" element={<DynamicManagement />} />
                <Route path="/counting/:id" element={<CountingPage />} />
                <Route path="/massive/:batchId" element={<HammerPage />} />
                
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      
      {!isScanningMode && (
        <>
          <BottomDock currentView={location.pathname.split('/')[1] || 'dashboard'} settings={settings} />
          
          {/* BOTÓN FLOTANTE DE ACCESO RÁPIDO (MÓVIL) - SOLO EN DASHBOARD */}
          {(location.pathname === '/' || location.pathname === '/dashboard') && (
            <button 
              onClick={() => setStartSessionModalOpen(true)}
              className="md:hidden fixed bottom-20 right-6 z-[110] w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-900/40 flex items-center justify-center active:scale-95 transition-all border-b-4 border-blue-800"
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
