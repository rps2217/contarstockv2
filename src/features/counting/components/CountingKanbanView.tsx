/**
 * CountingKanbanView - Vista Kanban para sesiones de conteo
 */

import React, { useMemo, useState } from 'react';
import { 
  CheckCircle,
  Clock, 
  Cloud,
  CloudOff,
  Package,
  Play,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Session {
  id: string;
  name: string;
  status: string;
  sessionType: string;
  createdAt: number;
  completedAt?: number;
  syncStatus: string;
  totalScans?: number;
  totalQuantity?: number;
}

interface CountingKanbanViewProps {
  sessions: Session[];
  onItemClick?: (session: Session) => void;
  theme?: 'dark' | 'light' | 'high-contrast';
}

type GroupBy = 'status' | 'sync' | 'type';

interface KanbanColumn {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  sessions: Session[];
}

const SessionCard: React.FC<{
  session: Session;
  theme: string;
  onClick?: () => void;
}> = ({ session, theme, onClick }) => {
  const isDark = theme === 'dark';
  const isHighContrast = theme === 'high-contrast';

  const getStatusBadge = () => {
    switch (session.status) {
      case 'completed':
      case 'closed':
        return { label: 'Completada', color: 'bg-emerald-500', textColor: 'text-emerald-400' };
      case 'in_progress':
        return { label: 'En Progreso', color: 'bg-blue-500', textColor: 'text-blue-400' };
      case 'paused':
        return { label: 'Pausada', color: 'bg-amber-500', textColor: 'text-amber-400' };
      default:
        return { label: 'Activa', color: 'bg-slate-500', textColor: 'text-slate-400' };
    }
  };

  const statusBadge = getStatusBadge();
  const dateStr = format(session.createdAt, 'dd MMM HH:mm', { locale: es });

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-xl border transition-all active:scale-[0.98] text-left ${
        isHighContrast 
          ? 'bg-black border-yellow-400/30 hover:border-yellow-400' 
          : isDark 
            ? 'bg-slate-800/50 border-white/10 hover:border-white/20' 
            : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-bold truncate max-w-[120px] ${
          isHighContrast ? 'text-yellow-400' : isDark ? 'text-white' : 'text-slate-900'
        }`}>
          {session.name || 'Sin nombre'}
        </span>
        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${statusBadge.color} text-white`}>
          {statusBadge.label.slice(0, 4)}
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-[10px]">
        <div className="flex items-center gap-1">
          <Package className={`w-3 h-3 ${isHighContrast ? 'text-yellow-500' : 'text-slate-500'}`} />
          <span className={isHighContrast ? 'text-yellow-400' : isDark ? 'text-slate-400' : 'text-slate-600'}>
            {session.totalScans || 0}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className={`w-3 h-3 ${isHighContrast ? 'text-yellow-500' : 'text-slate-500'}`} />
          <span className={isHighContrast ? 'text-yellow-400' : isDark ? 'text-slate-400' : 'text-slate-600'}>
            {session.totalQuantity || 0}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
        <span className={`text-[8px] ${isHighContrast ? 'text-yellow-500' : 'text-slate-500'}`}>
          {dateStr}
        </span>
        <div className="flex items-center gap-1">
          {session.syncStatus === 'synced' ? (
            <Cloud className="w-3 h-3 text-emerald-500" />
          ) : session.syncStatus === 'pending' ? (
            <CloudOff className="w-3 h-3 text-amber-500" />
          ) : (
            <CloudOff className="w-3 h-3 text-slate-500" />
          )}
        </div>
      </div>
    </button>
  );
};

