
import React, { useState, useEffect, useMemo, memo } from 'react';
import { ViewState, CountingSession, AppSettings } from './types';
import { Dashboard } from './components/Dashboard';
import { Scanner } from './components/Scanner';
import { Database } from './components/Database';
import { Reports } from './components/Reports';
import { Consolidated } from './components/Consolidated';
import { Conciliator } from './components/Conciliator';
import { Settings } from './components/Settings';
import { Reception } from './components/Reception';
import { Login } from './components/Login';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InstallPrompt } from './components/InstallPrompt';
import { NetworkStatus } from './components/NetworkStatus'; 
import { SyncManagerUI } from './components/SyncManagerUI'; 
import * as sessionService from './services/sessionService'; // Updated Import
import { getSettings } from './services/settings';
import { db } from './db';
import { SYNC_ENGINE_VERSION, processSyncQueue } from './services/appsheet';
import { initPersistence } from './services/backupService';
import { LayoutGrid, Database as DbIcon, History, Home, Box, AlertTriangle, Cloud, CloudOff, Container, Fingerprint, Layers } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

const AppContent: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState<ViewState>('dashboard');
  const [activeSession, setActiveSession] = useState<CountingSession | null>(null);
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    console.log(`LogiCount Pro v3.1.0 System Initialized.`);
    console.log(`Sync Engine: ${SYNC_ENGINE_VERSION}`);
    
    // 1. DB Integrity Check
    const initDb = async () => {
        try {
            await (db as any).open();
            setDbReady(true);
            // 2. Request Persistence
            await initPersistence();
        } catch (e: any) {
            console.error("DB Failed to open:", e);
            setDbError(`Error crítico de base de datos: ${e.message}. Intente recargar.`);
        }
    };
    initDb();

    // 3. Auth Check
    const auth = localStorage.getItem('logicount_auth');
    if (auth === 'true') {
        setIsAuthenticated(true);
    }

    // 4. Restore Session
    const restoreSession = async () => {
        try {
            if (!(db as any).isOpen()) await (db as any).open();
            const current = await sessionService.getActiveSession(); // Updated usage
            if (current) {
                setActiveSession(current);
                if (auth === 'true') setView('counting');
            }
        } catch (e) {
            console.warn("Could not restore session (DB not ready yet)");
        }
    };
    restoreSession();

    // 5. SYNC HEARTBEAT (ROBUSTNESS IMPROVEMENT)
    const syncInterval = setInterval(async () => {
        if (navigator.onLine) {
            const pending = await db.syncQueue.where('status').equals('pending').count();
            if (pending > 0) {
                console.log(`[Heartbeat] Intentando sincronizar ${pending} elementos pendientes...`);
                try {
                    await processSyncQueue();
                } catch (e) {
                    console.warn("[Heartbeat] Sync failed, will retry next cycle.");
                }
            }
        }
    }, 60000); 

    return () => clearInterval(syncInterval);

  }, []);

  const handleLoginSuccess = () => {
      localStorage.setItem('logicount_auth', 'true');
      setIsAuthenticated(true);
      if (activeSession) {
          setView('counting');
      } else {
          setView('dashboard');
      }
  };

  const handleSessionStart = (session: CountingSession) => {
    console.log("Starting Session:", session.id); 
    setActiveSession(session);
    setView('counting');
  };

  const handleCloseSession = async () => {
    if (activeSession) {
      await sessionService.closeSession(activeSession.id); // Updated usage
      setActiveSession(null);
      setView('reports');
    }
  };

  const handleDiscardSession = async () => {
    if (activeSession) {
        await sessionService.deleteSession(activeSession.id); // Updated usage
        setActiveSession(null);
        setView('reports');
    }
  };

  const updateSettings = (newSettings: AppSettings) => {
      setSettings(newSettings);
  };

  // Performance: Memoize theme class to prevent recalculation on every render
  const themeClass = useMemo(() => {
      switch (settings.theme) {
          case 'dark': return 'bg-slate-950 text-slate-200 selection:bg-blue-900 selection:text-white';
          case 'contrast': return 'bg-black text-yellow-400 font-mono tracking-wide selection:bg-yellow-400 selection:text-black';
          case 'warm': return 'bg-[#fcf8f2] text-[#57534e] selection:bg-orange-100 selection:text-orange-900 antialiased';
          case 'navy': return 'bg-[#0B1121] text-slate-300 selection:bg-indigo-900 selection:text-indigo-200 antialiased';
          default: return 'bg-[#eff3f8] text-slate-600 antialiased selection:bg-blue-100 selection:text-blue-800';
      }
  }, [settings.theme]);

  // Global Sync Status Query
  const pendingSyncCount = useLiveQuery(() => db.scans.where('synced').equals(0).count(), [], 0);

  // --- DB CRITICAL ERROR STATE ---
  if (dbError) {
      return (
          <div className="h-screen flex items-center justify-center bg-red-50 p-6 text-center">
              <div>
                  <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                  <h1 className="text-xl font-bold text-red-900 mb-2">Error de Sistema</h1>
                  <p className="text-red-700">{dbError}</p>
                  <button onClick={() => window.location.reload()} className="mt-6 bg-red-600 text-white px-6 py-2 rounded-lg font-bold">Recargar</button>
              </div>
          </div>
      );
  }

  // --- LOADING STATE ---
  if (!dbReady) {
      return <div className="h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  // --- AUTH CHECK ---
  if (!isAuthenticated) {
      return (
        <>
            <Login onLoginSuccess={handleLoginSuccess} />
            <InstallPrompt />
        </>
      );
  }

  // --- APP RENDER ---
  if (view === 'counting' && activeSession) {
    return (
      <div className="h-screen bg-slate-950">
        <NetworkStatus />
        <Scanner 
            session={activeSession} 
            onCloseSession={handleCloseSession} 
            onDiscardSession={handleDiscardSession}
        />
      </div>
    );
  }

  // NOTE: Reception View is fullscreen, handles its own layout
  if (view === 'reception') {
      return (
          <div className="h-screen bg-slate-900">
              <NetworkStatus />
              <Reception onBack={() => setView('dashboard')} />
          </div>
      );
  }

  return (
    <div className={`min-h-screen font-sans ${themeClass} transition-colors duration-300`}>
      <NetworkStatus />
      
      {/* HEADER NAV */}
      <DesktopNav 
        view={view} 
        setView={setView} 
        settings={settings} 
        pendingCount={pendingSyncCount} 
      />
      
      <main className="w-full animate-in fade-in zoom-in-95 duration-300">
        {view === 'dashboard' && <Dashboard onNavigate={setView} />}
        {view === 'database' && <Database onBack={() => setView('dashboard')} />}
        {view === 'reports' && <Reports onSessionStart={handleSessionStart} onNavigate={setView} />}
        {view === 'consolidated' && <Consolidated onBack={() => setView('reports')} />}
        {view === 'conciliator' && <Conciliator onBack={() => setView('dashboard')} />}
        {view === 'settings' && <Settings onBack={() => setView('dashboard')} onSettingsChanged={updateSettings} />}
        {view === 'sync' && <SyncManagerUI onBack={() => setView('dashboard')} />}
      </main>

      <InstallPrompt />
      <MobileNav view={view} setView={setView} settings={settings} />
    </div>
  );
};

