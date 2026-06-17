/**
 * SliceList - Lista de slices con búsqueda y selección
 */

import React from 'react';
import { 
  Search, 
  Database, 
  Eye, 
  TrendingDown,
  Edit,
  Trash2,
  ChevronRight,
  Layers
} from 'lucide-react';
import { AppSheetSlice } from '../types/Slice';

interface Props {
  slices: AppSheetSlice[];
  activeSliceId: string;
  searchQuery: string;
  onSelect: (id: string) => void;
  onEdit: (slice: AppSheetSlice) => void;
  onDelete: (id: string) => void;
  isDark: boolean;
}

const SYSTEM_ICONS: Record<string, React.ReactNode> = {
  'sys-scans-error': <TrendingDown className="w-4 h-4 text-rose-400" />,
  'sys-sessions-active': <Eye className="w-4 h-4 text-emerald-400" />,
  'sys-products-offline': <Database className="w-4 h-4 text-amber-400" />,
  'sys-vencimiento-alerta': <Layers className="w-4 h-4 text-red-400" />,
};

export const SliceList: React.FC<Props> = ({
  slices,
  activeSliceId,
  searchQuery,
  onSelect,
  onEdit,
  onDelete,
  isDark,
}) => {
  const filteredSlices = React.useMemo(() => {
    if (!searchQuery.trim()) return slices;
    const q = searchQuery.toLowerCase();
    return slices.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.description.toLowerCase().includes(q)
    );
  }, [slices, searchQuery]);

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4 border-b border-slate-100 dark:border-white/5">
        <div className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl ${
          isDark ? 'bg-white/5' : 'bg-slate-100'
        }`}>
          <Search className={`w-4 h-4 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          <input
            type="text"
            placeholder="Buscar slices..."
            value={searchQuery}
            onChange={(e) => {/* Parent handles */}}
            className={`flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500 ${
              isDark ? 'text-white' : 'text-slate-800'
            }`}
          />
        </div>
      </div>

      {/* Slice List */}
      <div className="flex-1 overflow-y-auto">
        {filteredSlices.map((slice) => {
          const isActive = slice.id === activeSliceId;
          const isSystem = slice.isSystem;
          
          return (
            <div
              key={slice.id}
              onClick={() => onSelect(slice.id)}
              className={`group p-4 border-b border-slate-100 dark:border-white/5 transition-all cursor-pointer ${
                isActive 
                  ? isDark 
                    ? 'bg-indigo-500/10 border-l-4 border-l-indigo-500' 
                    : 'bg-indigo-50 border-l-4 border-l-indigo-600'
                  : isDark 
                    ? 'hover:bg-white/5' 
                    : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`shrink-0 mt-0.5 ${
                  isSystem ? '' : isDark ? 'text-indigo-400' : 'text-indigo-600'
                }`}>
                  {SYSTEM_ICONS[slice.id] || <Layers className="w-4 h-4" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-black truncate ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                      {slice.name}
                    </h3>
                    {isSystem && (
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${
                        isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                      }`}>
                        Sistema
                      </span>
                    )}
                  </div>
                  <p className={`text-[10px] mt-1 line-clamp-2 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {slice.description}
                  </p>
                  <div className={`flex items-center gap-3 mt-2 text-[9px] font-bold uppercase tracking-wide ${
                    isDark ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    <span>{slice.sourceTable}</span>
                    <span>•</span>
                    <span>{slice.selectedColumns.length} columnas</span>
                  </div>
                </div>

                <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                  isActive ? 'rotate-90' : ''
                } ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
              </div>

              {/* Actions */}
              {!isSystem && (
                <div className={`flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-white/5 ${
                  isActive ? 'flex' : 'hidden group-hover:flex'
                }`}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(slice); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors ${
                      isDark 
                        ? 'bg-white/10 hover:bg-white/20 text-white' 
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    }`}
                  >
                    <Edit className="w-3 h-3" />
                    Editar
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(slice.id); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                  >
                    <Trash2 className="w-3 h-3" />
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
