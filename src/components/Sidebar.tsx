
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Scan, 
  Database, 
  History, 
  Cloud, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Database as DatabaseIcon
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppSettings } from '../types';
import { useSyncStore } from '@/stores';

interface NavItemProps {
  path: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  isCollapsed: boolean;
  onNavigate: (path: string) => void;
  description?: string;
}

const NavItem: React.FC<NavItemProps> = React.memo(({ path, label, icon: Icon, badge, isCollapsed, onNavigate, description }) => {
  const location = useLocation();
  const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      {/* Tooltip para sidebar colapsado */}
      <AnimatePresence>
        {isCollapsed && showTooltip && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
          >
            <div className="bg-slate-800 dark:bg-slate-700 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-xl whitespace-nowrap border border-white/10">
              <span className="font-semibold">{label}</span>
              {description && (
                <span className="text-slate-400 ml-2">— {description}</span>
              )}
              {/* Flechita */}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-slate-800 dark:border-r-slate-700" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => onNavigate(path)}
        onMouseEnter={() => isCollapsed && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-300 group relative ${
          isActive 
            ? 'bg-blue-600/15 text-blue-400' 
            : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
        }`}
        aria-label={isCollapsed ? label : undefined}
      >
        {/* Indicador activo - Barra lateral (expandido) */}
        {isActive && !isCollapsed && (
          <motion.div 
            layoutId="activeNav"
            className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full" 
          />
        )}

        {/* Indicador activo - Punto pulsante (colapsado) */}
        {isActive && isCollapsed && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"
          >
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-blue-400 rounded-full"
            />
          </motion.div>
        )}

        <div className="relative">
          <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
          
          {/* Badge - Siempre visible */}
          {(badge || 0) > 0 && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`absolute ${isCollapsed ? '-top-1.5 -right-1.5' : '-top-1.5 -right-2'} min-w-[18px] h-[18px] flex items-center justify-center bg-blue-500 text-white text-[9px] font-bold px-1 rounded-full shadow-lg`}
            >
              {badge !== undefined && badge > 99 ? '99+' : badge ?? 0}
            </motion.span>
          )}
        </div>

        {!isCollapsed && (
          <span className="font-bold text-[11px] uppercase tracking-wider">{label}</span>
        )}
      </button>
    </div>
  );
});

interface SidebarProps {
  view: string;
  settings: AppSettings;
  isCollapsed: boolean;
  onToggle: () => void;
}

// Navegación simplificada estilo AppSheet (6 items) con descripciones
const MAIN_NAV_ITEMS = [
  { key: 'dashboard', label: 'Panel', icon: Home, path: '/', description: 'Vista general' },
  { key: 'capture', label: 'Capturar', icon: Scan, path: '/capture', description: 'Escaneo y conteo' },
  { key: 'data', label: 'Datos', icon: Database, path: '/data', description: 'Inventario y catálogo' },
  { key: 'reports', label: 'Reportes', icon: History, path: '/reports', description: 'Informes' },
  { key: 'sync', label: 'Sync', icon: Cloud, path: '/sync', description: 'Sincronización' },
  { key: 'settings', label: 'Ajustes', icon: Settings, path: '/settings', description: 'Configuración' },
];

export const Sidebar: React.FC<SidebarProps> = ({ view, settings, isCollapsed, onToggle }) => {
  const navigate = useNavigate();
  const { pendingItems, isSyncing, isSupabaseConnected } = useSyncStore();

  return (
    <aside className={`hidden md:flex flex-col ${isCollapsed ? 'w-20' : 'w-64'} h-screen fixed left-0 top-0 bg-slate-950 dark:bg-stone-50 border-r border-white/5 dark:border-stone-200 z-50 overflow-hidden transition-all duration-500 ease-[0.23,1,0.32,1]`}>
      {/* Logo */}
      <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} h-20 border-b border-white/5`}>
        <motion.div 
          whileHover={{ scale: 1.05, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0"
        >
          <DatabaseIcon className="w-6 h-6 text-white" />
        </motion.div>
        {!isCollapsed && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="overflow-hidden"
          >
            <h1 className="text-stone-900 dark:text-white font-black text-lg leading-none uppercase tracking-tighter italic">LOGI<span className="text-blue-500">COUNT</span></h1>
            <p className="text-stone-500 dark:text-slate-600 text-[8px] font-bold uppercase tracking-[0.3em] mt-1">E-EDITION v3.2</p>
          </motion.div>
        )}
      </div>

      {/* Navegación Principal */}
      <nav className={`flex-1 ${isCollapsed ? 'px-3' : 'px-4'} space-y-1 overflow-y-auto no-scrollbar py-6`}>
        {!isCollapsed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[9px] font-black text-stone-400 dark:text-slate-700 uppercase tracking-[0.3em] px-4 mb-4"
          >
            Navegación
          </motion.div>
        )}
        
        {MAIN_NAV_ITEMS.map((item, index) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <NavItem 
              path={item.path}
              label={item.label}
              icon={item.icon}
              badge={item.key === 'sync' ? pendingItems : undefined}
              isCollapsed={isCollapsed}
              onNavigate={navigate}
              description={item.description}
            />
          </motion.div>
        ))}

        {/* Toggle collapse */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onToggle}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 mt-4 rounded-xl transition-all duration-300 text-slate-600 hover:bg-white/5 hover:text-slate-400`}
        >
          {isCollapsed ? (
            <motion.div
              whileHover={{ x: 3 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <ChevronRight className="w-5 h-5" />
            </motion.div>
          ) : (
            <>
              <motion.div
                whileHover={{ x: -3 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.div>
              <span className="font-bold text-[11px] uppercase tracking-wider">Colapsar</span>
            </>
          )}
        </motion.button>
      </nav>

      {/* Status Footer */}
      <div className={`p-4 mt-auto border-t border-white/5 bg-slate-900/20 backdrop-blur-md`}>
        {isCollapsed ? (
          // Indicador compacto cuando colapsado
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center"
          >
            <div 
              className="w-2.5 h-2.5 rounded-full cursor-pointer transition-all"
              title={isSupabaseConnected ? 'Nube conectada' : 'Sin conexión'}
            >
              <div className={`w-full h-full rounded-full ${isSupabaseConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                {isSupabaseConnected && (
                  <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute w-2.5 h-2.5 bg-emerald-400 rounded-full"
                  />
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-3 bg-white/5 rounded-xl border border-white/5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Estado Nube</span>
              <div className="flex items-center gap-2">
                {isSyncing && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Cloud className="w-3 h-3 text-blue-400" />
                  </motion.div>
                )}
                <div className={`w-2 h-2 rounded-full ${isSupabaseConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                  {isSupabaseConnected && (
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute w-2 h-2 bg-emerald-400 rounded-full"
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: isSyncing ? '100%' : '30%' }} 
                transition={{ duration: 2, repeat: isSyncing ? Infinity : 0 }}
                className={`h-full ${isSyncing ? 'bg-blue-500' : 'bg-slate-600'}`} 
              />
            </div>
          </motion.div>
        )}
      </div>
    </aside>
  );
};

