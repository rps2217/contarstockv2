
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Database, History, Cloud, Zap } from 'lucide-react';
import { AppSettings } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

interface Props {
    currentView: string;
    settings: AppSettings;
}

export const BottomDock: React.FC<Props> = ({ currentView }) => {
    const navigate = useNavigate();
    const pendingSync = useLiveQuery(() => db.scans.where('synced').equals(0).count(), [], 0);

    const navItems = [
        { id: 'dashboard', label: 'METRICS', icon: Home, path: '/dashboard' },
        { id: 'reports', label: 'HISTORY', icon: History, path: '/reports' },
        { id: 'massive', label: 'HAMMER', icon: Zap, path: '/massive/MOBILE-BURST' },
        { id: 'database', label: 'MASTER', icon: Database, path: '/database' },
        { id: 'sync', label: 'CLOUD', icon: Cloud, path: '/sync', badge: pendingSync }
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-slate-950/95 backdrop-blur-xl border-t-4 border-white/5 px-2 pb-safe-area pt-2 shadow-[0_-20px_60px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
                {navItems.map(item => {
                    const isActive = currentView === item.id || (item.id === 'massive' && currentView.startsWith('massive'));
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(10);
                                navigate(item.path);
                            }}
                            className={`flex flex-col items-center justify-center gap-1.5 min-w-[64px] transition-all relative ${isActive ? 'text-white' : 'text-slate-600'}`}
                        >
                            <div className={`p-2.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-110 border-2 border-blue-400' : 'bg-transparent'}`}>
                                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[3.5px]' : 'stroke-[2.5px]'}`} />
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-30'}`}>
                                {item.label}
                            </span>
                            
                            {item.badge !== undefined && item.badge > 0 && (
                                <span className="absolute top-1 right-2 bg-amber-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-md border-2 border-slate-950 shadow-xl animate-pulse">
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
