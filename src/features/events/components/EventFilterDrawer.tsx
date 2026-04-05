import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, X, Tag } from 'lucide-react';

interface EventFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  eventTypes: string[];
  selectedEvents: string[];
  onToggleEvent: (event: string) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
  theme?: 'dark' | 'light';
}

export const EventFilterDrawer: React.FC<EventFilterDrawerProps> = ({
  isOpen,
  onClose,
  eventTypes,
  selectedEvents,
  onToggleEvent,
  onClearFilters,
  activeFiltersCount,
  theme = 'dark'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed top-0 right-0 h-full w-80 z-50 shadow-2xl border-l flex flex-col ${
              theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
            }`}
          >
            <div className="p-6 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/40">
                  <Filter className="w-5 h-5" />
                </div>
                <div>
                  <h4 className={`text-sm font-black uppercase tracking-tighter italic leading-none ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>Filtros</h4>
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">{activeFiltersCount} Activos</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  theme === 'dark' ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Event Types */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Tag className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                  <h5 className={`text-xs font-black uppercase tracking-widest ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>Tipos de Evento</h5>
                </div>
                <div className="flex flex-wrap gap-2">
                  {eventTypes.map(event => {
                    const isSelected = selectedEvents.includes(event);
                    return (
                      <button
                        key={event}
                        onClick={() => onToggleEvent(event)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
                          isSelected 
                            ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20' 
                            : theme === 'dark'
                              ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {event}
                      </button>
                    );
                  })}
                  {eventTypes.length === 0 && (
                    <p className={`text-xs italic ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      No hay eventos disponibles
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/5">
              <button
                onClick={onClearFilters}
                className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  theme === 'dark' 
                    ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10' 
                    : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                Limpiar Filtros
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Forced GitHub sync
