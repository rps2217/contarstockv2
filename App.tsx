import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet, HashRouter, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Home, Database as DbIcon, History, Layers, Container, Fingerprint, Cloud, Loader2 } from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import { db } from './db';
import { processSyncQueue } from './services/syncManager';
import { initPersistence } from './services/backupService';
import { lazyWithRetry } from './services/lazyLoad';
import * as sessionService from './services/sessionService';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InstallPrompt } from './components/InstallPrompt';
import { SystemStatus } from './components/SystemStatus'; 
import { Sidebar } from './components/Sidebar'; 

const Scanner = lazyWithRetry(() => import('./components/Scanner').then(m => ({ default: m.Scanner })));
const DatabaseView = lazyWithRetry(() => import('./components/Database').then(m => ({ default: m.Database })));
const Reports = lazyWithRetry(() => import('./components/Reports').then(m => ({ default: m.Reports })));
const Consolidated = lazyWithRetry(() => import('./components/Consolidated').then(m => ({ default: m.Consolidated })));
const Conciliator = lazyWithRetry(() => import('./components/Conciliator').then(m => ({ default: m.Conciliator })));
const SettingsView = lazyWithRetry(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const Reception = lazyWithRetry(() => import('./components/Reception').then(m => ({ default: m.Reception })));
const SyncManagerUI = lazyWithRetry(() => import('./components/SyncManagerUI').then(m => ({ default: m.SyncManagerUI })));

const LoadingFallback = () => (
  <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 gap-4 animate-pulse">
    <Loader2 className="w-14 h-14 animate-spin text-blue-500" />
    <span className="text-sm font-bold uppercase tracking-wider">Cargando Sistema...</span>
  </div>
);

const MainLayout = () => {
    const { settings } = useAppStore();
    const location = useLocation();
    const currentView = location.pathname.split('/')[1] || 'dashboard';

    return (
        <div className="min-h-screen font-sans bg-slate-50 text-slate-900 transition-colors duration-300 flex">
            <SystemStatus />
            <Sidebar view={currentView} settings={settings} />
            <main className="flex-1 md:ml-64 w-full animate-in fade-in duration-500 min-h-screen relative pb-24 md:pb-0">
                <Suspense fallback={<LoadingFallback />}>
                    <div className="p-4 md:p-8 max-w-7xl mx-auto">
                      <Outlet />
                    </div>
                </Suspense>
            </main>
            <InstallPrompt />
            <MobileNav currentView={currentView} settings={settings} />
        </div>
    );
};

const AppContent: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const initDb = async () => {
        try {
            await db.open();
            setDbReady(true);
            await initPersistence();
        } catch (e: any) {
            setDbError(String(e.message || e));
        }
    };
    initDb();

    if (localStorage.getItem('logicount_auth') === 'true') {
        setIsAuthenticated(true);
    }

    const syncInterval = setInterval(() => {
        if (navigator.onLine) processSyncQueue().catch(() => {});
    }, 60000); 
    return () => clearInterval(syncInterval);
  }, []);

  if (dbError) return <div className="p-12 text-rose-600 text-center font-bold text-xl bg-white min-h-screen flex items-center justify-center">Error de base de datos: {dbError}</div>;
  if (!dbReady) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin w-12 h-12 text-blue-500"/></div>;

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
        <Route path="/counting/:sessionId" element={<Suspense fallback={<LoadingFallback />}><ScannerWrapper /></Suspense>} />
        <Route path="/reception" element={<Suspense fallback={<LoadingFallback />}><Reception /></Suspense>} />
    </Routes>
  );
};

const ScannerWrapper = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const session = useLiveQuery(() => db.sessions.get(sessionId!), [sessionId]);

    if (!session) return <LoadingFallback />;

    return (
        <div className="h-screen bg-slate-100 overflow-hidden">
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

const App: React.FC = () => (
    <ErrorBoundary>
        <HashRouter>
            <AppContent />
        </HashRouter>
    </ErrorBoundary>
);

const NAV_CONFIG: Record<string, { label: string, icon: React.ReactNode, path: string }> = {
    'dashboard': { label: 'Inicio', icon: <Home className="w-7 h-7" />, path: '/dashboard' },
    'database': { label: 'Datos', icon: <DbIcon className="w-7 h-7" />, path: '/database' },
    'reports': { label: 'Historial', icon: <History className="w-7 h-7" />, path: '/reports' },
    'consolidated': { label: 'Consol.', icon: <Layers className="w-7 h-7" />, path: '/consolidated' },
    'reception': { label: 'Recep.', icon: <Container className="w-7 h-7" />, path: '/reception' },
    'conciliator': { label: 'Detect.', icon: <Fingerprint className="w-7 h-7" />, path: '/conciliator' },
    'sync': { label: 'Nube', icon: <Cloud className="w-7 h-7" />, path: '/sync' },
};

const MobileNav = ({ currentView, settings }: any) => {
  const navigate = useNavigate();
  const navItems = settings.mobileNavConfig || ['dashboard', 'database', 'reports', 'sync'];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 pb-safe-area shadow-lg">
        <div className="flex justify-around items-center h-16 px-2">
            {navItems.map((key: string) => {
                const conf = NAV_CONFIG[key];
                if (!conf) return null;
                const isActive = currentView === key;
                return (
                    <button 
                        key={key}
                        onClick={() => navigate(conf.path)}
                        className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                    >
                        <div className="transition-all">{conf.icon}</div>
                        <span className={`text-[10px] font-bold uppercase ${isActive ? 'opacity-100' : 'opacity-60'}`}>{conf.label}</span>
                    </button>
                );
            })}
        </div>
    </nav>
  );
};

export default App;