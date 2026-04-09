import React from 'react';
import { AlertCircle, RefreshCw, Calendar, Sun, Moon, Settings2 } from 'lucide-react';

interface EventHeaderProps {
  totalCount: number;
  pendingOperations: number;
  isSyncing: boolean;
  theme: 'dark' | 'light';
  onNavigateExpiry: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  children?: React.ReactNode;
}

export const EventHeader: React.FC<EventHeaderProps> = ({
  totalCount,
  pendingOperations,
  isSyncing,
  theme,
  onNavigateExpiry,
  onToggleTheme,
  onOpenSettings,
  children
}) => {
  return (
    <div className={`p-4 md:p-6 pb-4 backdrop-blur-xl border-b shrink-0 transition-colors ${
      theme === 'dark' ? 'bg-brand-surface/50 border-white/5' : 'bg-white/80 border-slate-200 shadow-sm'
    }`}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg transition-colors shrink-0 ${
            theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20 shadow-blue-500/5' : 'bg-blue-50 border-blue-200 shadow-blue-500/10'
          }`}>
            <AlertCircle className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic leading-none">Control de Eventos</h1>
            <p className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2 ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              {totalCount} Registros Totales
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {pendingOperations > 0 && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest animate-pulse ${
              theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-amber-50 border-amber-200 text-amber-600'
            }`}>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Guardando ({pendingOperations})
            </div>
          )}
          <button
            onClick={onNavigateExpiry}
            className={`flex-1 md:flex-none px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${
              theme === 'dark' 
                ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-500' 
                : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-600 shadow-sm'
            }`}
            title="Ir a Control de Vencimientos (Alt+V)"
          >
            <Calendar className="w-4 h-4" />
            Vencimientos
          </button>

          <button
            onClick={onToggleTheme}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border shrink-0 ${
              theme === 'dark' 
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-amber-500' 
                : 'bg-white hover:bg-slate-50 border-slate-200 text-indigo-500 shadow-sm'
            }`}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button
            onClick={onOpenSettings}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border shrink-0 ${
              theme === 'dark' 
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-indigo-400' 
                : 'bg-white hover:bg-slate-50 border-slate-200 text-indigo-500 shadow-sm'
            }`}
            title="Preferencias de Vista"
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
};

// Forced GitHub sync
