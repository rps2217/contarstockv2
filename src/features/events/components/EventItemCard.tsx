import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertCircle, 
  CheckSquare, 
  MapPin, 
  Package, 
  MoreVertical,
  CheckCircle2,
  Undo2,
  Trash2,
  ExternalLink,
  Info,
  Copy,
  Truck,
  ShoppingCart,
  Cloud,
  CloudOff,
  RefreshCw,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface EventItemCardProps {
  item: any;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onUpdateStatus?: (id: string, isAdjusted: boolean) => void;
  onRemove?: (item: any) => void;
  onEdit?: (item: any) => void;
  onFrcClick?: (frc: string) => void;
  onEventClick?: (event: string) => void;
  onDestinoClick?: (destino: string) => void;
  onViewDetail?: (item: any) => void;
  theme?: 'dark' | 'light' | 'gray' | 'high-contrast' | 'appsheet-dark' | 'night';
  isCompact?: boolean;
  isExpanded?: boolean;
}

export const EventItemCard: React.FC<EventItemCardProps> = React.memo(({
  item,
  isSelected,
  onToggleSelect,
  onUpdateStatus,
  onRemove,
  onEdit,
  onFrcClick,
  onEventClick,
  onDestinoClick,
  onViewDetail,
  theme = 'dark',
  isCompact = false,
  isExpanded = false
}) => {
  const handleCopyBarcode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.barcode);
    toast.success(`Copiado: ${item.barcode}`, {
      icon: <Copy className="w-4 h-4 text-blue-500" />
    });
  };

  return (
    <motion.div
      id={`event-item-${item.id}`}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`border rounded-2xl flex flex-col md:grid md:grid-cols-[48px_minmax(0,2.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto] items-start md:items-center gap-3 md:gap-4 group transition-all relative ${
        isCompact ? 'p-2' : 'p-4'
      } ${
        (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'bg-brand-surface hover:bg-brand-surface/80 shadow-lg shadow-black/20' : 'bg-white shadow-md hover:shadow-lg'
      } ${
        isSelected ? 'border-blue-500 bg-blue-500/5' :
        (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'border-white/10' : 'border-slate-200'
      }`}
    >
      {/* MOBILE TOP ROW & DESKTOP COLUMN 1 */}
      <div className="flex items-start gap-3 w-full md:contents">
        {/* COLUMN 1: ICON */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(item.id);
            }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all shadow-lg hover:scale-105 ${
              isSelected ? 'bg-blue-600 text-white' :
              'bg-blue-500/10 text-blue-500 border border-blue-500/20'
            }`}
          >
            {isSelected ? <CheckSquare className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          </div>
        </div>

        {/* COLUMN 2: PRODUCT (Mobile View) */}
        <div className="flex-1 min-w-0 flex flex-col gap-2 md:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className={`font-black uppercase tracking-[0.2em] ${
                isExpanded ? 'text-xs' : 'text-[10px]'
              } ${
                (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-slate-500' : 'text-muted'
              }`}>Descripción del Producto</span>
              <h3 className={`font-black uppercase tracking-tighter italic leading-tight ${
                isExpanded ? 'text-lg' : 'text-base'
              } ${
                (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-white' : 'text-slate-900'
              }`}>
                {item.productName}
              </h3>
            </div>
            <div className="shrink-0 flex items-center gap-1.5">
              {item.isAdjusted && (
                <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                  (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/35' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  Ajustado
                </span>
              )}
              {item.syncStatus === 'synced' && <span title="Sincronizado"><Cloud className="w-4 h-4 text-emerald-500" /></span>}
              {item.syncStatus === 'pending' && <span title="Pendiente"><RefreshCw className="w-4 h-4 text-amber-500 animate-spin" /></span>}
              {item.syncStatus === 'error' && <span title={item.syncError || 'Error de sincronización'}><CloudOff className="w-4 h-4 text-rose-500" /></span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className={`p-2 rounded-xl border ${
              (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'bg-brand-dark border-white/5' : 'bg-slate-50 border-slate-100'
            }`}>
              <span className={`font-black text-slate-500 uppercase tracking-widest block mb-0.5 ${
                isExpanded ? 'text-[10px]' : 'text-[9px]'
              }`}>Proveedor</span>
              <p className={`font-bold uppercase truncate ${
                isExpanded ? 'text-sm' : 'text-xs'
              } ${
                (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-blue-400' : 'text-blue-600'
              }`}>
                {item.providerName || 'N/A'}
              </p>
            </div>
            <div className={`p-2 rounded-xl border ${
              (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'bg-brand-dark border-white/5' : 'bg-slate-50 border-slate-100'
            }`}>
              <span className={`font-black text-slate-500 uppercase tracking-widest block mb-0.5 ${
                isExpanded ? 'text-[10px]' : 'text-[9px]'
              }`}>SKU / EAN</span>
              <button
                onClick={handleCopyBarcode}
                className={`font-bold uppercase flex items-center gap-1 transition-all active:scale-95 ${
                  isExpanded ? 'text-sm' : 'text-xs'
                } ${
                  (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-secondary' : 'text-slate-700'
                }`}
              >
                {item.barcode || 'N/A'}
                <Copy className="w-2.5 h-2.5 opacity-50" />
              </button>
            </div>
          </div>

          {/* TRASPASOS & OBSERVACIONES MOBILE */}
          {(item.traspaso || item.observaciones) && (
            <div className="grid grid-cols-2 gap-2">
              {item.traspaso && (
                <div className={`p-2 rounded-xl border ${
                  (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'bg-brand-dark border-white/5' : 'bg-slate-50 border-slate-150'
                }`}>
                  <span className="font-black text-slate-500 uppercase tracking-widest block mb-0.5 text-[8px] md:text-[9px]">Documento Traspaso</span>
                  <p className={`font-bold uppercase truncate text-xs ${
                    (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-indigo-400' : 'text-indigo-600'
                  }`}>
                    {item.traspaso}
                  </p>
                </div>
              )}
              {item.observaciones && (
                <div className={`p-2 rounded-xl border ${
                  (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'bg-brand-dark border-white/5' : 'bg-slate-50 border-slate-150'
                } ${!item.traspaso ? 'col-span-2' : ''}`}>
                  <span className="font-black text-slate-500 uppercase tracking-widest block mb-0.5 text-[8px] md:text-[9px]">Notas Observadas</span>
                  <p className={`font-bold uppercase truncate text-xs ${
                    (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-secondary' : 'text-slate-600'
                  }`}>
                    {item.observaciones}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-1">
            {item.frc && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFrcClick?.(item.frc);
                }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all"
              >
                <span className="text-[9px] font-black uppercase">FRC:</span>
                <span className="text-xs font-black tracking-tighter italic">{item.frc}</span>
              </button>
            )}
            {item.event && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick?.(item.event);
                }}
                className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
              >
                {item.event}
              </button>
            )}
            {item.nguia && (
              <div className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center gap-1.5">
                <span className="text-[7px] font-black uppercase">Guía:</span>
                <span className="text-[9px] font-black">{item.nguia}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DESKTOP COLUMN 2: PRODUCT (Desktop View) */}
      <div className="hidden md:flex flex-col gap-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className={`font-black uppercase tracking-[0.15em] whitespace-nowrap ${
            isExpanded ? 'text-xs' : 'text-[10px]'
          } ${
            (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-slate-500' : 'text-muted'
          }`}>Producto</span>
          {item.syncStatus === 'synced' && <Cloud className="w-3 h-3 text-emerald-500/70 shrink-0" />}
          {item.syncStatus === 'pending' && <RefreshCw className="w-3 h-3 text-amber-500/70 animate-spin shrink-0" />}
          {item.syncStatus === 'error' && <CloudOff className="w-3 h-3 text-rose-500/70 shrink-0" />}
        </div>
        <h3 className={`font-black uppercase tracking-tighter italic truncate leading-tight ${
          isExpanded ? 'text-lg' : 'text-base'
        } ${
          (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-white' : 'text-slate-900'
        }`}>
          {item.productName || 'Producto Desconocido'}
        </h3>
        
        <div className="flex flex-col lg:flex-row lg:items-center gap-x-4 gap-y-1 mt-1">
          <div className="flex flex-col min-w-0">
            <span className={`font-black text-slate-500 uppercase tracking-widest mb-0.5 ${
              isExpanded ? 'text-[10px]' : 'text-[9px]'
            }`}>Proveedor</span>
            <p className={`font-bold uppercase truncate ${
              isExpanded ? 'text-sm' : 'text-xs'
            } ${
              (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-blue-400' : 'text-blue-600'
            }`}>
              {item.providerName || 'N/A'}
            </p>
          </div>
          <div className="flex flex-col min-w-0">
            <span className={`font-black text-slate-500 uppercase tracking-widest mb-0.5 ${
              isExpanded ? 'text-[10px]' : 'text-[9px]'
            }`}>SKU / EAN</span>
            <button
              onClick={handleCopyBarcode}
              className={`font-bold uppercase flex items-center gap-1 transition-all hover:text-blue-500 active:scale-95 ${
                isExpanded ? 'text-sm' : 'text-xs'
              } ${
                (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-secondary' : 'text-slate-700'
              }`}
            >
              <span className="truncate">{item.barcode || 'N/A'}</span>
              <Copy className="w-2.5 h-2.5 opacity-50 shrink-0" />
            </button>
          </div>
        </div>

        {item.isAdjusted && (
          <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md inline-block w-fit mt-1 ${
            (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
          }`}>
            Ajustado
          </span>
        )}
      </div>

      {/* DESKTOP COLUMN 3: FRC & EVENT (Priority Column) */}
      <div className="hidden md:flex flex-col gap-1.5 min-w-0 overflow-hidden">
        <div className="flex flex-col gap-1">
          <span className={`font-black uppercase tracking-[0.15em] ${
            isExpanded ? 'text-xs' : 'text-[10px]'
          } ${
            (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-slate-500' : 'text-muted'
          }`}>Folio FRC</span>
          {item.event && (
            <span className={`font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md w-fit truncate ${
              isExpanded ? 'text-[10px]' : 'text-[9px]'
            } ${
              (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700'
            }`}>
              {item.event}
            </span>
          )}
        </div>
        {item.frc ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFrcClick?.(item.frc);
            }}
            className={`px-2 py-1.5 rounded-xl border-2 font-black tracking-tighter italic transition-all hover:scale-105 active:scale-95 text-left flex flex-col w-fit max-w-full ${
              (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-white' 
                : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-600 hover:text-white'
            }`}
          >
            <span className={`leading-none truncate ${
              isExpanded ? 'text-lg' : 'text-sm'
            }`}>{item.frc}</span>
          </button>
        ) : (
          <div className={`px-2 py-1.5 rounded-xl border-2 border-dashed flex items-center justify-center w-fit ${
            (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'border-white/10 text-slate-600' : 'border-slate-200 text-muted'
          }`}>
            <span className="text-[9px] font-black uppercase tracking-widest italic">N/A</span>
          </div>
        )}
      </div>

      {/* COLUMN 4: QUANTITY & DESTINO */}
      <div className="flex items-center justify-between w-full md:w-auto md:flex-col md:items-start gap-2 md:gap-0.5 min-w-0 overflow-hidden">
        <div className="flex items-center gap-1.5">
          <Package className={`shrink-0 ${
            isExpanded ? 'w-4 h-4' : 'w-3.5 h-3.5'
          } ${(theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-slate-500' : 'text-muted'}`} />
          <span className={`font-black whitespace-nowrap ${
            isExpanded ? 'text-lg' : 'text-sm'
          } ${(theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-white' : 'text-slate-900'}`}>
            {item.quantity} <span className={`${
              isExpanded ? 'text-sm' : 'text-[10px]'
            } text-slate-500 italic`}>UN</span>
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDestinoClick?.(item.destino);
          }}
          className="flex items-center gap-1.5 hover:bg-emerald-500/10 rounded-lg px-1 transition-all"
        >
          <Truck className={`shrink-0 ${
            isExpanded ? 'w-4 h-4' : 'w-3 h-3'
          } ${(theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-emerald-500/80' : 'text-emerald-600/80'}`} />
          <span className={`font-black uppercase tracking-widest truncate ${
            isExpanded ? 'text-sm' : 'text-xs'
          } ${(theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-emerald-400' : 'text-emerald-600'}`}>
            {item.destino || 'SIN DESTINO'}
          </span>
        </button>
      </div>

      {/* COLUMN 5: ACTIONS */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-end md:justify-center shrink-0">
        {onViewDetail && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetail(item);
            }}
            className={`w-10 h-10 md:w-8 md:h-8 rounded-xl transition-all border flex items-center justify-center ${
              (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' 
                ? 'bg-purple-500/10 border-purple-500/20 text-purple-500 hover:bg-purple-500 hover:text-white' 
                : 'bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-600 hover:text-white shadow-sm'
            }`}
            title="Ver Detalle"
          >
            <Eye className="w-5 h-5 md:w-4 md:h-4" />
          </button>
        )}

        {onUpdateStatus && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateStatus(item.id, !item.isAdjusted);
            }}
            className={`w-10 h-10 md:w-8 md:h-8 rounded-xl transition-all border flex items-center justify-center ${
              item.isAdjusted
                ? (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' 
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white' 
                  : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-600 hover:text-white'
                : (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white shadow-sm'
            }`}
            title={item.isAdjusted ? "Revertir a Pendiente" : "Marcar como Ajustado"}
          >
            {item.isAdjusted ? <Undo2 className="w-5 h-5 md:w-4 md:h-4" /> : <CheckCircle2 className="w-5 h-5 md:w-4 md:h-4" />}
          </button>
        )}

        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            className={`w-10 h-10 md:w-8 md:h-8 rounded-xl transition-all border flex items-center justify-center ${
              (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' 
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-white' 
                : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white shadow-sm'
            }`}
            title="Editar Registro"
          >
            <MoreVertical className="w-5 h-5 md:w-4 md:h-4" />
          </button>
        )}
        
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item);
            }}
            className={`w-10 h-10 md:w-8 md:h-8 rounded-xl transition-all border flex items-center justify-center ${
              (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' 
                ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white' 
                : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-600 hover:text-white shadow-sm'
            }`}
            title="Eliminar Registro"
          >
            <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
});

