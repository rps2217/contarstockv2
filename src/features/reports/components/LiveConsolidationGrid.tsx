/**
 * LiveConsolidationGrid - Grid de consolidación en tiempo real
 */

import React from 'react';
import { Archive, MapPin } from 'lucide-react';

interface ConsolidatedItem {
  barcode: string;
  productName: string;
  locationsList: string;
  totalQuantity: number;
  source: 'Martillo' | 'Estándar' | 'Recepción';
}

interface Props {
  items: ConsolidatedItem[];
  isLoading?: boolean;
  searchQuery: string;
  isDark?: boolean;
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
  isDark = true,
  onExport,
  stats,
}) => {
  return (
    <div className="flex flex-col flex-1 gap-3">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`flex-1 border rounded-[2rem] overflow-hidden shadow-sm p-4 flex items-center gap-3 ${
          isDark ? 'bg-brand-surface border-white/5' : 'bg-white border-slate-200'
        }`}>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
            isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'
          }`}>
            <Archive className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
          </div>
          <div>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">SKUs</span>
            <span className={`text-xl font-black mt-1 block italic ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {stats.totalSKUs}
            </span>
          </div>
        </div>

        <div className={`flex-1 border rounded-[2rem] overflow-hidden shadow-sm p-4 flex items-center gap-3 ${
          isDark ? 'bg-brand-surface border-white/5' : 'bg-white border-slate-200'
        }`}>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
            isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'
          }`}>
            <Archive className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          </div>
          <div>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">UNIDADES</span>
            <span className={`text-xl font-black mt-1 block italic ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {stats.totalUnits.toLocaleString()}
            </span>
          </div>
        </div>

        <div className={`flex-1 border rounded-[2rem] overflow-hidden shadow-sm p-4 flex items-center gap-3 ${
          isDark ? 'bg-brand-surface border-white/5' : 'bg-white border-slate-200'
        }`}>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
            isDark ? 'bg-blue-500/10' : 'bg-blue-50'
          }`}>
            <MapPin className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <div>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">ZONAS</span>
            <span className={`text-xl font-black mt-1 block italic ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {stats.locationsCount}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Table */}
      <div className={`flex-1 border rounded-[2rem] overflow-hidden shadow-sm relative flex flex-col ${
        isDark ? 'bg-brand-surface border-white/5' : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`h-11 border-b flex items-center px-6 justify-between z-10 shrink-0 ${
          isDark ? 'bg-brand-dark/50 border-white/5' : 'bg-slate-50 border-slate-100'
        }`}>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex-1">PRODUCTO / SKU</span>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest w-24 text-right">CANT. TOTAL</span>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest w-24 text-right">ORIGEN</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col p-4 gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-500/10 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Archive className="w-10 h-10 opacity-20 mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                Sin registros consolidados en la nube
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-slate-500/10">
              {items.map((item, index) => (
                <div 
                  key={item.barcode + '-' + index} 
                  className={`p-4 flex items-center justify-between transition-colors ${
                    isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <span className="font-mono text-[10px] font-black uppercase text-indigo-500 block">
                      {item.barcode}
                    </span>
                    <span className={`text-xs font-black truncate block mt-0.5 ${
                      isDark ? 'text-white' : 'text-slate-800'
                    }`}>
                      {item.productName}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide block mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      Zonas: {item.locationsList}
                    </span>
                  </div>

                  <div className="w-24 text-right font-mono font-black text-lg pr-2 italic">
                    {item.totalQuantity}
                  </div>

                  <div className="w-24 text-right flex justify-end">
                    <span className={`text-[8px] px-2 py-1 font-black uppercase rounded-lg border leading-tight ${
                      item.source === 'Martillo' 
                        ? isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
                        : item.source === 'Estándar'
                          ? isDark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
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
