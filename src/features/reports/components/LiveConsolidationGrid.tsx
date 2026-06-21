/**
 * LiveConsolidationGrid - Grid de consolidación en tiempo real
 */

import React from 'react';
import { Archive, MapPin } from 'lucide-react';
import type { ConsolidatedItem } from '../hooks/useReports';

interface Props {
  items: ConsolidatedItem[];
  isLoading?: boolean;
  searchQuery: string;
  theme?: 'dark' | 'light' | 'high-contrast';
  onExport: () => void;
  stats: {
    totalSKUs: number;
    totalUnits: number;
    locationsCount: number;
  };
}

export const LiveConsolidationGrid: React.FC<Props> = ({
  items,
  isLoading = false,
  theme = 'dark',
  onExport,
  stats,
}) => {
  const isDark = theme === 'dark';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  // Clases según tema
  const cardBg = isHighContrast ? 'bg-black' : isLight ? 'bg-white' : 'bg-brand-surface';
  const cardBorder = isHighContrast ? 'border-yellow-400' : isLight ? 'border-slate-200' : 'border-white/5';
  const headerBg = isHighContrast ? 'bg-yellow-950/30' : isLight ? 'bg-slate-50' : 'bg-brand-dark/50';
  const headerBorder = isHighContrast ? 'border-yellow-400/30' : isLight ? 'border-slate-100' : 'border-white/5';
  const textPrimary = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white';
  const textSecondary = isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-600' : 'text-slate-400';
  const textMuted = isHighContrast ? 'text-yellow-600' : isLight ? 'text-slate-400' : 'text-slate-500';
  const rowHover = isHighContrast ? 'hover:bg-yellow-900/10' : isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5';
  const divider = isHighContrast ? 'divide-yellow-400/20' : isLight ? 'divide-slate-100' : 'divide-slate-500/10';

  const getStatIconBg = (color: string) => {
    if (isHighContrast) return 'bg-yellow-900/30';
    if (isLight) return `bg-${color}-50`;
    return `bg-${color}-500/10`;
  };

  const getStatIconColor = (color: string) => {
    if (isHighContrast) return 'text-yellow-400';
    if (isLight) return `text-${color}-600`;
    return `text-${color}-400`;
  };

  return (
    <div className="flex flex-col flex-1 gap-3">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`flex-1 border rounded-[2rem] overflow-hidden shadow-sm p-4 flex items-center gap-3 ${cardBg} ${cardBorder}`}>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${getStatIconBg('indigo')}`}>
            <Archive className={`w-5 h-5 ${getStatIconColor('indigo')}`} />
          </div>
          <div>
            <span className={`text-[8px] font-black uppercase tracking-widest block ${textMuted}`}>SKUs</span>
            <span className={`text-xl font-black mt-1 block italic ${textPrimary}`}>
              {stats.totalSKUs}
            </span>
          </div>
        </div>

        <div className={`flex-1 border rounded-[2rem] overflow-hidden shadow-sm p-4 flex items-center gap-3 ${cardBg} ${cardBorder}`}>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${getStatIconBg('emerald')}`}>
            <Archive className={`w-5 h-5 ${getStatIconColor('emerald')}`} />
          </div>
          <div>
            <span className={`text-[8px] font-black uppercase tracking-widest block ${textMuted}`}>UNIDADES</span>
            <span className={`text-xl font-black mt-1 block italic ${textPrimary}`}>
              {stats.totalUnits.toLocaleString()}
            </span>
          </div>
        </div>

        <div className={`flex-1 border rounded-[2rem] overflow-hidden shadow-sm p-4 flex items-center gap-3 ${cardBg} ${cardBorder}`}>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${getStatIconBg('blue')}`}>
            <MapPin className={`w-5 h-5 ${getStatIconColor('blue')}`} />
          </div>
          <div>
            <span className={`text-[8px] font-black uppercase tracking-widest block ${textMuted}`}>ZONAS</span>
            <span className={`text-xl font-black mt-1 block italic ${textPrimary}`}>
              {stats.locationsCount}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Table */}
      <div className={`flex-1 border rounded-[2rem] overflow-hidden shadow-sm relative flex flex-col ${cardBg} ${cardBorder}`}>
        {/* Header */}
        <div className={`h-11 border-b flex items-center px-6 justify-between z-10 shrink-0 ${headerBg} ${headerBorder}`}>
          <span className={`text-[8px] font-black uppercase tracking-widest flex-1 ${textMuted}`}>PRODUCTO / SKU</span>
          <span className={`text-[8px] font-black uppercase tracking-widest w-24 text-right ${textMuted}`}>CANT. TOTAL</span>
          <span className={`text-[8px] font-black uppercase tracking-widest w-24 text-right ${textMuted}`}>ORIGEN</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col p-4 gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`h-16 animate-pulse rounded-2xl w-full ${isHighContrast ? 'bg-yellow-900/20' : isLight ? 'bg-slate-200' : 'bg-slate-500/10'}`} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Archive className={`w-10 h-10 opacity-20 mb-2 ${isHighContrast ? 'text-yellow-400' : ''}`} />
              <p className={`text-[10px] font-black uppercase tracking-widest opacity-40 ${isHighContrast ? 'text-yellow-400' : ''}`}>
                Sin registros consolidados en la nube
              </p>
            </div>
          ) : (
            <div className={`flex flex-col divide-y ${divider}`}>
              {items.map((item, index) => (
                <div 
                  key={item.barcode + '-' + index} 
                  className={`p-4 flex items-center justify-between transition-colors ${rowHover}`}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <span className={`font-mono text-[10px] font-black uppercase block ${isHighContrast ? 'text-yellow-300' : isLight ? 'text-indigo-600' : 'text-indigo-500'}`}>
                      {item.barcode}
                    </span>
                    <span className={`text-xs font-black truncate block mt-0.5 ${textPrimary}`}>
                      {item.productName}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-wide block mt-1 flex items-center gap-1 ${textMuted}`}>
                      <MapPin className="w-3 h-3 shrink-0" />
                      Zonas: {item.locationsList}
                    </span>
                  </div>

                  <div className={`w-24 text-right font-mono font-black text-lg pr-2 italic ${textPrimary}`}>
                    {item.totalQuantity}
                  </div>

                  <div className="w-24 text-right flex justify-end">
                    <span className={`text-[8px] px-2 py-1 font-black uppercase rounded-lg border leading-tight ${
                      item.source === 'Martillo' 
                        ? (isHighContrast ? 'bg-yellow-900/20 border-yellow-400/30 text-yellow-300' : isLight ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-blue-500/10 border-blue-500/20 text-blue-400')
                        : item.source === 'Estándar'
                          ? (isHighContrast ? 'bg-yellow-900/20 border-yellow-400/30 text-yellow-300' : isLight ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400')
                          : (isHighContrast ? 'bg-yellow-900/20 border-yellow-400/30 text-yellow-300' : isLight ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-amber-500/10 border-amber-500/20 text-amber-400')
                    }`}>
                      {item.source}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
