/**
 * CountingMetricsCards - Dashboard de métricas para sesiones de conteo
 */

import React, { useMemo } from 'react';
import {
  Boxes,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  Cloud,
  CloudOff,
  TrendingUp,
  Zap,
  Timer,
  History,
} from 'lucide-react';

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

interface CountingMetricsCardsProps {
  sessions: Session[];
  theme?: 'dark' | 'light' | 'gray' | 'high-contrast' | 'appsheet-dark' | 'night';
}

export const CountingMetricsCards: React.FC<CountingMetricsCardsProps> = ({
  sessions,
  theme = 'dark',
}) => {
  const isDark =
    (theme as unknown) === 'dark' ||
    (theme as unknown) === 'night' ||
    (theme as unknown) === 'high-contrast' ||
    (theme as unknown) === 'appsheet-dark' ||
    (theme as unknown) === 'gray';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  const metrics = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return {
        total: 0,
        completed: 0,
        inProgress: 0,
        pendingSync: 0,
        synced: 0,
        totalItems: 0,
        totalUnits: 0,
        avgPerSession: 0,
        todaySessions: 0,
      };
    }

    const now = Date.now();
    const today = new Date().setHours(0, 0, 0, 0);

    let completed = 0;
    let inProgress = 0;
    let pendingSync = 0;
    let synced = 0;
    let totalItems = 0;
    let totalUnits = 0;
    let todaySessions = 0;

    sessions.forEach(s => {
      if (s.status === 'completed' || s.status === 'closed') {
        completed++;
      } else {
        inProgress++;
      }

      if (s.syncStatus === 'pending' || s.syncStatus === 'uploading') {
        pendingSync++;
      } else if (s.syncStatus === 'synced') {
        synced++;
      }

      totalItems += s.totalScans || 0;
      totalUnits += s.totalQuantity || 0;

      if (s.createdAt >= today) {
        todaySessions++;
      }
    });

    return {
      total: sessions.length,
      completed,
      inProgress,
      pendingSync,
      synced,
      totalItems,
      totalUnits,
      avgPerSession: completed > 0 ? Math.round(totalItems / completed) : 0,
      todaySessions,
    };
  }, [sessions]);

  const textColor = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white';
  const subtextColor = isHighContrast
    ? 'text-yellow-500'
    : isLight
      ? 'text-slate-500'
      : 'text-muted';

  const cards = [
    {
      label: 'Total Sesiones',
      value: metrics.total,
      icon: History,
      color: isHighContrast ? 'text-yellow-400' : isLight ? 'text-indigo-600' : 'text-indigo-400',
      bgColor: isHighContrast
        ? 'bg-yellow-900/20 border-yellow-400/30'
        : isLight
          ? 'bg-indigo-50'
          : 'bg-indigo-500/10',
    },
    {
      label: 'Hoy',
      value: metrics.todaySessions,
      icon: Zap,
      color: isHighContrast ? 'text-yellow-400' : isLight ? 'text-amber-600' : 'text-amber-400',
      bgColor: isHighContrast
        ? 'bg-yellow-900/20 border-yellow-400/30'
        : isLight
          ? 'bg-amber-50'
          : 'bg-amber-500/10',
    },
    {
      label: 'Completadas',
      value: metrics.completed,
      icon: CheckCircle,
      color: isHighContrast ? 'text-yellow-400' : isLight ? 'text-emerald-600' : 'text-emerald-400',
      bgColor: isHighContrast
        ? 'bg-yellow-900/20 border-yellow-400/30'
        : isLight
          ? 'bg-emerald-50'
          : 'bg-emerald-500/10',
    },
    {
      label: 'En Progreso',
      value: metrics.inProgress,
      icon: Clock,
      color: isHighContrast ? 'text-yellow-400' : isLight ? 'text-blue-600' : 'text-blue-400',
      bgColor: isHighContrast
        ? 'bg-yellow-900/20 border-yellow-400/30'
        : isLight
          ? 'bg-blue-50'
          : 'bg-blue-500/10',
    },
    {
      label: 'Items Totales',
      value: metrics.totalItems,
      icon: Package,
      color: isHighContrast ? 'text-yellow-400' : isLight ? 'text-purple-600' : 'text-purple-400',
      bgColor: isHighContrast
        ? 'bg-yellow-900/20 border-yellow-400/30'
        : isLight
          ? 'bg-purple-50'
          : 'bg-purple-500/10',
    },
    {
      label: 'Pendiente Sync',
      value: metrics.pendingSync,
      icon: CloudOff,
      color:
        metrics.pendingSync > 0
          ? isHighContrast
            ? 'text-yellow-400'
            : isLight
              ? 'text-rose-600'
              : 'text-rose-400'
          : isHighContrast
            ? 'text-yellow-400'
            : isLight
              ? 'text-slate-600'
              : 'text-muted',
      bgColor:
        metrics.pendingSync > 0
          ? isHighContrast
            ? 'bg-yellow-900/20 border-yellow-400/30'
            : isLight
              ? 'bg-rose-50'
              : 'bg-rose-500/10'
          : isHighContrast
            ? 'bg-yellow-900/20 border-yellow-400/30'
            : isLight
              ? 'bg-slate-50'
              : 'bg-slate-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <button
            key={card.label}
            className={`p-3 rounded-xl border transition-all active:scale-95 text-left ${card.bgColor}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${subtextColor}`}>
                {card.label}
              </span>
              <Icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <div className={`text-xl font-black ${textColor}`}>{card.value.toLocaleString()}</div>
          </button>
        );
      })}
    </div>
  );
};

export default CountingMetricsCards;
