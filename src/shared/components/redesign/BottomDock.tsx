import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Scan,
  Database,
  History,
  Settings,
  Plus
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface RedesignBottomDockProps {
  onQuickAction?: () => void;
}

const MOBILE_NAV = [
  { id: 'dashboard', label: 'Panel', icon: LayoutDashboard, path: '/' },
  { id: 'capture', label: 'Capturar', icon: Scan, path: '/capture' },
  { id: 'data', label: 'Datos', icon: Database, path: '/data' },
  { id: 'reports', label: 'Reportes', icon: History, path: '/reports' },
  { id: 'settings', label: 'Ajustes', icon: Settings, path: '/settings' },
];

export const RedesignBottomDock: React.FC<RedesignBottomDockProps> = ({ onQuickAction }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      {onQuickAction && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onQuickAction}
          className="md:hidden fixed bottom-24 right-6 z-50 w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-900/40 flex items-center justify-center border border-blue-500/50"
        >
          <Plus className="w-7 h-7" />
        </motion.button>
      )}

      {/* Dock */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-base/80 backdrop-blur-xl border-t border-subtle pb-safe">
        <div className="flex items-center justify-around px-2 h-16">
          {MOBILE_NAV.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="relative flex flex-col items-center justify-center w-16 h-full gap-1"
              >
                {active && (
                  <motion.div
                    layoutId="mobile-active"
                    className="absolute top-0 w-8 h-0.5 bg-blue-500 rounded-b-full"
                  />
                )}

                <Icon
                  className={cn(
                    'w-5 h-5 transition-colors',
                    active ? 'text-blue-500' : 'text-muted'
                  )}
                />

                <span
                  className={cn(
                    'text-[10px] font-medium transition-colors',
                    active ? 'text-blue-500' : 'text-muted'
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};