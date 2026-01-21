
import React from 'react';
import { useNavigate } from 'react-router-dom';
// Added Settings icon to imports from lucide-react
import { Home, Database, History, Cloud, Zap, Container, Layers, Fingerprint, Settings } from 'lucide-react';
import { AppSettings, ViewState } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

interface Props {
    currentView: string;
    settings: AppSettings;
}

export const BottomDock: React.FC<Props> = ({ currentView, settings }) => {
    const navigate = useNavigate();
    const pendingSync = useLiveQuery(() => db.scans.where('synced').equals(0).count(), [], 0);

    // Mapeo maestro de iconos y rutas
    // Added 'settings' key to match all possible values of ViewState
    const iconMap: Record<ViewState, { label: string, icon: any, path: string }> = {
        'dashboard': { label: 'METRICS', icon: Home, path: '/dashboard' },
        'reports': { label: 'HISTORY', icon: History, path: '/reports' },
        'database': { label: 'MASTER', icon: Database, path: '/database' },
        'reception': { label: 'RECEIVE', icon: Container, path: '/reception' },
        'consolidated': { label: 'MERGE', icon: Layers, path: '/consolidated' },
        'sync': { label: 'CLOUD', icon: Cloud, path: '/sync' },
        'conciliator': { label: 'DETECTIVE', icon: Fingerprint, path: '/conciliator' },
        'counting': { label: 'COUNT', icon: Zap, path: '/reports' }, // Fallback
        'settings': { label: 'SETUP', icon: Settings, path: '/settings' }
    };

    // Obtenemos la configuración del dock del usuario o usamos el martillo por defecto
    const activeNavKeys = settings.mobileNavConfig || ['dashboard', 'reports', 'sync'];
    
    // El modo martillo SIEMPRE debe estar disponible si se desea velocidad, 
    // pero respetaremos la lista del usuario añadiendo el acceso directo si no existe.
    const navItems = activeNavKeys.map(key => ({
        id: key,
        ...iconMap[key as ViewState]
    })).filter(item => item && item.icon);

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-slate-950/90 backdrop-blur-xl border-t-4 border-white/10 px-2 pb-safe-area pt-3">
            <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
                {navItems.map(item => {
                    const isActive = currentView === item.id;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(10);
                                navigate(item.path);
                            }}
                            className={`flex flex-col items-center justify-center gap-1.5 min-w-[64px] transition-all relative ${isActive ? 'text-blue-500' : 'text-slate-500'}`}
                        >
                            <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-blue-600/10 scale-110 border border-blue-500/30' : 'bg-transparent'}`}>
                                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[3px]' : 'stroke-[2px]'}`} />
                            </div>
                            
                            <div className={`w-1 h-1 rounded-full mt-0.5 transition-all ${isActive ? 'bg-blue-500 led-active' : 'bg-transparent'}`}></div>

                            <span className={`text-[7px] font-black uppercase tracking-widest mt-1 ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                                {item.label}
                            </span>
                            
                            {item.id === 'sync' && pendingSync > 0 && (
                                <span className="absolute -top-1 right-2 bg-amber-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-md border-2 border-slate-950 shadow-lg animate-pulse">
                                    {pendingSync}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};
