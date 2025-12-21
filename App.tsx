
import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet, HashRouter, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Home, Layers, Cloud, Loader2 } from 'lucide-react';
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
  <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 gap-4">
    <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
    <span className="text-xs font-bold uppercase tracking-widest">Cargando Sistema...</span>
  </div>
);

const MainLayout = () => {
    const { settings } = useAppStore();
    const location = useLocation();
    const currentView = location.pathname.split('/')[1] || 'dashboard';

    return (
        <div className="min-h-screen bg-[#FDFCF9] text-slate-900 flex flex-col md:flex-row transition-all duration-300">
            <SystemStatus />
            <Sidebar view={currentView} settings={settings} />
            <main className="flex-1 md:ml-64 w-full relative pb-24 md:pb-0">
                <Suspense fallback={<LoadingFallback />}>
                    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
                      <Outlet />
                    </div>
                </Suspense>
            </main>
            <InstallPrompt />
            <MobileNav currentView={currentView} />
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
            // Using as any for open() call to ensure method recognition regardless of inheritance complexity
            await (db as any).open();
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
        <div className="h-screen bg-white overflow-hidden">
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

const NAV_ITEMS = [
    { key: 'dashboard', label: 'Inicio', icon: Home, path: '/dashboard' },
    { key: 'consolidated', label: 'Consol.', icon: Layers, path: '/consolidated' },
    { key: 'sync', label: 'Nube', icon: Cloud, path: '/sync' },
];

const MobileNav = ({ currentView }: { currentView: string }) => {
  const navigate = useNavigate();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 pb-safe-area shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        <div className="flex justify-around items-center h-16 px-4">
            {NAV_ITEMS.map((item) => {
                const isActive = currentView === item.key;
                const Icon = item.icon;
                return (
                    <button 
                        key={item.key}
                        onClick={() => navigate(item.path)}
                        className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${isActive ? 'text-blue-600' : 'text-slate-300'}`}
                    >
                        <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
                    </button>
                );
            })}
        </div>
    </nav>
  );
};

export default App;
