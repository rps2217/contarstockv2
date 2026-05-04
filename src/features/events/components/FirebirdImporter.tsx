
import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, Database, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FirebirdImporterProps {
  onImport: (items: any[]) => Promise<boolean>;
  onClearAll: () => Promise<void>;
}

export const FirebirdImporter: React.FC<FirebirdImporterProps> = ({ 
  onImport, 
  onClearAll
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setIsUploading(false);
        if (results.data && results.data.length > 0) {
          // Validar si tiene columnas de Firebird
          const firstRow = results.data[0] as any;
          const hasFirebirdCols = ['SKU', 'CANTIDAD', 'EVENTO'].some(col => 
            Object.keys(firstRow).some(k => k.toUpperCase() === col)
          );

          if (!hasFirebirdCols) {
            setError('El archivo no parece tener el formato de Firebird (columnas SKU, CANTIDAD, EVENTO).');
            return;
          }

          setPreview(results.data);
        } else {
          setError('El archivo está vacío o no se pudo procesar.');
        }
      },
      error: (err) => {
        setIsUploading(false);
        setError(`Error al leer el archivo: ${err.message}`);
      }
    });
  };

  const executeImport = async () => {
    if (!preview) return;
    setIsUploading(true);
    const success = await onImport(preview);
    setIsUploading(false);
    if (success) {
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClear = async () => {
    if (!showConfirmClear) {
      setShowConfirmClear(true);
      setTimeout(() => setShowConfirmClear(false), 5000); // Reset after 5s
      return;
    }
    
    setIsUploading(true);
    await onClearAll();
    setIsUploading(false);
    setShowConfirmClear(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-brand-surface/40 border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4 text-amber-400">
          <Database className="w-5 h-5" />
          <h3 className="text-lg font-black uppercase tracking-tighter italic">Rehacer Migración Firebird</h3>
        </div>
        
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Usa esta herramienta para cargar registros desde CSV. 
          <span className="text-rose-400 font-bold block mt-1 underline decoration-rose-500/30">Se recomienda limpiar la base de datos antes de una nueva migración.</span>
        </p>

        <div className="grid grid-cols-1 gap-3">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileSelect}
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Seleccionar CSV Firebird
          </button>

          <button
            onClick={handleClear}
            disabled={isUploading}
            className={`flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 border-2 ${
              showConfirmClear 
                ? 'bg-rose-600 border-rose-400 text-white animate-pulse' 
                : 'bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 border-rose-500/30'
            }`}
          >
            {showConfirmClear ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                ¿Confirmar Borrado Total?
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                Limpiar Base de Datos
              </>
            )}
          </button>

          {showConfirmClear && (
            <p className="text-[10px] text-center text-rose-400 font-black uppercase animate-bounce mt-1">
              ¡Cuidado! Esta acción no se puede deshacer
            </p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-400 text-sm italic font-bold"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </motion.div>
        )}

        {preview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-brand-surface border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-black uppercase italic text-white">Vista Previa ({preview.length} filas)</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreview(null)}
                  className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeImport}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Iniciar Importación
                </button>
              </div>
            </div>
            
            <div className="max-h-60 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-brand-surface border-b border-white/10">
                  <tr>
                    {Object.keys(preview[0] || {}).slice(0, 5).map(k => (
                      <th key={k} className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">{k}</th>
                    ))}
                    <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">...</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {preview.slice(0, 5).map((row, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      {Object.values(row).slice(0, 5).map((val: any, j) => (
                        <td key={j} className="px-4 py-2 text-xs font-mono text-slate-400 truncate max-w-[150px]">{String(val)}</td>
                      ))}
                      <td className="px-4 py-2 text-xs text-slate-600">...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 5 && (
                <div className="p-3 text-center text-[10px] font-bold text-slate-500 italic bg-black/20">
                  Y otros {preview.length - 5} registros más...
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
