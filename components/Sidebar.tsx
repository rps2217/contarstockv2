
import React from 'react';
import { Home, Database, History, Layers, Container, Fingerprint, Cloud, Box, Settings, LogOut } from 'lucide-react';
import { ViewState, AppSettings } from '../types';

interface SidebarProps {
  view: ViewState;
  setView: (v: ViewState) => void;
  settings: AppSettings;
  pendingCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ view, setView, pendingCount }) => {
  
  const NavItem = ({ id, label, icon: Icon, badge }: { id: ViewState, label: string, icon: any, badge?: number }) => {
    const isActive = view === id || (id === 'reports' && view === 'consolidated');
    return (
      <button
        onClick={() => setView(id)}
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
          <p className="text-slate-500 text-xs font-mono">PRO v2.1</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-4 mb-2 mt-2">Principal</div>
        <NavItem id="dashboard" label="Inicio" icon={Home} />
        <NavItem id="counting" label="Scanner Activo" icon={Box} />
        
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-4 mb-2 mt-6">Gestión</div>
        <NavItem id="database" label="Base de Datos" icon={Database} />
        <NavItem id="reports" label="Historial" icon={History} />
        <NavItem id="consolidated" label="Consolidados" icon={Layers} />
        
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-4 mb-2 mt-6">Herramientas</div>
        <NavItem id="reception" label="Recepción Ciega" icon={Container} />
        <NavItem id="conciliator" label="Detective" icon={Fingerprint} />
        <NavItem id="sync" label="Nube / Sync" icon={Cloud} badge={pendingCount} />
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <button 
            onClick={() => setView('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'settings' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
        >
            <Settings className="w-5 h-5" />
            <span className="font-medium text-sm">Ajustes</span>
        </button>
      </div>
    </aside>
  );
};
