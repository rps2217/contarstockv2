
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
        { id: 'dashboard', label: 'Inicio', icon: Home, path: '/dashboard' },
        { id: 'reports', label: 'Historial', icon: History, path: '/reports' },
        { id: 'database', label: 'Catálogo', icon: Database, path: '/database' },
        { id: 'sync', label: 'Nube', icon: Cloud, path: '/sync', badge: pendingSync }
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 px-4 pb-safe-area pt-2 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-around h-14 max-w-md mx-auto">
                {navItems.map(item => {
                    const isActive = currentView === item.id;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={`flex flex-col items-center justify-center gap-1 min-w-[64px] transition-all relative ${isActive ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-slate-400'}`}
                        >
                            <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                <Icon className="w-6 h-6 stroke-[2.5px]" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
                            
                            {item.badge > 0 && (
                                <span className="absolute top-0 right-3 bg-rose-500 text-white text-[8px] font-black px-1 rounded-full border-2 border-white dark:border-black shadow-sm">
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
