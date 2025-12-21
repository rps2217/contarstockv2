
import React, { useState } from 'react';
import { FileSpreadsheet, X, Loader2, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
import * as productService from '../../services/productService';

interface ImportToolsProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (count: number) => void;
}

export const ImportTools: React.FC<ImportToolsProps> = ({ isOpen, onClose, onImportComplete }) => {
  const [sheetUrl, setSheetUrl] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importCount, setImportCount] = useState(0);
  const [importError, setImportError] = useState('');

  if (!isOpen) return null;

  const handleReset = () => {
      setImportStatus('idle');
      setImportCount(0);
      setImportError('');
      setSheetUrl('');
  };

  const handleClose = () => {
      handleReset();
      onClose();
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportStatus('loading');
    setImportError('');

    try {
      const idMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!idMatch) throw new Error("URL de hoja no válida.");

      const sheetId = idMatch[1];
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error("No se pudo descargar. Verifique que la hoja sea pública.");

      const csvText = await response.text();
      const count = await productService.bulkImportProducts(csvText);

      setImportCount(count);
      setImportStatus('success');
      setSheetUrl('');
      onImportComplete(count);
    } catch (err: any) {
      console.error(err);
      setImportStatus('error');
      setImportError(err.message || "Error desconocido.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('loading');
    setImportError('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvText = event.target?.result as string;
        const count = await productService.bulkImportProducts(csvText);
        setImportCount(count);
        setImportStatus('success');
        onImportComplete(count);
      } catch (err: any) {
        setImportStatus('error');
        setImportError('Error procesando el archivo CSV.');
      }
    };
    reader.onerror = () => {
      setImportStatus('error');
      setImportError('Error leyendo el archivo.');
    }
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 relative animate-in zoom-in-95 duration-200">
        <button onClick={handleClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2 bg-slate-50 rounded-full">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Importar Productos</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-2">Carga masiva de SKUs</p>
        </div>

        {importStatus === 'loading' ? (
          <div className="py-12 text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-900 font-bold uppercase tracking-widest text-xs">Procesando archivo...</p>
          </div>
        ) : importStatus === 'success' ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-900 mb-2">¡Importación Exitosa!</h3>
            <p className="text-slate-500 mb-8 text-sm font-medium">Se cargaron {importCount} productos.</p>
            <button onClick={handleClose} className="bg-slate-900 text-white w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">Finalizar</button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-2">Opción A: Archivo CSV</label>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-wide file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border-2 border-slate-100 rounded-2xl h-16 flex items-center bg-slate-50" />
            </div>

            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink-0 mx-4 text-slate-300 text-[10px] font-black uppercase tracking-widest">O también</span>
                <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <form onSubmit={handleImport}>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-2">Opción B: Google Sheet (Pública)</label>
                <div className="flex gap-2">
                  <input
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="flex-1 h-14 pl-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-green-500 transition-all placeholder:text-slate-300"
                    placeholder="https://docs.google.com/..."
                  />
                  <button type="submit" className="h-14 w-14 flex items-center justify-center bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-colors shadow-lg active:scale-90">
                    <Download className="w-6 h-6" />
                  </button>
                </div>
            </form>

            {importError && (
              <div className="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-2xl flex items-center gap-3 animate-in shake">
                <AlertTriangle className="w-5 h-5 shrink-0" /> {importError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
