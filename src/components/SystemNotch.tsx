
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Activity, RefreshCw, WifiOff, AlertTriangle } from 'lucide-react';
import { useSyncStore } from '../store/useSyncStore';
import { useExpiryStore } from '../store/useExpiryStore';

interface SystemNotchProps {
  children: React.ReactNode;
  theme: 'dark' | 'light';
}

export const SystemNotch: React.FC<SystemNotchProps> = ({ children, theme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { pendingItems, isSyncing, latencyMs, isFirestoreConnected } = useSyncStore();
  const { alertCount } = useExpiryStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  // Auto-open if there are critical alerts and it was closed? 
  // Maybe not, the user wants it "discreet".
  
  const hasAlerts = alertCount > 0 || pendingItems > 0 || !isOnline || !isFirestoreConnected;

  return (
    <div className="sticky top-0 w-full z-[1000] pointer-events-none">
      <div className="pointer-events-auto">
        {/* DESKTOP VIEW: Always visible, no notch handle */}
        <div className="hidden md:block">
          {children}
        </div>

        {/* MOBILE VIEW: Expandable Notch */}
        <div className="md:hidden">
          {/* EXPANDABLE CONTENT */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden w-full"
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>

          {/* NOTCH HANDLE */}
          <div className="flex justify-center">
            <motion.button
              onClick={() => setIsOpen(!isOpen)}
              className={`
                flex items-center gap-3 px-6 py-1 rounded-b-3xl border-x border-b shadow-2xl transition-all
                ${theme === 'dark' 
                  ? 'bg-slate-900/95 border-white/10 text-slate-400 hover:text-white shadow-black/50' 
                  : 'bg-white/95 border-slate-200 text-slate-600 hover:text-slate-900 shadow-slate-200'}
              `}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-2 relative">
                {!isOnline ? (
                  <WifiOff className="w-3.5 h-3.5 text-rose-500" />
                ) : isSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                ) : alertCount > 0 ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                ) : (
                  <Activity className={`w-3.5 h-3.5 ${latencyMs && latencyMs < 200 ? 'text-emerald-500' : 'text-slate-500'}`} />
                )}
                
                {hasAlerts && !isOpen && (
                  <span className="flex h-2 w-2 rounded-full bg-rose-500 absolute -top-1 -right-1 border-2 border-slate-900" />
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {alertCount > 0 && !isOpen && (
                  <span className="text-[9px] font-black bg-rose-600 text-white px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-sm">
                    {alertCount}
                  </span>
                )}
                {pendingItems > 0 && !isOpen && (
                  <span className="text-[9px] font-black bg-amber-600 text-white px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-sm">
                    {pendingItems}
                  </span>
                )}
              </div>

              <div className="h-1 w-10 rounded-full bg-slate-700/30 mx-1" />

              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </motion.div>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};
