
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
import { Box } from 'lucide-react';

// Core Lazy imports
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
              const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('timeout'), 1500));
              const auditPromise = (async () => {
                  await runFullSystemAudit();
                  await runFullMetadataRepair();
                  return 'done';
              })();
              await Promise.race([auditPromise, timeoutPromise]);
              if (isMounted) setBootState('ready');
          } catch (e) {
              if (isMounted) setBootState('ready');
          }
      };
      bootSequence();
      return () => { isMounted = false; };
  }, []);

  if (bootState === 'testing') return (
      <div className="h-screen w-full bg-[#0f172a] flex flex-col items-center justify-center text-white p-8 text-center select-none font-sans">
          <div className="bg-blue-600/20 p-6 rounded-[2rem] mb-8 border border-blue-500/30">
            <Box className="w-16 h-16 text-blue-500 animate-pulse" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-2">LogiCount <span className="text-blue-500">Pro</span></h1>
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Verificando...</span>
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
                <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-black p-12">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Cargando Módulo...</p>
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
