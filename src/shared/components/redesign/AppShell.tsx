import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  ScanLine,
  Database,
  CalendarClock,
  BarChart3,
  RefreshCw,
  Settings,
  Package2,
  Plus,
  Wifi,
  WifiOff,
  Zap,
  ClipboardList,
  Package,
  Truck,
  Bell,
  Users,
  Building2,
  Scissors,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDbReady } from './hooks/useDbReady';

// Páginas rediseñadas
import { RedesignDashboard } from './Dashboard';
import { RedesignCapturePage } from './pages/CapturePage';
import { RedesignDataPage } from './pages/DataPage';
import { RedesignExpiryPage } from './pages/ExpiryPage';
import { RedesignReportsPage } from './pages/ReportsPage';
import { RedesignSettingsPage } from './pages/SettingsPage';
import { RedesignSyncPage } from './pages/SyncPage';
import { RedesignHammerPage } from './pages/HammerPage';
import { RedesignEventsPage } from './pages/EventsPage';
import { RedesignCustomersPage } from './pages/CustomersPage';
import { RedesignSuppliersPage } from './pages/SuppliersPage';
import { RedesignCountingPage } from './pages/CountingPage';
import { RedesignExpectedOrdersPage } from './pages/ExpectedOrdersPage';
import { RedesignReceptionPage } from './pages/ReceptionPage';
import { RedesignDynamicPage } from './pages/DynamicPage';
import { RedesignSlicesPage } from './pages/SlicesPage';

type ViewId = 'dashboard' | 'capture' | 'data' | 'expiry' | 'reports' | 'sync' | 'settings' | 'hammer' | 'events' | 'customers' | 'suppliers' | 'counting' | 'expected-orders' | 'reception' | 'dynamic' | 'slices';

interface NavItem {
  id: ViewId;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

const MOBILE_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Panel', icon: LayoutDashboard },
  { id: 'capture', label: 'Capturar', icon: ScanLine },
  { id: 'expiry', label: 'Vencim.', icon: CalendarClock },
  { id: 'data', label: 'Datos', icon: Database },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

const DESKTOP_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Panel', icon: LayoutDashboard },
  { id: 'capture', label: 'Capturar', icon: ScanLine },
  { id: 'data', label: 'Datos', icon: Database },
  { id: 'expiry', label: 'Vencimientos', icon: CalendarClock },
  { id: 'reports', label: 'Reportes', icon: BarChart3 },
  { id: 'sync', label: 'Sync', icon: RefreshCw, badge: 3 },
  { id: 'hammer', label: 'Hammer', icon: Zap },
  { id: 'counting', label: 'Conteo', icon: ClipboardList },
  { id: 'expected-orders', label: 'Órdenes', icon: Package },
  { id: 'reception', label: 'Recepciones', icon: Truck },
  { id: 'events', label: 'Eventos', icon: Bell },
  { id: 'customers', label: 'Clientes', icon: Users },
  { id: 'suppliers', label: 'Proveedores', icon: Building2 },
  { id: 'dynamic', label: 'Dinámico', icon: Database },
  { id: 'slices', label: 'Cortes', icon: Scissors },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

// Mock props para demo - reemplazar con stores reales
interface RedesignAppShellProps {
  isOnline?: boolean;
  userName?: string;
  syncPending?: number;
}

export const RedesignAppShell: React.FC<RedesignAppShellProps> = ({
  // Verificar que la base de datos esté lista
  isOnline = true,
  userName = 'Usuario',
  syncPending = 0,
}) => {
  const { isReady, error } = useDbReady();
  const [currentView, setCurrentView] = useState<ViewId>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Escuchar eventos de navegación desde atajos de teclado
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const viewId = (e as CustomEvent).detail as ViewId;
      if (viewId && viewId !== currentView) {
        setCurrentView(viewId);
      }
    };

