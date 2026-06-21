
import { isModuleEnabled } from '../services/moduleManager';
import React from 'react';
import { motion } from 'motion/react';
import { 
  Home, 
  Scan, 
  Database, 
  History, 
  Cloud, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  Users,
  Truck,
  Container
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppSettings } from '../types';
import { useSyncStore } from '@/stores';

interface NavItemProps {
  path: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  activeKey: string;
  isCollapsed: boolean;
  onNavigate: (path: string) => void;
}

const NavItem: React.FC<NavItemProps> = React.memo(({ path, label, icon: Icon, badge, activeKey, isCollapsed, onNavigate }) => {
  const location = useLocation();
  const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  return (
    <button
      onClick={() => onNavigate(path)}
      className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-300 group relative ${
        isActive 
          ? 'bg-blue-600/10 text-blue-400' 
          : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
      }`}
    >
      {isActive && !isCollapsed && (
        <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full" />
      )}
      <Icon className={`w-5 h-5 ${isActive ? 'text-blue-500' : 'text-slate-600 group-hover:text-slate-400'}`} />
      {!isCollapsed && <span className="font-bold text-[11px] uppercase tracking-wider">{label}</span>}
      
      {(badge || 0) > 0 && (
        <span className={`absolute ${isCollapsed ? 'top-1 right-1' : 'right-3'} bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md`}>
          {badge}
        </span>
      )}
    </button>
  );
});

interface SidebarProps {
  view: string;
  settings: AppSettings;
  isCollapsed: boolean;
  onToggle: () => void;
}

// Navegación simplificada estilo AppSheet (5 items)
const MAIN_NAV_ITEMS = [
  { key: 'dashboard', label: 'Panel', icon: Home, path: '/' },
  { key: 'capture', label: 'Capturar', icon: Scan, path: '/capture' },
  { key: 'data', label: 'Datos', icon: Database, path: '/data' },
  { key: 'reports', label: 'Reportes', icon: History, path: '/reports' },
  { key: 'sync', label: 'Sync', icon: Cloud, path: '/sync' },
  { key: 'settings', label: 'Ajustes', icon: Settings, path: '/settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ view, settings, isCollapsed, onToggle }) => {
  const navigate = useNavigate();
  const { pendingItems, isSyncing, isSupabaseConnected } = useSyncStore();

  return (
    <aside className={`hidden md:flex flex-col ${isCollapsed ? 'w-20' : 'w-64'} h-screen fixed left-0 top-0 bg-slate-950 dark:bg-stone-50 border-r border-white/5 dark:border-stone-200 z-50 overflow-hidden transition-all duration-500 ease-[0.23,1,0.32,1]`}>
      {/* Logo */}
      <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} h-20 border-b border-white/5`}>
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
          <Database className="w-6 h-6 text-white" />
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <h1 className="text-stone-900 dark:text-white font-black text-lg leading-none uppercase tracking-tighter italic">LOGI<span className="text-blue-500">COUNT</span></h1>
            <p className="text-stone-500 dark:text-slate-600 text-[8px] font-bold uppercase tracking-[0.3em] mt-1">E-EDITION v3.2</p>
          </div>
        )}
      </div>

      {/* Navegación Principal Simplificada */}
      <nav className={`flex-1 ${isCollapsed ? 'px-3' : 'px-4'} space-y-1 overflow-y-auto no-scrollbar py-6`}>
        {!isCollapsed && (
          <div className="text-[9px] font-black text-stone-400 dark:text-slate-700 uppercase tracking-[0.3em] px-4 mb-4">
            Navegación
          </div>
        )}
        
        {MAIN_NAV_ITEMS.map((item) => (
          <NavItem 
            key={item.key}
            path={item.path}
            activeKey={item.key}
            label={item.label}
            icon={item.icon}
            badge={item.key === 'sync' ? pendingItems : undefined}
            isCollapsed={isCollapsed}
            onNavigate={navigate}
          />
        ))}

        {/* Toggle collapsed */}
        <button
          onClick={onToggle}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 mt-4 rounded-xl transition-all duration-300 text-slate-600 hover:bg-white/5 hover:text-slate-400`}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="font-bold text-[11px] uppercase tracking-wider">Colapsar</span>
            </>
          )}
        </button>
      </nav>

      {/* Status Footer */}
      <div className={`p-4 mt-auto border-t border-white/5 bg-slate-900/20 backdrop-blur-md`}>
        {!isCollapsed && (
          <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/5">
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

