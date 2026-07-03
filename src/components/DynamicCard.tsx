import React from 'react';
import { motion } from 'motion/react';
import { TableSchema } from '../types';
import { Trash2, Info, Cloud, AlertCircle, CheckCircle2, ExternalLink, Image as ImageIcon, CheckSquare, Square } from 'lucide-react';

interface DynamicCardProps {
  item: any;
  schema: TableSchema;
  onRemove?: (item: any) => void;
  onClick?: (item: any) => void;
  theme?: 'dark' | 'light' | 'gray' | 'high-contrast' | 'appsheet-dark' | 'night';
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export const DynamicCard: React.FC<DynamicCardProps> = ({
  item,
  schema,
  onRemove,
  onClick,
  theme = 'dark',
  isSelected = false,
  onSelect
}) => {
  const columns = Object.entries(schema.columns);
  
  // Identify primary fields for the card header
  const barcodeField = columns.find(([_, col]) => col.type === 'barcode')?.[0];
  const titleField = columns.find(([_, col]) => col.type === 'string' && col.required)?.[0] || columns[0][0];

  const syncStatus = item._syncStatus;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 border rounded-2xl flex flex-col gap-3 transition-all cursor-pointer relative overflow-hidden group ${
        isSelected 
          ? (theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark' || theme === 'gray' ? 'bg-indigo-500/20 border-indigo-500/50 ring-1 ring-indigo-500' : 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-400')
          : (theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark' || theme === 'gray' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-stone-200 shadow-sm hover:border-indigo-300')
      } ${syncStatus === 'error' && !isSelected ? 'border-rose-500/50 bg-rose-500/5' : ''}`}
      onClick={() => onClick?.(item)}
    >
      {/* Sync Status Badge */}
      <div className="absolute top-0 right-0 p-1.5 flex items-center gap-2">
        {syncStatus === 'synced' ? (
          <CheckCircle2 className="w-3 h-3 text-emerald-500 opacity-50" />
        ) : syncStatus === 'error' ? (
          <AlertCircle className="w-4 h-4 text-rose-500 animate-pulse" />
        ) : (
          <Cloud className="w-3 h-3 text-amber-500 opacity-50" />
        )}
      </div>

      <div className="flex justify-between items-start">
        <div className="flex items-start gap-3 min-w-0">
          {onSelect && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onSelect(item.id);
              }}
              className={`mt-1 shrink-0 transition-colors ${isSelected ? 'text-indigo-500' : (theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark' || theme === 'gray' ? 'text-slate-600 hover:text-muted' : 'text-stone-300 hover:text-stone-500')}`}
            >
              {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
            </button>
          )}
          <div className="flex flex-col gap-1 min-w-0">
            <h3 className={`text-base font-black uppercase tracking-tighter italic truncate ${
              theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark' || theme === 'gray' ? 'text-white' : 'text-stone-900'
            }`}>
              {item[titleField] || 'Sin Título'}
            </h3>
            <div className="flex items-center gap-2">
              {barcodeField && item[barcodeField] && (
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-widest border w-fit ${
                  theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark' || theme === 'gray' ? 'bg-elevated text-secondary border-white/10' : 'bg-stone-100 text-stone-600 border-stone-200'
                }`}>
                  {item[barcodeField]}
                </span>
              )}
              {syncStatus === 'error' && (
                <span className="text-[8px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded uppercase tracking-widest">
                  Error Sync
                </span>
              )}
            </div>
          </div>
        </div>
        
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item);
            }}
            className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-all border border-rose-500/20 opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 pl-8">
        {columns.map(([key, col]) => {
          // Skip title and barcode as they are already in the header
          if (key === titleField || key === barcodeField) return null;
          
          const value = item[key];
          if (value === undefined || value === null || value === '') return null;

          return (
            <div key={key} className="flex flex-col gap-0.5">
              <span className="text-[8px] font-black text-stone-500 uppercase tracking-widest">
                {col.label}
              </span>
              <span className={`text-xs font-bold truncate ${
                theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark' || theme === 'gray' ? 'text-secondary' : 'text-stone-700'
              }`}>
                {col.type === 'image' ? (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 bg-black/20">
                      <img 
                        src={String(value)} 
                        alt={col.label} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <a 
                      href={String(value)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-indigo-400 transition-all"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : typeof value === 'boolean' ? (value ? 'SÍ' : 'NO') : String(value)}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

