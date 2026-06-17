import React, { useState, useEffect, memo } from 'react';
import { Provider } from '../../../types';
import { Pencil, Trash2, Truck, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Badge, Button } from '../../../shared/components/ui';

interface ProviderListProps {
  providers?: Provider[];
  onEdit: (provider: Provider) => void;
  onDelete: (rut: string) => void;
  hasFilter: boolean;
  theme?: 'dark' | 'light' | 'high-contrast';
}

export const ProviderList: React.FC<ProviderListProps> = memo(({ 
  providers, 
  onEdit, 
  onDelete, 
  hasFilter,
  theme = 'dark'
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!providers || providers.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 md:p-12 text-center h-full flex flex-col items-center justify-center">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 md:mb-6 shadow-none">
          <Truck className="w-8 h-8 md:w-10 md:h-10 text-slate-300 dark:text-slate-600" />
        </div>
        <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-base md:text-lg">
          {hasFilter ? 'No hay resultados' : 'Sin Proveedores'}
        </h3>
        <p className="text-slate-500 font-medium text-xs md:text-sm mt-2 max-w-[250px] mx-auto text-center leading-relaxed">
          {hasFilter 
            ? 'Intenta con otros términos de búsqueda de proveedor.' 
            : 'Configura las directrices y políticas de canje de tus proveedores aquí.'}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-transparent md:bg-white md:dark:bg-slate-900 md:rounded-3xl md:border md:border-slate-200 md:dark:border-white/5 overflow-hidden md:shadow-sm">
      {/* Table Header ONLY on Desktop */}
      <div className="hidden md:flex bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-6 py-4 shrink-0 items-center sticky top-0 z-10">
        <div className="w-48 text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">RUT</div>
        <div className="flex-1 text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nombre / Razón Social</div>
        <div className="w-40 text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Estado Canje</div>
        <div className="w-56 text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Política de Retiro</div>
        <div className="w-24 text-right text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pr-4">Acción</div>
      </div>

      {/* Main List Container */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3.5 md:space-y-0 py-2 md:py-0">
        {providers.map((p) => {
          if (isMobile) {
            // HIGH DENSITY MOBILE CARD DESIGN
            return (
              <div key={p.rut} className="px-3 py-1.5 h-auto w-full">
                <div className={`flex items-stretch bg-white dark:bg-slate-900 border rounded-2xl shadow-sm transition-all focus-within:ring-2 focus-within:ring-indigo-500/50 ${
                  theme === 'dark' ? 'border-white/10' : 'border-slate-200'
                }`}>
                  {/* Left accent color indicator representing hasExchange */}
                  <div className={`w-1.5 shrink-0 rounded-l-2xl ${
                    p.hasExchange 
                      ? 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]' 
                      : 'bg-rose-500 dark:bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                  }`} />
                  
                  {/* Info Column */}
                  <div 
                    className="flex-1 min-w-0 p-3.5 flex flex-col justify-center active:bg-slate-50 dark:active:bg-white/5 cursor-pointer"
                    onClick={() => onEdit(p)}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5 no-scrollbar overflow-x-auto">
                      <span className={`shrink-0 text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                        p.hasExchange 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                      }`}>
                        {p.hasExchange ? 'CON CANJE' : 'SIN CANJE'}
                      </span>
                      {p.withdrawalDays !== undefined && (
                        <span className="shrink-0 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 whitespace-nowrap">
                          {p.withdrawalDays} Días
                        </span>
                      )}
                    </div>
                    
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight uppercase truncate">
                      {p.name}
                    </h3>
                    <div className="mt-0.5 font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-tight">
                      RUT: {p.rut}
                    </div>
                    {p.exchangePolicy && (
                      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 truncate italic">
                        « {p.exchangePolicy} »
                      </p>
                    )}
                  </div>

                  {/* Buttons Panel on the direct Right side */}
                  <div className="flex items-center border-l border-slate-100 dark:border-white/10 shrink-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEdit(p); }} 
                      className="w-12 h-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 active:bg-indigo-50 dark:active:bg-indigo-500/10 transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-4.5 h-4.5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(p.rut); }} 
                      className="w-12 h-full flex items-center justify-center text-rose-600 dark:text-rose-400 border-l border-slate-100 dark:border-white/5 active:bg-rose-50 dark:active:bg-rose-500/10 transition-colors rounded-r-2xl"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          } else {
            // DESKTOP SLIDY MATRIX ROW DESIGN (Matches ProductList Table row)
            return (
              <div 
                key={p.rut}
                onClick={() => onEdit(p)}
                className={`flex items-center border-b border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors px-6 text-sm h-16 group cursor-pointer ${
                  theme === 'dark' ? 'bg-brand-surface/20' : 'bg-white'
                }`}
              >
                {/* RUT Column */}
                <div className="w-48 shrink-0 flex items-center gap-3 font-mono font-bold text-slate-600 dark:text-slate-400">
                  <div className={`w-2 h-2 rounded-full shadow-sm ${
                    p.hasExchange ? 'bg-emerald-500' : 'bg-rose-500'
                  }`} />
                  {p.rut}
                </div>

                {/* Name / Razón Social */}
                <div className="flex-1 min-w-0 font-bold text-slate-800 dark:text-slate-200 truncate pr-6 uppercase">
                  {p.name}
                </div>

                {/* Exchange Status Badge */}
                <div className="w-40 shrink-0">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold leading-none ${
                    p.hasExchange
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-400'
                  }`}>
                    {p.hasExchange ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Con Canje
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3" /> Sin Canje
                      </>
                    )}
                  </span>
                </div>

                {/* Days policies and details */}
                <div className="w-56 shrink-0 flex flex-col justify-center">
                  <div className="flex flex-col">
                    <span className={`text-xs font-black uppercase tracking-tight ${
                      p.hasExchange ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
                    }`}>
                      {p.withdrawalDays || 0} Días de Ant.
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 max-w-[200px] truncate leading-tight">
                      {p.exchangePolicy || 'Anticipación Estándar'}
                    </span>
                  </div>
                </div>

                {/* Inline Hover Action Buttons */}
                <div className="w-24 shrink-0 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(p); }} 
                    className="p-2.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl transition-colors shrink-0"
                    title="Editar"
                  >
                    <Pencil className="w-4.5 h-4.5" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(p.rut); }} 
                    className="p-2.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl transition-colors shrink-0"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
});

ProviderList.displayName = 'ProviderList';
