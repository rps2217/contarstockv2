
import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkStatus } from './components/NetworkStatus';
import { Sidebar } from './components/Sidebar';
import { BottomDock } from './components/BottomDock';
import { SystemStatus } from './components/SystemStatus';
import { Box, Loader2 } from 'lucide-react';
import { lazyWithRetry } from './services/lazyLoad';

const Dashboard = lazyWithRetry(() => import('./components/Dashboard.tsx'));
const Reports = lazyWithRetry(() => import('./components/Reports.tsx'));
const DatabaseView = lazyWithRetry(() => import('./components/Database.tsx'));
const Sync = lazyWithRetry(() => import('./components/SyncManagerUI.tsx'));
const Reception = lazyWithRetry(() => import('./components/Reception.tsx'));
const Settings = lazyWithRetry(() => import('./components/Settings.tsx'));
const MassiveBlindView = lazyWithRetry(() => import('./components/MassiveBlindView.tsx'));

const AppContent = () => {
  const location = useLocation();
  const { settings } = useAppStore();
  const [bootState, setBootState] = useState<'testing' | 'ready'>('testing');
  
  const isScanningMode = location.pathname.startsWith('/counting/') || 
                         location.pathname === '/reception' || 
                         location.pathname.startsWith('/massive/');

  useEffect(() => {
    const timer = setTimeout(() => setBootState('ready'), 800);
    return () => clearTimeout(timer);
  }, []);

  if (bootState === 'testing') return (
    <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white p-8">
        <div className="p-8 border-4 border-blue-600 rounded-[2.5rem] mb-6">
          <Box className="w-16 h-16 text-blue-500 animate-pulse" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tighter italic">LogiCount <span className="text-blue-500">Pro</span></h1>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mt-4 animate-pulse">Initializing_Kernel_v4.0</p>
    </div>
  );

  return (
    <div className={`w-full h-full flex flex-col bg-slate-950 text-slate-100 font-mono selection:bg-blue-500 selection:text-white`}>
      <SystemStatus />
      <NetworkStatus />
      
      <div className="flex-1 flex overflow-hidden relative">
        {!isScanningMode && <Sidebar view={location.pathname.split('/')[1] || 'dashboard'} settings={settings} />}
        
        <main className={`flex-1 relative overflow-hidden transition-all duration-500 ${!isScanningMode ? 'md:pl-64' : ''}`}>
          <ErrorBoundary>
            <Suspense fallback={
                <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 p-12">
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
                <Route path="/reception" element={<Reception />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/massive/:batchId" element={<MassiveBlindView />} />
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
