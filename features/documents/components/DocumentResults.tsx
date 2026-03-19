import React from 'react';
import { CheckCircle, X, Camera, Save } from 'lucide-react';

interface DocumentResultsProps {
  result: any;
  onClear: () => void;
  onScanMore: () => void;
  onSave: () => void;
  onItemChange: (idx: number, field: string, value: any) => void;
  onRemoveItem: (idx: number) => void;
  onErpOrderChange: (val: string) => void;
}

export const DocumentResults: React.FC<DocumentResultsProps> = ({
  result,
  onClear,
  onScanMore,
  onSave,
  onItemChange,
  onRemoveItem,
  onErpOrderChange
}) => {
  if (!result) return null;

  return (
    <>
      <div className="bg-slate-900 p-6 rounded-3xl border border-emerald-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-black uppercase tracking-widest">Documento Procesado</span>
          </div>
          <button onClick={onClear} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo de Documento</label>
            <div className="bg-black/40 border border-white/5 rounded-xl px-4 py-2 mt-1 font-bold text-sm text-emerald-400">
              {result.documentType === 'invoice' ? 'Factura' : 'Guía de Despacho'}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha</label>
            <div className="bg-black/40 border border-white/5 rounded-xl px-4 py-2 mt-1 font-mono text-sm">
              {result.date || 'No detectada'}
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nº Documento / Orden ERP</label>
            <input 
              type="text" 
              value={result.documentNumber}
              onChange={(e) => onErpOrderChange(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 font-mono font-bold text-lg mt-1 focus:border-blue-500 outline-none"
            />
          </div>
          {result.internalGuide && (
            <div className="col-span-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Guía Interna</label>
              <div className="bg-black/40 border border-white/5 rounded-xl px-4 py-2 mt-1 font-mono text-sm text-blue-400">
                {result.internalGuide}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-black/50 flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ítems Extraídos ({result.items.length})</span>
          <button 
            onClick={onScanMore}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg border border-blue-500/30 transition-colors"
          >
            <Camera className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase">Escanear Otra Guía</span>
          </button>
        </div>
        <div className="divide-y divide-white/5">
          {result.items.map((item: any, idx: number) => (
            <div key={idx} className="p-4 space-y-3">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex-1 space-y-2 w-full">
                  <input 
                    type="text" 
                    value={item.barcode}
                    onChange={(e) => onItemChange(idx, 'barcode', e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 font-mono text-sm focus:border-blue-500 outline-none"
                    placeholder="SKU / Código"
                  />
                  <input 
                    type="text" 
                    value={item.name}
                    onChange={(e) => onItemChange(idx, 'name', e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-slate-400 focus:border-blue-500 outline-none"
                    placeholder="Descripción"
                  />
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="flex-1 md:w-32">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Cantidad</label>
                    <input 
                      type="number" 
                      value={item.quantity}
                      onChange={(e) => onItemChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 font-mono text-lg font-bold text-center focus:border-blue-500 outline-none"
                    />
                  </div>
                  <button 
                    onClick={() => onRemoveItem(idx)}
                    className="p-3 bg-rose-900/20 text-rose-500 hover:bg-rose-900/40 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest block mb-1">Lote</label>
                  <input 
                    type="text" 
                    value={item.batch || ''}
                    onChange={(e) => onItemChange(idx, 'batch', e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 font-mono text-[10px] focus:border-emerald-500 outline-none"
                    placeholder="Lote"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest block mb-1">Vencimiento</label>
                  <input 
                    type="text" 
                    value={item.expiry || ''}
                    onChange={(e) => onItemChange(idx, 'expiry', e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 font-mono text-[10px] focus:border-emerald-500 outline-none"
                    placeholder="Vencimiento"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <button 
        onClick={onSave}
        className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-colors shadow-xl shadow-blue-900/20"
      >
        <Save className="w-6 h-6" />
        Confirmar y Guardar Orden
      </button>
    </>
  );
};
