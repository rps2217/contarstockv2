
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Database, History, Cloud, Package } from 'lucide-react';
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

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
        { id: 'reports', label: 'Historial', icon: History, path: '/reports' },
        { id: 'database', label: 'Catálogo', icon: Database, path: '/database' },
        { id: 'sync', label: 'Cloud', icon: Cloud, path: '/sync', badge: pendingSync }
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-slate-900/95 backdrop-blur-2xl border-t-4 border-black px-4 pb-safe-area pt-3 shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-around h-16 max-w-md mx-auto">
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
                            className={`flex flex-col items-center justify-center gap-1.5 min-w-[72px] transition-all relative ${isActive ? 'text-white scale-110' : 'text-slate-500'}`}
                        >
                            <div className={`p-2 rounded-2xl transition-colors ${isActive ? 'bg-blue-600 shadow-lg shadow-blue-900/50' : ''}`}>
                                <Icon className={`w-6 h-6 ${isActive ? 'stroke-[3px]' : 'stroke-[2.5px]'}`} />
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                                {item.label}
                            </span>
                            
                            {item.badge > 0 && (
                                <span className="absolute -top-1 right-3 bg-amber-400 text-black text-[9px] font-black px-2 py-0.5 rounded-full border-2 border-slate-900 shadow-xl animate-pulse">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};
