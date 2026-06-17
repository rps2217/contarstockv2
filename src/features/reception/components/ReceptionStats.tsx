import React from 'react';
import { motion } from 'motion/react';
import { Box, Cloud, Clock, CheckCircle2 } from 'lucide-react';

interface Props {
  stats: {
    total: number;
    synced: number;
    pending: number;
    today: number;
  };
  theme: 'dark' | 'light' | 'high-contrast';
}

export const ReceptionStats: React.FC<Props> = ({ stats, theme }) => {
  const isDark = theme === 'dark';

  const cardClasses = isDark
    ? 'bg-slate-900 border-white/5 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all p-5 rounded-[2rem] border'
    : 'bg-white border-slate-200/60 shadow-md relative overflow-hidden group hover:border-blue-500/10 transition-all p-5 rounded-[2rem] border';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 shrink-0 mb-6">
      
      {/* CARD 1: TOTAL */}
      <motion.div 
        whileHover={{ y: -4 }}
        className={cardClasses}
      >
        <div className="flex items-center justify-between">
          <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500 border border-blue-500/20">
            <Box className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Historial</span>
        </div>
        <div className="mt-4">
          <h4 className={`text-2xl md:text-3xl font-black italic tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {stats.total}
          </h4>
          <p className="text-[10px] font-bold uppercase text-slate-400 mt-1">Total Bultos</p>
        </div>
        <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
          <Box className="w-24 h-24" />
        </div>
      </motion.div>

      {/* CARD 2: SYNCED */}
      <motion.div 
        whileHover={{ y: -4 }}
        className={cardClasses}
      >
        <div className="flex items-center justify-between">
          <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 border border-emerald-500/20">
            <Cloud className="w-5 h-5" />
          </div>
          <span className="inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Sincronizado
          </span>
        </div>
        <div className="mt-4">
          <h4 className={`text-2xl md:text-3xl font-black italic tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {stats.synced}
          </h4>
          <p className="text-[10px] font-bold uppercase text-slate-400 mt-1">En la Nube</p>
        </div>
        <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
          <Cloud className="w-24 h-24" />
        </div>
      </motion.div>

      {/* CARD 3: PENDING */}
      <motion.div 
        whileHover={{ y: -4 }}
        className={cardClasses}
      >
        <div className="flex items-center justify-between">
          <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <span className="inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
            Local Queue
          </span>
        </div>
        <div className="mt-4">
          <h4 className={`text-2xl md:text-3xl font-black italic tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {stats.pending}
          </h4>
          <p className="text-[10px] font-bold uppercase text-slate-400 mt-1">Borradores</p>
        </div>
        <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
          <Clock className="w-24 h-24" />
        </div>
      </motion.div>

      {/* CARD 4: TODAY */}
      <motion.div 
        whileHover={{ y: -4 }}
        className={cardClasses}
      >
        <div className="flex items-center justify-between">
          <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-500 border border-purple-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Hoy</span>
        </div>
        <div className="mt-4">
          <h4 className={`text-2xl md:text-3xl font-black italic tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {stats.today}
          </h4>
          <p className="text-[10px] font-bold uppercase text-slate-400 mt-1">Arribó Hoy</p>
        </div>
        <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
          <CheckCircle2 className="w-24 h-24" />
        </div>
      </motion.div>

    </div>
  );
};
