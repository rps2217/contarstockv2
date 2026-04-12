
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Activity, RefreshCw, WifiOff, AlertTriangle } from 'lucide-react';
import { useSyncStore } from '../store/useSyncStore';
import { useExpiryStore } from '../store/useExpiryStore';

interface SystemNotchProps {
  children: React.ReactNode;
  theme: 'dark' | 'light';
  mode?: 'expiry' | 'reception' | 'counting' | 'events' | 'default';
}

export const SystemNotch: React.FC<SystemNotchProps> = ({ children, theme, mode = 'default' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { pendingItems, isSyncing, latencyMs, isFirestoreConnected } = useSyncStore();
  const { alertCount } = useExpiryStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const modeColors = {
    expiry: 'border-brand-warning/50 bg-brand-warning/10',
    reception: 'border-emerald-500/50 bg-emerald-500/10',
    counting: 'border-blue-500/50 bg-blue-500/10',
    events: 'border-purple-500/50 bg-purple-500/10',
    default: ''
  };

  const currentModeClass = modeColors[mode] || modeColors.default;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const hasAlerts = alertCount > 0 || pendingItems > 0 || !isOnline || !isFirestoreConnected;

  return (
    <div className="sticky top-0 w-full z-[1000] pointer-events-none flex flex-col items-center">
      <motion.div 
        layout
        initial={false}
        animate={{ 
          width: isOpen ? '100%' : 'auto',
          borderRadius: isOpen ? '0 0 2rem 2rem' : '1.5rem',
          marginTop: isOpen ? '0' : '0.75rem'
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={`
          pointer-events-auto overflow-hidden shadow-2xl border backdrop-blur-xl transition-colors duration-500
          ${theme === 'dark' 
            ? 'bg-slate-950/80 border-white/10' 
            : 'bg-white/80 border-slate-200'}
          ${isOpen ? 'max-w-none' : 'max-w-[280px]'}
        `}
      >
        {/* EXPANDED CONTENT */}
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>

        {/* NOTCH HANDLE / COLLAPSED STATE */}
        <motion.button
          layout
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full flex items-center justify-between gap-4 px-4 py-2 transition-all
            ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}
            ${!isOpen && currentModeClass}
          `}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              {!isOnline ? (
                <WifiOff className="w-4 h-4 text-rose-500" />
              ) : isSyncing ? (
                <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
              ) : alertCount > 0 ? (
                <AlertTriangle className="w-4 h-4 text-brand-warning animate-pulse" />
              ) : (
                <Activity className={`w-4 h-4 ${latencyMs && latencyMs < 200 ? 'text-emerald-500' : 'text-slate-500'}`} />
              )}
              
              {hasAlerts && !isOpen && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </div>

            {!isOpen && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                  {mode === 'default' ? 'LogiCount Pro' : mode}
                </span>
                {(alertCount > 0 || pendingItems > 0) && (
                  <div className="flex gap-1">
                    {alertCount > 0 && (
                      <span className="text-[8px] font-black bg-rose-600 text-white px-1.5 py-0.5 rounded-full">
                        {alertCount}
                      </span>
                    )}
                    {pendingItems > 0 && (
                      <span className="text-[8px] font-black bg-amber-600 text-white px-1.5 py-0.5 rounded-full">
                        {pendingItems}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!isOpen && isOnline && latencyMs !== null && (
              <span className={`text-[9px] font-black ${latencyMs < 200 ? 'text-emerald-500' : 'text-amber-500'}`}>
                {latencyMs}ms
              </span>
            )}
            
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <ChevronDown className="w-4 h-4 opacity-50" />
            </motion.div>
          </div>
        </motion.button>
      </motion.div>
    </div>
  );
};
