import React from 'react';
import { AlertCircle, Plus, RefreshCw, Calendar, Sun, Moon, Settings2, Search } from 'lucide-react';

interface EventHeaderProps {
  totalCount: number;
  pendingOperations: number;
  isSyncing: boolean;
  theme: 'dark' | 'light';
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewEvent: () => void;
  onSync: () => void;
  onNavigateExpiry: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

export const EventHeader: React.FC<EventHeaderProps> = ({
  totalCount,
  pendingOperations,
  isSyncing,
  theme,
  searchQuery,
  onSearchChange,
  onNewEvent,
  onSync,
  onNavigateExpiry,
  onToggleTheme,
  onOpenSettings,
}) => {
  return (
    <div className={`p-4 md:p-6 pb-4 backdrop-blur-xl border-b shrink-0 transition-colors ${
      theme === 'dark' ? 'bg-slate-900/50 border-white/5' : 'bg-white/80 border-slate-200 shadow-sm'
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

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar..."
              className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs font-bold border transition-all outline-none ${
                theme === 'dark'
                  ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
                  : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
              }`}
            />
          </div>
          {pendingOperations > 0 && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest animate-pulse ${
              theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-amber-50 border-amber-200 text-amber-600'
            }`}>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Guardando ({pendingOperations})
            </div>
          )}
          <button
            onClick={onNewEvent}
            className={`flex-1 md:flex-none px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all border shadow-lg active:scale-95 ${
              theme === 'dark' 
                ? 'bg-blue-600 border-blue-500 text-white shadow-blue-500/20' 
                : 'bg-blue-600 border-blue-500 text-white shadow-blue-500/20'
            }`}
          >
            <Plus className="w-4 h-4" />
            Nuevo Evento
          </button>

          <button
            onClick={onSync}
            disabled={isSyncing}
            className={`flex-1 md:flex-none px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${
              theme === 'dark' 
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300' 
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 shadow-sm'
            } disabled:opacity-50`}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>

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
    </div>
  );
};
