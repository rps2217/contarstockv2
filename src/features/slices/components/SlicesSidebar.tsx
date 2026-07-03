/**
 * SlicesSidebar - Panel lateral con lista de slices disponibles
 */

import React from 'react';
import { Database, Filter, Trash2 } from 'lucide-react';
import { AppSheetSlice } from '../types/Slice';

interface Props {
  slices: AppSheetSlice[];
  activeSliceId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  theme?: 'dark' | 'light' | 'gray' | 'high-contrast' | 'appsheet-dark' | 'night';
}

export const SlicesSidebar: React.FC<Props> = ({
  slices,
  activeSliceId,
  onSelect,
  onDelete,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark' || theme === 'gray';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  // Clases según el tema
  const containerClass = isLight 
    ? 'bg-white border-slate-200' 
    : isHighContrast 
    ? 'bg-black border-yellow-400' 
    : 'bg-base/40 border-slate-900';

  const headerTextClass = isLight ? 'text-slate-500' : isHighContrast ? 'text-yellow-400' : 'text-slate-500';
  const iconClass = isLight ? 'text-muted' : isHighContrast ? 'text-yellow-400' : 'text-slate-600';
  
  const itemActiveClass = isLight 
    ? 'bg-blue-50 border-blue-200 text-slate-900' 
    : isHighContrast 
    ? 'bg-yellow-900/20 border-yellow-400 text-yellow-400' 
    : 'bg-blue-600/10 border-blue-500/30 text-white';
  
  const itemInactiveClass = isLight 
    ? 'border-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900' 
    : isHighContrast 
    ? 'border-transparent hover:bg-yellow-900/10 text-yellow-500 hover:text-yellow-300' 
    : 'border-transparent hover:bg-white/5 text-muted hover:text-white';
  
  const iconBgActiveClass = isLight ? 'bg-blue-100 text-blue-600' : isHighContrast ? 'bg-yellow-900/30 text-yellow-400' : 'bg-blue-500/20 text-blue-400';
  const iconBgInactiveClass = isLight ? 'bg-slate-100 text-muted' : isHighContrast ? 'bg-yellow-900/20 text-yellow-600' : 'bg-surface/60 text-slate-500';
  
  const sliceNameClass = isLight ? 'text-slate-800' : isHighContrast ? 'text-yellow-300' : 'text-white';
  const subtitleClass = isLight ? 'text-slate-500' : isHighContrast ? 'text-yellow-600' : 'text-slate-500';
  
  const helpBgClass = isLight ? 'bg-blue-50 border-blue-200' : isHighContrast ? 'bg-yellow-900/20 border-yellow-400/30' : 'bg-blue-500/5 border-blue-500/10';
  const helpTextClass = isLight ? 'text-slate-600' : isHighContrast ? 'text-yellow-500' : 'text-muted';

  return (
    <div className={`${containerClass} border rounded-3xl p-4 space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-inherit">
        <span className={`text-[10px] font-black uppercase tracking-widest ${headerTextClass}`}>
          Slices Disponibles ({slices.length})
        </span>
        <Database className={`w-4 h-4 ${iconClass}`} />
      </div>

      {/* Slice List */}
      <div className="space-y-1">
        {slices.map((slice) => {
          const isActive = slice.id === activeSliceId;
          const isSys = slice.isSystem;
          
          return (
            <div
              key={slice.id}
              className={`w-full group rounded-2xl p-3 flex items-center justify-between transition-all cursor-pointer border ${
                isActive ? itemActiveClass : itemInactiveClass
              }`}
              onClick={() => onSelect(slice.id)}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${isActive ? iconBgActiveClass : iconBgInactiveClass}`}>
                  <Filter className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className={`text-xs font-black block truncate transition-colors ${sliceNameClass}`}>
                    {slice.name}
                  </span>
                  <span className={`text-[9px] font-mono uppercase tracking-wider ${subtitleClass}`}>
                    {slice.sourceTable} • {isSys ? 'SISTEMA' : 'USUARIO'}
                  </span>
                </div>
              </div>

              {!isSys && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(slice.id);
                  }}
                  className={`p-1.5 rounded-lg transition-transform hover:scale-115 shrink-0 opacity-0 group-hover:opacity-100 ${
                    isLight ? 'text-muted hover:text-rose-500' : isHighContrast ? 'text-yellow-600 hover:text-yellow-300' : 'text-slate-600 hover:text-rose-400'
                  }`}
                  title="Eliminar Slice"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Help text */}
      <div className={`p-3 ${helpBgClass} border rounded-2xl`}>
        <p className={`text-[10px] leading-normal ${helpTextClass}`}>
          <strong>¿Qué es un Slice?</strong> Es una "segmentación de tabla" como en AppSheet. 
          En lugar de procesar millones de filas, diseñas vistas compactas para la línea operativa.
        </p>
      </div>
    </div>
  );
};
