import React, { useMemo } from 'react';
import { Package, Hash, Layers, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { VirtualList } from '../../../shared/components/ui/VirtualList';
import { ExpectedItem } from '../../../types';

interface OrderPreviewListProps {
  state: any;
  actions: any;
  isDark: boolean;
}

// Sub-component representing a single virtual row for performance
const ItemRow: React.FC<{ index: number; item: ExpectedItem; data: any; style?: React.CSSProperties }> = React.memo(({ index, item, data, style }) => {
  const isDark = data.isDark;
  const isWarning = item.expectedQty <= 0 || !item.barcode;

  return (
    <div 
      style={style}
      className={`px-4 py-3 flex items-center justify-between border-b gap-4 ${
        isWarning 
          ? (isDark ? 'bg-rose-500/5 border-rose-500/10' : 'bg-rose-50/50 border-rose-100')
          : (isDark ? 'border-white/5 hover:bg-white/2' : 'border-slate-100 hover:bg-slate-50/40')
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={`text-[10px] font-mono leading-none font-bold px-2 py-1 rounded-md ${
          isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
        }`}>
          #{index + 1}
        </span>
        <div className="min-w-0">
          <p className={`text-xs font-black truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {item.name || 'Sin Descripción'}
          </p>
          <span className={`text-[10px] font-mono leading-none tracking-wide block mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {item.barcode || 'SIN BARRAS'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <span className={`text-xs font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {item.expectedQty}
          </span>
          <span className={`text-[9px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Bultos Esperados
          </span>
        </div>

        {isWarning && (
          <AlertTriangle className="w-4 h-4 text-rose-500" />
        )}
      </div>
    </div>
  );
});

ItemRow.displayName = 'ExpectedOrderItemRow';

export const OrderPreviewList: React.FC<OrderPreviewListProps> = ({ state, actions, isDark }) => {
  const { previewItems, previewStats } = state;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* PREVIEW CONTAINER (VIRTUAL LIST) */}
      <div className="lg:col-span-2 flex flex-col h-[480px]">
        <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-slate-900/60 border-white/5' : 'bg-white border-slate-200/80'
        } rounded-t-3xl`}>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-500" />
            <h4 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-800'}`}>Lista Desglosada</h4>
          </div>
          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${
            isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
          }`}>
            Visualizando {previewItems.length} SKUs
          </span>
        </div>

        <div className={`flex-1 overflow-hidden relative border-x border-b ${
          isDark ? 'bg-slate-950 border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
        } rounded-b-3xl`}>
          <VirtualList
            items={previewItems}
            itemHeight={55}
            renderRow={ItemRow}
            rowData={{ isDark }}
            emptyState={
              <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center">
                <AlertTriangle className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest block">Ningún SKU válido mapeado</span>
                <p className="text-[10px] text-slate-400 max-w-xs leading-normal mt-1 block">
                  Verifica que hayas cargado un documento válido y las columnas correspondientes en el mapeador.
                </p>
              </div>
            }
          />
        </div>
      </div>

      {/* SUMMARY SIDEBAR & ACTIONS */}
      <div className="lg:col-span-1 space-y-6">
        <div className={`p-6 md:p-8 rounded-[2rem] border ${
          isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
        } space-y-6`}>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />
            <h4 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-800'}`}>Resumen Técnico</h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
              <span className={`text-[9px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Total SKUs</span>
              <span className={`text-2xl font-black block mt-1 tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {previewStats.skuCount}
              </span>
            </div>
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
              <span className={`text-[9px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Total Unidades</span>
              <span className={`text-2xl font-black block mt-1 tracking-tight ${isDark ? 'text-blue-500' : 'text-blue-600'}`}>
                {previewStats.unitCount}
              </span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border space-y-2.5 ${isDark ? 'bg-slate-950 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span>FOLIO ID:</span>
              <span className={`font-mono font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>{state.docId || 'TBD'}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span>TIPO DE CARGA:</span>
              <span className={`font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>{state.documentType}</span>
            </div>
            {state.purchaseOrder && (
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span>O. DE COMPRA:</span>
                <span className={`font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>{state.purchaseOrder}</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={actions.saveOrder}
              disabled={previewItems.length === 0}
              className={`w-full py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 ${
                previewItems.length === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 active:scale-95'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              CONFIRMAR Y GUARDAR
            </button>

            <button
              onClick={() => actions.setActiveStep('list')}
              className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all active:scale-95 ${
                isDark
                  ? 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              Cancelar Carga
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
