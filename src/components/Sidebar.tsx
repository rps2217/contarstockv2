
import React from 'react';
import { motion } from 'motion/react';
import { Home, Database, History, Container, Cloud, Box, Settings, Zap, FileText, Camera, Calendar, ChevronLeft, ChevronRight, AlertCircle, RefreshCw, Users } from 'lucide-react';
// Forced update to trigger GitHub sync for the components folder
import { useNavigate, useLocation } from 'react-router-dom';
import { AppSettings, TableSchema } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { ScanRepository } from '../repositories/ScanRepository';
import { db } from '../db';

import { useSyncStore } from '../store/useSyncStore';

interface SidebarProps {
  view: string;
  settings: AppSettings;
  isCollapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ view, settings, isCollapsed, onToggle }) => {
  const navigate = useNavigate();
  const { pendingItems, isSyncing, isSupabaseConnected } = useSyncStore();
  
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
    const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
    
    return (
      <button
        onClick={() => navigate(path)}
        className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-300 group relative ${
          isActive 
            ? 'bg-blue-600/10 text-blue-400 shadow-[inset_0_0_12px_rgba(59,130,246,0.1)]' 
            : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
        }`}
      >
        {isActive && !isCollapsed && (
          <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full" />
        )}
        <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 group-active:scale-90 ${isActive ? 'text-blue-500' : 'text-slate-600 group-hover:text-slate-400'}`} />
        {!isCollapsed && <span className="font-bold text-[11px] uppercase tracking-wider">{label}</span>}
        
        {(badge || 0) > 0 && (
          <span className={`absolute ${isCollapsed ? 'top-1 right-1' : 'right-3'} bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-lg shadow-blue-900/40`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className={`hidden md:flex flex-col ${isCollapsed ? 'w-20' : 'w-64'} h-screen fixed left-0 top-0 bg-slate-950 border-r border-white/5 z-50 overflow-hidden transition-all duration-500 ease-[0.23,1,0.32,1]`}>
      <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} h-20 border-b border-white/5`}>
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
          <Box className="w-6 h-6 text-white" />
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <h1 className="text-white font-black text-lg leading-none uppercase tracking-tighter italic">LOGI<span className="text-blue-500">COUNT</span></h1>
            <p className="text-slate-600 text-[8px] font-bold uppercase tracking-[0.3em] mt-1">E-EDITION v3.1</p>
          </div>
        )}
      </div>

      <nav className={`flex-1 ${isCollapsed ? 'px-3' : 'px-4'} space-y-1 overflow-y-auto no-scrollbar py-6`}>
        {!isCollapsed && <div className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] px-4 mb-4">Core Operativo</div>}
        <NavItem path="/dashboard" activeKey="dashboard" label="Panel Central" icon={Home} />
        <NavItem path="/reception" activeKey="reception" label="Recepción" icon={Container} />
        <NavItem path="/reports" activeKey="reports" label="Auditoría" icon={History} />
        <NavItem path="/database" activeKey="database" label="Inventario" icon={Database} />
        
        {!isCollapsed && <div className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] px-4 mb-4 mt-8">Herramientas</div>}
        <NavItem path="/massive/BURST-MODE" activeKey="massive" label="Modo Hammer" icon={Zap} />
        <NavItem path="/expiry" activeKey="expiry" label="Vencimientos" icon={Calendar} />
        <NavItem path="/customers" activeKey="customers" label="Clientes" icon={Users} />
        <NavItem path="/providers" activeKey="providers" label="Proveedores" icon={Container} />
        
        {(() => {
          const schema = settings.cloudConfig?.schema || settings.schema;
          if (!schema || Object.keys(schema).length === 0) return null;
          
          const dynamicTables = Object.entries(schema)
            .filter(([key]) => key !== 'expiry' && key !== 'events' && key !== 'products' && key !== 'counts');
            
          if (dynamicTables.length === 0) return null;

          return (
            <>
              {!isCollapsed && <div className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] px-4 mb-4 mt-8">Tablas Locales</div>}
              {dynamicTables.map(([key, tableSchema]) => {
                  const schema = tableSchema as TableSchema;
                  return (
                    <NavItem 
                      key={key} 
                      path={`/dynamic/${key}`} 
                      activeKey={`dynamic/${key}`} 
                      label={schema.tableName} 
                      icon={Database} 
                      badge={dynamicTableStats?.[schema.tableName] || 0}
                    />
                  );
                })}
            </>
          );
        })()}
      </nav>

      <div className={`p-4 mt-auto border-t border-white/5 bg-slate-900/20 backdrop-blur-md space-y-1`}>
        <NavItem path="/sync" activeKey="sync" label="Cloud Center" icon={Cloud} badge={pendingItems} />
        <NavItem path="/settings" activeKey="settings" label="Configuración" icon={Settings} />
        
        {!isCollapsed && (
          <div className="mt-4 px-4 py-3 bg-white/5 rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Estado Nube</span>
              <div className={`w-1.5 h-1.5 rounded-full ${isSupabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }} 
                 animate={{ width: isSyncing ? '100%' : '30%' }} 
                 transition={{ duration: 2, repeat: isSyncing ? Infinity : 0 }}
                 className={`h-full ${isSyncing ? 'bg-blue-500' : 'bg-slate-700'}`} 
               />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};


// Forced GitHub sync
