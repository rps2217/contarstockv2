
import React from 'react';
import { motion } from 'motion/react';
import { Filter, X, AlertTriangle, ShieldAlert, Download, Clock, CheckCircle2, RefreshCw, Package, CheckSquare, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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
  const isDark = theme === 'dark';

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
      {/* Panel Header */}
      <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-amber-500" />
          <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Filtros Avanzados de Vencimientos
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedStatuses([]);
              setSelectedCanje('all');
              setSelectedCategories([]);
              setActionPeriod('all');
              setCustomDateRange({ start: null, end: null });
              setCreationDateRange({ start: null, end: null });
            }}
            className="text-[10px] font-black uppercase text-amber-500 hover:text-amber-400 tracking-wider flex items-center gap-1 transition-colors"
          >
            Limpiar Todo
          </button>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-all ${
              isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
            title="Cerrar filtros"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid container with 4 responsive columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        
        {/* Column 1: Periodo Operativo & Creación */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-700'} flex items-center gap-1.5`}>
                <Calendar className="w-3.5 h-3.5 text-slate-500" /> Periodo Operativo
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'this_month', label: 'Este mes' },
                { id: 'next_month', label: 'Próx mes' },
                { id: 'next_3_months', label: 'En 3 meses' },
                { id: 'custom', label: 'Rango...' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setActionPeriod(p.id as any)}
                  className={`px-2 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wide transition-all border ${
                    actionPeriod === p.id
                      ? 'bg-amber-500 border-amber-400 text-black shadow-md shadow-amber-500/20'
                      : isDark
                        ? 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {actionPeriod === 'custom' && (
              <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                <input
                  type="date"
                  value={customDateRange.start ? format(customDateRange.start, 'yyyy-MM-dd') : ''}
                  onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value ? parseISO(e.target.value) : null })}
                  className={`px-2 py-1.5 rounded-xl text-[10px] font-mono border transition-all ${
                    isDark ? 'bg-slate-950 border-white/5 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
                <input
                  type="date"
                  value={customDateRange.end ? format(customDateRange.end, 'yyyy-MM-dd') : ''}
                  onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value ? parseISO(e.target.value) : null })}
                  className={`px-2 py-1.5 rounded-xl text-[10px] font-mono border transition-all ${
                    isDark ? 'bg-slate-950 border-white/5 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-700'} flex items-center gap-1.5`}>
              <Calendar className="w-3.5 h-3.5 text-slate-500" /> Fecha Creación
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                value={creationDateRange.start ? format(creationDateRange.start, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setCreationDateRange({ ...creationDateRange, start: val ? new Date(val + 'T00:00:00') : null });
                }}
                className={`px-2 py-1.5 rounded-xl text-[10px] font-mono border transition-all ${
                  isDark ? 'bg-slate-950 border-white/5 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
              <input
                type="date"
                value={creationDateRange.end ? format(creationDateRange.end, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setCreationDateRange({ ...creationDateRange, end: val ? new Date(val + 'T00:00:00') : null });
                }}
                className={`px-2 py-1.5 rounded-xl text-[10px] font-mono border transition-all ${
                  isDark ? 'bg-slate-950 border-white/5 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Column 2: Estados Críticos */}
        <div className="space-y-2">
          <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-700'} flex items-center gap-1.5`}>
            <AlertTriangle className="w-3.5 h-3.5 text-slate-500" /> Estados Críticos
          </span>
          <div className="flex flex-col gap-1">
            {([
              { id: 'expired', label: 'Vencidos', icon: AlertTriangle, color: 'text-rose-500' },
              { id: 'critical', label: 'Críticos', icon: ShieldAlert, color: 'text-amber-500' },
              { id: 'withdrawal', label: 'Retiros', icon: Download, color: 'text-indigo-400' },
              { id: 'next_expiry', label: 'Próximos', icon: Clock, color: 'text-blue-400' },
              { id: 'safe', label: 'Vigentes', icon: CheckCircle2, color: 'text-emerald-500' }
            ] as const).map(s => {
              const isSel = selectedStatuses.includes(s.id);
              const SIcon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    const next = selectedStatuses.includes(s.id)
                      ? selectedStatuses.filter(x => x !== s.id)
                      : [...selectedStatuses, s.id];
                    setSelectedStatuses(next);
                  }}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center justify-between ${
                    isSel
                      ? 'bg-amber-500 border-amber-400 text-black shadow-sm'
                      : isDark
                        ? 'bg-slate-900 border-white/5 text-slate-400 hover:text-white hover:bg-slate-900/80'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <SIcon className={`w-3.5 h-3.5 ${isSel ? 'text-black' : s.color}`} />
                    <span>{s.label}</span>
                  </div>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                    isSel ? 'bg-black border-black' : 'border-white/10'
                  }`}>
                    {isSel && <CheckSquare className="w-2.5 h-2.5 text-amber-500" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 3: Tipo de Retiro */}
        <div className="space-y-2">
          <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-700'} flex items-center gap-1.5`}>
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Tipo de Retiro
          </span>
          <div className="flex flex-col gap-1.5">
            {[
              { id: 'all', label: 'Todos los tipos' },
              { id: 'canje', label: 'Con Canje' },
              { id: 'markdown', label: 'Sin Canje (Markdown)' }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedCanje(type.id as any)}
                className={`px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center justify-between ${
                  selectedCanje === type.id
                    ? 'bg-amber-500 border-amber-400 text-black shadow-sm'
                    : isDark
                      ? 'bg-slate-900 border-white/5 text-slate-400 hover:text-white hover:bg-slate-900/80'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{type.label}</span>
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                  selectedCanje === type.id ? 'bg-black border-black' : 'border-white/10'
                }`}>
                  {selectedCanje === type.id && <CheckSquare className="w-2.5 h-2.5 text-amber-500" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Column 4: Mundos / Categorías */}
        <div className="space-y-2">
          <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-700'} flex items-center gap-1.5`}>
            <Package className="w-3.5 h-3.5 text-slate-500" /> Mundos / Categorías
          </span>
          <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1 no-scrollbar">
            {categories.map(cat => {
              const isSel = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => {
                    const next = selectedCategories.includes(cat)
                      ? selectedCategories.filter(x => x !== cat)
                      : [...selectedCategories, cat];
                    setSelectedCategories(next);
                  }}
                  className={`px-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-wide transition-all border text-center ${
                    isSel
                      ? 'bg-amber-500 border-amber-400 text-black shadow-sm'
                      : isDark
                        ? 'bg-slate-900 border-white/5 text-slate-500 hover:text-white hover:bg-slate-900/80'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat || 'N/A'}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </motion.div>
  );
};

