import React, { useEffect, useState } from 'react';
import {
  Search,
  CornerDownLeft,
  Camera,
  Loader2,
  WifiOff,
  RefreshCw,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSyncStore } from '@/stores';
import { useNavigate } from 'react-router-dom';

interface CaptureLayoutProps {
  header: React.ReactNode;
  inputPlaceholder?: string;
  inputValue: string;
  onInputChange: (val: string) => void;
  onInputSubmit: () => void;
  onCameraToggle?: () => void;
  isProcessing?: boolean;
  list: React.ReactNode;
  emptyState?: React.ReactNode;
  footer?: React.ReactNode;
  theme?: 'dark' | 'light' | 'gray' | 'high-contrast' | 'appsheet-dark' | 'night';
  inputRef?: React.RefObject<HTMLInputElement>;
  scrollRef?: React.RefObject<HTMLDivElement>;
  readOnly?: boolean;
  extra?: React.ReactNode;
  filters?: React.ReactNode;
  modalForm?: React.ReactNode;
  metrics?: React.ReactNode;
}

export const CaptureLayout: React.FC<CaptureLayoutProps> = ({
  header,
  inputPlaceholder = 'Escanear o ingresar código...',
  inputValue,
  onInputChange,
  onInputSubmit,
  onCameraToggle,
  isProcessing,
  list,
  emptyState,
  footer,
  theme = 'dark',
  inputRef,
  scrollRef,
  readOnly = false,
  extra,
  filters,
  modalForm,
  metrics,
}) => {
  const syncStore = useSyncStore();
  const navigate = useNavigate();
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
    <div
      className={`h-screen h-[100dvh] flex flex-col overflow-hidden ${(theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'bg-base text-white' : 'bg-slate-50 text-slate-900'}`}
    >
      {header}

      {/* COMPORTAMIENTO CLÁSICO DE APPSHEET: NUBE DE ESTADO FLOTANTE */}
      <div className="absolute top-[1rem] right-4 z-[2001] flex items-center pointer-events-auto">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/sync')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider backdrop-blur-md transition-all border shadow-[0_4px_20px_rgba(0,0,0,0.5)] ${
            syncStore.isSyncing
              ? 'bg-blue-600/30 border-blue-500/40 text-blue-400'
              : syncStore.pendingItems > 0
                ? 'bg-amber-600/30 border-amber-500/40 text-amber-400 animate-pulse'
                : !isOnline
                  ? 'bg-red-950/40 border-red-900/40 text-red-500'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
          }`}
          title="Sincronizador Automático de Cambios"
        >
          {syncStore.isSyncing ? (
            <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
          ) : syncStore.pendingItems > 0 ? (
            <Database className="w-3 h-3 animate-bounce text-amber-400" />
          ) : !isOnline ? (
            <WifiOff className="w-3 h-3 text-red-500" />
          ) : (
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          )}

          <span className="opacity-90 hidden sm:inline">
            {syncStore.isSyncing
              ? 'Guardando'
              : syncStore.pendingItems > 0
                ? `${syncStore.pendingItems} Pendientes`
                : !isOnline
                  ? 'Sin Red (Local)'
                  : 'Sincronizado'}
          </span>

          {syncStore.pendingItems > 0 && (
            <span className="font-mono bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-lg text-[9px] font-black">
              {syncStore.pendingItems}
            </span>
          )}
        </motion.button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col max-w-6xl mx-auto w-full relative">
        {/* FILTERS SECTION (Optional) */}
        {filters && (
          <div className="px-3 md:px-6 pt-4 pb-0 flex gap-2 overflow-x-auto no-scrollbar">
            {filters}
          </div>
        )}

        {/* METRICS SECTION (Optional) */}
        {metrics && <div className="px-3 md:px-6 pt-2 pb-0">{metrics}</div>}
        {/* INPUT SECTION */}
        <div className="p-3 md:p-6 border-b border-white/5 bg-base/50 backdrop-blur-md sticky top-0 z-10">
          {/* ... existing input code remains same ... */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <Search
                className={`w-5 h-5 ${isProcessing ? 'text-brand-warning animate-pulse' : 'text-slate-500'}`}
              />
            </div>
            <input
              ref={inputRef}
              type="text"
              readOnly={readOnly}
              value={inputValue}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onInputSubmit()}
              placeholder={inputPlaceholder}
              className="w-full bg-white/5 border-2 border-white/10 rounded-3xl py-5 pl-14 pr-32 text-lg font-black uppercase tracking-tighter italic focus:border-brand-warning/50 focus:bg-white/10 transition-all outline-none placeholder:text-slate-700"
            />
            <div className="absolute inset-y-2 right-2 flex items-center gap-2">
              {onCameraToggle && (
                <button
                  onClick={onCameraToggle}
                  className="h-full px-4 bg-white/5 hover:bg-white/10 rounded-2xl text-muted transition-all active:scale-95"
                >
                  <Camera className="w-6 h-6" />
                </button>
              )}
              <button
                onClick={onInputSubmit}
                disabled={!inputValue || isProcessing}
                className="h-full px-6 bg-brand-warning text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CornerDownLeft className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Enter</span>
              </button>
            </div>
          </div>
        </div>

        {extra}

        {/* LIST SECTION */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 custom-scrollbar will-change-scroll transform-gpu pb-32 md:pb-6"
        >
          {list}
          {emptyState}
        </div>

        {footer && (
          <div className="md:relative fixed bottom-0 left-0 right-0 z-[100] md:z-auto p-0 md:p-0 pointer-events-none md:pointer-events-auto">
            <div className="max-w-6xl mx-auto w-full pointer-events-auto font-sans">{footer}</div>
          </div>
        )}
      </div>

      {modalForm}
    </div>
  );
};
