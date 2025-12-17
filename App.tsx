import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet, HashRouter } from 'react-router-dom';
import { CountingSession } from './types';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InstallPrompt } from './components/InstallPrompt';
import { NetworkStatus } from './components/NetworkStatus'; 
import { Sidebar } from './components/Sidebar'; 
import * as sessionService from './services/sessionService'; 
import { useAppStore } from './store/useAppStore';
import { db } from './db';
import { processSyncQueue } from './services/syncManager';
import { initPersistence } from './services/backupService';
import { Home, Database as DbIcon, History, Layers, Container, Fingerprint, Cloud, Loader2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { lazyWithRetry } from './services/lazyLoad';

// Optimized Lazy Load with Retry Strategy
const Scanner = lazyWithRetry(() => import('./components/Scanner').then(module => ({ default: module.Scanner })));
const DatabaseView = lazyWithRetry(() => import('./components/Database').then(module => ({ default: module.Database })));
const Reports = lazyWithRetry(() => import('./components/Reports').then(module => ({ default: module.Reports })));
const Consolidated = lazyWithRetry(() => import('./components/Consolidated').then(module => ({ default: module.Consolidated })));
const Conciliator = lazyWithRetry(() => import('./components/Conciliator').then(module => ({ default: module.Conciliator })));
const SettingsView = lazyWithRetry(() => import('./components/Settings').then(module => ({ default: module.Settings })));
const Reception = lazyWithRetry(() => import('./components/Reception').then(module => ({ default: module.Reception })));
const SyncManagerUI = lazyWithRetry(() => import('./components/SyncManagerUI').then(module => ({ default: module.SyncManagerUI })));

const LoadingFallback = () => (
  <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 gap-3 animate-pulse">
    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
    <span className="text-xs font-bold uppercase tracking-wider">Cargando...</span>
  </div>
);

// --- LAYOUTS ---

const MainLayout = () => {
    const { settings } = useAppStore();
    // PERFORMANCE FIX: Removed useLiveQuery(pendingSyncCount) from here.
    // It was causing the entire Layout (and Outlet) to re-render on every single database write.
    
    const location = useLocation();
    
    // Determine ViewState for Sidebar highlighting based on URL
    const currentView = location.pathname.split('/')[1] || 'dashboard';

    // Theme Class
    const themeClass = useMemo(() => {
        switch (settings.theme) {
            case 'dark': return 'bg-slate-950 text-slate-200';
            case 'contrast': return 'bg-black text-yellow-400 font-mono';
            case 'warm': return 'bg-[#fcf8f2] text-[#57534e]';
            case 'navy': return 'bg-[#0B1121] text-slate-300';
            default: return 'bg-[#eff3f8] text-slate-600';
        }
    }, [settings.theme]);

    return (
        <div className={`min-h-screen font-sans ${themeClass} transition-colors duration-300 flex`}>
            <NetworkStatus />
            <Sidebar view={currentView} settings={settings} />
            
            <main className="flex-1 md:ml-64 w-full animate-in fade-in zoom-in-95 duration-300 min-h-screen relative pb-16 md:pb-0">
                <Suspense fallback={<LoadingFallback />}>
                    <Outlet />
                </Suspense>
            </main>

            <InstallPrompt />
            <MobileNav currentView={currentView} settings={settings} />
        </div>
    );
};

// --- APP CONTENT ---

const AppContent: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const initDb = async () => {
        try {
            await (db as any).open();
            setDbReady(true);
            await initPersistence();
        } catch (e: any) {
            setDbError(`Error crítico: ${e.message}`);
        }
    };
    initDb();

    if (localStorage.getItem('logicount_auth') === 'true') {
        setIsAuthenticated(true);
    }

    const syncInterval = setInterval(async () => {
        if (navigator.onLine) {
            try { await processSyncQueue(); } catch (e) {}
        }
    }, 60000); 
    return () => clearInterval(syncInterval);
  }, []);

  if (dbError) return <div className="p-8 text-red-600 text-center font-bold">{dbError}</div>;
  if (!dbReady) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-blue-600"/></div>;

  if (!isAuthenticated) {
      return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <Routes>
        <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/database" element={<DatabaseView />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports/:sessionId" element={<Reports />} />
            <Route path="/consolidated" element={<Consolidated />} />
            <Route path="/conciliator" element={<Conciliator />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/sync" element={<SyncManagerUI />} />
        </Route>
        
        {/* Fullscreen Routes */}
        <Route path="/counting/:sessionId" element={
            <Suspense fallback={<LoadingFallback />}>
                <ScannerWrapper />
            </Suspense>
        } />
        <Route path="/reception" element={
            <Suspense fallback={<LoadingFallback />}>
                <Reception />
            </Suspense>
        } />
    </Routes>
  );
};

// --- WRAPPERS ---

import { useParams } from 'react-router-dom';

const ScannerWrapper = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const session = useLiveQuery(() => db.sessions.get(sessionId!), [sessionId]);

    if (!session) return <LoadingFallback />;

    return (
        <div className="h-screen bg-slate-950 overflow-hidden">
            <Scanner 
                session={session} 
                onCloseSession={async () => {
                    await sessionService.closeSession(session.id);
                    navigate('/reports');
                }}
                onDiscardSession={async () => {
                    await sessionService.deleteSession(session.id);
                    navigate('/reports');
                }}
            />
        </div>
    );
};

const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <HashRouter>
                <AppContent />
            </HashRouter>
        </ErrorBoundary>
    );
};

// --- MOBILE NAV ---

const NAV_CONFIG: Record<string, { label: string, icon: React.ReactNode, path: string }> = {
    'dashboard': { label: 'Inicio', icon: <Home className="w-5 h-5" />, path: '/dashboard' },
    'database': { label: 'Datos', icon: <DbIcon className="w-5 h-5" />, path: '/database' },
    'reports': { label: 'Historial', icon: <History className="w-5 h-5" />, path: '/reports' },
    'consolidated': { label: 'Consol.', icon: <Layers className="w-5 h-5" />, path: '/consolidated' },
    'reception': { label: 'Recep.', icon: <Container className="w-5 h-5" />, path: '/reception' },
    'conciliator': { label: 'Detect.', icon: <Fingerprint className="w-5 h-5" />, path: '/conciliator' },
    'sync': { label: 'Nube', icon: <Cloud className="w-5 h-5" />, path: '/sync' },
};

const MobileNav = ({ currentView, settings }: any) => {
  const navigate = useNavigate();
  const navItems = settings.mobileNavConfig || ['dashboard', 'database', 'reports'];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur border-t border-slate-200 pb-safe-area">
        <div className="flex justify-around items-center h-16 px-1">
            {navItems.map((key: string) => {
                const conf = NAV_CONFIG[key];
                if (!conf) return null;
                const isActive = currentView === key;
                return (
                    <button 
                        key={key}
                        onClick={() => navigate(conf.path)}
                        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                    >
                        <div className={`${isActive ? '-translate-y-1' : ''} transition-transform duration-200`}>{conf.icon}</div>
                        <span className="text-[10px] font-bold leading-none">{conf.label}</span>
                    </button>
                );
            })}
        </div>
    </nav>
  );
};

export default App;