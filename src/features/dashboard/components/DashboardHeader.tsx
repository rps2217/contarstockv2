/**
 * DashboardHeader - Header del dashboard con saludo personalizado
 * Estilo inspirado en Magic Patterns con diseño limpio slate
 */

import React, { memo } from 'react';
import { motion } from 'motion/react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  userName: string;
  isOnline: boolean;
  isDark?: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = memo(({
  userName,
  isOnline,
  isDark = true
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 mb-2">
      {/* Header con logo y greeting */}
      <header className="flex items-end justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight mb-1"
          >
            {getGreeting()}, {userName}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted text-sm"
          >
            Esto es lo que pasa hoy en tu almacén.
          </motion.p>
        </div>

        {/* Status indicator estilo referencia */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="hidden sm:flex items-center gap-2 text-xs font-medium text-muted bg-surface/50 border border-subtle/60 px-3 py-1.5 rounded-full"
        >
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            isOnline ? "bg-emerald-500" : "bg-rose-500"
          )} />
          <span>{isOnline ? 'Sistema en línea' : 'Sin conexión'}</span>
        </motion.div>
      </header>
    </div>
  );
});

DashboardHeader.displayName = 'DashboardHeader';

export default DashboardHeader;