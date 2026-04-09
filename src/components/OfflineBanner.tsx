import React, { useState, useEffect } from 'react';
import { WifiOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const OfflineBanner: React.FC = () => {
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

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[2000] bg-rose-600 text-white px-4 py-2 flex items-center justify-center gap-3 shadow-lg"
        >
          <WifiOff className="w-5 h-5 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-tighter leading-none">Modo Offline Activo</span>
            <span className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-0.5">Puedes seguir trabajando, los cambios se sincronizarán al volver</span>
          </div>
          <AlertCircle className="w-4 h-4 ml-2 opacity-50" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
