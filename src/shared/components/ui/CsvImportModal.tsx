/**
 * CsvImportModal - Modal de importación CSV genérico y reutilizable
 * 
 * Características:
 * - Soporta drag & drop y click para seleccionar archivo
 * - Vista previa de datos antes de importar
 * - Mapeo de columnas
 * - Validación de datos
 * - Progreso de importación
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, X, Check, AlertTriangle, Loader2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ColumnMapping {
  source: string;
  target: string;
}

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  acceptedColumns: { key: string; label: string; required?: boolean }[];
  onImport: (data: Record<string, any>[]) => Promise<{ success: number; errors: number }>;
  sampleColumns?: string[];
  templateData?: Record<string, any>;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  title = 'Importar CSV',
  description = 'Carga un archivo CSV para importar datos',
  acceptedColumns,
  onImport,
  sampleColumns = [],
  templateData = {},
}) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parsear CSV
  const parseCSV = useCallback((text: string): { headers: string[]; data: Record<string, any>[] } => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return { headers: [], data: [] };

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: Record<string, any> = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      return row;
    }).filter(row => Object.values(row).some(v => v !== ''));

    return { headers, data };
  }, []);

  // Manejar archivo seleccionado
  const handleFile = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const { headers: csvHeaders, data } = parseCSV(text);
        
        setHeaders(csvHeaders);
        setParsedData(data);

        // Auto-mapear columnas
        const autoMapping: Record<string, string> = {};
        csvHeaders.forEach(header => {
          const normalizedHeader = header.toLowerCase().replace(/[^a-z]/g, '');
          const match = acceptedColumns.find(col => 
            col.key.toLowerCase() === normalizedHeader ||
            col.label.toLowerCase().includes(normalizedHeader) ||
            normalizedHeader.includes(col.key.toLowerCase())
          );
          if (match) {
            autoMapping[match.key] = header;
          }
        });
        setColumnMapping(autoMapping);
        
        setStep('preview');
      } catch {
        toast.error('Error al parsear el archivo CSV');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(selectedFile);
  }, [parseCSV, acceptedColumns]);

  // Manejar drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === 'text/csv' || droppedFile?.name.endsWith('.csv')) {
      handleFile(droppedFile);
    } else {
      toast.error('Por favor selecciona un archivo CSV');
    }
  }, [handleFile]);

  // Descargar plantilla
  const downloadTemplate = useCallback(() => {
    const csvContent = [
      acceptedColumns.map(c => c.label).join(','),
      acceptedColumns.map(c => templateData[c.key] || '').join(','),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantilla_${title.toLowerCase().replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [acceptedColumns, templateData, title]);

  // Importar datos
  const handleImport = useCallback(async () => {
    setStep('importing');
    setIsProcessing(true);

    try {
      // Transformar datos según mapeo
      const transformedData = parsedData.map(row => {
        const transformed: Record<string, any> = {};
        Object.entries(columnMapping).forEach(([targetKey, sourceHeader]) => {
          if (sourceHeader) {
            transformed[targetKey] = row[sourceHeader];
          }
        });
        return transformed;
      }).filter(row => Object.keys(row).length > 0);

      const result = await onImport(transformedData);
      setImportResult(result);
      setStep('complete');
      toast.success(`Importación completada: ${result.success} registros`);
    } catch (err) {
      toast.error('Error durante la importación');
      setStep('preview');
    } finally {
      setIsProcessing(false);
    }
  }, [parsedData, columnMapping, onImport]);

  // Reset
  const handleReset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setParsedData([]);
    setHeaders([]);
    setColumnMapping({});
    setImportResult(null);
  }, []);

  // Cerrar
  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-hidden"
          >
            <div className="bg-surface border border-subtle rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-4 border-b border-subtle flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-lg font-semibold text-primary">{title}</h2>
                  <p className="text-xs text-muted">{description}</p>
                </div>
                <button onClick={handleClose} className="p-2 hover:bg-elevated rounded-xl">
                  <X className="w-5 h-5 text-muted" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Upload Step */}
                {step === 'upload' && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={cn(
                      'border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer',
                      isDragging 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-subtle hover:border-blue-500/50'
                    )}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                    <Upload className="w-12 h-12 text-muted mx-auto mb-4" />
                    <p className="text-sm font-medium text-primary mb-1">
                      Arrastra un archivo CSV aquí o haz clic para seleccionar
                    </p>
                    <p className="text-xs text-muted">
                      Formato: .csv
                    </p>
                    
                    {sampleColumns.length > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}
                        className="mt-4 inline-flex items-center gap-2 text-xs text-blue-500 hover:text-blue-400"
                      >
                        <Download className="w-4 h-4" />
                        Descargar plantilla CSV
                      </button>
                    )}
                  </div>
                )}

                {/* Preview Step */}
                {step === 'preview' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                        <span className="text-sm font-medium text-primary">{file?.name}</span>
                        <span className="text-xs text-muted">({parsedData.length} registros)</span>
                      </div>
                      <button onClick={handleReset} className="text-xs text-muted hover:text-primary">
                        Cambiar archivo
                      </button>
                    </div>

                    {/* Column Mapping */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-secondary">Mapeo de columnas</h3>
                      {acceptedColumns.filter(c => c.required).map(col => (
                        <div key={col.key} className="flex items-center gap-2">
                          <label className="w-32 text-xs text-muted">{col.label}:</label>
                          <select
                            value={columnMapping[col.key] || ''}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, [col.key]: e.target.value }))}
                            className="flex-1 bg-elevated border border-subtle rounded-lg px-3 py-2 text-sm text-primary"
                          >
                            <option value="">-- Seleccionar --</option>
                            {headers.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    {/* Preview Table */}
                    <div className="border border-subtle rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-elevated sticky top-0">
                          <tr>
                            {headers.slice(0, 5).map(h => (
                              <th key={h} className="px-3 py-2 text-left text-muted font-medium">{h}</th>
                            ))}
                            {headers.length > 5 && <th className="px-3 py-2 text-muted">...</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {parsedData.slice(0, 5).map((row, i) => (
                            <tr key={i} className="border-t border-subtle">
                              {headers.slice(0, 5).map(h => (
                                <td key={h} className="px-3 py-2 text-primary truncate max-w-[150px]">{row[h]}</td>
                              ))}
                              {headers.length > 5 && <td className="px-3 py-2 text-muted">...</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {parsedData.length > 5 && (
                      <p className="text-xs text-muted text-center">Mostrando 5 de {parsedData.length} registros</p>
                    )}
                  </div>
                )}

                {/* Importing Step */}
                {step === 'importing' && (
                  <div className="text-center py-8">
                    <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
                    <p className="text-sm font-medium text-primary">Importando datos...</p>
                    <p className="text-xs text-muted mt-1">Esto puede tardar unos segundos</p>
                  </div>
                )}

                {/* Complete Step */}
                {step === 'complete' && importResult && (
                  <div className="text-center py-8">
                    <Check className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                    <p className="text-sm font-medium text-primary">¡Importación completada!</p>
                    <div className="mt-4 flex justify-center gap-4 text-xs">
                      <span className="text-emerald-500">{importResult.success} importados</span>
                      {importResult.errors > 0 && (
                        <span className="text-rose-500">{importResult.errors} errores</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-subtle flex justify-end gap-2 shrink-0">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-surface hover:bg-elevated border border-subtle"
                >
                  {step === 'complete' ? 'Cerrar' : 'Cancelar'}
                </button>
                {step === 'preview' && (
                  <button
                    onClick={handleImport}
                    disabled={isProcessing || Object.keys(columnMapping).length === 0}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                  >
                    Importar {parsedData.length} registros
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
