
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
      const bootSequence = async () => {
          try {
              // Auditoría rápida de integridad al inicio
              const audit = await runFullSystemAudit();
              if (audit.failed > 0) {
                  console.error("Fallo de integridad en arranque", audit.logs);
              }
              await runFullMetadataRepair();
              setBootState('ready');
          } catch (e) {
              console.error("Error crítico de arranque", e);
              setBootState('failed');
          }
      };
      bootSequence();
  }, []);

  if (bootState === 'testing') return (
      <div className="h-screen w-full bg-[#0f172a] flex flex-col items-center justify-center text-white">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Cargando Sistema...</span>
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
            <Suspense fallback={<div className="h-full w-full flex items-center justify-center"><div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div></div>}>
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
