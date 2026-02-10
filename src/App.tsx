
import React, { Suspense, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkStatus } from './components/NetworkStatus';
import { Sidebar } from './components/Sidebar';
import { BottomDock } from './components/BottomDock';
import { SystemStatus } from './components/SystemStatus';
import { Box, Loader2, Database, WifiOff, Cpu, RefreshCw } from 'lucide-react';
import { lazyWithRetry } from './services/lazyLoad';
import { initPersistence } from './services/backupService';
import { Login } from './components/Login';
import { InitializationService, InitStep } from './services/initializationService';
import { logger } from './services/logger';

// --- CARGA DIFERIDA DE MÓDULOS ---
const Dashboard = lazyWithRetry(() => import('./components/Dashboard'));
const Reports = lazyWithRetry(() => import('./components/Reports'));
const DatabaseView = lazyWithRetry(() => import('./components/Database'));
const Sync = lazyWithRetry(() => import('./components/SyncManagerUI'));
const Settings = lazyWithRetry(() => import('./components/Settings'));

const HammerPage = lazyWithRetry(() => import('./features/hammer/HammerPage'));
const CountingPage = lazyWithRetry(() => import('./features/counting/CountingPage'));
const ReceptionPage = lazyWithRetry(() => import('./features/reception/ReceptionPage'));

const AppContent = () => {
  const location = useLocation();
  const { settings } = useAppStore();
  const [bootState, setBootState] = useState<'checking_auth' | 'initializing' | 'ready'>('checking_auth');
  const [initStep, setInitStep] = useState<InitStep>('idle');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  const isScanningMode = location.pathname.startsWith('/counting/') || 
                         location.pathname === '/reception' || 
                         location.pathname.startsWith('/massive/');

  useEffect(() => {
    const startupSequence = async () => {
        await initPersistence();

        const authStatus = localStorage.getItem('logicount_auth') === 'true';
        setIsAuthenticated(authStatus);
        
        if (authStatus) {
            setBootState('initializing');
            await InitializationService.run((step) => {
                setInitStep(step);
                if (step === 'ready') {
                    setBootState('ready');
                    logger.success('BOOT', 'Kernel del sistema operativo y listo.');
                }
            });
        } else {
            setBootState('ready');
        }
    };

    startupSequence();
  }, []);

  const themeClasses: Record<string, string> = {
    'light': 'bg-slate-50 text-slate-900',
    'dark': 'bg-slate-950 text-slate-100',
    'navy': 'bg-blue-950 text-blue-50',
    'oled': 'bg-black text-white',
    'warm': 'bg-orange-50 text-orange-950',
    'contrast': 'bg-yellow-400 text-black'
  };

  const currentThemeClass = themeClasses[settings.theme] || themeClasses.dark;

  if (bootState !== 'ready') {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white p-8 font-mono">
          <div className="relative mb-10">
            <div className={`p-10 border-4 ${initStep === 'purging' ? 'border-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.2)]' : 'border-blue-600'} rounded-[3rem] relative z-10 bg-slate-950 transition-colors duration-500`}>
                {initStep === 'config' ? <Cpu className="w-16 h-16 text-blue-400 animate-pulse" /> : 
                 initStep === 'database' ? <Database className="w-16 h-16 text-amber-500 animate-bounce" /> :
                 initStep === 'offline' ? <WifiOff className="w-16 h-16 text-rose-500" /> :
                 initStep === 'purging' ? <RefreshCw className="w-16 h-16 text-amber-500 animate-spin" /> :
                 <Box className="w-16 h-16 text-blue-500 animate-pulse" />}
            </div>
            <div className={`absolute inset-0 ${initStep === 'purging' ? 'bg-amber-600' : 'bg-blue-600'} blur-[60px] opacity-20 animate-pulse transition-colors duration-500`}></div>
          </div>

          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-1">
            LOGICOUNT <span className={initStep === 'purging' ? 'text-amber-500' : 'text-blue-500'}>PRO</span>
          </h1>
          
          <div className="mt-8 w-64">
              <div className="flex justify-between items-center mb-2 px-1">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${initStep === 'purging' ? 'text-amber-500' : 'text-slate-500'}`}>
                    {initStep === 'version_check' ? 'Verificando_Kernel' :
                     initStep === 'config' ? 'Sincronizando_Config' : 
                     initStep === 'database' ? 'Refrescando_Catalogo' : 
                     initStep === 'purging' ? 'Purgando_Cache_Viejo' :
                     initStep === 'offline' ? 'Red_No_Disponible' :
                     'Inicializando_Kernel'}
                  </span>
                  {initStep !== 'offline' && <Loader2 className={`w-3 h-3 ${initStep === 'purging' ? 'text-amber-500' : 'text-blue-500'} animate-spin`} />}
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                  <div 
                    className={`h-full transition-all duration-500 ${initStep === 'offline' ? 'bg-rose-600 w-full' : initStep === 'purging' ? 'bg-amber-500 w-full animate-pulse' : 'bg-blue-600'} ${initStep === 'version_check' ? 'w-1/5' : initStep === 'config' ? 'w-2/5' : initStep === 'database' ? 'w-4/5' : initStep === 'ready' ? 'w-full' : 'w-1/4'}`} 
                  />
              </div>
              <p className="text-[7px] font-bold text-slate-600 uppercase tracking-[0.4em] mt-4 text-center">
                V5.6_CORE_RESET
              </p>
          </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;

  return (
    <div className={`w-full h-full flex flex-col transition-colors duration-500 ${currentThemeClass} font-mono`}>
      <SystemStatus />
      <NetworkStatus />
      
      <div className="flex-1 flex overflow-hidden relative">
        {!isScanningMode && <Sidebar view={location.pathname.split('/')[1] || 'dashboard'} settings={settings} />}
        
        <main className={`flex-1 relative overflow-hidden transition-all duration-500 ${!isScanningMode ? 'md:pl-64' : ''}`}>
          <ErrorBoundary>
            <Suspense fallback={
                <div className="h-full w-full flex flex-col items-center justify-center p-12">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Loading_Module...</p>
                </div>
            }>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/database" element={<DatabaseView />} />
                <Route path="/sync" element={<Sync />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/reception" element={<ReceptionPage />} />
                <Route path="/counting/:id" element={<CountingPage />} />
                <Route path="/massive/:batchId" element={<HammerPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      
      {!isScanningMode && <BottomDock currentView={location.pathname.split('/')[1] || 'dashboard'} settings={settings} />}
    </div>
  );
};

const App = () => (
  <Router>
    <AppContent />
  </Router>
);

export default App;