export const CountingKanbanView: React.FC<CountingKanbanViewProps> = ({
  sessions,
  onItemClick,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  const isHighContrast = theme === 'high-contrast';
  
  const [groupBy, setGroupBy] = useState<GroupBy>('status');
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(
    new Set(['completed', 'in_progress'])
  );

  const toggleColumn = (id: string) => {
    setExpandedColumns(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const columns = useMemo((): KanbanColumn[] => {
    const groups = new Map<string, { title: string; icon: React.ReactNode; sessions: Session[] }>();

    sessions.forEach(s => {
      let key: string;
      let title: string;
      let icon: React.ReactNode;

      if (groupBy === 'status') {
        key = s.status || 'unknown';
        title = s.status === 'completed' || s.status === 'closed' ? 'Completadas'
          : s.status === 'in_progress' ? 'En Progreso'
          : s.status === 'paused' ? 'Pausadas'
          : 'Activas';
        icon = s.status === 'completed' || s.status === 'closed' 
          ? <CheckCircle className="w-3 h-3" />
          : <Play className="w-3 h-3" />;
      } else if (groupBy === 'sync') {
        key = `sync_${s.syncStatus || 'pending'}`;
        title = s.syncStatus === 'synced' ? 'Sincronizadas'
          : s.syncStatus === 'pending' ? 'Pendientes'
          : 'Con Errores';
        icon = s.syncStatus === 'synced' 
          ? <Cloud className="w-3 h-3" />
          : s.syncStatus === 'pending'
            ? <Clock className="w-3 h-3" />
            : <CloudOff className="w-3 h-3" />;
      } else {
        key = s.sessionType || 'standard';
        title = s.sessionType === 'hammer' ? 'Martillo'
          : s.sessionType === 'reception' ? 'Recepciones'
          : 'Estándar';
        icon = <Package className="w-3 h-3" />;
      }

      if (!groups.has(key)) {
        groups.set(key, { title, icon, sessions: [] });
      }
      groups.get(key)!.sessions.push(s);
    });

    const colorMap: Record<string, { color: string; bgColor: string; borderColor: string }> = {
      completed: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
      closed: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
      in_progress: { color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
      paused: { color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
      active: { color: 'text-slate-400', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/30' },
      sync_synced: { color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30' },
      sync_pending: { color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
      sync_error: { color: 'text-rose-400', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/30' },
      standard: { color: 'text-indigo-400', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/30' },
      hammer: { color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
      reception: { color: 'text-violet-400', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/30' },
    };

    return Array.from(groups.entries())
      .map(([key, data]) => ({
        id: key,
        title: data.title,
        icon: data.icon,
        sessions: data.sessions,
        ...(colorMap[key] || { color: 'text-slate-400', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/30' }),
      }))
      .sort((a, b) => b.sessions.length - a.sessions.length);
  }, [sessions, groupBy]);

  return (
    <div className="p-4">
      {/* Controls */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className={`text-sm font-bold ${isHighContrast ? 'text-yellow-400' : isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Total: <span className={isHighContrast ? 'text-yellow-300' : isDark ? 'text-white' : 'text-slate-900'}>{sessions.length}</span>
          </span>
        </div>
        <div className="flex gap-1">
          {[
            { id: 'status', label: 'Estado' },
            { id: 'sync', label: 'Sync' },
            { id: 'type', label: 'Tipo' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setGroupBy(opt.id as GroupBy)}
              className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors ${
                groupBy === opt.id 
                  ? 'bg-indigo-600 text-white' 
                  : isDark 
                    ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map(col => {
          const isExpanded = expandedColumns.has(col.id);
          
          return (
            <div 
              key={col.id}
              className={`flex-1 min-w-[200px] max-w-[280px] rounded-xl border ${col.borderColor} ${col.bgColor} overflow-hidden`}
            >
              {/* Header */}
              <button
                onClick={() => toggleColumn(col.id)}
                className={`w-full p-3 flex items-center justify-between ${col.bgColor} border-b ${col.borderColor}`}
              >
                <div className="flex items-center gap-2">
                  <span className={col.color}>{col.icon}</span>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${col.color}`}>
                    {col.title}
                  </span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-800 text-white`}>
                    {col.sessions.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className={`w-4 h-4 ${col.color}`} />
                ) : (
                  <ChevronDown className={`w-4 h-4 ${col.color}`} />
                )}
              </button>

              {/* Content */}
              {isExpanded && (
                <div className="p-2 space-y-2 max-h-[400px] overflow-y-auto">
                  {col.sessions.slice(0, 15).map(s => (
                    <SessionCard 
                      key={s.id} 
                      session={s} 
                      theme={theme}
                      onClick={() => onItemClick?.(s)}
                    />
                  ))}
                  {col.sessions.length > 15 && (
                    <div className={`text-center text-[9px] py-2 ${isHighContrast ? 'text-yellow-500' : 'text-slate-500'}`}>
                      +{col.sessions.length - 15} más
                    </div>
                  )}
                  {col.sessions.length === 0 && (
                    <div className={`text-center text-[9px] py-4 ${isHighContrast ? 'text-yellow-500' : 'text-slate-500'}`}>
                      Sin elementos
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CountingKanbanView;
