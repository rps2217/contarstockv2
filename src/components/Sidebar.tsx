import React from 'react';
import { motion } from 'motion/react';
import {
  Database,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppSettings } from '../types';
import { useSyncStore } from '@/stores';
import { MAIN_NAV, getActiveNavKey, NavItem as NavItemDef } from '@/config/navigation';

interface NavItemProps {
  item: NavItemDef;
  badge?: number;
  isActive: boolean;
  isCollapsed: boolean;
  onNavigate: (path: string) => void;
}

const NavItem: React.FC<NavItemProps> = React.memo(({ item, badge, isActive, isCollapsed, onNavigate }) => {
  const Icon = item.icon;

  return (
    <button
      onClick={() => onNavigate(item.path)}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
      title={isCollapsed ? `${item.label} — ${item.description}` : undefined}
      className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-300 group relative ${
        isActive
          ? 'bg-blue-600/10 text-blue-500 dark:text-blue-400'
          : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
      }`}
    >
      {isActive && !isCollapsed && (
        <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full" />
      )}
      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-500' : 'text-slate-500 group-hover:text-slate-300'}`} />
      {!isCollapsed && <span className="font-semibold text-sm tracking-tight">{item.label}</span>}

      {(badge || 0) > 0 && (
        <span className={`absolute ${isCollapsed ? 'top-1 right-1' : 'right-3'} bg-blue-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full`}>
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

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { pendingItems, isSyncing, isSupabaseConnected } = useSyncStore();
  const activeKey = getActiveNavKey(location.pathname);

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
            <p className="text-stone-500 dark:text-slate-600 text-[10px] font-semibold uppercase tracking-[0.2em] mt-1">E-Edition v3.2</p>
          </div>
        )}
      </div>

      {/* Navegación Principal */}
      <nav className={`flex-1 ${isCollapsed ? 'px-3' : 'px-4'} space-y-1 overflow-y-auto no-scrollbar py-6`} aria-label="Navegación principal">
        {!isCollapsed && (
          <div className="text-[10px] font-bold text-stone-400 dark:text-slate-600 uppercase tracking-[0.2em] px-4 mb-3">
            Navegación
          </div>
        )}

        {MAIN_NAV.map((item) => (
          <NavItem
            key={item.key}
            item={item}
            isActive={activeKey === item.key}
            badge={item.key === 'sync' ? pendingItems : undefined}
            isCollapsed={isCollapsed}
            onNavigate={navigate}
          />
        ))}

        {/* Toggle collapsed */}
        <button
          onClick={onToggle}
          aria-label={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 mt-4 rounded-xl transition-all duration-300 text-slate-500 hover:bg-white/5 hover:text-slate-300`}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="font-semibold text-sm tracking-tight">Colapsar</span>
            </>
          )}
        </button>
      </nav>

      {/* Status Footer */}
      <div className="p-4 mt-auto border-t border-white/5 bg-slate-900/20 backdrop-blur-md">
        {!isCollapsed ? (
          <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Estado nube</span>
              <div className={`w-2 h-2 rounded-full ${isSupabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} title={isSupabaseConnected ? 'Conectado' : 'Sin conexión'} />
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
        ) : (
          <div className="flex justify-center" title={isSupabaseConnected ? 'Nube conectada' : 'Nube sin conexión'}>
            <div className={`w-2.5 h-2.5 rounded-full ${isSupabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          </div>
        )}
      </div>
    </aside>
  );
};
