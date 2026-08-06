import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Scan,
  Database,
  History,
  Cloud,
  Settings,
  ChevronLeft,
  ChevronRight,
  Database as DatabaseIcon,
  CalendarClock,
  Bell,
  FileText,
  Users,
  Truck,
  ClipboardList,
  Warehouse,
  Package,
  Shield,
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

const NavItem: React.FC<NavItemProps> = React.memo(
  ({ path, label, icon: Icon, badge, isCollapsed, onNavigate, description }) => {
    const location = useLocation();
    const isActive =
      location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
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
              <div className="bg-surface text-primary text-xs font-medium px-3 py-2 rounded-lg shadow-xl whitespace-nowrap border border-subtle">
                <span className="font-semibold">{label}</span>
                {description && <span className="text-muted ml-2">— {description}</span>}
                {/* Flechita */}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-surface" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => onNavigate(path)}
          onMouseEnter={() => isCollapsed && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-2.5 rounded-xl transition-all duration-300 group relative ${
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-secondary hover:bg-surface hover:text-primary'
          }`}
          aria-label={isCollapsed ? label : undefined}
        >
          {/* Indicador activo - Barra lateral (expandido) */}
          {isActive && !isCollapsed && (
            <motion.div
              layoutId="activeNav"
              className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
            />
          )}

          {/* Indicador activo - Punto pulsante (colapsado) */}
          {isActive && isCollapsed && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full"
            />
          )}

          <div className="relative">
            <Icon
              className={`w-5 h-5 transition-colors ${isActive ? 'text-primary' : 'text-muted group-hover:text-secondary'}`}
            />

            {/* Badge - Siempre visible */}
            {(badge || 0) > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`absolute ${isCollapsed ? '-top-1.5 -right-1.5' : '-top-1.5 -right-2'} min-w-[18px] h-[18px] flex items-center justify-center bg-primary text-white text-[9px] font-bold px-1 rounded-full shadow-lg`}
              >
                {badge !== undefined && badge > 99 ? '99+' : (badge ?? 0)}
              </motion.span>
            )}
          </div>

          {!isCollapsed && (
            <span className="font-bold text-[11px] uppercase tracking-wider">{label}</span>
          )}
        </button>
      </div>
    );
  }
);

interface SidebarProps {
  view: string;
  settings: AppSettings;
  isCollapsed: boolean;
  onToggle: () => void;
}

// Navegación simplificada estilo AppSheet con descripciones
// "Contar" va a /massive que muestra el modal de inicio unificado
const MAIN_NAV_ITEMS = [
  { key: 'dashboard', label: 'Panel', icon: Home, path: '/', description: 'Vista general' },
  {
    key: 'counting',
    label: 'Contar',
    icon: Scan,
    path: '/massive',
    description: 'Conteo ciego o con carga teórica',
  },
  {
    key: 'expiry',
    label: 'Vencimientos',
    icon: CalendarClock,
    path: '/expiry',
    description: 'Control de vencimientos',
  },
  {
    key: 'events',
    label: 'Eventos',
    icon: Bell,
    path: '/events',
    description: 'Gestión de incidencias',
  },
  {
    key: 'data',
    label: 'Datos',
    icon: Database,
    path: '/data',
    description: 'Inventario y catálogo',
  },
  { key: 'reports', label: 'Reportes', icon: History, path: '/reports', description: 'Informes' },
  { key: 'sync', label: 'Sync', icon: Cloud, path: '/sync', description: 'Sincronización' },
];

// Navegación secundaria - Configuración y herramientas
const SECONDARY_NAV_ITEMS = [
  {
    key: 'audit',
    label: 'Auditoría',
    icon: Shield,
    path: '/audit',
    description: 'Logs de auditoría',
  },
  {
    key: 'settings',
    label: 'Ajustes',
    icon: Settings,
    path: '/settings',
    description: 'Configuración',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ view, settings, isCollapsed, onToggle }) => {
  const navigate = useNavigate();
  const { pendingItems, isSyncing, isSupabaseConnected } = useSyncStore();

  return (
    <aside
      className={`hidden md:flex flex-col ${isCollapsed ? 'w-20' : 'w-64'} h-screen fixed left-0 top-0 bg-base border-r border-subtle z-50 overflow-hidden transition-all duration-500 ease-[0.23,1,0.32,1]`}
    >
      {/* Logo */}
      <div
        className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} h-20 border-b border-subtle`}
      >
        <motion.div
          whileHover={{ scale: 1.05, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0"
        >
          <DatabaseIcon className="w-6 h-6 text-white" />
        </motion.div>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col overflow-hidden whitespace-nowrap"
          >
            <span className="font-bold text-primary tracking-tight leading-tight">ContarStock</span>
            <span className="text-[10px] font-medium text-muted uppercase tracking-widest">
              Inventario
            </span>
          </motion.div>
        )}
      </div>

      {/* Navegación Principal */}
      <nav
        className={`flex-1 ${isCollapsed ? 'px-3' : 'px-4'} space-y-1 overflow-y-auto no-scrollbar py-6`}
        aria-label="Navegación principal"
      >
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[9px] font-black text-muted uppercase tracking-[0.3em] px-4 mb-4"
          >
            Menú
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

        {/* Separador */}
        {!isCollapsed && <div className="my-4 border-t border-subtle" />}

        {/* Navegación Secundaria */}
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[9px] font-black text-muted uppercase tracking-[0.3em] px-4 mb-2"
          >
            Sistema
          </motion.div>
        )}

        {SECONDARY_NAV_ITEMS.map((item, index) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: (MAIN_NAV_ITEMS.length + index) * 0.05 }}
          >
            <NavItem
              path={item.path}
              label={item.label}
              icon={item.icon}
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
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 mt-4 rounded-xl transition-all duration-300 text-muted hover:bg-surface hover:text-secondary`}
        >
          {isCollapsed ? (
            <motion.div whileHover={{ x: 3 }} transition={{ type: 'spring', stiffness: 300 }}>
              <ChevronRight className="w-5 h-5" />
            </motion.div>
          ) : (
            <>
              <motion.div whileHover={{ x: -3 }} transition={{ type: 'spring', stiffness: 300 }}>
                <ChevronLeft className="w-5 h-5" />
              </motion.div>
              <span className="font-bold text-[11px] uppercase tracking-wider">Colapsar</span>
            </>
          )}
        </motion.button>
      </nav>

      {/* Status Footer */}
      <div className={`p-4 mt-auto border-t border-white/5 bg-surface/20 backdrop-blur-md`}>
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
              <div
                className={`w-full h-full rounded-full ${isSupabaseConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}
              >
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
              <span className="text-[8px] font-bold text-muted uppercase tracking-widest">
                Estado Nube
              </span>
              <div className="flex items-center gap-2">
                {isSyncing && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Cloud className="w-3 h-3 text-primary" />
                  </motion.div>
                )}
                <div
                  className={`w-2 h-2 rounded-full ${isSupabaseConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}
                >
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
                className={`h-full ${isSyncing ? 'bg-blue-500' : 'bg-elevated'}`}
              />
            </div>
          </motion.div>
        )}
      </div>
    </aside>
  );
};
