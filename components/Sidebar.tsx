
import React from 'react';
import { Home, Database, History, Layers, Container, Cloud, Box, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppSettings } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

interface SidebarProps {
  view: string;
  settings: AppSettings;
}

export const Sidebar: React.FC<SidebarProps> = ({ view }) => {
  const navigate = useNavigate();
  const pendingCount = useLiveQuery(() => db.scans.where('synced').equals(0).count(), [], 0);
  
  const NavItem = ({ path, label, icon: Icon, badge, activeKey }: { path: string, label: string, icon: any, badge?: number, activeKey: string }) => {
    const isActive = view === activeKey;
    return (
      <button
        onClick={() => navigate(path)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group relative ${
          isActive 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
        }`}
      >
        <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
        <span className="font-black text-xs uppercase tracking-widest">{label}</span>
        
        {badge && badge > 0 && (
          <span className="absolute right-3 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg shadow-sm">
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-slate-900 border-r border-slate-800 z-50 overflow-hidden">
      <div className="p-8 flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-xl shadow-xl shadow-blue-900/20">
          <Box className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-white font-black text-xl leading-none uppercase tracking-tighter">LogiCount</h1>
          <p className="text-blue-400 text-[9px] font-black uppercase tracking-[0.3em] mt-1">Core</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar pt-4">
        <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] px-4 mb-4">Core Operativo</div>
        <NavItem path="/dashboard" activeKey="dashboard" label="Métricas" icon={Home} />
        <NavItem path="/reports" activeKey="reports" label="Historial" icon={History} />
        <NavItem path="/database" activeKey="database" label="Catálogo" icon={Database} />
        
        <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] px-4 mb-4 mt-8">Herramientas</div>
        <NavItem path="/reception" activeKey="reception" label="Recepción" icon={Container} />
        <NavItem path="/consolidated" activeKey="consolidated" label="Consolidados" icon={Layers} />
        <NavItem path="/sync" activeKey="sync" label="Cloud Sync" icon={Cloud} badge={pendingCount} />
      </nav>

      <div className="p-6 border-t border-slate-800 bg-slate-950/50">
        <button 
            onClick={() => navigate('/settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${view === 'settings' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}
        >
            <Settings className="w-5 h-5" />
            <span className="font-black text-xs uppercase tracking-widest">Ajustes</span>
        </button>
      </div>
    </aside>
  );
};
