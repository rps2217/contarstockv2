
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, X, AlertTriangle, ShieldAlert, Download, Clock, CheckCircle2, RefreshCw, Package, CheckSquare, Calendar } from 'lucide-react';
import { format, parseISO, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ExpiryStatus } from '../hooks/useExpiryDatabase';

interface ExpiryFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStatuses: ExpiryStatus[];
  setSelectedStatuses: (statuses: ExpiryStatus[]) => void;
  selectedCanje: 'all' | 'canje' | 'markdown';
  setSelectedCanje: (type: 'all' | 'canje' | 'markdown') => void;
  categories: string[];
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  actionPeriod: 'all' | 'this_month' | 'next_month' | 'next_3_months' | 'custom';
  setActionPeriod: (period: 'all' | 'this_month' | 'next_month' | 'next_3_months' | 'custom') => void;
  customDateRange: { start: Date | null, end: Date | null };
  setCustomDateRange: (range: { start: Date | null, end: Date | null }) => void;
  creationDateRange: { start: Date | null, end: Date | null };
  setCreationDateRange: (range: { start: Date | null, end: Date | null }) => void;
  theme?: 'dark' | 'light';
}

export const ExpiryFilterDrawer: React.FC<ExpiryFilterDrawerProps> = ({
  isOpen,
  onClose,
  selectedStatuses,
  setSelectedStatuses,
  selectedCanje,
  setSelectedCanje,
  categories,
  selectedCategories,
  setSelectedCategories,
  actionPeriod,
  setActionPeriod,
  customDateRange,
  setCustomDateRange,
  creationDateRange,
  setCreationDateRange,
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
          
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed top-0 right-0 bottom-0 w-full max-w-md border-l shadow-2xl z-[70] flex flex-col transition-colors ${
              theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
            }`}
          >
            <div className={`p-6 border-b flex items-center justify-between ${
              theme === 'dark' ? 'border-white/10' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50'
                }`}>
                  <Filter className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className={`text-xl font-black uppercase tracking-tighter italic leading-none ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>Filtros Avanzados</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Personaliza tu vista</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  theme === 'dark' ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span className={`text-xs font-black uppercase tracking-widest ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                    }`}>Periodo Operativo</span>
                  </div>
                  {actionPeriod !== 'all' && (
                    <button 
                      onClick={() => setActionPeriod('all')}
                      className="text-[10px] font-black text-amber-500 uppercase hover:underline"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setActionPeriod('this_month')}
                    className={`px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                      actionPeriod === 'this_month'
                        ? 'bg-amber-500 border-amber-400 text-black shadow-lg shadow-amber-500/20'
                        : theme === 'dark'
                          ? 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    Este Mes
                  </button>
                  <button
                    onClick={() => setActionPeriod('next_month')}
                    className={`px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                      actionPeriod === 'next_month'
                        ? 'bg-amber-500 border-amber-400 text-black shadow-lg shadow-amber-500/20'
                        : theme === 'dark'
                          ? 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    Próximo Mes
                  </button>
                  <button
                    onClick={() => setActionPeriod('next_3_months')}
                    className={`px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border col-span-2 ${
                      actionPeriod === 'next_3_months'
                        ? 'bg-amber-500 border-amber-400 text-black shadow-lg shadow-amber-500/20'
                        : theme === 'dark'
                          ? 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    Próximos 3 Meses
                  </button>
                  <button
                    onClick={() => setActionPeriod('custom')}
                    className={`px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border col-span-2 ${
                      actionPeriod === 'custom'
                        ? 'bg-amber-500 border-amber-400 text-black shadow-lg shadow-amber-500/20'
                        : theme === 'dark'
                          ? 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    Rango Personalizado
                  </button>
                </div>

                {actionPeriod === 'custom' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-2 gap-2 pt-2"
                  >
                    <input
                      type="date"
                      value={customDateRange.start ? format(customDateRange.start, 'yyyy-MM-dd') : ''}
                      onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value ? parseISO(e.target.value) : null })}
                      className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                        theme === 'dark' 
                          ? 'bg-white/5 border-white/5 text-white' 
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                    <input
                      type="date"
                      value={customDateRange.end ? format(customDateRange.end, 'yyyy-MM-dd') : ''}
                      onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value ? parseISO(e.target.value) : null })}
                      className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                        theme === 'dark' 
                          ? 'bg-white/5 border-white/5 text-white' 
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </motion.div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span className={`text-xs font-black uppercase tracking-widest ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                    }`}>Fecha de Creación</span>
                  </div>
                  {(creationDateRange.start || creationDateRange.end) && (
                    <button 
                      onClick={() => setCreationDateRange({ start: null, end: null })}
                      className="text-[10px] font-black text-amber-500 uppercase hover:underline"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={creationDateRange.start ? format(creationDateRange.start, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setCreationDateRange({ ...creationDateRange, start: e.target.value ? parseISO(e.target.value) : null })}
                    className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                      theme === 'dark' 
                        ? 'bg-white/5 border-white/5 text-white' 
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                  <input
                    type="date"
                    value={creationDateRange.end ? format(creationDateRange.end, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setCreationDateRange({ ...creationDateRange, end: e.target.value ? parseISO(e.target.value) : null })}
                    className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                      theme === 'dark' 
                        ? 'bg-white/5 border-white/5 text-white' 
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-slate-500" />
                    <span className={`text-xs font-black uppercase tracking-widest ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                    }`}>Estados Críticos</span>
                  </div>
                  {selectedStatuses.length > 0 && (
                    <button 
                      onClick={() => setSelectedStatuses([])}
                      className="text-[10px] font-black text-amber-500 uppercase hover:underline"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {(['expired', 'critical', 'withdrawal', 'next_expiry', 'safe'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        const newStatuses = selectedStatuses.includes(s)
                          ? selectedStatuses.filter(x => x !== s)
                          : [...selectedStatuses, s];
                        setSelectedStatuses(newStatuses);
                      }}
                      className={`px-4 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border flex items-center justify-between group ${
                        selectedStatuses.includes(s)
                          ? s === 'expired' ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_20px_rgba(225,29,72,0.3)]' :
                            s === 'critical' ? 'bg-amber-600 border-amber-400 text-white shadow-[0_0_20px_rgba(217,119,6,0.3)]' :
                            s === 'withdrawal' ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]' :
                            s === 'next_expiry' ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' :
                            'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_20px_rgba(5,150,105,0.3)]'
                          : theme === 'dark' 
                            ? 'bg-white/5 border-white/5 text-slate-500 hover:text-white hover:bg-white/10'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {s === 'expired' && <AlertTriangle className="w-4 h-4" />}
                        {s === 'critical' && <ShieldAlert className="w-4 h-4" />}
                        {s === 'withdrawal' && <Download className="w-4 h-4" />}
                        {s === 'next_expiry' && <Clock className="w-4 h-4" />}
                        {s === 'safe' && <CheckCircle2 className="w-4 h-4" />}
                        <span>
                          {s === 'expired' ? 'Vencidos' : 
                           s === 'critical' ? 'Críticos' : 
                           s === 'withdrawal' ? 'Retiros' :
                           s === 'next_expiry' ? 'Próximos' : 'Vigentes'}
                        </span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedStatuses.includes(s) ? 'bg-white border-white' : 'border-white/10'
                      }`}>
                        {selectedStatuses.includes(s) && <CheckSquare className="w-3 h-3 text-black" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-slate-500" />
                  <span className={`text-xs font-black uppercase tracking-widest ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                  }`}>Tipo de Retiro</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {(['all', 'canje', 'markdown'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setSelectedCanje(type)}
                      className={`px-4 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border flex items-center justify-between ${
                        selectedCanje === type
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]'
                          : theme === 'dark'
                            ? 'bg-white/5 border-white/5 text-slate-500 hover:text-white hover:bg-white/10'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <span>{type === 'all' ? 'Todos los tipos' : type === 'canje' ? 'Con Canje' : 'Sin Canje (Markdown)'}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedCanje === type ? 'bg-white border-white' : 'border-white/10'
                      }`}>
                        {selectedCanje === type && <CheckSquare className="w-3 h-3 text-black" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-500" />
                    <span className={`text-xs font-black uppercase tracking-widest ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                    }`}>Mundos / Categorías</span>
                  </div>
                  {selectedCategories.length > 0 && (
                    <button 
                      onClick={() => setSelectedCategories([])}
                      className="text-[10px] font-black text-amber-500 uppercase hover:underline"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        const newCategories = selectedCategories.includes(cat)
                          ? selectedCategories.filter(x => x !== cat)
                          : [...selectedCategories, cat];
                        setSelectedCategories(newCategories);
                      }}
                      className={`px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border text-center ${
                        selectedCategories.includes(cat)
                          ? 'bg-amber-500 border-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                          : theme === 'dark'
                            ? 'bg-white/5 border-white/5 text-slate-500 hover:text-white hover:bg-white/10'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={`p-6 border-t transition-colors ${
              theme === 'dark' ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'
            }`}>
              <button
                onClick={onClose}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-4 rounded-2xl uppercase tracking-widest transition-all shadow-xl shadow-amber-500/20 active:scale-95"
              >
                Aplicar Filtros
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Forced GitHub sync
