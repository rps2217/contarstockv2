import React, { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle, ArrowRight, Settings2, Sparkles, Copy, Columns3, Package, Hash, FileBadge, LayoutGrid, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

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

  const useColumnMapping = state.pasteMappings?.enabled;

  return (
    <div className="space-y-6">
      {/* Selector de Modo de Carga */}
      <div className={`p-1 rounded-2xl flex max-w-md ${isDark ? 'bg-surface border border-white/5' : 'bg-slate-100 border border-slate-200/60'}`}>
        <button
          onClick={() => { actions.setImportMode('csv'); actions.resetImporter(); }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            state.importMode === 'csv'
              ? (isDark ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-slate-800 shadow-md')
              : 'text-slate-500 hover:text-muted'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Subir CSV
        </button>
        <button
          onClick={() => { actions.setImportMode('paste'); actions.resetImporter(); }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            state.importMode === 'paste'
              ? (isDark ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-slate-800 shadow-md')
              : 'text-slate-500 hover:text-muted'
          }`}
        >
          <Copy className="w-3.5 h-3.5" />
          Copiar y Pegar
        </button>
      </div>

      {/* Selector de Tipo de Documento */}
      <div className={`p-4 md:p-6 rounded-[1.5rem] border ${isDark ? 'bg-surface/80 border-white/5' : 'bg-white border-slate-200/80 shadow-sm'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2.5 rounded-xl ${isDark ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
            <FileBadge className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          </div>
          <div>
            <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Tipo de Documento para Ticket
            </h3>
            <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-muted'}`}>
              Define el formato del ticket/impresión que se generará
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { value: 'Picking List', label: 'Picking List' },
            { value: 'Remisión', label: 'Remisión / Guía' },
            { value: 'Factura Compra', label: 'Factura' },
            { value: 'Manifiesto', label: 'Manifiesto' },
            { value: 'Inventario Teórico', label: 'Inventario' },
          ].map((doc) => (
            <button
              key={doc.value}
              onClick={() => actions.setDocumentType(doc.value)}
              className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                state.documentType === doc.value
                  ? (isDark ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-blue-600 border-blue-600 text-white shadow-lg')
                  : (isDark ? 'bg-elevated border-white/5 text-muted hover:border-white/10 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300')
              }`}
            >
              {doc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metadata para modo simple */}
      {!useColumnMapping && state.importMode !== 'csv' && (
        <div className={`p-6 rounded-[2rem] border ${isDark ? 'bg-surface border-white/5' : 'bg-white border-slate-200/80 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-gradient-blue shrink-0 animate-pulse" />
            <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-muted' : 'text-slate-500'}`}>Datos del Documento</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-muted' : 'text-slate-500'}`}>
                Identificador (Folio / Guía)
              </label>
              <input
                type="text"
                placeholder="Ej. FACTURA-4822"
                value={state.docId}
                onChange={(e) => actions.setDocId(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                  isDark ? 'bg-base border-white/10 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                }`}
              />
            </div>

            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-muted' : 'text-slate-500'}`}>
                Orden de Compra
              </label>
              <input
                type="text"
                placeholder="Ej. OC-2023"
                value={state.purchaseOrder}
                onChange={(e) => actions.setPurchaseOrder(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                  isDark ? 'bg-base border-white/10 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                }`}
              />
            </div>

            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-muted' : 'text-slate-500'}`}>
                Observación / Notas
              </label>
              <input
                type="text"
                placeholder="Ej. Recibe Andén Sur"
                value={state.orderNote}
                onChange={(e) => actions.setOrderNote(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                  isDark ? 'bg-base border-white/10 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                }`}
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => actions.togglePasteMapping(true)}
                className={`w-full py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-2 ${
                  isDark ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <Columns3 className="w-3.5 h-3.5" />
                Mapeo Avanzado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV MODE */}
      {state.importMode === 'csv' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-4 border-dashed rounded-[2.5rem] p-10 md:p-14 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[300px] ${
                isDragging ? 'border-blue-500 bg-blue-500/5 scale-[0.99]' :
                state.fileName ? (isDark ? 'border-emerald-500/40 bg-emerald-500/2' : 'border-emerald-300 bg-emerald-50/20') :
                (isDark ? 'border-white/5 bg-surface/50 hover:bg-surface hover:border-white/10' : 'border-slate-200 bg-slate-100/50 hover:bg-slate-100 hover:border-slate-300')
              }`}
            >
              <input type="file" ref={fileInputRef} accept=".csv" onChange={handleFileChange} className="hidden" />
              {state.fileName ? (
                <div className="flex flex-col items-center">
                  <CheckCircle className={`w-12 h-12 mb-4 ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`} />
                  <h4 className={`text-sm font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{state.fileName}</h4>
                  <p className={`text-[10px] font-medium mt-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{state.parsedRows.length} filas procesadas</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className={`w-12 h-12 mb-4 ${isDark ? 'text-slate-600' : 'text-muted'}`} />
                  <h4 className={`text-sm font-black ${isDark ? 'text-secondary' : 'text-slate-700'}`}>Arrastra tu archivo CSV o haz clic</h4>
                  <p className={`text-[10px] font-medium max-w-sm mx-auto leading-normal mt-1 block ${isDark ? 'text-slate-500' : 'text-muted'}`}>
                    Se convertirá en una Carga Teórica activa.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className={`p-6 md:p-8 rounded-[2rem] border h-full flex flex-col justify-between ${
              isDark ? 'bg-surface border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
              <div className="space-y-5">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-blue-500" />
                  <h4 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-800'}`}>Mapeador de Columnas</h4>
                </div>

                {state.headers.length === 0 ? (
                  <div className={`p-4 rounded-xl text-center border ${isDark ? 'border-dashed border-white/5 text-slate-600' : 'border-dashed border-slate-200 text-muted'}`}>
                    <FileText className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    <span className="text-[10px] uppercase font-black tracking-wide block">Espera cargando archivo...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-wider mb-2 ${isDark ? 'text-muted' : 'text-slate-500'}`}>
                        Código de Barra / EAN
                      </label>
                      <select
                        value={state.mappings.barcodeCol}
                        onChange={(e) => actions.setMappings({ ...state.mappings, barcodeCol: e.target.value })}
                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide border ${
                          isDark ? 'bg-base border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        {state.headers.map((h: string) => (<option key={h} value={h}>{h}</option>))}
                      </select>
                    </div>

                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-wider mb-2 ${isDark ? 'text-muted' : 'text-slate-500'}`}>
                        Descripción / Nombre
                      </label>
                      <select
                        value={state.mappings.nameCol}
                        onChange={(e) => actions.setMappings({ ...state.mappings, nameCol: e.target.value })}
                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide border ${
                          isDark ? 'bg-base border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="">-- Autogenerar --</option>
                        {state.headers.map((h: string) => (<option key={h} value={h}>{h}</option>))}
                      </select>
                    </div>

                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-wider mb-2 ${isDark ? 'text-muted' : 'text-slate-500'}`}>
                        Cantidad Teórica
                      </label>
                      <select
                        value={state.mappings.qtyCol}
                        onChange={(e) => actions.setMappings({ ...state.mappings, qtyCol: e.target.value })}
                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide border ${
                          isDark ? 'bg-base border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        {state.headers.map((h: string) => (<option key={h} value={h}>{h}</option>))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {state.fileName && (
                <div className={`mt-6 p-4 rounded-xl border flex gap-3 text-left ${isDark ? 'bg-blue-600/5 border-blue-500/10 text-blue-400' : 'bg-blue-50/40 border-blue-200 text-blue-700'}`}>
                  <Sparkles className="w-5 h-5 shrink-0" />
                  <p className="text-[10px] font-bold leading-normal">¡Mapeo inteligente activado!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* PASTE MODE */
        <div className="space-y-4">
          {/* Toggle modo avanzado */}
          {useColumnMapping && (
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-purple-600/5 border-purple-500/10' : 'bg-purple-50 border-purple-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Columns3 className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  <span className={`text-[11px] font-black uppercase tracking-wider ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>
                    Modo Mapeo de Columnas Activo
                  </span>
                </div>
                <button onClick={() => actions.togglePasteMapping(false)} className={`text-[10px] font-bold ${isDark ? 'text-slate-500 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                  Volver al modo simple
                </button>
              </div>
              <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                El sistema identificará automáticamente los grupos cuando cambie el valor de la columna FOLIO/GUIA
              </p>
            </div>
          )}

          {/* Mapeo de columnas */}
          {useColumnMapping && (
            <div className={`p-6 rounded-[2rem] border ${isDark ? 'bg-surface border-white/5' : 'bg-white border-slate-200/80 shadow-sm'}`}>
              <h4 className={`text-xs font-black uppercase tracking-wider mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                Configura las columnas de tu datos pegados
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-wider mb-2 ${isDark ? 'text-muted' : 'text-slate-500'}`}>
                    <Package className="w-3 h-3 inline mr-1" /> SKU / Código
                  </label>
                  <select
                    value={state.pasteMappings?.skuCol || ''}
                    onChange={(e) => actions.setPasteMappings({ ...state.pasteMappings, skuCol: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold border ${
                      isDark ? 'bg-base border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="">-- Seleccionar --</option>
                    {['0','1','2','3','4','5'].map(c => (<option key={c} value={c}>Columna {parseInt(c)+1}</option>))}
                  </select>
                </div>

                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-wider mb-2 ${isDark ? 'text-muted' : 'text-slate-500'}`}>
                    <FileText className="w-3 h-3 inline mr-1" /> Descripción
                  </label>
                  <select
                    value={state.pasteMappings?.nameCol || ''}
                    onChange={(e) => actions.setPasteMappings({ ...state.pasteMappings, nameCol: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold border ${
                      isDark ? 'bg-base border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="">-- Ignorar --</option>
                    {['0','1','2','3','4','5'].map(c => (<option key={c} value={c}>Columna {parseInt(c)+1}</option>))}
                  </select>
                </div>

                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-wider mb-2 ${isDark ? 'text-muted' : 'text-slate-500'}`}>
                    <Hash className="w-3 h-3 inline mr-1" /> Cantidad
                  </label>
                  <select
                    value={state.pasteMappings?.qtyCol || ''}
                    onChange={(e) => actions.setPasteMappings({ ...state.pasteMappings, qtyCol: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold border ${
                      isDark ? 'bg-base border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="">-- Seleccionar --</option>
                    {['0','1','2','3','4','5'].map(c => (<option key={c} value={c}>Columna {parseInt(c)+1}</option>))}
                  </select>
                </div>

                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-wider mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    <FileBadge className="w-3 h-3 inline mr-1" /> Folio / Guía *
                  </label>
                  <select
                    value={state.pasteMappings?.folioCol || ''}
                    onChange={(e) => actions.setPasteMappings({ ...state.pasteMappings, folioCol: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold border ${
                      isDark ? 'bg-emerald-950 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}
                  >
                    <option value="">-- Ignorar (1 sola) --</option>
                    {['0','1','2','3','4','5'].map(c => (<option key={c} value={c}>Columna {parseInt(c)+1}</option>))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Área de pegado */}
          <div className={`p-6 md:p-8 rounded-[2rem] border ${isDark ? 'bg-surface border-white/5' : 'bg-white border-slate-200/80 shadow-sm'}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
              <div className="space-y-1">
                <h4 className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-800'} flex items-center gap-2`}>
                  <Sparkles className="w-4 h-4 text-gradient-blue animate-pulse" />
                  Copiar y Pegar desde Excel, Google Sheets o SAP
                </h4>
                <p className={`text-[10px] font-semibold ${isDark ? 'text-slate-500' : 'text-muted'}`}>
                  {useColumnMapping ? 'Pega tus datos tabulados. Se separará automáticamente por Folio/Guía.' : 'Copia las filas directamente de tu grilla.'}
                </p>
              </div>
              {!useColumnMapping && (
                <div className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border shrink-0 ${isDark ? 'border-blue-500/20 bg-blue-500/10 text-blue-400' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                  Soporta SAP NATIVO 🚀
                </div>
              )}
            </div>

            <textarea
              rows={useColumnMapping ? 12 : 10}
              value={state.pasteText}
              onChange={(e) => actions.setPasteText(e.target.value)}
              placeholder={useColumnMapping 
                ? "Pega aquí los datos tabulados con columnas...\nEj:\nFOLIO\tSKU\tDescripción\tCantidad\nGUIA001\t7702001\tProducto A\t10\nGUIA001\t7702002\tProducto B\t20\nGUIA002\t7702003\tProducto C\t5"
                : "Pega aquí... ejemplo:\n770200105312\tArroz 1kg\t150\n770200114002\tFrijol Rojo\t90"
              }
              className={`w-full p-4 rounded-2xl font-mono text-xs leading-normal border transition-all resize-none ${
                isDark ? 'bg-base border-white/10 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
              }`}
            />
          </div>

          {/* Preview parcelado */}
          {useColumnMapping && state.parceledOrders && state.parceledOrders.length > 1 && (
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-emerald-600/5 border-emerald-500/10' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <LayoutGrid className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <h4 className={`text-[11px] font-black uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  Se crearán {state.parceledOrders.length} importaciones separadas
                </h4>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {state.parceledOrders.map((order: any, idx: number) => (
                  <div key={idx} className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-surface/50' : 'bg-white/50'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                        {idx + 1}
                      </span>
                      <div>
                        <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{order.id}</span>
                        <p className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{order.items.length} SKUs · {order.totalUnits} unidades</p>
                      </div>
                    </div>
                    <button onClick={() => actions.removeParceledOrder(idx)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/5 text-slate-500' : 'hover:bg-slate-100 text-muted'}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-emerald-500/10">
                <button
                  onClick={actions.saveAllParceledOrders}
                  className={`w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${isDark ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                >
                  Guardar las {state.parceledOrders.length} importaciones
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
