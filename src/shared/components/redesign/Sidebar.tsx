import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Scan,
  Database,
  History,
  Cloud,
  Settings,
  ChevronLeft,
  ChevronRight,
  Package
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from './utils';

interface RedesignSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  pendingSync?: number;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Panel', icon: LayoutDashboard, path: '/' },
  { id: 'capture', label: 'Capturar', icon: Scan, path: '/capture' },
  { id: 'data', label: 'Datos', icon: Database, path: '/data' },
  { id: 'reports', label: 'Reportes', icon: History, path: '/reports' },
  { id: 'sync', label: 'Sync', icon: Cloud, path: '/sync', badge: 3 },
  { id: 'settings', label: 'Ajustes', icon: Settings, path: '/settings' },
];

export const RedesignSidebar: React.FC<RedesignSidebarProps> = ({
  isCollapsed,
  onToggle,
  pendingSync = 0
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen bg-base border-r border-subtle transition-all duration-300 ease-in-out z-50 relative',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo Area */}
      <div className="h-20 flex items-center px-6 border-b border-subtle shrink-0">
        <div className="flex items-center gap-3 w-full">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/20">
            <Package className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col overflow-hidden whitespace-nowrap"
            >
              <span className="font-bold text-primary tracking-tight leading-tight">
                ContarStock
              </span>
              <span className="text-[10px] font-medium text-muted uppercase tracking-widest">
                Inventario
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {!isCollapsed && (
          <div className="px-3 mb-4 text-xs font-semibold text-muted uppercase tracking-wider">
            Menú
          </div>
        )}

        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          const badge = item.id === 'sync' ? pendingSync : 0;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group',
                active
                  ? 'bg-blue-500/10 text-blue-500'
                  : 'text-secondary hover:bg-surface hover:text-primary'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              {active && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full"
                />
              )}

              <Icon
                className={cn(
                  'w-5 h-5 shrink-0 transition-colors',
                  active ? 'text-blue-500' : 'text-muted group-hover:text-secondary'
                )}
              />

              {!isCollapsed && (
                <span className="font-medium text-sm whitespace-nowrap">
                  {item.label}
                </span>
              )}

              {badge > 0 && (
                <div
                  className={cn(
                    'absolute flex items-center justify-center bg-blue-500 text-white font-bold rounded-full',
                    isCollapsed
                      ? 'top-1.5 right-1.5 w-4 h-4 text-[9px]'
                      : 'right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px]'
                  )}
                >
                  {badge}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Toggle */}
      <div className="p-4 border-t border-subtle shrink-0">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-muted hover:bg-surface hover:text-secondary transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Colapsar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};