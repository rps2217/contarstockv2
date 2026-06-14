import React, { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, ArrowRight, Settings2, Sparkles, Copy, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { ColumnMappings } from '../hooks/useExpectedOrders';

interface OrderImporterProps {
  state: any;
  actions: any;
  isDark: boolean;
}

export const OrderImporter: React.FC<OrderImporterProps> = ({ state, actions, isDark }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      actions.handleCsvFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      actions.handleCsvFile(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector de Modo de Carga */}
      <div className={`p-1 rounded-2xl flex max-w-sm ${isDark ? 'bg-slate-900 border border-white/5' : 'bg-slate-100 border border-slate-200/60'}`}>
        <button
          onClick={() => {
            actions.setImportMode('csv');
            actions.resetImporter();
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            state.importMode === 'csv'
              ? (isDark ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-slate-800 shadow-md')
              : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Subir archivo CSV
        </button>
        <button
          onClick={() => {
            actions.setImportMode('paste');
            actions.resetImporter();
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            state.importMode === 'paste'
              ? (isDark ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-slate-800 shadow-md')
              : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          <Copy className="w-3.5 h-3.5" />
          Copiar y Pegar Excel
        </button>
      </div>

      {/* METADATA FORM */}
      <div className={`p-6 md:p-8 rounded-[2rem] border ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200/80 shadow-sm'} space-y-5`}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-gradient-blue shrink-0 animate-pulse" />
          <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Datos del Documento Teórico</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Identificador (Folio / Guía) *
            </label>
            <input
              type="text"
              placeholder="Ej. FACTURA-4822"
              value={state.docId}
              onChange={(e) => actions.setDocId(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                isDark 
                  ? 'bg-slate-950 border-white/10 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20' 
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/10'
              }`}
            />
          </div>

          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Tipo de Documento
            </label>
            <select
              value={state.documentType}
              onChange={(e) => actions.setDocumentType(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                isDark 
                  ? 'bg-slate-950 border-white/10 text-white focus:border-blue-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
              }`}
            >
              <option value="Picking List">Picking List / Orden de Preparación</option>
              <option value="Remisión">Remisión / Guía Despacho</option>
              <option value="Factura Compra">Factura de Compra</option>
              <option value="Manifiesto">Manifiesto de Carga</option>
              <option value="Inventario Teórico">Inventario Físico Teórico</option>
            </select>
          </div>

          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Orden de Compra / Requerimiento
            </label>
            <input
              type="text"
              placeholder="Ej. OC-2023"
              value={state.purchaseOrder}
              onChange={(e) => actions.setPurchaseOrder(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                isDark 
                  ? 'bg-slate-950 border-white/10 text-white focus:border-blue-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
              }`}
            />
          </div>

          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Observación / Notas
            </label>
            <input
              type="text"
              placeholder="Ej. Recibe Andén Sur"
              value={state.orderNote}
              onChange={(e) => actions.setOrderNote(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                isDark 
                  ? 'bg-slate-950 border-white/10 text-white focus:border-blue-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
              }`}
            />
          </div>
        </div>
      </div>

      {/* BODY IMPORTER */}
      {state.importMode === 'csv' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CSV File Zone */}
          <div className="lg:col-span-2">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-4 border-dashed rounded-[2.5rem] p-10 md:p-14 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[300px] ${
                isDragging
                  ? 'border-blue-500 bg-blue-500/5 scale-[0.99]'
                  : state.fileName
                  ? (isDark ? 'border-emerald-500/40 bg-emerald-500/2' : 'border-emerald-300 bg-emerald-50/20')
                  : (isDark ? 'border-white/5 bg-slate-900/50 hover:bg-slate-900 hover:border-white/10' : 'border-slate-200 bg-slate-100/50 hover:bg-slate-100 hover:border-slate-300')
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {state.fileName ? (
                <div className="space-y-4">
                  <div className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-lg ${isDark ? 'bg-emerald-600/10 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>{state.fileName}</h4>
                    <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Archivo Cargado con éxito</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (fileInputRef.current) fileInputRef.current.value = '';
                      actions.resetImporter();
                    }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 mx-auto transition-all active:scale-95 ${
                      isDark 
                        ? 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <RefreshCw className="w-3 h-3" />
                    Cambiar archivo
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className={`text-sm font-black ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Arrastra tu archivo CSV o haz clic para examinar</h4>
                    <p className={`text-[10px] font-medium max-w-sm mx-auto leading-normal mt-1 block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      Se convertirá en una Carga Teórica activa para ser cruzada con tus escaneos automáticos o auditorías manuales.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MAPPING INTERACTIVE INTERFACE */}
          <div className="lg:col-span-1">
            <div className={`p-6 md:p-8 rounded-[2rem] border h-full flex flex-col justify-between ${
              isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
              <div className="space-y-5">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-blue-500" />
                  <h4 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-800'}`}>Mapeador de Columnas</h4>
                </div>
                
                <p className={`text-[11px] leading-relaxed font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  El sistema detectó las siguientes columnas de datos. Verifica o ajusta la equivalencia para asegurar el mapeo correcto.
                </p>

                {state.headers.length === 0 ? (
                  <div className={`p-4 rounded-xl text-center border ${isDark ? 'border-dashed border-white/5 text-slate-600' : 'border-dashed border-slate-200 text-slate-400'}`}>
                    <FileText className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    <span className="text-[10px] uppercase font-black tracking-wide block">Espera cargando archivo...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Código de Barra / EAN (Requerido)
                      </label>
                      <select
                        value={state.mappings.barcodeCol}
                        onChange={(e) => actions.setMappings({ ...state.mappings, barcodeCol: e.target.value })}
                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide border ${
                          isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        {state.headers.map((h: string) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Descripción / Nombre (Opcional)
                      </label>
                      <select
                        value={state.mappings.nameCol}
                        onChange={(e) => actions.setMappings({ ...state.mappings, nameCol: e.target.value })}
                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide border ${
                          isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="">-- Autogenerar nombres --</option>
                        {state.headers.map((h: string) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Cantidad Teórica (Requerido)
                      </label>
                      <select
                        value={state.mappings.qtyCol}
                        onChange={(e) => actions.setMappings({ ...state.mappings, qtyCol: e.target.value })}
                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide border ${
                          isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        {state.headers.map((h: string) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {state.fileName && (
                <div className={`mt-6 p-4 rounded-xl border flex gap-3 text-left ${isDark ? 'bg-blue-600/5 border-blue-500/10 text-blue-400' : 'bg-blue-50/40 border-blue-200 text-blue-700'}`}>
                  <Sparkles className="w-5 h-5 shrink-0" />
                  <p className="text-[10px] font-bold leading-normal">
                    ¡Mapeo inteligente activado! El sistema previsualiza automáticamente las celdas coincidentes con tu base de SKU.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* PASTE EXCEL TABULAR TEXTAREA */
        <div className={`p-6 md:p-8 rounded-[2rem] border ${
          isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
            <div className="space-y-1">
              <h4 className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-800'} flex items-center gap-2`}>
                <Sparkles className="w-4 h-4 text-gradient-blue animate-pulse" />
                Copiar y Pegar desde Excel, Google Sheets o SAP
              </h4>
              <p className={`text-[10px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'} max-w-2xl`}>
                Soporta tabulado directo y está optimizado para SAP: copia las filas directamente de tu grilla de SAP y el sistema detectará inteligentemente el <strong className="text-blue-500">SKU (columna 1)</strong>, la <strong className="text-blue-500">Descripción (columna 2)</strong> y la <strong className="text-blue-500">Cantidad Despachada (columna 4)</strong>, descartando las filas de control sobrantes.
              </p>
            </div>
            <div className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border shrink-0 ${isDark ? 'border-blue-500/20 bg-blue-500/10 text-blue-400' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
              Soporta Copiado de SAP NATIVO 🚀
            </div>
          </div>

          <textarea
            rows={10}
            value={state.pasteText}
            onChange={(e) => actions.setPasteText(e.target.value)}
            placeholder="Pega aquí... ejemplo:&#13;770200105312&#9;Arroz Largo Ancho 1kg&#9;150&#13;770200114002&#9;Frijol Bola Rojo&#9;90"
            className={`w-full p-4 rounded-2xl font-mono text-xs leading-normal border transition-all resize-none ${
              isDark 
                ? 'bg-slate-950 border-white/10 text-white focus:border-blue-500' 
                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
            }`}
          />
        </div>
      )}
    </div>
  );
};
