
import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Home, Database, History, Layers, Container, Fingerprint, Cloud, Settings as SettingsIcon } from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkStatus } from './components/NetworkStatus';
import { InstallPrompt } from './components/InstallPrompt';
import { Sidebar } from './components/Sidebar';
import { runFullMetadataRepair } from './components/maintenance/RecalculateTool';
import { logger } from './services/logger';

// Lazy imports - Rutas explícitas
const Dashboard = lazy(() => import('./components/Dashboard'));
const Reports = lazy(() => import('./components/Reports'));
const DatabaseView = lazy(() => import('./components/Database'));
const Sync = lazy(() => import('./components/SyncManagerUI'));
const Consolidated = lazy(() => import('./components/Consolidated'));
const Conciliator = lazy(() => import('./components/Conciliator'));
const Reception = lazy(() => import('./components/Reception'));
const Settings = lazy(() => import('./components/Settings'));
const CountingView = lazy(() => import('./components/CountingView'));
const AuditDashboard = lazy(() => import('./components/AuditDashboard'));

const NAV_REGISTRY: Record<string, { label: string, icon: any, path: string }> = {
  dashboard: { label: 'INICIO', icon: Home, path: '/dashboard' },
  reports: { label: 'HISTORIAL', icon: History, path: '/reports' },
  database: { label: 'DATOS', icon: Database, path: '/database' },
  sync: { label: 'NUBE', icon: Cloud, path: '/sync' },
  consolidated: { label: 'CONSOL.', icon: Layers, path: '/consolidated' },
  reception: { label: 'RECEP.', icon: Container, path: '/reception' },
  conciliator: { label: 'DETECT.', icon: Fingerprint, path: '/conciliator' },
  settings: { label: 'AJUSTES', icon: SettingsIcon, path: '/settings' }
};

const MobileNav = ({ currentView }: { currentView: string }) => {
  const navigate = useNavigate();
  const { settings } = useAppStore();
  const activeNavKeys = settings.mobileNavConfig && settings.mobileNavConfig.length > 0 ? settings.mobileNavConfig : ['dashboard', 'reports', 'database', 'sync'];
  const navItems = activeNavKeys.map(key => ({ key, ...NAV_REGISTRY[key] })).filter(item => !!item.label);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.4)] pb-safe">
        <div className="flex justify-around items-center h-24 px-2">
            {navItems.map((item) => {
                const isActive = currentView === item.key;
                const Icon = item.icon;
                return (
                    <button key={item.key} onClick={() => navigate(item.path)} className={`flex flex-col items-center justify-center flex-1 h-full gap-2 transition-all ${isActive ? 'text-white scale-105' : 'text-slate-500'}`}>
                        <div className={`p-3 rounded-2xl transition-all duration-300 ${isActive ? 'bg-blue-600 shadow-lg shadow-blue-900/40' : ''}`}>
                            <Icon className={`w-7 h-7 ${isActive ? 'stroke-[3px]' : 'stroke-2'}`} />
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-40'}`}>{item.label}</span>
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
  const isScanningMode = location.pathname.startsWith('/counting/');

  useEffect(() => {
      const bootRepair = async () => {
          try {
              const fixedCount = await runFullMetadataRepair();
              if (fixedCount > 0) logger.info('System', `Auto-sanación: ${fixedCount} cabeceras reparadas.`);
          } catch (e) {}
      };
      bootRepair();
  }, []);

  const theme = settings.theme || 'light';
  const isDarkTheme = ['dark', 'oled', 'navy', 'contrast'].includes(theme);

  return (
    <div className={`fixed inset-0 overflow-hidden transition-colors duration-500 theme-${theme} ${isDarkTheme ? 'dark' : ''} ${isDarkTheme ? 'bg-black' : 'bg-slate-50'}`}>
      <NetworkStatus />
      
      <div className="flex w-full h-full overflow-hidden">
        {!isScanningMode && <Sidebar view={currentView} settings={settings} />}
        
        {/* Main Layout Container - Viewport Locked */}
        <main className={`flex-1 flex flex-col relative w-full h-full overflow-hidden transition-all duration-300 ${!isScanningMode ? 'md:pl-64' : ''}`}>
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>}>
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
                <Route path="/audit" element={<AuditDashboard />} />
                <Route path="/counting/:id" element={<CountingView />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      
      {!isScanningMode && <MobileNav currentView={currentView} />}
      <InstallPrompt />
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
