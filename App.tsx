
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkStatus } from './components/NetworkStatus';
import { InstallPrompt } from './components/InstallPrompt';
import { Sidebar } from './components/Sidebar';
import { BottomDock } from './components/BottomDock';
import { runFullMetadataRepair } from './components/maintenance/RecalculateTool';
import { runFullSystemAudit } from './services/businessLogic.test';
import { Box, Loader2, CheckCircle2 } from 'lucide-react';

// Core Lazy imports only
const Dashboard = lazy(() => import('./components/Dashboard.tsx'));
const Reports = lazy(() => import('./components/Reports.tsx'));
const DatabaseView = lazy(() => import('./components/Database.tsx'));
const Sync = lazy(() => import('./components/SyncManagerUI.tsx'));
const Consolidated = lazy(() => import('./components/Consolidated.tsx'));
const Reception = lazy(() => import('./components/Reception.tsx'));
const Settings = lazy(() => import('./components/Settings.tsx'));
const CountingView = lazy(() => import('./components/CountingView.tsx'));

const AppContent = () => {
  const location = useLocation();
  const { settings } = useAppStore();
  const [bootState, setBootState] = useState<'testing' | 'ready' | 'failed'>('testing');
  
  const currentView = location.pathname.split('/')[1] || 'dashboard';
  const isScanningMode = location.pathname.startsWith('/counting/') || location.pathname === '/reception';

  useEffect(() => {
      let isMounted = true;
      const bootSequence = async () => {
          try {
              // Race condition: Si el audit tarda más de 2 seg, forzamos carga para no bloquear al usuario
              const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('timeout'), 2000));
              
              const auditPromise = (async () => {
                  await runFullSystemAudit();
                  await runFullMetadataRepair();
                  return 'done';
              })();

              await Promise.race([auditPromise, timeoutPromise]);
              
              if (isMounted) setBootState('ready');
          } catch (e) {
              console.error("Boot warning", e);
              if (isMounted) setBootState('ready'); // Fail-safe: Cargar app de todas formas
          }
      };
      bootSequence();
      return () => { isMounted = false; };
  }, []);

  if (bootState === 'testing') return (
      <div className="h-screen w-full bg-[#0f172a] flex flex-col items-center justify-center text-white p-8 text-center select-none">
          <div className="bg-blue-600/20 p-6 rounded-[2rem] mb-8 border border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.2)]">
            <Box className="w-16 h-16 text-blue-500 animate-pulse" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-2">LogiCount <span className="text-blue-500">Pro</span></h1>
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Verificando Integridad...</span>
          </div>
      </div>
  );

  const theme = settings.theme || 'light';
  const isDarkTheme = ['dark', 'oled'].includes(theme);

  return (
    <div className={`w-full h-full flex flex-col theme-${theme} ${isDarkTheme ? 'dark' : ''}`}>
      <NetworkStatus />
      
      <div className="flex-1 flex overflow-hidden relative">
        {!isScanningMode && <Sidebar view={currentView} settings={settings} />}
        
        <main className={`flex-1 relative overflow-hidden ${!isScanningMode ? 'md:pl-64' : ''}`}>
          <ErrorBoundary>
            <Suspense fallback={
                <div className="h-full w-full flex items-center justify-center bg-slate-50 dark:bg-black">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                </div>
            }>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/database" element={<DatabaseView />} />
                <Route path="/sync" element={<Sync />} />
                <Route path="/consolidated" element={<Consolidated />} />
                <Route path="/reception" element={<Reception />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/counting/:id" element={<CountingView />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      
      {!isScanningMode && <BottomDock currentView={currentView} settings={settings} />}
      <InstallPrompt />
    </div>
  );
};

const App = () => (
  <Router>
    <AppContent />
  </Router>
);

export default App;
