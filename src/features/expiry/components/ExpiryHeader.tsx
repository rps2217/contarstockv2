import React from 'react';
import { 
  FileText,
  Calendar,
  Settings2,
  AlertCircle,
  LayoutGrid,
  List,
  Cloud,
  Printer
} from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'motion/react';
import { ExpiryStats } from './ExpiryStats';
import { ManagementSearchBar } from '../../../shared/components/core/ManagementSearchBar';
import { handlePrintExpirations, handleExportExpirationsCSV } from '../utils/expiryUtils';

interface ExpiryHeaderProps {
  ui: any;
  state: any;
  actions: any;
  dbActions: any;
  settings: any;
  navigate: (path: string) => void;
}

export const ExpiryHeader: React.FC<ExpiryHeaderProps> = ({
  ui,
  state,
  actions,
  dbActions,
  settings,
  navigate
}) => {
  return (
    <div className={`p-3 md:p-4 pb-3 backdrop-blur-xl border-b shrink-0 transition-colors ${
      settings.theme === 'dark' ? 'bg-slate-950/40 border-white/5' : 'bg-stone-50/80 border-stone-200 shadow-sm'
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        {/* TITLE SECTION */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-md transition-colors shrink-0 ${
            settings.theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20 shadow-amber-500/5' : 'bg-amber-50 border-amber-200 shadow-amber-500/10'
          }`}>
            <Calendar className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter italic leading-none">
              {settings.pharmacyName || 'L-121'}
            </h1>
          </div>
        </div>

        {/* STATS SECTION (In-line for desktop) */}
        <div className="hidden lg:block flex-1 px-4">
          <ExpiryStats 
            variant="compact"
            stats={state.stats} 
            selectedStatuses={state.selectedStatuses} 
            onStatusClick={(status) => {
              const newStatuses = state.selectedStatuses.includes(status)
                ? state.selectedStatuses.filter((s: string) => s !== status)
                : [...state.selectedStatuses, status];
              dbActions.setSelectedStatuses(newStatuses);
            }}
            theme={settings.theme}
          />
        </div>

        {/* ACTIONS SECTION */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <button 
            onClick={() => navigate('/events')}
            className={`border px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all ${
              settings.theme === 'dark' 
                ? 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 text-blue-500' 
                : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600 shadow-sm'
            }`}
          >
            <AlertCircle className="w-3 h-3" />
            Eventos
          </button>

          <button 
            onClick={() => handlePrintExpirations(state.processedScans)}
            className={`border px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all ${
              settings.theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-slate-100 hover:bg-slate-200 border-slate-200'
            }`}
          >
            <Printer className="w-3 h-3 text-slate-400" />
            Imprimir
          </button>
          
          <button 
            onClick={() => actions.setIsSettingsDrawerOpen(true)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border ${
              settings.theme === 'dark' 
                ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10' 
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 shadow-sm'
            }`}
          >
            <Settings2 className="w-4 h-4" />
          </button>

          <div className={`flex items-center p-0.5 rounded-lg border ${
            settings.theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => actions.setViewMode('grid')}
              className={`p-1 rounded-md transition-all ${
                ui.viewMode === 'grid' ? 'bg-amber-500 text-black shadow-sm' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => actions.setViewMode('table')}
              className={`p-1 rounded-md transition-all ${
                ui.viewMode === 'table' ? 'bg-amber-500 text-black shadow-sm' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className={`border px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all ${
            state.isSyncing 
              ? settings.theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
              : settings.theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm'
          }`}>
            <Cloud className={`w-3 h-3 ${state.isSyncing ? 'animate-bounce' : ''}`} />
            <span className="hidden sm:inline">{state.isSyncing ? 'Sincronizando...' : 'Nube Sincronizada'}</span>
          </div>

          <button 
            onClick={() => handleExportExpirationsCSV(state.processedScans)}
            className={`border px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all ${
              settings.theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-slate-100 hover:bg-slate-200 border-slate-200'
            }`}
          >
            <FileText className="w-3 h-3 text-slate-400" />
            Exportar
          </button>
        </div>
      </div>

      {/* MOBILE STATS (Visible on mobile screens) */}
      <div className="lg:hidden mb-3">
        <ExpiryStats 
          variant="compact"
          stats={state.stats} 
          selectedStatuses={state.selectedStatuses} 
          onStatusClick={(status) => {
            const newStatuses = state.selectedStatuses.includes(status)
              ? state.selectedStatuses.filter((s: string) => s !== status)
              : [...state.selectedStatuses, status];
            dbActions.setSelectedStatuses(newStatuses);
          }}
          theme={settings.theme}
        />
      </div>
      
      <div className="flex flex-col md:flex-row gap-2">
        <div className="flex-1">
          <ManagementSearchBar 
            searchQuery={state.searchQuery}
            setSearchQuery={dbActions.setSearchQuery}
            onOpenFilters={() => actions.setIsFilterDrawerOpen(true)}
            onOpenAdd={actions.handleOpenAdd}
            onClearFilters={actions.handleClearFilters}
            activeFiltersCount={ui.activeFiltersCount}
            placeholder="BUSCAR SKU, NOMBRE O PROVEEDOR..."
            accentColor="amber"
            theme={settings.theme}
          />
        </div>

        {/* QUICK MONTH FILTER PILLS */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar md:shrink-0">
          {Array.from({ length: 4 }).map((_, i) => {
            const date = addMonths(new Date(), i);
            const monthName = format(date, 'MMM', { locale: es });
            
            return (
              <button
                key={i}
                onClick={() => {
                  actions.handleClearFilters();
                  dbActions.setActionPeriod('custom');
                  dbActions.setCustomDateRange({ start: startOfMonth(date), end: endOfMonth(date) });
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                  state.actionPeriod === 'custom' && 
                  state.customDateRange.start?.getMonth() === date.getMonth() &&
                  state.customDateRange.start?.getFullYear() === date.getFullYear()
                    ? 'bg-amber-500 border-amber-400 text-black'
                    : settings.theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-slate-500 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {monthName}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
