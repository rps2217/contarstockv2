/**
 * DashboardHeader - Header del dashboard con saludo personalizado
 * Muestra el nombre del usuario, estado del sistema y fecha
 */

import React, { memo } from 'react';
import { motion } from 'motion/react';
import { Wifi, WifiOff, Clock } from 'lucide-react';

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

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  return (
    <div className={`px-4 py-6 ${isDark ? 'bg-neutral-950' : 'bg-white'}`}>
      {/* Greeting */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}
          >
            {getGreeting()}, {userName}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className={`text-sm mt-1 ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}
          >
            Esto es lo que pasa hoy en tu almacén.
          </motion.p>
        </div>

        {/* Status indicator */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
            ${isOnline 
              ? 'bg-emerald-500/10 text-emerald-500' 
              : 'bg-rose-500/10 text-rose-500'
            }
          `}
        >
          {isOnline ? (
            <>
              <div className="relative">
                <Wifi className="w-3.5 h-3.5" />
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-emerald-500 rounded-full -z-10 blur-sm"
                />
              </div>
              <span>Sistema en línea</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Sin conexión</span>
            </>
          )}
        </motion.div>
      </div>

      {/* Date */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={`flex items-center gap-2 text-xs ${isDark ? 'text-neutral-600' : 'text-neutral-400'}`}
      >
        <Clock className="w-3.5 h-3.5" />
        <span className="capitalize">{formatDate()}</span>
      </motion.div>
    </div>
  );
});

DashboardHeader.displayName = 'DashboardHeader';

export default DashboardHeader;