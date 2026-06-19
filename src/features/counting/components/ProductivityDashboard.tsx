/**
 * ProductivityDashboard - Panel de métricas de productividad en tiempo real
 * 
 * Muestra:
 * - Items/minuto
 * - Tendencia (↑↓→)
 * - Duración de sesión
 * - Tiempo promedio por item
 */

import React from 'react';
import { Zap, TrendingUp, TrendingDown, Minus, Clock, Timer } from 'lucide-react';
import { ProductivityStats } from '../hooks/useProductivity';

interface ProductivityDashboardProps {
  stats: ProductivityStats;
  formattedDuration: string;
  isVisible: boolean;
  onToggle: () => void;
}

export const ProductivityDashboard: React.FC<ProductivityDashboardProps> = ({
  stats,
  formattedDuration,
  isVisible,
  onToggle,
}) => {
  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed top-20 right-4 z-[150] bg-slate-900/90 backdrop-blur-sm border border-white/10 rounded-2xl px-3 py-2 flex items-center gap-2 shadow-lg"
      >
        <Zap className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-black text-white">
          {stats.itemsPerMinute.toFixed(1)}/min
        </span>
      </button>
    );
  }

  const TrendIcon = stats.trend === 'increasing' ? TrendingUp 
    : stats.trend === 'decreasing' ? TrendingDown 
    : Minus;
  
  const trendColor = stats.trend === 'increasing' ? 'text-emerald-400' 
    : stats.trend === 'decreasing' ? 'text-rose-400' 
    : 'text-slate-400';

  const trendArrow = stats.trend === 'increasing' ? '↑' 
    : stats.trend === 'decreasing' ? '↓' 
    : '→';

  return (
    <div className="fixed top-20 right-4 z-[150] bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-3xl p-4 shadow-2xl min-w-[220px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-amber-500/20 p-1.5 rounded-lg">
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Productividad
          </span>
        </div>
        <button 
          onClick={onToggle}
          className="text-slate-500 hover:text-white text-xs font-bold"
        >
          ✕
        </button>
      </div>

      {/* Main metric */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-white">
            {stats.itemsPerMinute.toFixed(1)}
          </span>
          <span className="text-xs font-bold text-slate-400 uppercase">items/min</span>
        </div>
        <div className={`flex items-center gap-1 mt-1 ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          <span className="text-[10px] font-bold">
            {stats.trendPercent > 0 ? `+${stats.trendPercent}%` : stats.trendPercent < 0 ? `${stats.trendPercent}%` : 'estable'}
          </span>
          <span className="text-slate-500 text-[10px]">vs promedio</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total items */}
        <div className="bg-white/5 rounded-xl p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-[9px] font-bold text-slate-500 uppercase">Items</span>
          </div>
          <div className="text-lg font-black text-white">{stats.totalItems}</div>
        </div>

        {/* Total quantity */}
        <div className="bg-white/5 rounded-xl p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[9px] font-bold text-slate-500 uppercase">Unidades</span>
          </div>
          <div className="text-lg font-black text-white">{stats.totalQuantity}</div>
        </div>

        {/* Duration */}
        <div className="bg-white/5 rounded-xl p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span className="text-[9px] font-bold text-slate-500 uppercase">Duración</span>
          </div>
          <div className="text-lg font-black text-white">{formattedDuration}</div>
        </div>

        {/* Avg time */}
        <div className="bg-white/5 rounded-xl p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Timer className="w-3 h-3 text-slate-500" />
            <span className="text-[9px] font-bold text-slate-500 uppercase">Promedio</span>
          </div>
          <div className="text-lg font-black text-white">
            {stats.averageTimePerItem > 0 
              ? `${(stats.averageTimePerItem / 1000).toFixed(1)}s` 
              : '--'}
          </div>
        </div>
      </div>

      {/* Trend bar */}
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-500 font-medium">Ritmo</span>
          <div className={`flex items-center gap-1 font-black ${trendColor}`}>
            <span>{trendArrow}</span>
            <span>
              {stats.trend === 'increasing' ? 'Acelerando' 
                : stats.trend === 'decreasing' ? 'Desacelerando' 
                : 'Constante'}
            </span>
          </div>
        </div>
        <div className="mt-1.5 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              stats.trend === 'increasing' ? 'bg-emerald-400' 
                : stats.trend === 'decreasing' ? 'bg-rose-400' 
                : 'bg-blue-400'
            }`}
            style={{ 
              width: `${Math.min(100, Math.max(10, 50 + (stats.trendPercent || 0)))}%` 
            }}
          />
        </div>
      </div>
    </div>
  );
};
