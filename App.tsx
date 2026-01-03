import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Home, Database, History, Layers, Container, Fingerprint, Cloud, Settings as SettingsIcon } from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkStatus } from './components/NetworkStatus';
import { InstallPrompt } from './components/InstallPrompt';
import { Sidebar } from './components/Sidebar';

// Lazy load views for better performance
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const Reports = lazy(() => import('./components/Reports').then(m => ({ default: m.Reports })));
const DatabaseView = lazy(() => import('./components/Database').then(m => ({ default: m.Database })));
const Sync = lazy(() => import('./components/SyncManagerUI').then(m => ({ default: m.SyncManagerUI })));
const Consolidated = lazy(() => import('./components/Consolidated').then(m => ({ default: m.Consolidated })));
const Conciliator = lazy(() => import('./components/Conciliator').then(m => ({ default: m.Conciliator })));
const Reception = lazy(() => import('./components/Reception').then(m => ({ default: m.Reception })));
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));

// Fix: Define NAV_REGISTRY which provides metadata for navigation items
const NAV_REGISTRY: Record<string, { label: string, icon: any, path: string }> = {
  dashboard: { label: 'Inicio', icon: Home, path: '/dashboard' },
  reports: { label: 'Historial', icon: History, path: '/reports' },
  database: { label: 'Catálogo', icon: Database, path: '/database' },
  sync: { label: 'Sincronizar', icon: Cloud, path: '/sync' },
  consolidated: { label: 'Consolidados', icon: Layers, path: '/consolidated' },
  reception: { label: 'Recepción', icon: Container, path: '/reception' },
  conciliator: { label: 'Conciliador', icon: Fingerprint, path: '/conciliator' },
  settings: { label: 'Ajustes', icon: SettingsIcon, path: '/settings' }
};

const MobileNav = ({ currentView }: { currentView: string }) => {
  // Fix: useNavigate correctly imported from react-router-dom
  const navigate = useNavigate();
  // Fix: useAppStore correctly imported from ./store/useAppStore
  const { settings } = useAppStore();
  
  const activeNavKeys = settings.mobileNavConfig && settings.mobileNavConfig.length > 0 
    ? settings.mobileNavConfig 
    : ['dashboard', 'reports', 'database', 'sync'];

  const navItems = activeNavKeys
    .map(key => ({ key, ...NAV_REGISTRY[key] }))
    .filter(item => !!item.label);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t-4 border-slate-100 ios-safe-pb shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
        <div className="flex justify-around items-center h-20 px-2">
            {navItems.map((item) => {
                const isActive = currentView === item.key;
                const Icon = item.icon;
                return (
                    <button 
                        key={item.key}
                        onClick={() => navigate(item.path)}
                        className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-90 ${isActive ? 'text-blue-700' : 'text-slate-500'}`}
                    >
                        <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-blue-100' : ''}`}>
                            <Icon className={`w-8 h-8 ${isActive ? 'stroke-[3px]' : 'stroke-2'}`} />
                        </div>
                        <span className={`text-[11px] font-black uppercase tracking-wider ${isActive ? 'opacity-100' : 'opacity-70'}`}>{item.label}</span>
                    </button>
                );
            })}
        </div>
    </nav>
  );
};

const AppContent = () => {
  const location = useLocation();
  const { settings } = useAppStore();
  const currentView = location.pathname.split('/')[1] || 'dashboard';

  return (
    <div className={`min-h-screen bg-slate-50 ${settings.theme === 'dark' || settings.theme === 'oled' ? 'dark bg-slate-950' : ''}`}>
      <NetworkStatus />
      <div className="flex">
        <Sidebar view={currentView} settings={settings} />
        <main className="flex-1 md:pl-64 min-h-screen">
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/database" element={<DatabaseView />} />
                <Route path="/sync" element={<Sync />} />
                <Route path="/consolidated" element={<Consolidated />} />
                <Route path="/reception" element={<Reception />} />
                <Route path="/conciliator" element={<Conciliator />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <MobileNav currentView={currentView} />
      <InstallPrompt />
    </div>
  );
};

// Fix: Defining the App component and exporting it as default to solve the index.tsx import error
const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
