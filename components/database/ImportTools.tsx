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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
        <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2">
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Importar Productos</h2>
          <p className="text-sm text-slate-500 mt-1">Cargue un CSV o use una hoja de Google Sheets pública.</p>
        </div>

        {importStatus === 'loading' ? (
          <div className="py-8 text-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-600 font-bold">Procesando archivo...</p>
            <p className="text-xs text-slate-400">Esto puede tomar unos segundos.</p>
          </div>
        ) : importStatus === 'success' ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">¡Importación Exitosa!</h3>
            <p className="text-slate-600 mb-6">Se cargaron {importCount} productos.</p>
            <button onClick={handleClose} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold">Cerrar</button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Opción A: Subir Archivo CSV</label>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-xl" />
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-slate-300 text-xs font-bold uppercase">O también</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <form onSubmit={handleImport}>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Opción B: URL Google Sheet (Pública)</label>
                <div className="flex gap-2">
                  <input
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                  />
                  <button type="submit" className="bg-green-600 text-white p-3 rounded-xl hover:bg-green-700 transition-colors shadow-sm">
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>
            {importError && (
              <div className="mt-4 bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {importError}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};