
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Database, History, Cloud, Container, Settings, Zap, FileText, Camera, Calendar } from 'lucide-react';
import { AppSettings, ViewState } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { ScanRepository } from '../repositories/ScanRepository';

interface Props {
 currentView: string;
 settings: AppSettings;
}

export const BottomDock: React.FC<Props> = ({ currentView, settings }) => {
 const navigate = useNavigate();
 const pendingSync = useLiveQuery(() => ScanRepository.getPendingSyncCount(), [], 0);

 const iconMap: Partial<Record<ViewState, { label: string, icon: any, path: string }>> = {
 'dashboard': { label: 'HOME', icon: Home, path: '/dashboard' },
 'reports': { label: 'LOGS', icon: History, path: '/reports' },
 'database': { label: 'DB', icon: Database, path: '/database' },
 'reception': { label: 'INBOUND', icon: Container, path: '/reception' },
 'sync': { label: 'SYNC', icon: Cloud, path: '/sync' },
 'visual-picking': { label: 'VISUAL', icon: Camera, path: '/visual-picking' },
 'expiry': { label: 'EXPIRY', icon: Calendar, path: '/expiry' },
 'events': { label: 'EVENTS', icon: FileText, path: '/events' },
 'settings': { label: 'SETUP', icon: Settings, path: '/settings' }
 };

 const activeNavKeys = settings.mobileNavConfig?.filter(k => k !== 'massive' && k !== 'documents') || ['dashboard', 'reports', 'sync'];
 
 return (
 <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-slate-950/95 border-t-2 border-white/10 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-3 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
 <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
 {activeNavKeys.map(key => {
 const item = iconMap[key as ViewState];
 if (!item) return null;
 const isActive = currentView === key;
 const Icon = item.icon;
 
 return (
 <button
 key={key}
 onClick={() => {
 if (navigator.vibrate) navigator.vibrate(12);
 navigate(item.path);
 }}
 className={`flex flex-col items-center justify-center gap-1 min-w-[60px] transition-all relative ${isActive ? 'text-blue-400' : 'text-slate-600'}`}
 >
 <div className={`p-2.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-blue-500/10 scale-110' : 'bg-transparent'}`}>
 <Icon className={`w-5 h-5 ${isActive ? 'stroke-[3px]' : 'stroke-[2px]'}`} />
 </div>
 
 <span className={`text-[8px] font-black tracking-[0.2em] uppercase leading-none transition-opacity ${isActive ? 'opacity-100' : 'opacity-40'}`}>
 {item.label}
 </span>

 {isActive && (
 <div className="absolute -bottom-1 w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_8px_#60a5fa] animate-pulse"></div>
 )}

 {key === 'sync' && pendingSync > 0 && (
 <span className="absolute -top-1 right-1 bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-md border-2 border-slate-950 animate-bounce">
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
