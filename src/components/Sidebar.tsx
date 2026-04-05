
import React from 'react';
import { Home, Database, History, Container, Cloud, Box, Settings, Zap, FileText, Camera, Calendar, ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
// Forced update to trigger GitHub sync for the components folder
import { useNavigate, useLocation } from 'react-router-dom';
import { AppSettings } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { ScanRepository } from '../repositories/ScanRepository';
import { db } from '../db';

interface SidebarProps {
  view: string;
  settings: AppSettings;
  isCollapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ view, settings, isCollapsed, onToggle }) => {
  const navigate = useNavigate();
  const pendingCount = useLiveQuery(() => ScanRepository.getPendingSyncCount(), [], 0);
  
  const dynamicTableStats = useLiveQuery(async () => {
    const records = await db.dynamic_data.where('syncStatus').anyOf(['pending', 'error']).toArray();
    const stats: Record<string, number> = {};
    records.forEach(r => {
      stats[r.tableName] = (stats[r.tableName] || 0) + 1;
    });
    return stats;
  }, [], {});
  
  const NavItem = ({ path, label, icon: Icon, badge, activeKey }: { path: string, label: string, icon: any, badge?: number, activeKey: string }) => {
    const location = useLocation();
    const isActive = location.pathname === path || location.pathname === `/${activeKey}`;
    return (
      <button
        onClick={() => navigate(path)}
        title={isCollapsed ? label : undefined}
        className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-5'} py-4 rounded-2xl transition-all duration-200 group relative border-2 ${
          isActive 
            ? 'bg-blue-600 border-blue-400 text-white shadow-xl shadow-blue-900/40' 
            : 'text-slate-500 border-transparent hover:bg-white/5 hover:text-slate-200'
        }`}
      >
        <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 group-active:scale-90 ${isActive ? 'text-white' : 'text-slate-600 group-hover:text-blue-400'}`} />
        {!isCollapsed && <span className="font-black text-[10px] font-mono uppercase tracking-[0.2em]">{label}</span>}
        
        {badge && badge > 0 && (
          <span className={`absolute ${isCollapsed ? '-top-1 -right-1' : 'right-3'} bg-amber-500 text-black text-[9px] font-black px-2 py-0.5 rounded-lg border-2 border-slate-900 shadow-md animate-pulse`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className={`hidden md:flex flex-col ${isCollapsed ? 'w-20' : 'w-64'} h-screen fixed left-0 top-0 bg-slate-950 border-r-4 border-white/5 z-50 overflow-hidden transition-all duration-300`}>
      <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'} border-b-4 border-white/5 bg-slate-900/30`}>
        <button 
          onClick={onToggle}
          title={isCollapsed ? "Expandir" : "Colapsar"}
          className="bg-blue-600 p-2.5 rounded-xl shadow-2xl border-2 border-blue-400 shrink-0 hover:bg-blue-500 active:scale-95 transition-all group"
        >
          <Box className={`w-6 h-6 text-white transition-transform ${isCollapsed ? 'group-hover:rotate-12' : 'group-hover:-rotate-12'}`} />
        </button>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <h1 className="text-white font-black text-xl leading-none uppercase tracking-tighter italic whitespace-nowrap">LogiCount</h1>
            <p className="text-blue-500 text-[8px] font-black uppercase tracking-[0.5em] mt-1">Enterprise_v4</p>
          </div>
        )}
      </div>

      <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-4'} space-y-2 overflow-y-auto no-scrollbar py-8`}>
        {!isCollapsed && <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] px-5 mb-6">Execution_Layer</div>}
        <NavItem path="/dashboard" activeKey="dashboard" label="Inicio" icon={Home} />
        <NavItem path="/reports" activeKey="reports" label="Historial" icon={History} />
        <NavItem path="/database" activeKey="database" label="Catálogo" icon={Database} />
        
        {!isCollapsed && <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] px-5 mb-6 mt-10">Advanced_Tools</div>}
        <NavItem path="/massive/BURST-MODE" activeKey="massive" label="Modo_Martillo" icon={Zap} />
        <NavItem path="/expiry" activeKey="expiry" label="Vencimientos" icon={Calendar} />
        <NavItem path="/events" activeKey="events" label="Eventos" icon={AlertCircle} />
        
        {(() => {
          const schema = settings.appSheetConfig?.schema || settings.schema;
          if (!schema || Object.keys(schema).length === 0) return null;
          
          return (
            <>
              {!isCollapsed && <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] px-5 mb-6 mt-10">Dynamic_Tables</div>}
              {Object.entries(schema)
                .filter(([key]) => key !== 'expiry' && key !== 'events' && key !== 'products')
                .map(([key, tableSchema]) => (
                <NavItem 
                  key={key} 
                  path={`/dynamic/${key}`} 
                  activeKey={`dynamic/${key}`} 
                  label={tableSchema.tableName} 
                  icon={Database} 
                  badge={dynamicTableStats?.[tableSchema.tableName] || 0}
                />
              ))}
            </>
          );
        })()}

        <NavItem path="/sync" activeKey="sync" label="Nube" icon={Cloud} badge={pendingCount} />
      </nav>

      <div className={`p-4 border-t-4 border-white/5 bg-slate-900/50`}>
        <button 
          onClick={() => navigate('/settings')}
          title={isCollapsed ? "Setup" : undefined}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-5'} py-4 rounded-2xl transition-all border-2 ${view === 'settings' ? 'bg-slate-800 border-white/10 text-white' : 'text-slate-600 border-transparent hover:text-white'}`}
        >
          <Settings className="w-5 h-5" />
          {!isCollapsed && <span className="font-black text-[10px] font-mono uppercase tracking-[0.3em]">Ajustes</span>}
        </button>
      </div>
    </aside>
  );
};
