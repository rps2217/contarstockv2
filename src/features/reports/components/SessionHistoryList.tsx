/**
 * SessionHistoryList - Lista de sesiones/bultos con filtrado
 */

import React from 'react';
import { Archive } from 'lucide-react';
import { VirtualList } from '../../../shared/components/ui/VirtualList';
import { SessionRow } from './SessionRow';
import { SessionRowSkeleton } from './SessionRowSkeleton';

interface Session {
  id: string;
  name: string;
  status: string;
  sessionType: string;
  createdAt: number;
  completedAt?: number;
  syncStatus: string;
  createdBy?: string;
  erpOrder?: string;
  totalScans?: number;
  totalQuantity?: number;
}

interface Props {
  sessions: Session[] | undefined;
  isLoading?: boolean;
  filterType: string;
  theme: 'light' | 'dark';
  isDark?: boolean;
  activeMenuId: string | null;
  onSelect: (id: string) => void;
  onMenuToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEndReached: () => void;
  onFilterChange: (filter: string) => void;
}

export const SessionHistoryList: React.FC<Props> = ({
  sessions,
  isLoading = false,
  filterType,
  theme,
  isDark = true,
  activeMenuId,
  onSelect,
  onMenuToggle,
  onDelete,
  onEndReached,
  onFilterChange,
}) => {
  const rowData = {
    onSelect,
    activeMenuId,
    onMenuToggle,
    onDelete,
    theme,
  };

  return (
    <div className="flex flex-col flex-1 gap-4">
      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'standard', label: 'Estándar/Consolidado' },
          { id: 'hammer', label: 'Ciego (Martillo)' },
          { id: 'reception', label: 'Recepciones' }
        ].map(pill => (
          <button
            key={pill.id}
            onClick={() => onFilterChange(pill.id)}
            className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 border transition-all ${
              filterType === pill.id
                ? isDark 
                  ? 'bg-white text-black border-white'
                  : 'bg-indigo-600 text-white border-indigo-700'
                : isDark
                  ? 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Sessions Grid */}
      <div className={`flex-1 border rounded-[2rem] overflow-hidden shadow-sm relative flex flex-col ${
        isDark ? 'bg-brand-surface border-white/5' : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`h-11 border-b flex items-center px-6 justify-between z-10 shrink-0 ${
          isDark ? 'bg-brand-dark/50 border-white/5' : 'bg-slate-50 border-slate-100'
        }`}>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Firma Operativa / Bulto
          </span>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Detalle y Estado
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-[480px]">
          {isLoading ? (
            <div className="flex flex-col">
              {[...Array(5)].map((_, i) => (
                <SessionRowSkeleton key={i} theme={theme} />
              ))}
            </div>
          ) : sessions?.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
              <Archive className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                Sin bultos en este filtro
              </p>
            </div>
          ) : (
            <VirtualList
              items={sessions || []}
              itemHeight={110}
              renderRow={SessionRow}
              rowData={rowData}
              onEndReached={onEndReached}
              emptyState={
                <div className="flex flex-col items-center">
                  <Archive className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                    Historial vacío
                  </p>
                </div>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};