const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <AppContent />
        </ErrorBoundary>
    );
};

// --- Extracted Components (Memoized) ---

interface NavProps {
  view: ViewState;
  setView: (v: ViewState) => void;
  settings: AppSettings;
  pendingCount?: number;
}

// CONFIGURATION FOR NAV ITEMS
const NAV_CONFIG: Record<string, { label: string, icon: React.ReactNode }> = {
    'dashboard': { label: 'Inicio', icon: <Home className="w-6 h-6" /> },
    'database': { label: 'Datos', icon: <DbIcon className="w-6 h-6" /> },
    'reports': { label: 'Historial', icon: <History className="w-6 h-6" /> },
    'consolidated': { label: 'Consolidado', icon: <Layers className="w-6 h-6" /> },
    'reception': { label: 'Recepción', icon: <Container className="w-6 h-6" /> },
    'conciliator': { label: 'Detective', icon: <Fingerprint className="w-6 h-6" /> },
    'sync': { label: 'Nube', icon: <Cloud className="w-6 h-6" /> },
};

const MobileNav = memo(({ view, setView, settings }: NavProps) => {
  const t = settings.theme;
  
  let navClass = "bg-white/90 border-white/20 text-slate-400 shadow-2xl shadow-slate-200/50"; 
  
  if (t === 'contrast') navClass = "bg-black/90 border-yellow-400/50 text-yellow-400/50 shadow-yellow-900/50";
  else if (t === 'dark') navClass = "bg-slate-900/90 border-slate-700/50 text-slate-500 shadow-black/50";
  else if (t === 'navy') navClass = "bg-[#151f32]/90 border-[#1e293b] text-slate-500 shadow-black/50";
  else if (t === 'warm') navClass = "bg-[#f5efe6]/90 border-[#e7e0d3] text-[#a8a29e] shadow-orange-900/10";

  // Use configured items or fallback to default
  const navItems = settings.mobileNavConfig || ['dashboard', 'database', 'reports'];

  return (
    <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-sm z-40 transition-all duration-500 ease-out">
        <div className={`flex justify-around items-center h-16 px-2 rounded-2xl border backdrop-blur-md ${navClass}`}>
            {navItems.map((itemKey) => {
                const config = NAV_CONFIG[itemKey];
                if (!config) return null;
                
                // Active state logic handles combined views (e.g. reports active when consolidated is shown)
                let isActive = view === itemKey;
                if (itemKey === 'reports' && view === 'consolidated') isActive = true;

                return (
                    <NavButton 
                        key={itemKey}
                        active={isActive} 
                        onClick={() => setView(itemKey as ViewState)} 
                        icon={config.icon} 
                        label={config.label} 
                        theme={settings.theme} 
                    />
                );
            })}
        </div>
    </nav>
  );
});

