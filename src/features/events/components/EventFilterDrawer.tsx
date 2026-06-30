import React from 'react';
import { motion } from 'motion/react';
import { Filter, Tag, Calendar, Clock, X } from 'lucide-react';
import { startOfMonth, endOfMonth, addMonths, format } from 'date-fns';

interface EventFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  eventTypes: string[];
  selectedEvents: string[];
  onToggleEvent: (event: string) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
  dateRange: { start: string | null; end: string | null };
  onSetDateRange: (range: { start: string | null; end: string | null }) => void;
  theme?: 'dark' | 'light' | 'high-contrast';
}

export const EventFilterDrawer: React.FC<EventFilterDrawerProps> = ({
  isOpen,
  onClose,
  eventTypes,
  selectedEvents,
  onToggleEvent,
  onClearFilters,
  activeFiltersCount,
  dateRange,
  onSetDateRange,
  theme = 'dark'
}) => {
  const handleQuickDateFilter = (type: 'this-month' | 'next-month' | 'today') => {
    const now = new Date();
    let start: Date;
    let end: Date;

    if (type === 'this-month') {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else if (type === 'next-month') {
      const nextMonth = addMonths(now, 1);
      start = startOfMonth(nextMonth);
      end = endOfMonth(nextMonth);
    } else {
      start = now;
      end = now;
    }

    onSetDateRange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    });
  };

  const isDark = theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark';

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className={`overflow-hidden mt-4 border rounded-[2rem] p-5 shadow-inner transition-colors flex flex-col ${
        isDark ? 'bg-black/40 border-white/5 text-white' : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      {/* Header section inside the panel */}
      <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-500" />
          <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Filtros Avanzados de Eventos
          </span>
          {activeFiltersCount > 0 && (
            <span className="bg-blue-600/20 text-blue-400 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
              {activeFiltersCount} Activos
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onClearFilters}
            className="text-[10px] font-black uppercase text-blue-500 hover:text-blue-400 tracking-wider flex items-center gap-1 transition-colors"
          >
            Limpiar Todo
          </button>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-all ${
              isDark ? 'hover:bg-white/5 text-muted' : 'hover:bg-slate-100 text-slate-500'
            }`}
            title="Cerrar filtros"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Accesos Rápidos */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-muted' : 'text-slate-500'}`} />
            <h5 className={`text-[10px] font-black uppercase tracking-widest ${
              isDark ? 'text-muted' : 'text-slate-700'
            }`}>Accesos Rápidos</h5>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDateFilter('this-month')}
              className={`px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                isDark
                  ? 'bg-white/5 border-white/5 text-muted hover:bg-white/10 hover:text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Este Mes
            </button>
            <button
              type="button"
              onClick={() => handleQuickDateFilter('next-month')}
              className={`px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                isDark
                  ? 'bg-white/5 border-white/5 text-muted hover:bg-white/10 hover:text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Próximo Mes
            </button>
          </div>
        </div>

        {/* Column 2: Rango de Fechas */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className={`w-3.5 h-3.5 ${isDark ? 'text-muted' : 'text-slate-500'}`} />
            <h5 className={`text-[10px] font-black uppercase tracking-widest ${
              isDark ? 'text-muted' : 'text-slate-700'
            }`}>Rango de Fechas</h5>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-slate-500 uppercase px-1">Desde</label>
              <input
                type="date"
                value={dateRange.start || ''}
                onChange={(e) => onSetDateRange({ ...dateRange, start: e.target.value || null })}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold outline-none border transition-all ${
                  isDark
                    ? 'bg-surface border-white/5 text-white focus:border-blue-500/50'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500/50'
                }`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-slate-500 uppercase px-1">Hasta</label>
              <input
                type="date"
                value={dateRange.end || ''}
                onChange={(e) => onSetDateRange({ ...dateRange, end: e.target.value || null })}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold outline-none border transition-all ${
                  isDark
                    ? 'bg-surface border-white/5 text-white focus:border-blue-500/50'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500/50'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Column 3: Tipos de Evento */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Tag className={`w-3.5 h-3.5 ${isDark ? 'text-muted' : 'text-slate-500'}`} />
            <h5 className={`text-[10px] font-black uppercase tracking-widest ${
              isDark ? 'text-muted' : 'text-slate-700'
            }`}>Tipos de Evento</h5>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {eventTypes.map(event => {
              const isSelected = selectedEvents.includes(event);
              return (
                <button
                  type="button"
                  key={event}
                  onClick={() => onToggleEvent(event)}
                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${
                    isSelected 
                      ? 'bg-blue-500 border-blue-400 text-white shadow-md' 
                      : isDark
                        ? 'bg-white/5 border-white/5 text-muted hover:bg-white/10'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {event}
                </button>
              );
            })}
            {eventTypes.length === 0 && (
              <p className={`text-[10px] italic ${isDark ? 'text-slate-500' : 'text-muted'}`}>
                No hay eventos disponibles
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

