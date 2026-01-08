
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Home, Database, History, Layers, Container, Fingerprint, Cloud, Settings as SettingsIcon } from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkStatus } from './components/NetworkStatus';
import { InstallPrompt } from './components/InstallPrompt';
import { Sidebar } from './components/Sidebar';
import { runFullMetadataRepair } from './components/maintenance/RecalculateTool';
import { logger } from './services/logger';

// Lazy imports con rutas absolutas locales
const Dashboard = lazy(() => import('./components/Dashboard.tsx'));
const Reports = lazy(() => import('./components/Reports.tsx'));
const DatabaseView = lazy(() => import('./components/Database.tsx'));
const Sync = lazy(() => import('./components/SyncManagerUI.tsx'));
const Consolidated = lazy(() => import('./components/Consolidated.tsx'));
const Conciliator = lazy(() => import('./components/Conciliator.tsx'));
const Reception = lazy(() => import('./components/Reception.tsx'));
const Settings = lazy(() => import('./components/Settings.tsx'));
const CountingView = lazy(() => import('./components/CountingView.tsx'));
const AuditDashboard = lazy(() => import('./components/AuditDashboard.tsx'));

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
        <div className="flex justify-around items-center h-20 px-4">
            {navItems.map((item) => {
                const isActive = currentView === item.key;
                const Icon = item.icon;
                return (
                    <button key={item.key} onClick={() => navigate(item.path)} className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${isActive ? 'text-white' : 'text-slate-500'}`}>
                        <div className={`p-2 rounded-[1.2rem] transition-all duration-300 ${isActive ? 'bg-blue-600 shadow-lg shadow-blue-900/40' : ''}`}>
                            <Icon className={`w-6 h-6 ${isActive ? 'stroke-[3px]' : 'stroke-2'}`} />
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-40'}`}>{item.label}</span>
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
  const [isHydrated, setIsHydrated] = useState(false);
  const currentView = location.pathname.split('/')[1] || 'dashboard';
  const isScanningMode = location.pathname.startsWith('/counting/');

  useEffect(() => {
      const bootRepair = async () => {
          try {
              await runFullMetadataRepair();
              setIsHydrated(true);
          } catch (e) {
              setIsHydrated(true);
          }
      };
      bootRepair();
  }, []);

  if (!isHydrated) return (
      <div className="h-screen w-full bg-[#0f172a] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
  );

  const theme = settings.theme || 'light';
  const isDarkTheme = ['dark', 'oled', 'navy', 'contrast'].includes(theme);

  let bgClass = 'bg-slate-50';
  if (theme === 'dark') bgClass = 'bg-slate-950';
  else if (theme === 'oled' || theme === 'contrast') bgClass = 'bg-black';
  else if (theme === 'navy') bgClass = 'bg-[#0f172a]';
  else if (theme === 'warm') bgClass = 'bg-orange-50';

  return (
    <div className={`w-full h-full flex flex-col transition-colors duration-500 theme-${theme} ${isDarkTheme ? 'dark' : ''} ${bgClass}`}>
      <NetworkStatus />
      
      <div className="flex-1 flex overflow-hidden relative">
        {!isScanningMode && <Sidebar view={currentView} settings={settings} />}
        
        <main className={`flex-1 relative overflow-hidden transition-all duration-300 ${!isScanningMode ? 'md:pl-64' : ''}`}>
          <ErrorBoundary>
            <Suspense fallback={
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/5 z-50">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Iniciando...</span>
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
