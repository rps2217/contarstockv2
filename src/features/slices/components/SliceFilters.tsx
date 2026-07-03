/**
 * SliceFilters - Barra de búsqueda y panel de información del slice activo
 */

import React from 'react';
import { Search, SlidersHorizontal, FileSpreadsheet, Info } from 'lucide-react';
import { AppSheetSlice } from '../types/Slice';

interface Props {
  activeSlice: AppSheetSlice | undefined;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onExport: () => void;
  filteredCount: number;
  totalCount: number;
  theme?: 'dark' | 'light' | 'gray' | 'high-contrast' | 'appsheet-dark' | 'night';
}

export const SliceFilters: React.FC<Props> = ({
  activeSlice,
  searchTerm,
  onSearchChange,
  onExport,
  filteredCount,
  totalCount,
  theme = 'dark',
}) => {
  if (!activeSlice) return null;

  const isDark = theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark' || theme === 'gray';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  // Clases según tema
  const bgSecondary = isLight ? 'bg-slate-100' : isHighContrast ? 'bg-yellow-950/20' : 'bg-surface/30';
  const borderSubtle = isLight ? 'border-slate-200' : isHighContrast ? 'border-yellow-400/30' : 'border-slate-900/80';
  const borderMain = isLight ? 'border-slate-200' : isHighContrast ? 'border-yellow-400' : 'border-slate-900';
  
  const textPrimary = isLight ? 'text-slate-900' : isHighContrast ? 'text-yellow-400' : 'text-white';
  const textSecondary = isLight ? 'text-slate-600' : isHighContrast ? 'text-yellow-500' : 'text-muted';
  const textMuted = isLight ? 'text-slate-500' : isHighContrast ? 'text-yellow-600' : 'text-slate-500';
  
  const accentBlue = isLight ? 'text-blue-600 bg-blue-50 border-blue-200' : isHighContrast ? 'text-yellow-400 bg-yellow-900/20 border-yellow-400/30' : 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  const accentGreen = isLight ? 'text-emerald-600' : isHighContrast ? 'text-yellow-400' : 'text-emerald-500';
  const accentGreenBg = isLight ? 'hover:bg-emerald-50' : isHighContrast ? 'hover:bg-yellow-900/10' : 'hover:bg-emerald-500/10';
  
  const inputBg = isLight ? 'bg-white' : isHighContrast ? 'bg-black' : 'bg-base';
  const inputBorder = isLight ? 'border-slate-200' : isHighContrast ? 'border-yellow-400' : 'border-slate-900';

  return (
    <div className="space-y-4">
      {/* Header info for Active Slice */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${borderMain}`}>
        <div className="space-y-1">
          <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${accentBlue}`}>
            Tabla Madre: {activeSlice.sourceTable.toUpperCase()}
          </span>
          <h2 className={`text-lg font-black uppercase mt-1 ${textPrimary}`}>{activeSlice.name}</h2>
          <p className={`text-xs leading-relaxed max-w-2xl ${textSecondary}`}>{activeSlice.description}</p>
        </div>

        <button
          onClick={onExport}
          className={`flex items-center gap-1.5 px-3.5 py-2 border transition-all active:scale-95 self-start rounded-xl text-[10px] font-black uppercase tracking-wider ${accentGreenBg} ${accentGreen} border-current`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> EXPORTAR CSV
        </button>
      </div>

      {/* Segmenting Criteria block */}
      <div className={`${bgSecondary} border ${borderSubtle} p-3.5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs`}>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className={`w-4 h-4 ${isLight ? 'text-blue-500' : isHighContrast ? 'text-yellow-400' : 'text-blue-400'}`} />
          <span className={`font-bold font-mono ${textSecondary}`}>Filtro Condicional:</span>
          <code className={`px-2 py-0.5 rounded border font-mono font-bold ${isLight ? 'text-blue-600 bg-blue-50 border-blue-200' : isHighContrast ? 'text-yellow-300 bg-yellow-900/20 border-yellow-400/30' : 'text-blue-400 bg-blue-500/5 border-blue-500/10'}`}>
            [{activeSlice.filterField}] {activeSlice.filterOperator} "{activeSlice.filterValue}"
          </code>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`${textMuted} text-[10px] uppercase font-bold`}>Edición:</span>
            <span className={`w-2 h-2 rounded-full ${activeSlice.allowEdits ? (isLight ? 'bg-emerald-500' : 'bg-emerald-500') : 'bg-rose-500'}`} />
            <span className={`text-[10px] font-bold uppercase ${textSecondary}`}>{activeSlice.allowEdits ? 'Sí' : 'No'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`${textMuted} text-[10px] uppercase font-bold`}>Borrado:</span>
            <span className={`w-2 h-2 rounded-full ${activeSlice.allowDeletes ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className={`text-[10px] font-bold uppercase ${textSecondary}`}>{activeSlice.allowDeletes ? 'Sí' : 'No'}</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Escribe para buscar o depurar en este Slice..."
          className={`w-full ${inputBg} border ${inputBorder} rounded-2xl pl-11 pr-4 py-3 text-xs placeholder:${textMuted} focus:outline-none focus:border-blue-500 transition-colors ${textPrimary}`}
        />
      </div>

      {/* Info footer */}
      <div className={`p-3 border rounded-2xl flex gap-2.5 ${isLight ? 'bg-blue-50 border-blue-200' : isHighContrast ? 'bg-yellow-900/20 border-yellow-400/30' : 'bg-blue-500/5 border-blue-500/10'}`}>
        <Info className={`w-4 h-4 shrink-0 mt-0.5 ${isLight ? 'text-blue-500' : isHighContrast ? 'text-yellow-400' : 'text-blue-400'}`} />
        <p className={`text-[10px] leading-normal ${textSecondary}`}>
          <strong>¿Qué es un Slice?</strong> Es una "segmentación de tabla" como en AppSheet. 
          En lugar de procesar millones de filas, diseñas vistas compactas para la línea operativa.
        </p>
      </div>

      {/* Stats */}
      <div className={`flex justify-between items-center px-1 ${textMuted} text-xs`}>
        <span className="font-bold uppercase tracking-wider">
          Total en Slice: <span className={`font-mono ${textPrimary}`}>{filteredCount}</span> registros de{' '}
          <span className={`font-mono ${textSecondary}`}>{totalCount}</span>
        </span>
        <span>Visualizando en Tiempo Real desde la Base Local</span>
      </div>
    </div>
  );
};
