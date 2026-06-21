import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Tag, Image, ShieldCheck, X, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  statusFilter: 'all' | 'synced' | 'draft' | 'completed';
  setStatusFilter: (v: 'all' | 'synced' | 'draft' | 'completed') => void;
  photoFilter: 'all' | 'with_photo' | 'without_photo';
  setPhotoFilter: (v: 'all' | 'with_photo' | 'without_photo') => void;
  selectedErpFilter: string;
  setSelectedErpFilter: (v: string) => void;
  uniqueErps: string[];
  theme: 'dark' | 'light' | 'high-contrast';
  onClear: () => void;
}

export const ReceptionFiltersDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  statusFilter,
  setStatusFilter,
  photoFilter,
  setPhotoFilter,
  selectedErpFilter,
  setSelectedErpFilter,
  uniqueErps,
  theme,
  onClear
}) => {
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className={`overflow-hidden mt-4 border rounded-[2rem] p-5 shadow-inner transition-colors ${
        isDark ? 'bg-black/40 border-white/5' : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-500" />
          <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Filtros Avanzados de Control
          </span>
        </div>
        <button
          onClick={onClear}
          className="text-[10px] font-black uppercase text-blue-500 hover:text-blue-400 tracking-wider flex items-center gap-1 transition-colors"
        >
          Limpiar Todo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Date Filters */}
        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-slate-500" /> Desde / Hasta
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-500 border transition-all ${
                isDark ? 'bg-slate-900 border-white/5 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-500 border transition-all ${
                isDark ? 'bg-slate-900 border-white/5 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            />
          </div>
        </div>

        {/* Status Filters */}
        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-slate-500" /> Estado de Sincronización
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'synced', label: 'Comp. (Nube)' },
              { id: 'completed', label: 'Comp. (Local)' },
              { id: 'draft', label: 'Borradores' }
            ].map((stat) => (
              <button
                key={stat.id}
                onClick={() => setStatusFilter(stat.id as any)}
                className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                  statusFilter === stat.id
                    ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                    : isDark 
                      ? 'bg-slate-900/50 hover:bg-slate-900 border-white/5 text-slate-400 hover:text-white' 
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-950'
                }`}
              >
                {stat.label}
              </button>
            ))}
          </div>
        </div>

        {/* ERP Association Filters */}
        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Tag className="w-3 h-3 text-slate-500" /> Orden ERP
          </label>
          <select
            value={selectedErpFilter}
            onChange={(e) => setSelectedErpFilter(e.target.value)}
            className={`w-full px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider focus:outline-none focus:border-blue-500 border transition-all ${
              isDark ? 'bg-slate-900 border-white/5 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="all">Todas las órdenes</option>
            {uniqueErps.map((erp) => (
              <option key={erp} value={erp}>
                {erp === 'RECEPCION_BORRADOR' ? 'BORRADOR DE RECEPCIÓN' : erp}
              </option>
            ))}
          </select>
        </div>

        {/* Presence of Image Filters */}
        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Image className="w-3 h-3 text-slate-500" /> Registro Fotográfico
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'all', label: 'Ambos' },
              { id: 'with_photo', label: 'Con Foto' },
              { id: 'without_photo', label: 'Sin Foto' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPhotoFilter(p.id as any)}
                className={`px-2 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                  photoFilter === p.id
                    ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                    : isDark 
                      ? 'bg-slate-900/50 hover:bg-slate-900 border-white/5 text-slate-400' 
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </motion.div>
  );
};
