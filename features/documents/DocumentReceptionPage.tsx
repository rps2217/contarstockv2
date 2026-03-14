import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle, Loader2, Save, X, ChevronLeft, AlertCircle } from 'lucide-react';
import * as documentProcessor from '../../services/documentProcessor';
import { SoundFX } from '../../services/audio';
import { db } from '../../db';

export const DocumentReceptionPage: React.FC = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      try {
        const data = await documentProcessor.parseGuidePDF(base64);
        if (data && data.erpOrder && data.items) {
          setResult(data);
          SoundFX.play('success');
        } else {
          throw new Error("Formato de documento no reconocido");
        }
      } catch (err: any) {
        setError(err.message || "Error procesando PDF");
        SoundFX.play('error');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      await db.expectedOrders.put({
        id: result.erpOrder,
        internalId: result.erpOrder,
        items: result.items,
        totalExpectedUnits: result.items.reduce((acc: number, item: any) => acc + item.expectedQty, 0),
        totalExpectedSKUs: result.items.length,
        importedAt: Date.now()
      });
      SoundFX.play('success');
      setResult(null);
      alert("Orden guardada exitosamente");
    } catch (error) {
      console.error("Error saving expected order:", error);
      alert("Error al guardar la orden");
    }
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...result.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setResult({ ...result, items: newItems });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = result.items.filter((_: any, i: number) => i !== index);
    setResult({ ...result, items: newItems });
  };

  return (
    <div className="h-full w-full bg-black overflow-y-auto no-scrollbar pb-32 font-mono text-white">
      {/* HEADER */}
      <header className="px-6 py-6 border-b-4 border-white/5 bg-slate-900/20 sticky top-0 z-50 flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-blue-600 transition-colors">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">
            DOC<span className="text-blue-500">RECEPTION</span>
          </h1>
          <span className="text-[9px] font-black text-slate-500 tracking-[0.3em] uppercase">Procesamiento de Guías</span>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        
        {error && (
          <div className="bg-rose-900/40 text-rose-400 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-500/30 flex items-center gap-3 animate-in shake">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {!result ? (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-700 rounded-3xl cursor-pointer hover:border-blue-500 hover:bg-blue-900/10 transition-all">
              <Upload className="w-12 h-12 text-slate-500 mb-4" />
              <span className="text-sm font-black text-white uppercase tracking-widest">Subir Guía PDF / Imagen</span>
              <span className="text-[10px] font-bold text-slate-500 mt-2 uppercase">La IA extraerá los datos automáticamente</span>
              <input type="file" accept="application/pdf,image/*" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-slate-900 p-6 rounded-3xl border border-emerald-500/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-black uppercase tracking-widest">Documento Procesado</span>
                </div>
                <button onClick={() => setResult(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Orden ERP / Documento</label>
                  <input 
                    type="text" 
                    value={result.erpOrder}
                    onChange={(e) => setResult({...result, erpOrder: e.target.value})}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 font-mono font-bold text-lg mt-1 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-3xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10 bg-black/50 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ítems Extraídos ({result.items.length})</span>
              </div>
              <div className="divide-y divide-white/5">
                {result.items.map((item: any, idx: number) => (
                  <div key={idx} className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex-1 space-y-2 w-full">
                      <input 
                        type="text" 
                        value={item.barcode}
                        onChange={(e) => handleItemChange(idx, 'barcode', e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 font-mono text-sm focus:border-blue-500 outline-none"
                        placeholder="SKU / Código"
                      />
                      <input 
                        type="text" 
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-slate-400 focus:border-blue-500 outline-none"
                        placeholder="Descripción"
                      />
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="flex-1 md:w-32">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Cant. Esperada</label>
                        <input 
                          type="number" 
                          value={item.expectedQty}
                          onChange={(e) => handleItemChange(idx, 'expectedQty', parseInt(e.target.value) || 0)}
                          className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 font-mono text-lg font-bold text-center focus:border-blue-500 outline-none"
                        />
                      </div>
                      <button 
                        onClick={() => handleRemoveItem(idx)}
                        className="p-3 bg-rose-900/20 text-rose-500 hover:bg-rose-900/40 rounded-xl transition-colors mt-4 md:mt-0"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <button 
              onClick={handleSave}
              className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-colors shadow-xl shadow-blue-900/20"
            >
              <Save className="w-6 h-6" />
              Confirmar y Guardar Orden
            </button>
          </div>
        )}

        {isProcessing && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <span className="text-sm font-black uppercase tracking-widest text-white animate-pulse">Analizando Documento...</span>
            <span className="text-[10px] text-slate-400 mt-2 uppercase">Extrayendo ERP y SKUs</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentReceptionPage;
