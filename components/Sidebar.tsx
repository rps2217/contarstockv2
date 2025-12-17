import React from 'react';
import { Home, Database, History, Layers, Container, Fingerprint, Cloud, Box, Settings } from 'lucide-react';
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
  
  // PERFORMANCE: Query is now local to Sidebar. Updates here won't re-render the whole App.
  const pendingCount = useLiveQuery(() => db.scans.where('synced').equals(0).count(), [], 0);
  
  const NavItem = ({ path, label, icon: Icon, badge, activeKey }: { path: string, label: string, icon: any, badge?: number, activeKey: string }) => {
    const isActive = view === activeKey;
    return (
      <button
        onClick={() => navigate(path)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
          isActive 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
        }`}
      >
        <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
        <span className="font-medium text-sm tracking-wide">{label}</span>
        
        {badge && badge > 0 && (
          <span className="absolute right-3 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-slate-900 border-r border-slate-800 z-50">
      {/* Brand */}
      <div className="p-6 pb-8 flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/20">
          <Box className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-tight">LogiCount</h1>
          <p className="text-slate-500 text-xs font-mono">PRO v2.2</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-4 mb-2 mt-2">Principal</div>
        <NavItem path="/dashboard" activeKey="dashboard" label="Inicio" icon={Home} />
        
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-4 mb-2 mt-6">Gestión</div>
        <NavItem path="/database" activeKey="database" label="Base de Datos" icon={Database} />
        <NavItem path="/reports" activeKey="reports" label="Historial" icon={History} />
        <NavItem path="/consolidated" activeKey="consolidated" label="Consolidados" icon={Layers} />
        
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-4 mb-2 mt-6">Herramientas</div>
        <NavItem path="/reception" activeKey="reception" label="Recepción Ciega" icon={Container} />
        <NavItem path="/conciliator" activeKey="conciliator" label="Detective" icon={Fingerprint} />
        <NavItem path="/sync" activeKey="sync" label="Nube / Sync" icon={Cloud} badge={pendingCount} />
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <button 
            onClick={() => navigate('/settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'settings' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
        >
            <Settings className="w-5 h-5" />
            <span className="font-medium text-sm">Ajustes</span>
        </button>
      </div>
    </aside>
  );
};