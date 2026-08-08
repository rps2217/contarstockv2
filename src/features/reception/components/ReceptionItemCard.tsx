import React from 'react';
import { Box, Calendar, Trash2, Expand } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { useAppStore } from '@/stores';

interface ReceptionItemCardProps {
  item: any;
  onDelete: (id: string | number) => void;
  onShowPhoto: (item: any) => void;
  onViewDetail?: (item: any) => void;
  isCompact?: boolean;
}

export const ReceptionItemCard = React.memo(({ item, onDelete, onShowPhoto, onViewDetail, isCompact }: ReceptionItemCardProps) => {
  const { settings } = useAppStore();
  const isSynced = !!item.lastSyncTimestamp;
  const isDraft = item.status === 'draft';
  const hasPhoto = !!(item.labelPhoto || item.photoUrl);
  const isDark = settings.theme === 'dark' || settings.theme === 'high-contrast' || settings.theme === 'appsheet-dark';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className={`group relative border rounded-[1.5rem] p-4 transition-all ${
      isSynced 
        ? isDark
          ? 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20' 
          : 'bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200/65 shadow-sm'
        : isDraft 
          ? isDark
            ? 'bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/20 animate-pulse' 
            : 'bg-blue-50/40 hover:bg-blue-50 border-blue-200/60 shadow-sm'
          : isDark 
            ? 'bg-surface border-white/5 hover:border-subtle' 
            : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm shadow-slate-100'
    }`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 overflow-hidden flex-1">
          <button 
            type="button"
            onClick={() => hasPhoto && onShowPhoto(item)}
            disabled={!hasPhoto}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border overflow-hidden transition-all ${
              hasPhoto ? 'hover:scale-105 active:scale-95 cursor-pointer' : 'opacity-60 cursor-default'
            } ${
              isSynced 
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                : isDraft 
                  ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                  : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
            }`}
          >
            {item.labelPhoto || item.photoUrl ? (
              <img 
                src={item.labelPhoto || item.photoUrl} 
                alt="Bulto" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Box className="w-6 h-6 opacity-75" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-mono text-base font-black truncate uppercase tracking-wider ${
                isSynced ? 'text-emerald-500' : isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {item.logisticsLabel}
              </span>
              <div className="flex items-center gap-1.5 font-bold uppercase mt-0.5">
                {isSynced ? (
                  <span className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[8px] px-2 py-0.5 rounded-full">
                    Sincronizado
                  </span>
                ) : isDraft ? (
                  <span className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[8px] px-2 py-0.5 rounded-full animate-pulse">
                    Borrador Local
                  </span>
                ) : (
                  <span className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[8px] px-2 py-0.5 rounded-full">
                    Completado Local
                  </span>
                )}
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase mt-1.5 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 opacity-60 text-muted" />
                {format(item.createdAt, 'dd/MM/yyyy')}
              </span>
              <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
              <span>{format(item.createdAt, 'HH:mm:ss')}</span>
              <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
              <span className={`px-2 py-0.5 font-black rounded-md ${
                isDraft ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-500/10 text-muted'
              }`}>
                {item.erpOrder && item.erpOrder !== 'RECEPCION_BORRADOR' ? `ERP: ${item.erpOrder}` : 'AUTÓNOMO'}
              </span>
            </div>
          </div>
        </div>

        {/* Ver Detalle Button */}
        {onViewDetail && (
          <button 
            type="button"
            onClick={() => onViewDetail(item)}
            className="w-11 h-11 flex items-center justify-center shrink-0 text-purple-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-2xl transition-all border border-purple-500/20 active:scale-95"
            title="Ver Detalle"
          >
            <Expand className="w-5 h-5" />
          </button>
        )}

        {!isSynced && (
          <button 
            type="button"
            onClick={() => onDelete(item.id)}
            className="w-11 h-11 flex items-center justify-center shrink-0 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all border border-transparent hover:border-rose-500/20 active:scale-95"
            title="Eliminar del registro"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
});

ReceptionItemCard.displayName = 'ReceptionItemCard';
