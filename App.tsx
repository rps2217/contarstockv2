
import React, { Suspense, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkStatus } from './components/NetworkStatus';
import { Sidebar } from './components/Sidebar';
import { BottomDock } from './components/BottomDock';
import { SystemStatus } from './components/SystemStatus';
import { Box, Loader2 } from 'lucide-react';
import { lazyWithRetry } from './services/lazyLoad';
import { initPersistence } from './services/backupService';
import { Login } from './components/Login';

const Dashboard = lazyWithRetry(() => import('./components/Dashboard'));
const Reports = lazyWithRetry(() => import('./components/Reports'));
const DatabaseView = lazyWithRetry(() => import('./components/Database'));
const Sync = lazyWithRetry(() => import('./components/SyncManagerUI'));
const Reception = lazyWithRetry(() => import('./components/Reception'));
const Settings = lazyWithRetry(() => import('./components/Settings'));
const MassiveBlindView = lazyWithRetry(() => import('./components/MassiveBlindView'));
const CountingView = lazyWithRetry(() => import('./components/CountingView'));

const AppContent = () => {
  const location = useLocation();
  const { settings } = useAppStore();
  const [bootState, setBootState] = useState<'testing' | 'ready'>('testing');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  const isScanningMode = location.pathname.startsWith('/counting/') || 
                         location.pathname === '/reception' || 
                         location.pathname.startsWith('/massive/');

  useEffect(() => {
    initPersistence();
    const authStatus = localStorage.getItem('logicount_auth') === 'true';
    setIsAuthenticated(authStatus);
    const timer = setTimeout(() => setBootState('ready'), 800);
    return () => clearTimeout(timer);
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

  if (bootState === 'testing' || isAuthenticated === null) return (
    <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white p-8">
        <div className="p-8 border-4 border-blue-600 rounded-[2.5rem] mb-6">
          <Box className="w-16 h-16 text-blue-500 animate-pulse" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tighter italic">LogiCount <span className="text-blue-500">Pro</span></h1>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mt-4 animate-pulse">Initializing_Kernel_v4.5</p>
    </div>
  );

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
                <Route path="/reception" element={<Reception />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/counting/:id" element={<CountingView />} />
                <Route path="/massive/:batchId" element={<MassiveBlindView />} />
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
