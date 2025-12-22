
import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet, HashRouter, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Home, Layers, Cloud, Loader2, Database, History, Container, Fingerprint } from 'lucide-react';
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
import { ViewState } from './types';

const Scanner = lazyWithRetry(() => import('./components/Scanner').then(m => ({ default: m.Scanner })));
const DatabaseView = lazyWithRetry(() => import('./components/Database').then(m => ({ default: m.Database })));
const Reports = lazyWithRetry(() => import('./components/Reports').then(m => ({ default: m.Reports })));
const Consolidated = lazyWithRetry(() => import('./components/Consolidated').then(m => ({ default: m.Consolidated })));
const Conciliator = lazyWithRetry(() => import('./components/Conciliator').then(m => ({ default: m.Conciliator })));
const SettingsView = lazyWithRetry(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const Reception = lazyWithRetry(() => import('./components/Reception').then(m => ({ default: m.Reception })));
const SyncManagerUI = lazyWithRetry(() => import('./components/SyncManagerUI').then(m => ({ default: m.SyncManagerUI })));

const LoadingFallback = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-4">
    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Cargando Módulo</span>
  </div>
);

// Diccionario maestro de navegación
const NAV_REGISTRY: Record<string, { label: string, icon: any, path: string }> = {
    dashboard: { label: 'Inicio', icon: Home, path: '/dashboard' },
    database: { label: 'Datos', icon: Database, path: '/database' },
    reports: { label: 'Historial', icon: History, path: '/reports' },
    consolidated: { label: 'Consol.', icon: Layers, path: '/consolidated' },
    reception: { label: 'Recep.', icon: Container, path: '/reception' },
    conciliator: { label: 'Detect.', icon: Fingerprint, path: '/conciliator' },
    sync: { label: 'Nube', icon: Cloud, path: '/sync' },
};

const MainLayout = () => {
    const { settings } = useAppStore();
    const location = useLocation();
    const currentView = location.pathname.split('/')[1] || 'dashboard';

    // Lógica de Temas
    const getThemeClasses = () => {
        switch (settings.theme) {
            case 'dark': return 'bg-slate-950 text-slate-100 selection:bg-blue-900';
            case 'navy': return 'bg-[#0f172a] text-slate-200 selection:bg-indigo-500';
            case 'warm': return 'bg-orange-50 text-orange-950 selection:bg-orange-200';
            case 'contrast': return 'bg-black text-yellow-400 selection:bg-white selection:text-black';
            default: return 'bg-slate-50 text-slate-900 selection:bg-blue-100';
        }
    };

    return (
        <div className={`min-h-[100dvh] flex flex-col md:flex-row overflow-hidden transition-colors duration-500 ${getThemeClasses()}`}>
            <SystemStatus />
            <Sidebar view={currentView} settings={settings} />
            <main className="flex-1 md:ml-64 w-full relative flex flex-col min-h-0 h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto no-scrollbar pb-24 md:pb-8">
                    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full h-full">
                        <Suspense fallback={<LoadingFallback />}>
                            <ErrorBoundary>
                                <Outlet />
                            </ErrorBoundary>
                        </Suspense>
                    </div>
                </div>
                <MobileNav currentView={currentView} />
            </main>
            <InstallPrompt />
        </div>
    );
};

const AppContent: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const init = async () => {
        try {
            await (db as any).open();
            setDbReady(true);
            await initPersistence();
        } catch (e) { console.error(e); }
    };
    init();

    if (localStorage.getItem('logicount_auth') === 'true') setIsAuthenticated(true);

    const syncInterval = setInterval(() => {
        if (navigator.onLine) processSyncQueue().catch(() => {});
    }, 60000); 
    return () => clearInterval(syncInterval);
  }, []);

  if (!dbReady) return <LoadingFallback />;
  if (!isAuthenticated) return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;

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
            <Route path="/reception" element={<Reception />} />
            <Route path="/sync" element={<SyncManagerUI />} />
        </Route>
        <Route path="/counting/:sessionId" element={<Suspense fallback={<LoadingFallback />}><ScannerWrapper /></Suspense>} />
    </Routes>
  );
};

const ScannerWrapper = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const session = useLiveQuery(() => db.sessions.get(sessionId!), [sessionId]);

    if (!session) return <LoadingFallback />;

    return (
        <div className="fixed inset-0 bg-white overflow-hidden">
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

const MobileNav = ({ currentView }: { currentView: string }) => {
  const navigate = useNavigate();
  const { settings } = useAppStore();
  
  const activeNavKeys = settings.mobileNavConfig && settings.mobileNavConfig.length > 0 
    ? settings.mobileNavConfig 
    : ['dashboard', 'reports', 'database', 'sync'];

  const navItems = activeNavKeys
    .map(key => ({ key, ...NAV_REGISTRY[key] }))
    .filter(item => !!item.label);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-slate-200 ios-safe-pb shadow-[0_-10px_40px_rgb(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16 px-2 pb-safe">
            {navItems.map((item) => {
                const isActive = currentView === item.key;
                const Icon = item.icon;
                return (
                    <button 
                        key={item.key}
                        onClick={() => navigate(item.path)}
                        className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95 ${isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <div className={`p-1.5 rounded-2xl transition-all duration-300 ${isActive ? 'bg-blue-50 shadow-sm translate-y-[-2px]' : ''}`}>
                            <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-wider ${isActive ? 'opacity-100' : 'opacity-70'}`}>{item.label}</span>
                    </button>
                );
            })}
        </div>
    </nav>
  );
};

const App: React.FC = () => (
    <ErrorBoundary>
        <HashRouter>
            <AppContent />
        </HashRouter>
    </ErrorBoundary>
);

export default App;