    window.addEventListener('app-navigate', handleNavigate);
    return () => window.removeEventListener('app-navigate', handleNavigate);
  }, [currentView]);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <RedesignDashboard />;
      case 'capture':
        return <RedesignCapturePage />;
      case 'data':
        return <RedesignDataPage />;
      case 'expiry':
        return <RedesignExpiryPage />;
      case 'reports':
        return <RedesignReportsPage />;
      case 'sync':
        return <RedesignSyncPage />;
      case 'settings':
        return <RedesignSettingsPage />;
      case 'hammer':
        return <RedesignHammerPage />;
      case 'events':
        return <RedesignEventsPage />;
      case 'customers':
        return <RedesignCustomersPage />;
      case 'suppliers':
        return <RedesignSuppliersPage />;
      case 'counting':
        return <RedesignCountingPage />;
      case 'expected-orders':
        return <RedesignExpectedOrdersPage />;
      case 'reception':
        return <RedesignReceptionPage />;
      case 'dynamic':
        return <RedesignDynamicPage />;
      case 'slices':
        return <RedesignSlicesPage />;
      default:
        return <RedesignDashboard />;
    }
  };

  const Sidebar = ({ className = '' }: { className?: string }) => (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen bg-base border-r border-subtle transition-all duration-300 ease-in-out z-50 relative',
        isSidebarCollapsed ? 'w-20' : 'w-64',
        className
      )}
    >
      {/* Logo Area */}
      <div className="h-20 flex items-center px-6 border-b border-subtle shrink-0">
        <div className="flex items-center gap-3 w-full">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/20">
            <Package2 className="w-5 h-5 text-white" />
          </div>
          {!isSidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col overflow-hidden whitespace-nowrap"
            >
              <span className="font-bold text-primary tracking-tight leading-tight">
                ContarStock
              </span>
              <span className="text-[10px] font-medium text-muted uppercase tracking-widest">
                Inventario
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto no-scrollbar">
        {!isSidebarCollapsed && (
          <div className="px-3 mb-4 text-xs font-semibold text-muted uppercase tracking-wider">
            Menú
          </div>
        )}

        {DESKTOP_NAV.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group',
                isActive
                  ? 'bg-blue-500/10 text-blue-500'
                  : 'text-secondary hover:bg-surface hover:text-primary',
              )}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav-desktop"
                  className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full"
                />
              )}

              <Icon
                className={cn(
                  'w-5 h-5 shrink-0 transition-colors',
                  isActive
                    ? 'text-blue-500'
                    : 'text-muted group-hover:text-secondary',
                )}
              />

              {!isSidebarCollapsed && (
                <span className="font-medium text-sm whitespace-nowrap">
                  {item.label}
                </span>
              )}

              {(item.badge || (item.id === 'sync' && syncPending > 0)) && (
                <div
                  className={cn(
                    'absolute flex items-center justify-center bg-blue-500 text-white font-bold rounded-full',
                    isSidebarCollapsed
                      ? 'top-1.5 right-1.5 w-4 h-4 text-[9px]'
                      : 'right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px]',
                  )}
                >
                  {item.id === 'sync' ? syncPending : item.badge}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-4 border-t border-subtle shrink-0">
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-muted hover:bg-surface hover:text-secondary transition-colors"
        >
          {isSidebarCollapsed ? (
            <RefreshCw className="w-5 h-5 rotate-180" />
          ) : (
            <>
              <RefreshCw className="w-5 h-5 rotate-180" />
              <span className="text-sm font-medium">Colapsar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );

  const BottomDockComponent = () => (
    <>
      {/* Floating Action Button */}
      {currentView === 'dashboard' && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileTap={{ scale: 0.9 }}
          className="md:hidden fixed bottom-24 right-6 z-50 w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-900/40 flex items-center justify-center border border-blue-500/50"
        >
          <Plus className="w-7 h-7" />
        </motion.button>
      )}

      {/* Dock */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-base/80 backdrop-blur-xl border-t border-subtle pb-safe">
        <div className="flex items-center justify-around px-2 h-16">
          {MOBILE_NAV.map((item) => {
            const isActive = currentView === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className="relative flex flex-col items-center justify-center w-16 h-full gap-1"
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-active"
                    className="absolute top-0 w-8 h-0.5 bg-blue-500 rounded-b-full"
                  />
                )}

                <Icon
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isActive ? 'text-blue-500' : 'text-muted',
                  )}
                />

                <span
                  className={cn(
                    'text-[10px] font-medium transition-colors',
                    isActive ? 'text-blue-500' : 'text-muted',
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  const OnlineStatusBadge = () => (
    <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-secondary bg-surface border border-subtle px-3 py-1.5 rounded-full">
      <div className={cn(
        'w-2 h-2 rounded-full animate-pulse',
        isOnline ? 'bg-emerald-500' : 'bg-rose-500'
      )} />
      {isOnline ? 'Sistema en línea' : 'Sin conexión'}
    </div>
  );

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-base text-primary">
        <div className="text-center">
          <p className="text-lg font-bold mb-2">Error de base de datos</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-base text-primary font-sans overflow-hidden selection:bg-blue-500/30">
      <Sidebar />
      <main className="flex-1 relative overflow-hidden">
        {renderView()}
      </main>
    </div>
  );
};

// Componente wrapper que envuelve con RedesignThemeProvider
export const RedesignAppShellWrapper: React.FC<RedesignAppShellProps> = (props) => {
  const { error } = useDbReady();
  
  // Escuchar eventos de navegación desde atajos de teclado y command palette
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      // Usar setTimeout para asegurar que AppShell esté montado
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('app-navigate', { detail }));
      }, 0);
    };

    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-base text-primary">
        <div className="text-center">
          <p className="text-lg font-bold mb-2">Error de base de datos</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return <RedesignAppShell {...props} />;
};

// Exportar también el componente principal para uso directo si ya se tiene un provider
export const RedesignAppShellWithProvider: React.FC<RedesignAppShellProps> = (props) => {
  return <RedesignAppShell {...props} />;
};

export default RedesignAppShell;
