
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
import { Sidebar } from './components/Sidebar'; // New Sidebar Import
import * as sessionService from './services/sessionService'; 
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
            const current = await sessionService.getActiveSession(); 
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
      await sessionService.closeSession(activeSession.id); 
      setActiveSession(null);
      setView('reports');
    }
  };

  const handleDiscardSession = async () => {
    if (activeSession) {
        await sessionService.deleteSession(activeSession.id); 
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
  
  // Fullscreen Modes (No Sidebar)
  if (view === 'counting' && activeSession) {
    return (
      <div className="h-screen bg-slate-950 overflow-hidden">
        <NetworkStatus />
        <Scanner 
            session={activeSession} 
            onCloseSession={handleCloseSession} 
            onDiscardSession={handleDiscardSession}
        />
      </div>
    );
  }

  if (view === 'reception') {
      return (
          <div className="h-screen bg-slate-900 overflow-hidden">
              <NetworkStatus />
              <Reception 
                onBack={() => setView('dashboard')} 
                onNavigate={setView} // Passed navigation prop
              />
          </div>
      );
  }

  // Standard Layout with Sidebar
  return (
    <div className={`min-h-screen font-sans ${themeClass} transition-colors duration-300 flex`}>
      <NetworkStatus />
      
      {/* DESKTOP SIDEBAR */}
      <Sidebar 
        view={view} 
        setView={setView} 
        settings={settings} 
        pendingCount={pendingSyncCount} 
      />
      
      {/* MAIN CONTENT AREA */}
      <main className="flex-1 md:ml-64 w-full animate-in fade-in zoom-in-95 duration-300 min-h-screen relative">
        {view === 'dashboard' && <Dashboard onNavigate={setView} />}
        {view === 'database' && <Database onBack={() => setView('dashboard')} />}
        {view === 'reports' && <Reports onSessionStart={handleSessionStart} onNavigate={setView} />}
        {view === 'consolidated' && <Consolidated onBack={() => setView('reports')} onNavigate={setView} />}
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
    'dashboard': { label: 'Inicio', icon: <Home className="w-5 h-5" /> },
    'database': { label: 'Datos', icon: <DbIcon className="w-5 h-5" /> },
    'reports': { label: 'Historial', icon: <History className="w-5 h-5" /> },
    'consolidated': { label: 'Consol.', icon: <Layers className="w-5 h-5" /> },
    'reception': { label: 'Recep.', icon: <Container className="w-5 h-5" /> },
    'conciliator': { label: 'Detect.', icon: <Fingerprint className="w-5 h-5" /> },
    'sync': { label: 'Nube', icon: <Cloud className="w-5 h-5" /> },
};

const MobileNav = memo(({ view, setView, settings }: NavProps) => {
  const t = settings.theme;
  
  let navClass = "bg-white/80 border-t border-slate-200 text-slate-400 shadow-[0_-4px_16px_rgba(0,0,0,0.05)]"; 
  
  if (t === 'contrast') navClass = "bg-black/90 border-t border-yellow-400/30 text-yellow-400/50";
  else if (t === 'dark') navClass = "bg-slate-900/90 border-t border-slate-700/50 text-slate-500";
  else if (t === 'navy') navClass = "bg-[#151f32]/90 border-t border-[#1e293b] text-slate-500";
  else if (t === 'warm') navClass = "bg-[#f5efe6]/90 border-t border-[#e7e0d3] text-[#a8a29e]";

  // Use configured items or fallback to default
  const navItems = settings.mobileNavConfig || ['dashboard', 'database', 'reports'];

  return (
    <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-lg pb-safe-area transition-all duration-300 ${navClass}`}>
        <div className="flex justify-around items-center h-16 px-1">
            {navItems.map((itemKey) => {
                const config = NAV_CONFIG[itemKey];
                if (!config) return null;
                
                // Active state logic handles combined views
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

const NavButton = ({ active, onClick, icon, label, theme }: any) => {
    let activeColor = 'text-blue-600';
    let inactiveColor = 'text-slate-400';
    // Removed background shape for clearer icon focus on mobile
    
    if (theme === 'contrast') {
        activeColor = 'text-yellow-400';
        inactiveColor = 'text-yellow-400/30';
    } else if (theme === 'warm') {
        activeColor = 'text-[#78350f]';
        inactiveColor = 'text-[#a8a29e]';
    } else if (theme === 'navy') {
        activeColor = 'text-sky-400';
        inactiveColor = 'text-slate-500';
    } else if (theme === 'dark') {
        activeColor = 'text-blue-400';
        inactiveColor = 'text-slate-600';
    }

    const handleClick = () => {
        if (navigator.vibrate) navigator.vibrate(10);
        onClick();
    };

    return (
        <button 
            onClick={handleClick}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 active:scale-95 group ${active ? activeColor : inactiveColor}`}
        >
            <div className={`transition-all duration-300 ${active ? '-translate-y-1 scale-110 drop-shadow-sm' : ''}`}>
                {icon}
            </div>
            <span className={`text-[10px] font-bold tracking-tight transition-opacity duration-300 leading-none ${active ? 'opacity-100' : 'opacity-70'}`}>
                {label}
            </span>
            {/* Active Indicator Dot */}
            <div className={`w-1 h-1 rounded-full bg-current transition-all duration-300 ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} />
        </button>
    );
};

export default App;
