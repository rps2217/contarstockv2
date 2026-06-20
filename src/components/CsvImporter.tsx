import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToastStore } from '@/stores';
import { db } from '../db';
import { parse } from 'papaparse';

export const CsvImporter: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToastStore();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const processCsv = async () => {
    if (!file) return;

    setIsImporting(true);
    try {
      parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const rows = results.data;
          
          if (rows.length === 0) {
            addToast("El archivo está vacío", "error");
            setIsImporting(false);
            return;
          }

          // Mapear filas a formato de producto
          const products = rows.map((row: any) => ({
            barcode: String(row.barcode || row.BARCODE || '').trim(),
            name: String(row.name || row.NAME || row.description || row.DESCRIPTION || '').trim(),
            category: 'default',
            syncStatus: 'pending' as const
          })).filter(p => p.barcode !== '');

          if (products.length === 0) {
            addToast("No se encontraron registros válidos", "error");
            setIsImporting(false);
            return;
          }

          // Guardar en la base de datos local
          await db.products.bulkPut(products);
          
          addToast(`${products.length} productos importados correctamente`, "success");
          setIsImporting(false);
          setFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
        error: (error) => {
          addToast("Error al procesar el archivo: " + error.message, "error");
          setIsImporting(false);
        }
      });
    } catch (error: any) {
      addToast("Error inesperado: " + error.message, "error");
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border-4 border-slate-100 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
          <Upload size={20} />
        </div>
        <div>
          <h3 className="font-black text-slate-900 leading-tight">Importador CSV</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Maestro de Productos</p>
        </div>
      </div>

      <div 
        className={`border-4 border-dashed rounded-3xl p-8 transition-all text-center ${
          file ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'
        }`}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          ref={fileInputRef}
          className="hidden"
          id="csv-input"
        />
        
        {file ? (
          <div className="flex flex-col items-center">
            <CheckCircle className="text-emerald-500 mb-2" size={32} />
            <span className="font-black text-slate-900 text-sm mb-1">{file.name}</span>
            <span className="text-[10px] text-slate-400 uppercase font-black">{(file.size / 1024).toFixed(1)} KB</span>
          </div>
        ) : (
          <label htmlFor="csv-input" className="flex flex-col items-center cursor-pointer">
            <FileText className="text-slate-300 mb-2" size={32} />
            <span className="font-black text-slate-400 text-sm">Selecciona o arrastra tu archivo CSV</span>
            <span className="text-[10px] text-slate-300 uppercase font-black mt-1">Headers requeridos: barcode, name</span>
          </label>
        )}
      </div>

      <button
        onClick={processCsv}
        disabled={!file || isImporting}
        className={`w-full mt-6 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 ${
          !file || isImporting 
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95'
        }`}
      >
        {isImporting ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            PROCESANDO...
          </>
        ) : (
          <>
            <Upload size={20} />
            COMENZAR IMPORTACIÓN
          </>
        )}
      </button>
    </div>
  );
};