const DesktopNav = memo(({ view, setView, settings, pendingCount }: NavProps) => {
  const t = settings.theme;
  
  let navClass = "bg-white border-slate-200 text-slate-600";
  if (t === 'contrast') navClass = "bg-black border-yellow-400 text-yellow-400";
  else if (t === 'dark') navClass = "bg-slate-900 border-slate-800 text-slate-200";
  else if (t === 'navy') navClass = "bg-[#151f32] border-[#1e293b] text-slate-400";
  else if (t === 'warm') navClass = "bg-[#fcf8f2] border-[#e7e0d3] text-[#57534e]";

  const logoBg = t === 'contrast' ? 'bg-yellow-400 text-black' : (t === 'warm' ? 'bg-[#57534e] text-[#fcf8f2]' : 'bg-slate-900 text-white');

  return (
    <nav className={`hidden md:flex h-16 border-b items-center justify-between px-6 lg:px-12 sticky top-0 z-40 ${navClass}`}>
      <div 
        className="font-bold text-xl flex items-center gap-2.5 cursor-pointer tracking-tight"
        onClick={() => setView('dashboard')}
      >
        <div className={`${logoBg} p-1.5 rounded-lg`}>
            <Box className="w-5 h-5" /> 
        </div>
        LogiCount <span className="opacity-50 font-normal">Pro</span>
      </div>
      <div className="flex gap-2">
        <DesktopNavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} label="Dashboard" icon={<LayoutGrid className="w-4 h-4" />} theme={settings.theme} />
        <DesktopNavButton active={view === 'database'} onClick={() => setView('database')} label="Base de Datos" icon={<DbIcon className="w-4 h-4" />} theme={settings.theme} />
        <DesktopNavButton active={view === 'reports' || view === 'consolidated'} onClick={() => setView('reports')} label="Historial" icon={<History className="w-4 h-4" />} theme={settings.theme} />
        
        {/* DESKTOP SYNC BUTTON -> Navigates to Sync View */}
        <button 
            onClick={() => setView('sync')}
            className={`ml-4 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-bold transition-all border ${
                pendingCount && pendingCount > 0 
                ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100' 
                : (view === 'sync' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100')
            }`}
        >
            {pendingCount && pendingCount > 0 ? <CloudOff className="w-4 h-4" /> : <Cloud className="w-4 h-4" />}
            <span>{pendingCount && pendingCount > 0 ? `${pendingCount} Pendientes` : 'Sincronizado'}</span>
        </button>
      </div>
    </nav>
  );
});

const NavButton = ({ active, onClick, icon, label, theme }: any) => {
    let activeColor = 'text-blue-600';
    let inactiveColor = 'text-slate-400';
    let activeBg = 'bg-blue-50';

    if (theme === 'contrast') {
        activeColor = 'text-yellow-400';
        inactiveColor = 'text-yellow-400/30';
        activeBg = 'bg-yellow-400/20';
    } else if (theme === 'warm') {
        activeColor = 'text-[#78350f]';
        inactiveColor = 'text-[#a8a29e]';
        activeBg = 'bg-[#e7e0d3]';
    } else if (theme === 'navy') {
        activeColor = 'text-sky-400';
        inactiveColor = 'text-slate-500';
        activeBg = 'bg-[#1e293b]';
    } else if (theme === 'dark') {
        activeColor = 'text-blue-400';
        inactiveColor = 'text-slate-600';
        activeBg = 'bg-slate-800';
    }

    const handleClick = () => {
        if (navigator.vibrate) navigator.vibrate(15);
        onClick();
    };

    return (
        <button 
            onClick={handleClick}
            className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 group ${active ? activeColor : inactiveColor}`}
        >
            {active && (
                <span className={`absolute inset-x-2 inset-y-1 rounded-xl opacity-100 ${activeBg} -z-10 animate-in fade-in zoom-in-90 duration-300`} />
            )}
            <div className={`p-1 transition-transform duration-300 ${active ? 'scale-110 -translate-y-0.5' : 'group-active:scale-90'}`}>
                {icon}
            </div>
            <span className={`text-[10px] font-bold tracking-wide transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-70'}`}>
                {label}
            </span>
        </button>
    );
};

const DesktopNavButton = ({ active, onClick, label, icon, theme }: any) => {
    let baseClass = "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ";
    if (theme === 'contrast') {
        baseClass += active ? "bg-yellow-400 text-black" : "text-yellow-400 hover:bg-yellow-900/30";
    } else if (theme === 'warm') {
        baseClass += active ? "bg-[#e7e0d3] text-[#44403c]" : "text-[#78716c] hover:bg-[#f5efe6]";
    } else if (theme === 'navy') {
        baseClass += active ? "bg-[#1e293b] text-sky-400" : "text-slate-400 hover:bg-[#1e293b] hover:text-slate-200";
    } else {
        baseClass += active ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50";
    }

    return (
        <button onClick={onClick} className={baseClass}>
            {icon}
            {label}
        </button>
    );
};

export default App;
